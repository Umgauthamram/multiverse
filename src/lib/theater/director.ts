/**
 * Theater Director
 *
 * Coordinates playback timing, sub-beat sequencing, staggered quarters,
 * and reveal gate synchronization across the 4 stories.
 *
 * Implements Section 8.2 of Multiverse Theater specification.
 */

import { parseLine, ParsedSceneLine } from "@/lib/scene/sceneLanguage";
import {
  SceneState,
  createInitialSceneState,
  reduceSceneState,
} from "@/lib/theater/sceneState";

export interface DirectorConfig {
  now?: () => number;
  reducedMotion?: boolean;
  beatMs?: number;
  staggerMs?: number;
  maxTheaterMs?: number;
  onStateChange?: (state: SceneState) => void;
  onLineDispatched?: (line: string, parsed: ParsedSceneLine) => void;
  onRevealReady?: () => void;
}

export interface SubBeatDefinition {
  name: "event" | "math" | "think" | "result" | "story";
  startOffset: number;
  duration: number;
  verbs: string[];
}

export const NORMAL_SUB_BEATS: SubBeatDefinition[] = [
  { name: "event", startOffset: 0, duration: 1100, verbs: ["ROLL"] },
  { name: "math", startOffset: 1100, duration: 1300, verbs: ["CALC"] },
  { name: "think", startOffset: 2400, duration: 1200, verbs: ["THINK"] },
  { name: "result", startOffset: 3600, duration: 1400, verbs: ["DELTA", "CLAMP"] },
  { name: "story", startOffset: 5000, duration: 1500, verbs: ["STATUS", "SAY", "DONE"] },
];

export const REDUCED_MOTION_SUB_BEATS: SubBeatDefinition[] = [
  { name: "event", startOffset: 0, duration: 500, verbs: ["ROLL"] },
  { name: "math", startOffset: 500, duration: 600, verbs: ["CALC"] },
  { name: "think", startOffset: 1100, duration: 500, verbs: ["THINK"] },
  { name: "result", startOffset: 1600, duration: 600, verbs: ["DELTA", "CLAMP"] },
  { name: "story", startOffset: 2200, duration: 800, verbs: ["STATUS", "SAY", "DONE"] },
];

interface QuarterPackage {
  quarter: number;
  lines: string[];
  dispatchedSubBeats: Set<string>;
}

interface StoryPlaybackTrack {
  storyId: string;
  storyIndex: number;
  staggerDelayMs: number;
  stagingLines: string[];
  playableQueue: QuarterPackage[];
  currentQuarter: QuarterPackage | null;
  quarterStartTime: number | null;
  isCompleted: boolean;
}

export class TheaterDirector {
  private now: () => number;
  private reducedMotion: boolean;
  private beatMs: number;
  private staggerMs: number;
  private maxTheaterMs: number;
  private startTime: number | null = null;

  private state: SceneState;
  private tracks: Map<string, StoryPlaybackTrack> = new Map();
  private pendingFinaleLines: string[] = [];
  private finishReceived = false;
  private revealTriggered = false;

  private onStateChange?: (state: SceneState) => void;
  private onLineDispatched?: (line: string, parsed: ParsedSceneLine) => void;
  private onRevealReady?: () => void;

  private timer: NodeJS.Timeout | null = null;

  constructor(config: DirectorConfig = {}) {
    this.now = config.now || (() => Date.now());
    this.reducedMotion = !!config.reducedMotion;
    this.beatMs = config.beatMs || (this.reducedMotion ? 3000 : 6500);
    this.staggerMs = config.staggerMs ?? (this.reducedMotion ? 200 : 600);
    this.maxTheaterMs = config.maxTheaterMs || 150000;

    this.onStateChange = config.onStateChange;
    this.onLineDispatched = config.onLineDispatched;
    this.onRevealReady = config.onRevealReady;

    this.state = createInitialSceneState();
  }

  public getState(): SceneState {
    return this.state;
  }

  public isRevealReady(): boolean {
    return this.revealTriggered;
  }

  /**
   * Ingests a batch of incoming Scene lines from SSE or mockSceneStream.
   */
  public ingestLines(lines: string[]): void {
    if (this.startTime === null) {
      this.startTime = this.now();
    }

    for (const rawLine of lines) {
      const parsed = parseLine(rawLine);
      if (!parsed) continue;

      const { scope, verb } = parsed;
      const storyId = scope.storyId;
      const quarter = scope.quarter;

      // 1. Finale lines held until stories finish
      if (verb === "NARRATE" || verb === "FINISH") {
        if (verb === "FINISH") this.finishReceived = true;
        this.pendingFinaleLines.push(rawLine);
        continue;
      }

      // 2. Global immediate lines (@* BOOT, CAST, REROUTE, PROGRESS)
      if (scope.kind === "global" || !storyId) {
        this.applyLine(rawLine, parsed);
        continue;
      }

      // 3. Story level FORK or END
      if (verb === "FORK") {
        this.ensureTrack(storyId);
        this.applyLine(rawLine, parsed);
        continue;
      }

      if (verb === "END") {
        const track = this.ensureTrack(storyId);
        track.isCompleted = true;
        this.applyLine(rawLine, parsed);
        continue;
      }

      // 4. Quarter level simulation lines (@S1/Q5)
      const track = this.ensureTrack(storyId);
      track.stagingLines.push(rawLine);

      if (verb === "DONE") {
        const qPkg: QuarterPackage = {
          quarter: quarter || 0,
          lines: [...track.stagingLines],
          dispatchedSubBeats: new Set(),
        };
        track.playableQueue.push(qPkg);
        track.stagingLines = [];
      }
    }
  }

