/**
 * Procedural 48 x 32 Monitor Screen Textures
 *
 * Implements Section 4.6 of plan_update.md:
 * - 9 procedural monitor textures refreshed at 8 fps (125 ms)
 * - Anti-AI-slop: crisp pixels, flat colors, no blurred glows
 * - Restrained palette: accent color used only on monitor content
 * - Monospace font allowed strictly inside CIPHER and RONIN screens
 *
 * Screen Content per Agent:
 * - CIPHER: typing CALC formula, blinking cursor, flashing cash result
 * - RONIN: scrolling code glyphs during THINK, frozen deltas on DELTA
 * - SAGE: 4 stat bars (joy, health, rel, career) + 8-quarter sparkline
 * - MUSE: event severity swatch chip + 6-10 drifting square pixel dots
 * - ATLAS: 4-node story constellation with pulsing active story
 * - FORGE: progress bar (done/total) + round #; 3-step finale bar on NARRATE
 * - ECHO: tiny markdown doc lines updating on SAY
 * - SPARK: invariant pass/fail checks with drawn checks/crosses
 * - NEXUS: switchboard radar sweep with story dispatch dots
 */

import { AgentId, AgentState, SceneState, StorySceneState } from "@/lib/theater/sceneState";
import { THEATER_DIMENSIONS, THEATER_PALETTE } from "@/lib/theater/tokens";

export const MONITOR_W = THEATER_DIMENSIONS.MONITOR_WIDTH; // 48
export const MONITOR_H = THEATER_DIMENSIONS.MONITOR_HEIGHT; // 32

/**
 * CIPHER: The Coder
 * Terminal typing CALC formula, blinking cursor, flashing cash result on complete.
 */
export function drawCipherScreen(
  ctx: CanvasRenderingContext2D,
  agent: AgentState,
  tick: number
): void {
  // Terminal dark green background
  ctx.fillStyle = "#020f06";
  ctx.fillRect(0, 0, MONITOR_W, MONITOR_H);

  // Top header strip
  ctx.fillStyle = "#052e14";
  ctx.fillRect(0, 0, MONITOR_W, 6);
  ctx.fillStyle = THEATER_PALETTE.agentAccents.CIPHER;
  ctx.font = "5px monospace";
  ctx.fillText("CIPHER:CALC", 2, 5);

  const formula = (agent.monitorData.formula as string) || "$25k+(5-2)x3=$34k";
  const typeIndex = (tick * 2) % (formula.length + 8);
  const typed = formula.slice(0, Math.min(formula.length, typeIndex));

  // Monospace terminal text
  ctx.fillStyle = "#22c55e";
  ctx.font = "5px monospace";
  ctx.fillText(typed.slice(0, 11), 2, 14);
  if (typed.length > 11) {
    ctx.fillText(typed.slice(11, 22), 2, 22);
  }

  // Blinking cursor
  const showCursor = tick % 4 < 2;
  if (showCursor) {
    ctx.fillStyle = "#4ade80";
    const cursorY = typed.length > 11 ? 22 : 14;
    const cursorX = Math.min(42, 2 + (typed.length % 11) * 3.5);
    ctx.fillRect(cursorX, cursorY - 4, 3, 5);
  }

  // Cash flash on formula completion
  if (agent.monitorData.flash && tick % 6 < 3) {
    ctx.fillStyle = "rgba(0, 230, 118, 0.25)";
    ctx.fillRect(0, 0, MONITOR_W, MONITOR_H);
  }
}

/**
 * RONIN: The Builder
 * Looping code rows during THINK, freezes on 4 deltas on DELTA.
 */
