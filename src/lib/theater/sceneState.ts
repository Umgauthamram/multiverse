/**
 * Scene State Reducer
 *
 * Pure, deterministic state container for Multiverse Theater.
 * Ingests individual Scene Language lines, updates story rooms, agent desks,
 * ticker feed, and simulation progress.
 *
 * Implements Sections 4.6, 5.3, 6.2, and 8.1 of Multiverse Theater specification.
 */

import { parseLine, renderTickerText, ParsedSceneLine } from "@/lib/scene/sceneLanguage";
import { PersonaSeedType } from "@/lib/simulation/personaSeeder";
import { LifeStats } from "@/lib/simulation/statClamper";
import { inspectForCrisis } from "@/lib/safety/crisisInterceptor";

export type AgentId =
  | "RONIN"
  | "SAGE"
  | "CIPHER"
  | "MUSE"
  | "ATLAS"
  | "FORGE"
  | "ECHO"
  | "SPARK"
  | "NEXUS";

export type DotColor = "grey" | "accent" | "done" | "error";

export interface AgentState {
  id: AgentId;
  name: string;
  role: string;
  accent: string;
  statusTag: string; // e.g. "idle", "working S2 Q7", "done"
  dotColor: DotColor;
  currentStoryId: string | null;
  currentQuarter: number | null;
  monitorData: Record<string, unknown>;
  speechBubble: string | null;
}

export interface StorySceneState {
  storyId: string;
  branchOption: "A" | "B";
  personaSeed: PersonaSeedType;
  label: string;
  location: string;
  quarter: number;
  initialSavings: number;
  currentSavings: number;
  stats: {
    happiness: number;
    health: number;
    relationships: number;
    career: number;
  };
  statDeltas: {
    joy: number;
    hp: number;
    rel: number;
    car: number;
  };
  clampedHit: "none" | "joy" | "hp" | "rel" | "car";
  status: "thriving" | "plateau" | "struggling" | "burnout";
  isBurnedOut: boolean;
  currentEvent: {
    ev: string;
    sev: "pos" | "neg" | "neu";
    title: string;
  } | null;
  lastDiary: string | null;
  coinTier: number; // 0..3 based on savings vs initial
  happinessTier: "happy" | "neutral" | "sad";
  healthTier: "normal" | "tired" | "exhausted";
  relPhotoTier: number; // 0..3
  careerDeskTier: number; // 0..3
  finished: boolean;
}

export interface CastNPC {
  role: string;
  name: string;
  trait: string;
}

export interface TickerItem {
  id: string;
  text: string;
  storyId?: string;
  scope: string;
  verb: string;
  timestamp: number;
}

export interface SceneState {
  session: {
    sessionId: string;
    stories: number;
    quarters: number;
  } | null;
  progress: {
    done: number;
    total: number;
  };
  stories: Record<string, StorySceneState>;
  agents: Record<AgentId, AgentState>;
  cast: Record<string, CastNPC>;
  ticker: TickerItem[];
  narratorPhase: "digest" | "gemini" | "report" | "done" | null;
  isFinished: boolean;
  activeHandoff: {
    fromAgent: AgentId;
    toAgent: AgentId;
    storyId: string;
    quarter: number;
  } | null;
}