  private ensureTrack(storyId: string): StoryPlaybackTrack {
    let track = this.tracks.get(storyId);
    if (!track) {
      const storyIndex = this.tracks.size;
      track = {
        storyId,
        storyIndex,
        staggerDelayMs: storyIndex * this.staggerMs,
        stagingLines: [],
        playableQueue: [],
        currentQuarter: null,
        quarterStartTime: null,
        isCompleted: false,
      };
      this.tracks.set(storyId, track);
    }
    return track;
  }

  private applyLine(rawLine: string, parsed?: ParsedSceneLine): void {
    this.state = reduceSceneState(this.state, rawLine);
    const p = parsed || parseLine(rawLine);
    if (p) {
      this.onLineDispatched?.(rawLine, p);
    }
    this.onStateChange?.(this.state);
  }

  /**
   * Advances simulation playback clock.
   */
  public tick(): void {
    if (this.revealTriggered) return;

    const currentTime = this.now();
    if (this.startTime === null) {
      this.startTime = currentTime;
    }

    const elapsed = currentTime - this.startTime;
    const is3xSpeed = elapsed >= this.maxTheaterMs;
    const currentBeatDuration = is3xSpeed ? Math.max(800, Math.floor(this.beatMs / 3)) : this.beatMs;

    const subBeats = this.reducedMotion ? REDUCED_MOTION_SUB_BEATS : NORMAL_SUB_BEATS;

    // Process each story track
    let allTracksFinished = this.tracks.size > 0;

    for (const track of this.tracks.values()) {
      if (track.isCompleted) continue;

      // Check stagger delay
      if (elapsed < track.staggerDelayMs) {
        allTracksFinished = false;
        continue;
      }

      // Advance or start quarter
      if (!track.currentQuarter) {
        if (track.playableQueue.length > 0) {
          track.currentQuarter = track.playableQueue.shift()!;
          track.quarterStartTime = currentTime;
        } else {
          if (this.finishReceived) {
            track.isCompleted = true;
          } else {
            allTracksFinished = false;
          }
          continue;
        }
      }

      const quarterElapsed = currentTime - (track.quarterStartTime || currentTime);
      const subBeatRatio = is3xSpeed ? 0.333 : 1.0;

      // Dispatch lines for matching sub-beats
      for (const sb of subBeats) {
        const sbStart = sb.startOffset * subBeatRatio;
        if (quarterElapsed >= sbStart && !track.currentQuarter.dispatchedSubBeats.has(sb.name)) {
          track.currentQuarter.dispatchedSubBeats.add(sb.name);

          // Find lines belonging to this sub-beat
          const matchingLines = track.currentQuarter.lines.filter((l) => {
            const p = parseLine(l);
            return p && sb.verbs.includes(p.verb);
          });

          for (const l of matchingLines) {
            this.applyLine(l);
          }
        }
      }

      // Check if beat completed
      if (quarterElapsed >= currentBeatDuration) {
        // Guarantee all remaining lines in this quarter are applied
        for (const l of track.currentQuarter.lines) {
          const p = parseLine(l);
          if (p && !this.isLineAppliedInQuarter(track.currentQuarter, p.verb)) {
            this.applyLine(l, p);
          }
        }

        const maxQuarters = this.state.session?.quarters || 20;
        if (
          track.currentQuarter.quarter >= maxQuarters ||
          (track.playableQueue.length === 0 && this.finishReceived)
        ) {
          track.isCompleted = true;
          track.currentQuarter = null;
        } else {
          // Ready for next quarter
          track.currentQuarter = null;
          track.quarterStartTime = null;
          allTracksFinished = false;
        }
      } else {
        allTracksFinished = false;
      }
    }

    // Reveal Gate Check
    if (allTracksFinished && this.finishReceived && !this.revealTriggered) {
      // Drain any pending finale lines
      while (this.pendingFinaleLines.length > 0) {
        const fLine = this.pendingFinaleLines.shift()!;
        this.applyLine(fLine);
      }
      this.revealTriggered = true;
      this.onRevealReady?.();
    }
  }

  private isLineAppliedInQuarter(pkg: QuarterPackage, verb: string): boolean {
    const subBeats = this.reducedMotion ? REDUCED_MOTION_SUB_BEATS : NORMAL_SUB_BEATS;
    for (const sbName of pkg.dispatchedSubBeats) {
      const def = subBeats.find((d) => d.name === sbName);
      if (def?.verbs.includes(verb)) return true;
    }
    return false;
  }

  /**
   * Jumps immediately to the final simulation state.
   */
  public skip(): void {
    // 1. Drain all tracks and lines
    for (const track of this.tracks.values()) {
      // Apply any lines remaining in current quarter
      if (track.currentQuarter) {
        for (const l of track.currentQuarter.lines) {
          this.applyLine(l);
        }
        track.currentQuarter = null;
      }

      // Drain all playable quarters
      while (track.playableQueue.length > 0) {
        const q = track.playableQueue.shift()!;
        for (const l of q.lines) {
          this.applyLine(l);
        }
      }

      // Drain any staging lines
      while (track.stagingLines.length > 0) {
        const l = track.stagingLines.shift()!;
        this.applyLine(l);
      }

      track.isCompleted = true;
    }

    // 2. Drain all finale lines
    while (this.pendingFinaleLines.length > 0) {
      const fLine = this.pendingFinaleLines.shift()!;
      this.applyLine(fLine);
    }

    this.finishReceived = true;
    this.revealTriggered = true;
    this.onRevealReady?.();
  }

  /**
   * Starts automatic internal ticking loop (optional convenience for UI integration).
   */
  public start(intervalMs = 50): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public destroy(): void {
    this.stop();
  }
}