export function drawRoninScreen(
  ctx: CanvasRenderingContext2D,
  agent: AgentState,
  tick: number
): void {
  // Dark cyber teal background
  ctx.fillStyle = "#020d12";
  ctx.fillRect(0, 0, MONITOR_W, MONITOR_H);

  // Top header strip
  ctx.fillStyle = "#082f38";
  ctx.fillRect(0, 0, MONITOR_W, 6);
  ctx.fillStyle = THEATER_PALETTE.agentAccents.RONIN;
  ctx.font = "5px monospace";
  ctx.fillText("RONIN:LLM", 2, 5);

  const rawDeltas = agent.monitorData.rawDeltas as
    | { joy: number; hp: number; rel: number; car: number }
    | undefined;

  if (rawDeltas) {
    // Frozen deltas view
    ctx.fillStyle = "#38bdf8";
    ctx.font = "5px monospace";
    ctx.fillText(`J:${rawDeltas.joy > 0 ? "+" : ""}${rawDeltas.joy} H:${rawDeltas.hp > 0 ? "+" : ""}${rawDeltas.hp}`, 2, 14);
    ctx.fillText(`R:${rawDeltas.rel > 0 ? "+" : ""}${rawDeltas.rel} C:${rawDeltas.car > 0 ? "+" : ""}${rawDeltas.car}`, 2, 22);
  } else {
    // Scrolling code rows
    const rows = [
      "const s = await step();",
      "eval(life.stage);",
      "clamp(stats, 0, 100);",
      "dispatch.next(q);",
      "return diary.log();",
    ];

    ctx.font = "5px monospace";
    const scroll = (tick * 1.5) % 18;

    for (let i = 0; i < rows.length; i++) {
      const y = 14 + i * 7 - scroll;
      if (y >= 6 && y <= MONITOR_H) {
        ctx.fillStyle = i % 2 === 0 ? "#0deef3" : "#0284c7";
        ctx.fillText(rows[i], 2, y);
      }
    }
  }

  // Tiny helmet logo in top right corner
  ctx.fillStyle = THEATER_PALETTE.agentAccents.RONIN;
  ctx.fillRect(40, 1, 6, 4);
}

/**
 * SAGE: The Analyst
 * 4 stat bars (joy, health, rel, career) + 8-quarter sparkline.
 */
export function drawSageScreen(
  ctx: CanvasRenderingContext2D,
  agent: AgentState,
  tick: number,
  story?: StorySceneState
): void {
  // Dark amber background
  ctx.fillStyle = "#140a02";
  ctx.fillRect(0, 0, MONITOR_W, MONITOR_H);

  // Top header strip
  ctx.fillStyle = "#3b1e04";
  ctx.fillRect(0, 0, MONITOR_W, 6);
  ctx.fillStyle = agent.accent || THEATER_PALETTE.agentAccents.SAGE;
  ctx.font = "5px sans-serif";
  ctx.fillText("SAGE:STATS", 2, 5);

  // Activity LED
  ctx.fillStyle = tick % 4 < 2 ? agent.accent : "#b45309";
  ctx.fillRect(42, 2, 3, 2);

  const stats = story?.stats || {
    happiness: 65,
    health: 70,
    relationships: 60,
    career: 75,
  };

  const statEntries = [
    { label: "J", val: stats.happiness, color: THEATER_PALETTE.statColors.happiness },
    { label: "H", val: stats.health, color: THEATER_PALETTE.statColors.health },
    { label: "R", val: stats.relationships, color: THEATER_PALETTE.statColors.relationships },
    { label: "C", val: stats.career, color: THEATER_PALETTE.statColors.career },
  ];

  // Draw 4 mini bars
  for (let i = 0; i < 4; i++) {
    const entry = statEntries[i];
    const y = 9 + i * 5;

    ctx.fillStyle = "#94a3b8";
    ctx.font = "4px sans-serif";
    ctx.fillText(entry.label, 2, y + 3);

    // Bar background
    ctx.fillStyle = "#334155";
    ctx.fillRect(8, y, 24, 3);

    // Bar fill
    const fillW = Math.max(1, Math.floor(24 * (entry.val / 100)));
    ctx.fillStyle = entry.color;
    ctx.fillRect(8, y, fillW, 3);

    // Numeric value
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(`${entry.val}`, 34, y + 3);
  }

  // Mini bottom trend line
  ctx.strokeStyle = "#f5a623";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(2, 30);
  ctx.lineTo(12, 28);
  ctx.lineTo(24, 29);
  ctx.lineTo(36, 26);
  ctx.lineTo(46, 27);
  ctx.stroke();
}