export const INITIAL_AGENTS: Record<AgentId, AgentState> = {
  RONIN: {
    id: "RONIN",
    name: "RONIN",
    role: "The Builder",
    accent: "#0DEEF3",
    statusTag: "idle",
    dotColor: "grey",
    currentStoryId: null,
    currentQuarter: null,
    monitorData: { codeLines: [], rawDeltas: null },
    speechBubble: null,
  },
  SAGE: {
    id: "SAGE",
    name: "SAGE",
    role: "The Analyst",
    accent: "#F5A623",
    statusTag: "idle",
    dotColor: "grey",
    currentStoryId: null,
    currentQuarter: null,
    monitorData: { bars: { joy: 50, hp: 50, rel: 50, car: 50 }, trend: [] },
    speechBubble: null,
  },
  CIPHER: {
    id: "CIPHER",
    name: "CIPHER",
    role: "The Coder",
    accent: "#00E676",
    statusTag: "idle",
    dotColor: "grey",
    currentStoryId: null,
    currentQuarter: null,
    monitorData: { formula: "", cursor: true, flash: false },
    speechBubble: null,
  },
  MUSE: {
    id: "MUSE",
    name: "MUSE",
    role: "The Creative",
    accent: "#E040FB",
    statusTag: "idle",
    dotColor: "grey",
    currentStoryId: null,
    currentQuarter: null,
    monitorData: { swatches: [], lastEvent: null },
    speechBubble: null,
  },
  ATLAS: {
    id: "ATLAS",
    name: "ATLAS",
    role: "The Strategist",
    accent: "#448AFF",
    statusTag: "idle",
    dotColor: "grey",
    currentStoryId: null,
    currentQuarter: null,
    monitorData: { nodes: { S1: "active", S2: "active", S3: "active", S4: "active" } },
    speechBubble: null,
  },
  FORGE: {
    id: "FORGE",
    name: "FORGE",
    role: "The Deployer",
    accent: "#FF9100",
    statusTag: "idle",
    dotColor: "grey",
    currentStoryId: null,
    currentQuarter: null,
    monitorData: { done: 0, total: 80, phase: null },
    speechBubble: null,
  },
  ECHO: {
    id: "ECHO",
    name: "ECHO",
    role: "The Researcher",
    accent: "#7C4DFF",
    statusTag: "idle",
    dotColor: "grey",
    currentStoryId: null,
    currentQuarter: null,
    monitorData: { docLines: [] },
    speechBubble: null,
  },
  SPARK: {
    id: "SPARK",
    name: "SPARK",
    role: "The Tester",
    accent: "#FF5252",
    statusTag: "idle",
    dotColor: "grey",
    currentStoryId: null,
    currentQuarter: null,
    monitorData: { checks: { clamp_range: true, burnout_rule: true, crisis_scan: true } },
    speechBubble: null,
  },
  NEXUS: {
    id: "NEXUS",
    name: "NEXUS",
    role: "The Coordinator",
    accent: "#CCDDEE",
    statusTag: "ready",
    dotColor: "grey",
    currentStoryId: null,
    currentQuarter: null,
    monitorData: { mode: "reception", rerouteCount: 0 },
    speechBubble: null,
  },
};

export function createInitialSceneState(): SceneState {
  return {
    session: null,
    progress: { done: 0, total: 80 },
    stories: {},
    agents: { ...INITIAL_AGENTS },
    cast: {},
    ticker: [],
    narratorPhase: null,
    isFinished: false,
    activeHandoff: null,
  };
}

/**
 * Computes visual tiers from financial and life stats (Section 5.3)
 */
function computeVisualTiers(initialSavings: number, currentSavings: number, stats: LifeStats) {
  // Coin tier: <25% = 0, 25-75% = 1, 75-150% = 2, >150% = 3
  const ratio = initialSavings > 0 ? currentSavings / initialSavings : 1.0;
  let coinTier = 1;
  if (ratio < 0.25) coinTier = 0;
  else if (ratio <= 0.75) coinTier = 1;
  else if (ratio <= 1.5) coinTier = 2;
  else coinTier = 3;

  // Happiness: >=65 happy, 35..64 neutral, <35 sad
  let happinessTier: "happy" | "neutral" | "sad" = "neutral";
  if (stats.happiness >= 65) happinessTier = "happy";
  else if (stats.happiness < 35) happinessTier = "sad";

  // Health: <20 exhausted, <40 tired, >=40 normal
  let healthTier: "normal" | "tired" | "exhausted" = "normal";
  if (stats.health < 20) healthTier = "exhausted";
  else if (stats.health < 40) healthTier = "tired";

  // Relationships photo tier: <30 = 0, 30..59 = 1, 60..79 = 2, >=80 = 3
  let relPhotoTier = 1;
  if (stats.relationships < 30) relPhotoTier = 0;
  else if (stats.relationships <= 59) relPhotoTier = 1;
  else if (stats.relationships <= 79) relPhotoTier = 2;
  else relPhotoTier = 3;

  // Career tier: <40 = 0, 40..69 = 1, 70..89 = 2, >=90 = 3
  let careerDeskTier = 1;
  if (stats.career < 40) careerDeskTier = 0;
  else if (stats.career <= 69) careerDeskTier = 1;
  else if (stats.career <= 89) careerDeskTier = 2;
  else careerDeskTier = 3;

  return { coinTier, happinessTier, healthTier, relPhotoTier, careerDeskTier };
}