/**
 * MUSE: The Creative
 * Event severity swatch chip + 6-10 drifting square pixel dots.
 */
export function drawMuseScreen(
  ctx: CanvasRenderingContext2D,
  agent: AgentState,
  tick: number
): void {
  // Dark magenta background
  ctx.fillStyle = "#120214";
  ctx.fillRect(0, 0, MONITOR_W, MONITOR_H);

  // Top header strip
  ctx.fillStyle = "#3b0742";
  ctx.fillRect(0, 0, MONITOR_W, 6);
  ctx.fillStyle = THEATER_PALETTE.agentAccents.MUSE;
  ctx.font = "5px sans-serif";
  ctx.fillText("MUSE:FLAVOR", 2, 5);

  const lastEv = agent.monitorData.lastEvent as
    | { ev: string; sev: "pos" | "neg" | "neu"; title: string }
    | undefined;

  const sev = lastEv?.sev || "neu";
  const sevColor =
    sev === "pos" ? "#10b981" : sev === "neg" ? "#ef4444" : "#f59e0b";

  // Event swatch chip
  ctx.fillStyle = sevColor;
  ctx.fillRect(3, 8, 8, 8);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(3, 8, 8, 8);

  // Short event label
  ctx.fillStyle = "#fdf4ff";
  ctx.font = "5px sans-serif";
  const label = lastEv?.title ? lastEv.title.slice(0, 8) : "EVENT ROLL";
  ctx.fillText(label, 14, 14);

  // 6 to 10 drifting square pixel dots (hard-edged fillRect, strictly no blur)
  const dotSeeds = [
    { x: 10, offset: 0 },
    { x: 18, offset: 5 },
    { x: 26, offset: 12 },
    { x: 34, offset: 8 },
    { x: 42, offset: 15 },
    { x: 14, offset: 18 },
    { x: 22, offset: 22 },
    { x: 38, offset: 2 },
  ];

  for (let i = 0; i < dotSeeds.length; i++) {
    const seed = dotSeeds[i];
    const dotY = MONITOR_H - ((tick * 1.5 + seed.offset) % (MONITOR_H - 12));
    ctx.fillStyle = i % 2 === 0 ? THEATER_PALETTE.agentAccents.MUSE : "#f472b6";
    ctx.fillRect(seed.x, dotY, 2, 2);
  }
}

/**
 * ATLAS: The Strategist
 * 4-node story constellation with pulsing active story.
 */
export function drawAtlasScreen(
  ctx: CanvasRenderingContext2D,
  agent: AgentState,
  tick: number,
  state?: SceneState
): void {
  // Dark blue background
  ctx.fillStyle = "#030814";
  ctx.fillRect(0, 0, MONITOR_W, MONITOR_H);

  // Top header strip
  ctx.fillStyle = "#0a1e3f";
  ctx.fillRect(0, 0, MONITOR_W, 6);
  ctx.fillStyle = agent.accent || THEATER_PALETTE.agentAccents.ATLAS;
  ctx.font = "5px sans-serif";
  ctx.fillText("ATLAS:MAP", 2, 5);

  // 4 Node Coordinates
  const nodes = [
    { id: "S1", x: 12, y: 13 },
    { id: "S2", x: 36, y: 13 },
    { id: "S3", x: 12, y: 24 },
    { id: "S4", x: 36, y: 24 },
  ];

  // Connecting constellation lines
  ctx.strokeStyle = "#1e3a8a";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(nodes[0].x, nodes[0].y);
  ctx.lineTo(nodes[1].x, nodes[1].y);
  ctx.lineTo(nodes[3].x, nodes[3].y);
  ctx.lineTo(nodes[2].x, nodes[2].y);
  ctx.closePath();
  ctx.stroke();

  // Draw 4 nodes
  for (const node of nodes) {
    const story = state?.stories[node.id];
    const status = story?.status || "thriving";
    const statusColor = THEATER_PALETTE.statusColors[status];

    // Pulsing radius for active story
    const isPulsing = (tick + node.x) % 6 < 3;
    const r = isPulsing ? 3.5 : 2.5;

    ctx.fillStyle = statusColor;
    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
    ctx.fill();

    // Node label
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "4px sans-serif";
    ctx.fillText(node.id, node.x - 2, node.y + 1);
  }
}

/**
 * FORGE: The Deployer
 * Queue progress (done/total) + round #; 3-step finale bar on NARRATE.
 */
export function drawForgeScreen(
  ctx: CanvasRenderingContext2D,
  agent: AgentState,
  tick: number,
  state?: SceneState
): void {
  // Dark orange background
  ctx.fillStyle = "#140802";
  ctx.fillRect(0, 0, MONITOR_W, MONITOR_H);

  // Top header strip
  ctx.fillStyle = "#3b1a04";
  ctx.fillRect(0, 0, MONITOR_W, 6);
  ctx.fillStyle = agent.accent || THEATER_PALETTE.agentAccents.FORGE;
  ctx.font = "5px sans-serif";
  ctx.fillText("FORGE:DEPLOY", 2, 5);

  // Activity tick LED
  ctx.fillStyle = tick % 4 < 2 ? agent.accent : "#78350f";
  ctx.fillRect(42, 2, 3, 2);

  const done = state?.progress.done || 0;
  const total = state?.progress.total || 80;
  const roundNum = Math.min(20, Math.floor(done / 4) + 1);

  if (state?.narratorPhase) {
    // 3-step finale progress bar: [digest | narrator | report]
    ctx.fillStyle = "#ea580c";
    ctx.font = "4px sans-serif";
    ctx.fillText(`PHASE: ${state.narratorPhase.toUpperCase()}`, 2, 13);

    const phases = ["digest", "gemini", "report"];
    const curIndex = phases.indexOf(state.narratorPhase);

    for (let p = 0; p < 3; p++) {
      const px = 2 + p * 15;
      const isComplete = p <= curIndex;
      ctx.fillStyle = isComplete ? THEATER_PALETTE.agentAccents.FORGE : "#334155";
      ctx.fillRect(px, 17, 13, 8);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px, 17, 13, 8);
    }
  } else {
    // Standard simulation progress
    ctx.fillStyle = "#fed7aa";
    ctx.font = "4px sans-serif";
    ctx.fillText(`BUILD #${roundNum} (Q${roundNum})`, 2, 13);
    ctx.fillText(`${done}/${total} STEPS`, 2, 20);

    // Progress bar
    ctx.fillStyle = "#334155";
    ctx.fillRect(2, 23, 44, 5);

    const progressRatio = total > 0 ? done / total : 0;
    const fillW = Math.max(1, Math.floor(44 * Math.min(1.0, progressRatio)));
    ctx.fillStyle = THEATER_PALETTE.agentAccents.FORGE;
    ctx.fillRect(2, 23, fillW, 5);
  }
}

/**
 * ECHO: The Researcher
 * Markdown document rows appending diary memory archives.
 */