/**
 * Pure state transition reducer.
 * Applies a single scene line to produce the next SceneState.
 */
export function reduceSceneState(state: SceneState, rawLine: string | ParsedSceneLine): SceneState {
  let parsed: ParsedSceneLine | null = null;

  if (typeof rawLine === "string") {
    parsed = parseLine(rawLine);
  } else {
    parsed = rawLine;
  }

  // Gracefully drop unrecognized or invalid lines
  if (!parsed) {
    return state;
  }

  const { verb, scope, args } = parsed;
  const storyId = scope.storyId;
  const quarter = scope.quarter;

  const nextState: SceneState = {
    ...state,
    stories: { ...state.stories },
    agents: { ...state.agents },
    cast: { ...state.cast },
    ticker: [...state.ticker],
  };

  // Generate and append ticker entry (if template exists)
  const tickerText = renderTickerText(parsed);
  if (tickerText) {
    nextState.ticker.unshift({
      id: `tick_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text: tickerText,
      storyId,
      scope: scope.raw,
      verb,
      timestamp: Date.now(),
    });
    // Keep last 150 ticker items
    if (nextState.ticker.length > 150) {
      nextState.ticker = nextState.ticker.slice(0, 150);
    }
  }

  switch (verb) {
    case "BOOT": {
      const sess = String(args.sess || "");
      const storiesCount = Number(args.stories) || 4;
      const quartersCount = Number(args.quarters) || 20;

      nextState.session = {
        sessionId: sess,
        stories: storiesCount,
        quarters: quartersCount,
      };
      nextState.agents.NEXUS = {
        ...nextState.agents.NEXUS,
        statusTag: "ready",
        dotColor: "accent",
        speechBubble: `Session ready: ${storiesCount} lives`,
      };
      break;
    }

    case "FORK": {
      if (!storyId) break;
      const opt = (args.opt === "B" ? "B" : "A") as "A" | "B";
      const seed = (args.seed || "balanced") as PersonaSeedType;
      const label = String(args.label || `Option ${opt}`);
      const loc = String(args.loc || "Location");
      const initialSavings = 25000;

      const initialStats: LifeStats = { happiness: 65, health: 70, relationships: 65, career: 60 };
      const tiers = computeVisualTiers(initialSavings, initialSavings, initialStats);

      nextState.stories[storyId] = {
        storyId,
        branchOption: opt,
        personaSeed: seed,
        label,
        location: loc,
        quarter: 0,
        initialSavings,
        currentSavings: initialSavings,
        stats: initialStats,
        statDeltas: { joy: 0, hp: 0, rel: 0, car: 0 },
        clampedHit: "none",
        status: "thriving",
        isBurnedOut: false,
        currentEvent: null,
        lastDiary: null,
        finished: false,
        ...tiers,
      };

      nextState.agents.ATLAS = {
        ...nextState.agents.ATLAS,
        statusTag: `forked ${storyId}`,
        dotColor: "accent",
        currentStoryId: storyId,
      };
      break;
    }

    case "CAST": {
      const role = String(args.role || "npc");
      const name = String(args.name || "Alex");
      const trait = String(args.trait || "steady");

      nextState.cast[role] = { role, name, trait };

      const existingDocLines = (nextState.agents.ECHO.monitorData.docLines as string[]) || [];
      nextState.agents.ECHO = {
        ...nextState.agents.ECHO,
        statusTag: `cast ${name}`,
        dotColor: "accent",
        monitorData: {
          docLines: [...existingDocLines, `# ${name} (${role}, ${trait})`].slice(-6),
        },
      };
      break;
    }

    case "ROLL": {
      if (!storyId) break;
      const ev = String(args.ev || "steady");
      const sev = (args.sev || "neu") as "pos" | "neg" | "neu";
      const title = String(args.title || "Quarterly Event");

      if (nextState.stories[storyId]) {
        nextState.stories[storyId] = {
          ...nextState.stories[storyId],
          quarter: quarter || nextState.stories[storyId].quarter,
          currentEvent: { ev, sev, title },
        };
      }

      nextState.agents.MUSE = {
        ...nextState.agents.MUSE,
        statusTag: `working ${storyId} Q${quarter}`,
        dotColor: "accent",
        currentStoryId: storyId,
        currentQuarter: quarter || null,
        monitorData: { lastEvent: { ev, sev, title } },
      };

      nextState.activeHandoff = {
        fromAgent: "MUSE",
        toAgent: "CIPHER",
        storyId,
        quarter: quarter || 0,
      };
      break;
    }

    case "CALC": {
      if (!storyId) break;
      const cash0 = Number(args.cash0) || 0;
      const inc = Number(args.inc) || 0;
      const exp = Number(args.exp) || 0;
      const evc = Number(args.evc) || 0;
      const cash1 = Number(args.cash1) || cash0;

      if (nextState.stories[storyId]) {
        const story = nextState.stories[storyId];
        const tiers = computeVisualTiers(story.initialSavings, cash1, story.stats);
        nextState.stories[storyId] = {
          ...story,
          currentSavings: cash1,
          ...tiers,
        };
      }

      nextState.agents.CIPHER = {
        ...nextState.agents.CIPHER,
        statusTag: `working ${storyId} Q${quarter}`,
        dotColor: "accent",
        currentStoryId: storyId,
        currentQuarter: quarter || null,
        monitorData: {
          formula: `${cash0} + (${inc} - ${exp})*3 + ${evc} = ${cash1}`,
          flash: true,
        },
      };

      nextState.activeHandoff = {
        fromAgent: "CIPHER",
        toAgent: "RONIN",
        storyId,
        quarter: quarter || 0,
      };
      break;
    }

    case "THINK": {
      if (!storyId) break;
      const prov = String(args.prov || "groq");

      nextState.agents.RONIN = {
        ...nextState.agents.RONIN,
        statusTag: `drafting ${storyId} Q${quarter}`,
        dotColor: "accent",
        currentStoryId: storyId,
        currentQuarter: quarter || null,
        monitorData: { provider: prov, thinking: true },
      };
      break;
    }

    case "DELTA": {
      if (!storyId) break;
      const joy = Number(args.joy) || 0;
      const hp = Number(args.hp) || 0;
      const rel = Number(args.rel) || 0;
      const car = Number(args.car) || 0;

      if (nextState.stories[storyId]) {
        nextState.stories[storyId] = {
          ...nextState.stories[storyId],
          statDeltas: { joy, hp, rel, car },
        };
      }

      nextState.agents.RONIN = {
        ...nextState.agents.RONIN,
        statusTag: `delta ${storyId} Q${quarter}`,
        dotColor: "accent",
        monitorData: { rawDeltas: { joy, hp, rel, car }, thinking: false },
      };

      nextState.activeHandoff = {
        fromAgent: "RONIN",
        toAgent: "SPARK",
        storyId,
        quarter: quarter || 0,
      };
      break;
    }

    case "CLAMP": {
      if (!storyId) break;
      const joy = Math.min(100, Math.max(0, Number(args.joy) || 0));
      const hp = Math.min(100, Math.max(0, Number(args.hp) || 0));
      const rel = Math.min(100, Math.max(0, Number(args.rel) || 0));
      const car = Math.min(100, Math.max(0, Number(args.car) || 0));
      const hit = (args.hit || "none") as "none" | "joy" | "hp" | "rel" | "car";

      if (nextState.stories[storyId]) {
        const story = nextState.stories[storyId];
        const newStats: LifeStats = { happiness: joy, health: hp, relationships: rel, career: car };
        const tiers = computeVisualTiers(story.initialSavings, story.currentSavings, newStats);

        nextState.stories[storyId] = {
          ...story,
          stats: newStats,
          clampedHit: hit,
          ...tiers,
        };
      }

      nextState.agents.SPARK = {
        ...nextState.agents.SPARK,
        statusTag: `clamped ${storyId} Q${quarter}`,
        dotColor: hit === "none" ? "done" : "accent",
        currentStoryId: storyId,
        currentQuarter: quarter || null,
      };

      nextState.agents.SAGE = {
        ...nextState.agents.SAGE,
        statusTag: `working ${storyId} Q${quarter}`,
        dotColor: "accent",
        currentStoryId: storyId,
        currentQuarter: quarter || null,
        monitorData: { bars: { joy, hp, rel, car } },
      };

      nextState.activeHandoff = {
        fromAgent: "SPARK",
        toAgent: "ECHO",
        storyId,
        quarter: quarter || 0,
      };
      break;
    }

    case "STATUS": {
      if (!storyId) break;
      const st = (args.st || "thriving") as "thriving" | "plateau" | "struggling" | "burnout";
      const burn = Number(args.burn) === 1;

      if (nextState.stories[storyId]) {
        nextState.stories[storyId] = {
          ...nextState.stories[storyId],
          status: st,
          isBurnedOut: burn,
        };
      }

      nextState.agents.ATLAS = {
        ...nextState.agents.ATLAS,
        statusTag: `${storyId} ${st}`,
        dotColor: burn ? "error" : "done",
        currentStoryId: storyId,
      };
      break;
    }

    case "SAY": {
      if (!storyId) break;
      const rawText = String(args.text || "");
      const isCrisis = inspectForCrisis(rawText).isCrisis;
      const text = isCrisis ? "..." : rawText;

      if (nextState.stories[storyId]) {
        nextState.stories[storyId] = {
          ...nextState.stories[storyId],
          lastDiary: text,
        };
      }

      const existingDocLines = (nextState.agents.ECHO.monitorData.docLines as string[]) || [];
      nextState.agents.ECHO = {
        ...nextState.agents.ECHO,
        statusTag: `archived ${storyId} Q${quarter}`,
        dotColor: "done",
        currentStoryId: storyId,
        currentQuarter: quarter || null,
        monitorData: {
          docLines: [...existingDocLines, `Q${quarter}: ${text.slice(0, 40)}...`].slice(-6),
        },
      };
      break;
    }

    case "DONE": {
      if (!storyId) break;
      if (nextState.stories[storyId]) {
        nextState.stories[storyId] = {
          ...nextState.stories[storyId],
          quarter: quarter || nextState.stories[storyId].quarter,
        };
      }

      // Reset active handoff
      if (nextState.activeHandoff?.storyId === storyId) {
        nextState.activeHandoff = null;
      }
      break;
    }

    case "PROGRESS": {
      const done = Number(args.done) || 0;
      const total = Number(args.total) || 80;

      nextState.progress = { done, total };
      nextState.agents.FORGE = {
        ...nextState.agents.FORGE,
        statusTag: `progress ${done}/${total}`,
        dotColor: "accent",
        monitorData: { done, total },
      };
      break;
    }

    case "END": {
      if (!storyId) break;
      const finalCash = Number(args.cash) || nextState.stories[storyId]?.currentSavings || 0;
      const finalSt = (args.st || "thriving") as "thriving" | "plateau" | "struggling" | "burnout";

      if (nextState.stories[storyId]) {
        nextState.stories[storyId] = {
          ...nextState.stories[storyId],
          finished: true,
          currentSavings: finalCash,
          status: finalSt,
        };
      }
      break;
    }

    case "REROUTE": {
      const from = String(args.from || "primary");
      const to = String(args.to || "fallback");

      nextState.agents.NEXUS = {
        ...nextState.agents.NEXUS,
        statusTag: `rerouting to ${to}`,
        dotColor: "accent",
        speechBubble: `Provider ${from} busy, rerouting to ${to}`,
      };
      break;
    }

    case "ERROR": {
      const code = String(args.code || "UNKNOWN");
      if (storyId && nextState.stories[storyId]) {
        nextState.stories[storyId] = {
          ...nextState.stories[storyId],
          status: "struggling",
        };
      }
      nextState.agents.SPARK = {
        ...nextState.agents.SPARK,
        statusTag: `error ${code}`,
        dotColor: "error",
      };
      break;
    }

    case "NARRATE": {
      const phase = (args.phase || "digest") as "digest" | "gemini" | "report" | "done";
      nextState.narratorPhase = phase;

      nextState.agents.FORGE = {
        ...nextState.agents.FORGE,
        statusTag: `narrating: ${phase}`,
        dotColor: "accent",
        monitorData: { phase },
      };
      break;
    }

    case "FINISH": {
      nextState.isFinished = true;
      nextState.agents.NEXUS = {
        ...nextState.agents.NEXUS,
        statusTag: "complete",
        dotColor: "done",
        speechBubble: "All lives complete",
      };
      break;
    }

    default:
      // Unknown verb dropped gracefully
      break;
  }

  return nextState;
}