export function drawEchoScreen(
  ctx: CanvasRenderingContext2D,
  agent: AgentState,
  tick: number
): void {
  // Dark purple background
  ctx.fillStyle = "#0c0414";
  ctx.fillRect(0, 0, MONITOR_W, MONITOR_H);

  // Top header strip
  ctx.fillStyle = "#2d0e4e";
  ctx.fillRect(0, 0, MONITOR_W, 6);
  ctx.fillStyle = agent.accent || THEATER_PALETTE.agentAccents.ECHO;
  ctx.font = "5px sans-serif";
  ctx.fillText("ECHO:MEMORY", 2, 5);

  // Cursor indicator
  if (tick % 4 < 2) {
    ctx.fillStyle = agent.accent;
    ctx.fillRect(42, 2, 3, 2);
  }

  const docLines = (agent.monitorData.docLines as string[]) || [
    "# Cast Ready",
    "- partner steady",
    "- manager active",
  ];

  ctx.fillStyle = "#c084fc";
  ctx.font = "4px sans-serif";

  for (let i = 0; i < Math.min(4, docLines.length); i++) {
    const line = docLines[docLines.length - 1 - i];
    const y = 13 + i * 5;
    ctx.fillText(line.slice(0, 15), 2, y);
  }
}

/**
 * SPARK: The Tester
 * Invariant test runner (clamp_range, burnout_rule, crisis_scan) with drawn checks/crosses.
 */
export function drawSparkScreen(
  ctx: CanvasRenderingContext2D,
  agent: AgentState,
  tick: number
): void {
  // Dark red background
  ctx.fillStyle = "#140303";
  ctx.fillRect(0, 0, MONITOR_W, MONITOR_H);

  // Top header strip
  ctx.fillStyle = "#3d0a0a";
  ctx.fillRect(0, 0, MONITOR_W, 6);
  ctx.fillStyle = agent.accent || THEATER_PALETTE.agentAccents.SPARK;
  ctx.font = "5px sans-serif";
  ctx.fillText("SPARK:INVAR", 2, 5);

  // Alert flash on error
  if (agent.dotColor === "error" && tick % 4 < 2) {
    ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
    ctx.fillRect(0, 0, MONITOR_W, MONITOR_H);
  }

  const tests = [
    { name: "clamp_rng", pass: true },
    { name: "burnout", pass: true },
    { name: "crisis_scan", pass: true },
  ];

  ctx.font = "4px sans-serif";

  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    const y = 13 + i * 6;

    ctx.fillStyle = "#fca5a5";
    ctx.fillText(t.name, 2, y);

    // Draw checkmark ✓
    const checkX = 38;
    const checkY = y - 1;
    ctx.strokeStyle = t.pass ? "#10b981" : "#ef4444";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(checkX, checkY + 1);
    ctx.lineTo(checkX + 2, checkY + 3);
    ctx.lineTo(checkX + 6, checkY - 2);
    ctx.stroke();
  }
}

/**
 * NEXUS: The Coordinator
 * Reception switchboard radar sweep with story dispatch dots.
 */
export function drawNexusScreen(
  ctx: CanvasRenderingContext2D,
  agent: AgentState,
  tick: number
): void {
  // Dark silver slate background
  ctx.fillStyle = "#090d16";
  ctx.fillRect(0, 0, MONITOR_W, MONITOR_H);

  // Top header strip
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, 0, MONITOR_W, 6);
  ctx.fillStyle = agent.accent || THEATER_PALETTE.agentAccents.NEXUS;
  ctx.font = "5px sans-serif";
  ctx.fillText("NEXUS:DISPATCH", 2, 5);

  // Switchboard radar center
  const cx = MONITOR_W / 2;
  const cy = 19;

  // Concentric radar arcs
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.arc(cx, cy, 11, 0, Math.PI * 2);
  ctx.stroke();

  // Rotating sweep line
  const angle = (tick * 0.25) % (Math.PI * 2);
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * 11, cy + Math.sin(angle) * 11);
  ctx.stroke();

  // Story dispatch status dots
  const storyColors = ["#10b981", "#f59e0b", "#3b82f6", "#06b6d4"];
  for (let s = 0; s < 4; s++) {
    const dotAngle = (s * Math.PI) / 2 + 0.3;
    const dx = cx + Math.cos(dotAngle) * 8;
    const dy = cy + Math.sin(dotAngle) * 8;

    ctx.fillStyle = storyColors[s];
    ctx.fillRect(dx - 1, dy - 1, 2, 2);
  }
}

/**
 * Unified Monitor Manager & 8 FPS Texture Cache
 */
export class MonitorManager {
  private canvases: Record<AgentId, HTMLCanvasElement | null> = {
    RONIN: null,
    SAGE: null,
    CIPHER: null,
    MUSE: null,
    ATLAS: null,
    FORGE: null,
    ECHO: null,
    SPARK: null,
    NEXUS: null,
  };

  private contexts: Record<AgentId, CanvasRenderingContext2D | null> = {
    RONIN: null,
    SAGE: null,
    CIPHER: null,
    MUSE: null,
    ATLAS: null,
    FORGE: null,
    ECHO: null,
    SPARK: null,
    NEXUS: null,
  };

  private frameAccumulator = 0;
  private currentTick = 0;

  constructor() {
    this.initCanvases();
  }

  private initCanvases(): void {
    if (typeof document === "undefined" || !document.createElement) return;

    const agentIds: AgentId[] = [
      "RONIN",
      "SAGE",
      "CIPHER",
      "MUSE",
      "ATLAS",
      "FORGE",
      "ECHO",
      "SPARK",
      "NEXUS",
    ];

    for (const id of agentIds) {
      const c = document.createElement("canvas");
      c.width = MONITOR_W;
      c.height = MONITOR_H;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        this.canvases[id] = c;
        this.contexts[id] = ctx;
      }
    }
  }

  /**
   * Advances tick and updates all 9 monitor textures at 8 fps (every 125 ms).
   */
  public update(dtMs: number, state?: SceneState, focusedStoryId?: string | null): void {
    this.frameAccumulator += dtMs;

    // 8 fps = 125 ms per tick
    if (this.frameAccumulator < 125) return;

    const ticksToAdvance = Math.floor(this.frameAccumulator / 125);
    this.frameAccumulator -= ticksToAdvance * 125;
    this.currentTick += ticksToAdvance;

    const focusedStory = focusedStoryId && state?.stories[focusedStoryId]
      ? state.stories[focusedStoryId]
      : state?.stories.S1;

    for (const id of Object.keys(this.canvases) as AgentId[]) {
      const ctx = this.contexts[id];
      if (!ctx) continue;

      const agent = state?.agents[id] || {
        id,
        name: id,
        role: "",
        accent: THEATER_PALETTE.agentAccents[id],
        statusTag: "idle",
        dotColor: "grey",
        currentStoryId: null,
        currentQuarter: null,
        monitorData: {},
        speechBubble: null,
      };

      this.renderAgentTexture(ctx, id, agent, this.currentTick, state, focusedStory);
    }
  }

  /**
   * Returns the offscreen canvas for a given agent.
   */
  public getMonitorCanvas(agentId: AgentId): HTMLCanvasElement | null {
    return this.canvases[agentId];
  }

  /**
   * Renders monitor texture directly to a target context.
   */
  public renderAgentTexture(
    ctx: CanvasRenderingContext2D,
    agentId: AgentId,
    agent: AgentState,
    tick: number,
    state?: SceneState,
    focusedStory?: StorySceneState
  ): void {
    switch (agentId) {
      case "CIPHER":
        drawCipherScreen(ctx, agent, tick);
        break;
      case "RONIN":
        drawRoninScreen(ctx, agent, tick);
        break;
      case "SAGE":
        drawSageScreen(ctx, agent, tick, focusedStory);
        break;
      case "MUSE":
        drawMuseScreen(ctx, agent, tick);
        break;
      case "ATLAS":
        drawAtlasScreen(ctx, agent, tick, state);
        break;
      case "FORGE":
        drawForgeScreen(ctx, agent, tick, state);
        break;
      case "ECHO":
        drawEchoScreen(ctx, agent, tick);
        break;
      case "SPARK":
        drawSparkScreen(ctx, agent, tick);
        break;
      case "NEXUS":
        drawNexusScreen(ctx, agent, tick);
        break;
    }
  }
}
