/**
 * Multiverse Theater Renderer
 *
 * Imperative, framework-free 2D Canvas rendering engine for The Multiverse Complex.
 * Consumes pure `SceneState` from `sceneState.ts` reducer.
 *
 * Implements Sections 4, 8.1, 8.3, and 8.5 of plan_update.md:
 * - 2:1 Isometric projection & Painter's algorithm depth sorting
 * - Dual-floor architecture (Floor 1 Life Wing + Floor 2 Agent Office)
 * - Offscreen pre-rendered static architectural layer
 * - Procedural chibi characters & agents with animation cycles
 * - Desk monitors, TinyFloor status tags, handoff packets
 * - Room status frames (2px border + 6% floor tint)
 * - 400ms camera easing to 2x zoom on room focus and overview
 * - Safe font loading check ("600 14px Poppins")
 */

import {
  Camera,
  compareDepth,
  createDefaultCamera,
  DepthSortable,
  gridToScreen,
  Point2D,
  screenToGrid,
  updateCamera,
  viewportToWorld,
} from "@/lib/theater/iso";
import {
  AGENT_OFFICE,
  LIFE_WING_ROOMS,
  resolveWindowView,
} from "@/lib/theater/layout";
import {
  createWalker,
  setWalkerDestination,
  updateWalker,
  WalkerState,
} from "@/lib/theater/pathfinding";
import {
  AgentId,
  SceneState,
  StorySceneState,
} from "@/lib/theater/sceneState";
import { MonitorManager } from "@/lib/theater/sprites/screens";
import {
  AnimationName,
  createAgentLookSpec,
  createCastLookSpec,
  createYouLookSpec,
  drawCharacterFrame,
} from "@/lib/theater/sprites/characterGenerator";
import {
  drawBookshelf,
  drawBulletinBoard,
  drawCardboardBox,
  drawChair,
  drawDesk,
  drawFloatingTextPop,
  drawKitchenCounter,
  drawPlant,
  drawReceptionDesk,
  drawServerRack,
  drawSofa,
  drawWallCalendar,
  drawWallPhotoFrame,
  drawWaterCooler,
  drawWindowWithSkyline,
} from "@/lib/theater/sprites/props";
import {
  AGENT_ROSTER_INFO,
  THEATER_DIMENSIONS,
  THEATER_PALETTE,
} from "@/lib/theater/tokens";

interface RenderEntity extends DepthSortable {
  draw: (ctx: CanvasRenderingContext2D) => void;
}

export interface TextPop {
  id: string;
  storyId: string;
  text: string;
  color: string;
  pixelX: number;
  pixelY: number;
  progress: number; // 0.0 to 1.0
  durationMs: number;
}

export class TheaterRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  // Offscreen static canvas for floors and walls
  private staticCanvas: HTMLCanvasElement | null = null;
  private staticCtx: CanvasRenderingContext2D | null = null;
  private isStaticReady = false;

  // Viewport dimensions
  private viewportWidth: number = THEATER_DIMENSIONS.CANVAS_WIDTH;
  private viewportHeight: number = THEATER_DIMENSIONS.CANVAS_HEIGHT;
  private dpr = 1;

  // Camera state
  private camera: Camera = createDefaultCamera();
  public focusedStoryId: string | null = null;

  // Animation and tick tracking
  private animationFrameId: number | null = null;
  private lastTimestamp = 0;
  private frameCount = 0;
  private animTimer = 0;
  private currentAnimFrame = 0;

  // Fonts ready flag
  private fontsLoaded = false;

  // 8 FPS Monitor Screen Manager for 9 agents
  private monitorManager = new MonitorManager();

  // Internal character walkers
  private youWalkers: Record<string, WalkerState> = {};
  private nexusWalker: WalkerState | null = null;
  private lastForkedStoriesCount = 0;
  private nexusWalkPhase: "idle" | "to_stairs" | "to_reception" | "to_corridor" = "idle";

  // Life Wing Cast Walkers & Room State Trackers
  private castWalkers: Record<
    string,
    (WalkerState & { role: string; phase: "entering" | "interacting" | "exiting" | "gone" }) | null
  > = {};
  private textPops: TextPop[] = [];
  private lastSavings: Record<string, number> = {};
  private lastClampedHits: Record<string, string> = {};

  // Handoff packet animation state
  private handoffProgress = 0;
  private currentHandoffKey: string | null = null;

  // Callbacks
  public onRoomClick?: (storyId: string | null) => void;
  public onAgentClick?: (agentId: AgentId) => void;

  // Bound event listeners
  private handleCanvasClickBound: (e: MouseEvent) => void;
  private handleKeyDownBound: (e: KeyboardEvent) => void;

  constructor() {
    this.handleCanvasClickBound = this.handleCanvasClick.bind(this);
    this.handleKeyDownBound = this.handleKeyDown.bind(this);

    // Initialize walkers at default room desks
    for (const [storyId, room] of Object.entries(LIFE_WING_ROOMS)) {
      this.youWalkers[storyId] = createWalker(room.anchors.desk);
    }
    this.nexusWalker = createWalker(AGENT_OFFICE.anchors.reception);

    // Check font readiness
    if (typeof document !== "undefined" && document.fonts?.load) {
      document.fonts
        .load("600 14px Poppins")
        .then(() => {
          this.fontsLoaded = true;
        })
        .catch(() => {
          this.fontsLoaded = true;
        });
    } else {
      this.fontsLoaded = true;
    }
  }

  /**
   * Attaches renderer to target HTML5 canvas.
   */
  public attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });

    const rect = canvas.getBoundingClientRect();
    const width = rect.width > 0 ? rect.width : THEATER_DIMENSIONS.CANVAS_WIDTH;
    const height = rect.height > 0 ? rect.height : THEATER_DIMENSIONS.CANVAS_HEIGHT;

    this.resize(width, height);

    canvas.addEventListener("click", this.handleCanvasClickBound);
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", this.handleKeyDownBound);
    }

    this.buildStaticLayer();
  }

  /**
   * Resizes viewport and sets up crisp high-DPI canvas backing store.
   */
  public resize(width: number, height: number): void {
    if (!this.canvas) return;

    this.viewportWidth = width;
    this.viewportHeight = height;

    const rawDpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    this.dpr = Math.min(2, Math.max(1, rawDpr));

    this.canvas.width = Math.floor(width * this.dpr);
    this.canvas.height = Math.floor(height * this.dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false;
    }

    this.isStaticReady = false;
    this.buildStaticLayer();
  }

  /**
   * Focuses camera onto a specific story room or resets to building overview.
   */
  public focusStory(storyId: string | null): void {
    this.focusedStoryId = storyId;

    if (!storyId || !LIFE_WING_ROOMS[storyId]) {
      // Overview: centered at world (0, 80) with 1x zoom
      this.camera.targetX = 0;
      this.camera.targetY = 80;
      this.camera.targetZoom = 1.0;
    } else {
      // Room center: col 4, row 4 relative to room origin
      const room = LIFE_WING_ROOMS[storyId];
      const centerCol = room.originCol + 4;
      const centerRow = room.originRow + 4;
      const screenPt = gridToScreen(centerCol, centerRow, 0);

      this.camera.targetX = screenPt.x;
      this.camera.targetY = screenPt.y;
      this.camera.targetZoom = 2.0;
    }

    this.onRoomClick?.(storyId);
  }

  /**
   * Main simulation and animation state step.
   * dt is elapsed time in milliseconds.
   */
  public update(dt: number, state?: SceneState): void {
    // 1. Smooth camera easing
    updateCamera(this.camera, dt, 8);

    // 2. Global animation frame timer (~4 fps for idle character bobs)
    this.animTimer += dt;
    if (this.animTimer >= 250) {
      this.animTimer = 0;
      this.currentAnimFrame = (this.currentAnimFrame + 1) % 4;
    }
    this.frameCount++;

    // 3. Update 8 FPS Monitor Textures for all 9 agents
    this.monitorManager.update(dt, state, this.focusedStoryId);

    // 4. Update walkers & NEXUS special path sequences
    for (const walker of Object.values(this.youWalkers)) {
      updateWalker(walker, dt);
    }

    if (this.nexusWalker) {
      updateWalker(this.nexusWalker, dt);

      // Trigger NEXUS walk on FORK
      const storiesCount = state ? Object.keys(state.stories).length : 0;
      if (storiesCount > this.lastForkedStoriesCount && this.nexusWalkPhase === "idle") {
        this.lastForkedStoriesCount = storiesCount;
        this.nexusWalkPhase = "to_stairs";
        setWalkerDestination(this.nexusWalker, AGENT_OFFICE.anchors.stairs_top);
      } else if (this.nexusWalkPhase === "to_stairs" && !this.nexusWalker.isMoving) {
        this.nexusWalkPhase = "to_reception";
        setWalkerDestination(this.nexusWalker, AGENT_OFFICE.anchors.reception);
      } else if (this.nexusWalkPhase === "to_reception" && !this.nexusWalker.isMoving) {
        this.nexusWalkPhase = "idle";
      }

      // Trigger NEXUS walk to Life Wing corridor on FINISH
      if (state?.isFinished && this.nexusWalkPhase !== "to_corridor") {
        this.nexusWalkPhase = "to_corridor";
        setWalkerDestination(this.nexusWalker, { col: 8, row: 4, level: 0 });
      }
    }

    // 5. Update handoff packet
    if (state?.activeHandoff) {
      const key = `${state.activeHandoff.fromAgent}->${state.activeHandoff.toAgent}:${state.activeHandoff.quarter}`;
      if (this.currentHandoffKey !== key) {
        this.currentHandoffKey = key;
        this.handoffProgress = 0;
      } else {
        this.handoffProgress = Math.min(1.0, this.handoffProgress + dt / 400);
      }
    } else {
      this.currentHandoffKey = null;
      this.handoffProgress = 0;
    }

    // 6. Life Wing State Reactions: Cash Delta & Stat Clamping Text Pops
    if (state?.stories) {
      for (const [storyId, story] of Object.entries(state.stories)) {
        const prevSavings = this.lastSavings[storyId];
        if (prevSavings !== undefined && story.currentSavings !== prevSavings) {
          const diff = Math.round(story.currentSavings - prevSavings);
          if (Math.abs(diff) > 0) {
            const text = diff > 0 ? `+$${diff.toLocaleString()}` : `-$${Math.abs(diff).toLocaleString()}`;
            const color = diff > 0 ? "#10b981" : "#f43f5e";
            const walker = this.youWalkers[storyId];
            const px = walker ? walker.currentPixel.x : 0;
            const py = walker ? walker.currentPixel.y - 30 : 0;

            this.textPops.push({
              id: `pop_${Date.now()}_${Math.random()}`,
              storyId,
              text,
              color,
              pixelX: px,
              pixelY: py,
              progress: 0,
              durationMs: 1200,
            });
          }
        }
        this.lastSavings[storyId] = story.currentSavings;

        // Stat clamp hit detection (BURNOUT or MAX STAT)
        const prevHit = this.lastClampedHits[storyId];
        if (story.clampedHit && story.clampedHit !== "none" && story.clampedHit !== prevHit) {
          const hitLabel = story.clampedHit === "hp" ? "BURNOUT HIT!" : `MAX ${story.clampedHit.toUpperCase()}!`;
          const color = story.clampedHit === "hp" ? "#f43f5e" : "#f59e0b";
          const walker = this.youWalkers[storyId];
          const px = walker ? walker.currentPixel.x : 0;
          const py = walker ? walker.currentPixel.y - 48 : 0;

          this.textPops.push({
            id: `hit_${Date.now()}_${Math.random()}`,
            storyId,
            text: hitLabel,
            color,
            pixelX: px,
            pixelY: py,
            progress: 0,
            durationMs: 1400,
          });
        }
        this.lastClampedHits[storyId] = story.clampedHit || "none";
      }
    }

    // Advance floating text pops
    for (const pop of this.textPops) {
      pop.progress += dt / pop.durationMs;
    }
    this.textPops = this.textPops.filter((p) => p.progress < 1.0);

    // 7. Cast NPCs Lifecycle & Pathing
    if (state?.cast) {
      const activeRoles = Object.keys(state.cast);
      for (const [storyId, room] of Object.entries(LIFE_WING_ROOMS)) {
        let castWalker = this.castWalkers[storyId];

        if (!castWalker && activeRoles.length > 0) {
          const role = activeRoles[0];
          const newWalker = createWalker(room.anchors.door);
          castWalker = {
            ...newWalker,
            role,
            phase: "entering",
          };
          setWalkerDestination(castWalker, room.anchors.visitor_1);
          this.castWalkers[storyId] = castWalker;
        }

        if (castWalker) {
          updateWalker(castWalker, dt);

          if (castWalker.phase === "entering" && !castWalker.isMoving) {
            castWalker.phase = "interacting";
          } else if (castWalker.phase === "interacting") {
            const story = state?.stories[storyId];
            if (story?.finished) {
              castWalker.phase = "exiting";
              setWalkerDestination(castWalker, room.anchors.door);
            }
          } else if (castWalker.phase === "exiting" && !castWalker.isMoving) {
            castWalker.phase = "gone";
            this.castWalkers[storyId] = null;
          }
        }
      }
    }
  }

  /**
   * Draws the complete scene to the canvas context.
   */
  public draw(state?: SceneState): void {
    const ctx = this.ctx;
    if (!ctx || !this.canvas) return;

    // Save canvas state and apply devicePixelRatio scaling
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // Clear background with crisp dark theater tone
    ctx.fillStyle = "#0b0f19";
    ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);

    // Apply Camera Transform
    ctx.save();
    ctx.translate(this.viewportWidth / 2, this.viewportHeight / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    // 1. Draw static floors, corridors, and architectural walls
    this.drawStaticFloorsAndWalls(ctx);

    // 2. Draw room status floor tints and 2px borders
    this.drawRoomStatusFrames(ctx, state);

    // 3. Collect and sort depth-sorted dynamic entities
    const entities: RenderEntity[] = [];
    this.collectOfficeEntities(entities, state);
    this.collectLifeWingEntities(entities, state);

    // Painter's algorithm sort
    entities.sort(compareDepth);

    // Draw entities in sorted order
    for (const entity of entities) {
      entity.draw(ctx);
    }

    // 4. Draw active handoff packet between desks
    if (state?.activeHandoff && this.handoffProgress < 1.0) {
      this.drawHandoffPacket(ctx, state);
    }

    // 5. Draw room information banners
    this.drawRoomBanners(ctx, state);

    // 6. Draw active floating text pops (cash deltas and stat hits)
    for (const pop of this.textPops) {
      drawFloatingTextPop(ctx, pop.pixelX, pop.pixelY, pop.text, pop.color, pop.progress);
    }

    ctx.restore(); // Restore Camera Transform

    // 7. Draw overlay / HUD elements (if any)
    this.drawHUD(ctx);

    ctx.restore(); // Restore DPR scaling
  }

  /**
   * Pre-renders or draws the static dual-floor building architecture.
   */
  private buildStaticLayer(): void {
    // If running in browser with canvas support, initialize offscreen canvas
    if (typeof document !== "undefined" && document.createElement) {
      this.staticCanvas = document.createElement("canvas");
      this.staticCanvas.width = 1600;
      this.staticCanvas.height = 1200;
      this.staticCtx = this.staticCanvas.getContext("2d");
      if (this.staticCtx) {
        this.staticCtx.imageSmoothingEnabled = false;
        // Pre-render static floors and walls onto the offscreen canvas
        this.staticCtx.save();
        this.staticCtx.translate(800, 450); // Center origin
        this.renderFloorsAndWalls(this.staticCtx);
        this.staticCtx.restore();
        this.isStaticReady = true;
      }
    }
  }

  private drawStaticFloorsAndWalls(ctx: CanvasRenderingContext2D): void {
    if (this.isStaticReady && this.staticCanvas) {
      ctx.drawImage(this.staticCanvas, -800, -450);
    } else {
      this.renderFloorsAndWalls(ctx);
    }
  }

  /**
   * Renders static tiles and building structure.
   */
  private renderFloorsAndWalls(ctx: CanvasRenderingContext2D): void {
    // FLOOR 1: LIFE WING (17 x 17 tiles, level 0)
    for (let col = 0; col < 17; col++) {
      for (let row = 0; row < 17; row++) {
        const isCorridor = col === 8 || row === 8;
        const tileColor = isCorridor
          ? "#53737c"
          : (col + row) % 2 === 0
          ? THEATER_PALETTE.floorA
          : THEATER_PALETTE.floorB;

        this.drawIsometricTile(ctx, col, row, 0, tileColor);
      }
    }

    // Glass dividing walls along corridor
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(180, 210, 230, 0.4)";
    const c8Top = gridToScreen(8, 0, 0);
    const c8Bottom = gridToScreen(8, 17, 0);
    ctx.beginPath();
    ctx.moveTo(c8Top.x, c8Top.y);
    ctx.lineTo(c8Bottom.x, c8Bottom.y);
    ctx.stroke();

    const r8Left = gridToScreen(0, 8, 0);
    const r8Right = gridToScreen(17, 8, 0);
    ctx.beginPath();
    ctx.moveTo(r8Left.x, r8Left.y);
    ctx.lineTo(r8Right.x, r8Right.y);
    ctx.stroke();

    // FLOOR 2: AGENT OFFICE (16 x 10 tiles, level 1)
    for (let col = 0; col < 16; col++) {
      for (let row = 0; row < 10; row++) {
        const tileColor =
          (col + row) % 2 === 0 ? THEATER_PALETTE.floorA : THEATER_PALETTE.floorB;
        this.drawIsometricTile(ctx, col, row, 1, tileColor);
      }
    }

    // Agent Office Back Walls (NW along row 0, NE along col 0)
    this.drawWall(ctx, 0, 0, 16, 0, 1, 48, THEATER_PALETTE.wall);
    this.drawWall(ctx, 0, 0, 0, 10, 1, 48, THEATER_PALETTE.wallShade);

    // Office back wall windows (cloud pane)
    for (let w = 2; w < 14; w += 3) {
      const pt1 = gridToScreen(w, 0, 1);
      const pt2 = gridToScreen(w + 2, 0, 1);
      ctx.fillStyle = THEATER_PALETTE.windowGlass;
      ctx.beginPath();
      ctx.moveTo(pt1.x, pt1.y - 14);
      ctx.lineTo(pt2.x, pt2.y - 14);
      ctx.lineTo(pt2.x, pt2.y - 38);
      ctx.lineTo(pt1.x, pt1.y - 38);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = THEATER_PALETTE.trim;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Cloud silhouette
      ctx.fillStyle = THEATER_PALETTE.windowClouds;
      ctx.fillRect((pt1.x + pt2.x) / 2 - 8, (pt1.y + pt2.y) / 2 - 28, 16, 5);
    }
  }

  private drawIsometricTile(
    ctx: CanvasRenderingContext2D,
    col: number,
    row: number,
    level: number,
    fillColor: string
  ): void {
    const pt = gridToScreen(col, row, level);

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = "#405b63";
    ctx.lineWidth = 0.5;

    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(pt.x + 32, pt.y + 16);
    ctx.lineTo(pt.x, pt.y + 32);
    ctx.lineTo(pt.x - 32, pt.y + 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawWall(
    ctx: CanvasRenderingContext2D,
    col1: number,
    row1: number,
    col2: number,
    row2: number,
    level: number,
    height: number,
    color: string
  ): void {
    const pt1 = gridToScreen(col1, row1, level);
    const pt2 = gridToScreen(col2, row2, level);

    ctx.fillStyle = color;
    ctx.strokeStyle = THEATER_PALETTE.outline;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(pt1.x, pt1.y);
    ctx.lineTo(pt2.x, pt2.y);
    ctx.lineTo(pt2.x, pt2.y - height);
    ctx.lineTo(pt1.x, pt1.y - height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Top trim line
    ctx.strokeStyle = THEATER_PALETTE.trim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pt1.x, pt1.y - height);
    ctx.lineTo(pt2.x, pt2.y - height);
    ctx.stroke();
  }

  /**
   * Draws room status floor tint (6% alpha) and 2px border.
   */
  private drawRoomStatusFrames(ctx: CanvasRenderingContext2D, state?: SceneState): void {
    for (const [storyId, room] of Object.entries(LIFE_WING_ROOMS)) {
      const storyState = state?.stories[storyId];
      const status = storyState?.status || "thriving";
      const statusColor = THEATER_PALETTE.statusColors[status];

      const pNorth = gridToScreen(room.originCol, room.originRow, 0);
      const pEast = gridToScreen(room.originCol + room.width, room.originRow, 0);
      const pSouth = gridToScreen(room.originCol + room.width, room.originRow + room.height, 0);
      const pWest = gridToScreen(room.originCol, room.originRow + room.height, 0);

      // 6% Alpha Floor Tint
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = statusColor;
      ctx.beginPath();
      ctx.moveTo(pNorth.x, pNorth.y);
      ctx.lineTo(pEast.x, pEast.y);
      ctx.lineTo(pSouth.x, pSouth.y);
      ctx.lineTo(pWest.x, pWest.y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 2px crisp border
      ctx.lineWidth = this.focusedStoryId === storyId ? 3 : 2;
      ctx.strokeStyle = statusColor;
      ctx.beginPath();
      ctx.moveTo(pNorth.x, pNorth.y);
      ctx.lineTo(pEast.x, pEast.y);
      ctx.lineTo(pSouth.x, pSouth.y);
      ctx.lineTo(pWest.x, pWest.y);
      ctx.closePath();
      ctx.stroke();
    }
  }

  /**
   * Collects depth-sortable Floor 2 entities (Desks, Server, Coolers, Agents).
   */
  private collectOfficeEntities(entities: RenderEntity[], state?: SceneState): void {
    // 1. Reception Desk & NEXUS
    const recPt = AGENT_OFFICE.anchors.reception;
    const recScr = gridToScreen(recPt.col, recPt.row, 1);
    const nexusScreen = this.monitorManager.getMonitorCanvas("NEXUS");

    entities.push({
      level: 1,
      col: recPt.col,
      row: recPt.row,
      sortOrderOffset: 1,
      draw: (c) => drawReceptionDesk(c, recScr.x, recScr.y + 10, nexusScreen),
    });

    const nexusState = state?.agents.NEXUS;
    const nexusWalker = this.nexusWalker;
    if (nexusWalker) {
      const nexusLook = createAgentLookSpec("NEXUS", THEATER_PALETTE.agentAccents.NEXUS);
      const activeCoord = nexusWalker.path[nexusWalker.currentIndex] || recPt;
      const nx = nexusWalker.currentPixel.x;
      const ny = nexusWalker.currentPixel.y;

      entities.push({
        level: activeCoord.level ?? 1,
        col: activeCoord.col,
        row: activeCoord.row,
        sortOrderOffset: 2,
        draw: (c) => {
          drawCharacterFrame(
            c,
            nexusLook,
            nexusWalker.isMoving ? "walk" : "idle",
            this.currentAnimFrame,
            nexusWalker.facing,
            nx - 16,
            ny - 14
          );
          const bubbleText = state?.isFinished
            ? "All lives complete"
            : nexusState?.speechBubble;
          if (bubbleText) {
            this.drawSpeechBubble(c, nx, ny - 64, bubbleText);
          }
        },
      });
    }

    // 2. Server Rack & Props
    const srvPt = AGENT_OFFICE.anchors.server_rack;
    const srvScr = gridToScreen(srvPt.col, srvPt.row, 1);
    entities.push({
      level: 1,
      col: srvPt.col,
      row: srvPt.row,
      sortOrderOffset: 1,
      draw: (c) => drawServerRack(c, srvScr.x, srvScr.y + 16, this.frameCount),
    });

    const bBoardPt = AGENT_OFFICE.anchors.bulletin_board;
    const bBoardScr = gridToScreen(bBoardPt.col, bBoardPt.row, 1);
    entities.push({
      level: 1,
      col: bBoardPt.col,
      row: bBoardPt.row,
      sortOrderOffset: 1,
      draw: (c) => drawBulletinBoard(c, bBoardScr.x, bBoardScr.y + 16),
    });

    const coolerPt = AGENT_OFFICE.anchors.water_cooler;
    const coolerScr = gridToScreen(coolerPt.col, coolerPt.row, 1);
    entities.push({
      level: 1,
      col: coolerPt.col,
      row: coolerPt.row,
      sortOrderOffset: 1,
      draw: (c) => drawWaterCooler(c, coolerScr.x, coolerScr.y + 16),
    });

    // 3. The 8 Desk Agents
    const agentIds: AgentId[] = [
      "RONIN",
      "SAGE",
      "CIPHER",
      "MUSE",
      "ATLAS",
      "FORGE",
      "ECHO",
      "SPARK",
    ];

    for (const agentId of agentIds) {
      const anchorKey = `desk_${agentId}` as keyof typeof AGENT_OFFICE.anchors;
      const anchor = AGENT_OFFICE.anchors[anchorKey];
      if (!anchor) continue;

      const screenPt = gridToScreen(anchor.col, anchor.row, 1);
      const agentState = state?.agents[agentId];
      const accent = AGENT_ROSTER_INFO[agentId]?.accent || THEATER_PALETTE.trim;
      const screenCanvas = this.monitorManager.getMonitorCanvas(agentId);

      // Desk + Chair + Live 48x32 CRT screen
      entities.push({
        level: 1,
        col: anchor.col,
        row: anchor.row,
        sortOrderOffset: 0,
        draw: (c) => {
          drawChair(c, screenPt.x, screenPt.y - 6);
          drawDesk(
            c,
            screenPt.x,
            screenPt.y + 12,
            accent,
            { label: agentState?.statusTag },
            screenCanvas
          );
        },
      });

      // Agent Character
      const look = createAgentLookSpec(agentId, accent);
      const isWorking = agentState?.statusTag.startsWith("working");
      const anim: AnimationName = isWorking ? "type" : "sit";

      entities.push({
        level: 1,
        col: anchor.col,
        row: anchor.row,
        sortOrderOffset: 1,
        draw: (c) => {
          drawCharacterFrame(
            c,
            look,
            anim,
            this.currentAnimFrame,
            1,
            screenPt.x - 16,
            screenPt.y - 12
          );

          // Status tag pill
          this.drawAgentStatusTag(
            c,
            screenPt.x,
            screenPt.y - 48,
            agentId,
            agentState?.statusTag || "idle",
            agentState?.dotColor || "grey",
            accent
          );
        },
      });
    }
  }

  /**
   * Collects depth-sortable Floor 1 entities (Props, YOU characters, NPCs).
   */
  private collectLifeWingEntities(entities: RenderEntity[], state?: SceneState): void {
    for (const [storyId, room] of Object.entries(LIFE_WING_ROOMS)) {
      const storyState = state?.stories[storyId];

      // Desk & Chair with career tiers, pill bottle, and coffee
      const deskPt = room.anchors.desk;
      const deskScr = gridToScreen(deskPt.col, deskPt.row, 0);
      entities.push({
        level: 0,
        col: deskPt.col,
        row: deskPt.row,
        sortOrderOffset: 0,
        draw: (c) => {
          drawChair(c, deskScr.x, deskScr.y - 6);
          drawDesk(
            c,
            deskScr.x,
            deskScr.y + 12,
            THEATER_PALETTE.furnitureLight,
            undefined,
            null,
            {
              careerTier: storyState?.careerDeskTier ?? 1,
              hasPillBottle: (storyState?.stats.health ?? 50) < 35,
              coffeeCups: storyState?.personaSeed === "workaholic" ? 2 : 0,
            }
          );
        },
      });

      // Window with city skyline silhouette
      const winPt = room.anchors.window;
      const winScr = gridToScreen(winPt.col, winPt.row, 0);
      const city = resolveWindowView(storyState?.location || "");
      const isDim = (storyState?.stats.happiness ?? 50) < 35;
      entities.push({
        level: 0,
        col: winPt.col,
        row: winPt.row,
        sortOrderOffset: -1,
        draw: (c) => drawWindowWithSkyline(c, winScr.x, winScr.y - 8, city, isDim),
      });

      // Sofa
      const sofaPt = room.anchors.sofa;
      const sofaScr = gridToScreen(sofaPt.col, sofaPt.row, 0);
      entities.push({
        level: 0,
        col: sofaPt.col,
        row: sofaPt.row,
        sortOrderOffset: 1,
        draw: (c) => drawSofa(c, sofaScr.x, sofaScr.y + 10),
      });

      // Bookshelf + Coins
      const shelfPt = room.anchors.shelf;
      const shelfScr = gridToScreen(shelfPt.col, shelfPt.row, 0);
      const coinTier = storyState?.coinTier ?? 2;
      entities.push({
        level: 0,
        col: shelfPt.col,
        row: shelfPt.row,
        sortOrderOffset: 1,
        draw: (c) => drawBookshelf(c, shelfScr.x, shelfScr.y + 16, coinTier),
      });

      // Wall calendar
      entities.push({
        level: 0,
        col: shelfPt.col,
        row: shelfPt.row,
        sortOrderOffset: 0,
        draw: (c) => drawWallCalendar(c, shelfScr.x + 14, shelfScr.y - 18, storyState?.quarter || 1),
      });

      // Kitchen Counter
      const kitPt = room.anchors.kitchen;
      const kitScr = gridToScreen(kitPt.col, kitPt.row, 0);
      entities.push({
        level: 0,
        col: kitPt.col,
        row: kitPt.row,
        sortOrderOffset: 1,
        draw: (c) => drawKitchenCounter(c, kitScr.x, kitScr.y + 12),
      });

      // Plant (alive when happiness >= 35, wilted when sad/burnout)
      const plantIsAlive = (storyState?.stats.happiness ?? 50) >= 35;
      entities.push({
        level: 0,
        col: winPt.col,
        row: winPt.row,
        sortOrderOffset: 1,
        draw: (c) => drawPlant(c, winScr.x, winScr.y + 10, plantIsAlive),
      });

      // Cardboard box (on struggling / layoff)
      if (storyState?.status === "struggling" || storyState?.isBurnedOut) {
        const boxPt = room.anchors.visitor_2;
        const boxScr = gridToScreen(boxPt.col, boxPt.row, 0);
        entities.push({
          level: 0,
          col: boxPt.col,
          row: boxPt.row,
          sortOrderOffset: 1,
          draw: (c) => drawCardboardBox(c, boxScr.x, boxScr.y + 8),
        });
      }

      // Relationship photo frame
      if ((storyState?.relPhotoTier ?? 0) > 0) {
        entities.push({
          level: 0,
          col: shelfPt.col,
          row: shelfPt.row,
          sortOrderOffset: 2,
          draw: (c) =>
            drawWallPhotoFrame(c, shelfScr.x - 14, shelfScr.y - 18, storyState?.relPhotoTier ?? 1),
        });
      }

      // YOU Character
      const walker = this.youWalkers[storyId];
      if (walker) {
        const persona = storyState?.personaSeed || "bold";
        const youLook = createYouLookSpec(persona, 28);
        const anim = this.determineYouAnimation(storyState, walker);

        entities.push({
          level: 0,
          col: deskPt.col,
          row: deskPt.row,
          sortOrderOffset: 2,
          draw: (c) => {
            const px = walker.currentPixel.x;
            const py = walker.currentPixel.y;
            drawCharacterFrame(
              c,
              youLook,
              anim,
              this.currentAnimFrame,
              walker.facing,
              px - 16,
              py - 12
            );

            // Last diary speech bubble if present
            if (storyState?.lastDiary && this.focusedStoryId === storyId) {
              this.drawSpeechBubble(
                c,
                px,
                py - 60,
                storyState.lastDiary.slice(0, 42) + "..."
              );
            }
          },
        });
      }

      // Cast NPCs (dynamic lifecycle walker)
      const castWalker = this.castWalkers[storyId];
      if (castWalker && castWalker.phase !== "gone") {
        const npcLook = createCastLookSpec(castWalker.role);
        const curCoord = castWalker.path[castWalker.currentIndex] || room.anchors.visitor_1;
        const anim: AnimationName = castWalker.isMoving ? "walk" : "talk";

        entities.push({
          level: 0,
          col: curCoord.col,
          row: curCoord.row,
          sortOrderOffset: 2,
          draw: (c) => {
            drawCharacterFrame(
              c,
              npcLook,
              anim,
              this.currentAnimFrame,
              castWalker.facing,
              castWalker.currentPixel.x - 16,
              castWalker.currentPixel.y - 12
            );
          },
        });
      }
    }
  }

  private determineYouAnimation(
    storyState: StorySceneState | undefined,
    walker: WalkerState
  ): AnimationName {
    if (walker.isMoving) return "walk";
    if (storyState?.isBurnedOut) return "hold_chest";
    if (storyState?.clampedHit && storyState.clampedHit !== "none") return "react_down";
    if (storyState?.currentEvent?.sev === "pos") return "react_up";
    return "sit";
  }

  /**
   * Draws TinyFloor-style agent status pill.
   */
  private drawAgentStatusTag(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    agentId: string,
    tag: string,
    dotColor: "grey" | "accent" | "done" | "error",
    accentColor: string
  ): void {
    ctx.save();
    ctx.translate(x, y);

    const fontStr = this.fontsLoaded ? "600 9px Poppins, sans-serif" : "600 9px sans-serif";
    ctx.font = fontStr;
    const textWidth = ctx.measureText(`${agentId} • ${tag}`).width;
    const pillWidth = Math.max(54, textWidth + 18);

    // Pill background
    ctx.fillStyle = "#0f172a";
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(-pillWidth / 2, -7, pillWidth, 14, 7);
    ctx.fill();
    ctx.stroke();

    // Status dot
    let dotFill = "#94a3b8"; // grey
    if (dotColor === "accent") dotFill = accentColor;
    else if (dotColor === "done") dotFill = "#10b981";
    else if (dotColor === "error") dotFill = "#ef4444";

    ctx.fillStyle = dotFill;
    ctx.beginPath();
    ctx.arc(-pillWidth / 2 + 7, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Text label
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(`${agentId} • ${tag}`, -pillWidth / 2 + 13, 3);

    ctx.restore();
  }

  /**
   * Draws sliding handoff document sprite between two agent desks.
   */
  private drawHandoffPacket(ctx: CanvasRenderingContext2D, state: SceneState): void {
    if (!state.activeHandoff) return;

    const fromKey = `desk_${state.activeHandoff.fromAgent}` as keyof typeof AGENT_OFFICE.anchors;
    const toKey = `desk_${state.activeHandoff.toAgent}` as keyof typeof AGENT_OFFICE.anchors;

    const fromAnchor = AGENT_OFFICE.anchors[fromKey] || AGENT_OFFICE.anchors.reception;
    const toAnchor = AGENT_OFFICE.anchors[toKey] || AGENT_OFFICE.anchors.reception;

    const fromScr = gridToScreen(fromAnchor.col, fromAnchor.row, 1);
    const toScr = gridToScreen(toAnchor.col, toAnchor.row, 1);

    const t = Math.min(1.0, Math.max(0.0, this.handoffProgress));
    const currX = fromScr.x + (toScr.x - fromScr.x) * t;
    const currY = fromScr.y + (toScr.y - fromScr.y) * t - 18;

    const accent =
      THEATER_PALETTE.agentAccents[state.activeHandoff.fromAgent] || "#0284c7";

    ctx.save();
    ctx.translate(currX, currY);

    // Trailing accent dots behind moving packet
    const dirX = fromScr.x - toScr.x;
    const dirY = fromScr.y - toScr.y;
    const len = Math.hypot(dirX, dirY) || 1;
    const nx = dirX / len;
    const ny = dirY / len;

    ctx.fillStyle = accent;
    for (let p = 1; p <= 3; p++) {
      const px = nx * (p * 6);
      const py = ny * (p * 6);
      ctx.fillRect(px - 1, py - 1, 2, 2);
    }

    // Small document icon with folded corner
    ctx.fillStyle = "#f8fafc";
    ctx.strokeStyle = THEATER_PALETTE.outline;
    ctx.lineWidth = 1.5;
    ctx.fillRect(-6, -8, 12, 16);
    ctx.strokeRect(-6, -8, 12, 16);

    // Folded top-right corner
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.moveTo(2, -8);
    ctx.lineTo(6, -4);
    ctx.lineTo(2, -4);
    ctx.closePath();
    ctx.fill();

    // Mini lines on document in sending agent's accent
    ctx.fillStyle = accent;
    ctx.fillRect(-4, -5, 5, 2);
    ctx.fillRect(-4, -1, 8, 2);
    ctx.fillRect(-4, 3, 6, 2);

    ctx.restore();
  }

  /**
   * Draws speech bubble above character.
   */
  private drawSpeechBubble(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string
  ): void {
    ctx.save();
    ctx.translate(x, y);

    const fontStr = this.fontsLoaded ? "600 10px Poppins, sans-serif" : "600 10px sans-serif";
    ctx.font = fontStr;
    const textWidth = ctx.measureText(text).width;
    const w = Math.min(220, textWidth + 16);
    const h = 20;

    // Bubble box
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = THEATER_PALETTE.outline;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h, w, h, 4);
    ctx.fill();
    ctx.stroke();

    // Bubble pointer down
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(4, 0);
    ctx.lineTo(0, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = "#0f172a";
    ctx.fillText(text, -w / 2 + 8, -6);

    ctx.restore();
  }

  /**
   * Draws room identification and status banner.
   */
  private drawRoomBanners(ctx: CanvasRenderingContext2D, state?: SceneState): void {
    for (const [storyId, room] of Object.entries(LIFE_WING_ROOMS)) {
      const storyState = state?.stories[storyId];
      const pWest = gridToScreen(room.originCol, room.originRow + room.height, 0);

      ctx.save();
      ctx.translate(pWest.x, pWest.y + 18);

      const status = storyState?.status || "thriving";
      const statusColor = THEATER_PALETTE.statusColors[status];
      const opt = storyState?.branchOption || "A";
      const persona = storyState?.personaSeed || "bold";
      const savings = storyState?.currentSavings ?? 25000;
      const formattedCash = `$${Math.round(savings).toLocaleString()}`;

      const bannerText = `${storyId} • Path ${opt} (${persona}) • ${formattedCash}`;

      const fontStr = this.fontsLoaded ? "600 11px Poppins, sans-serif" : "600 11px sans-serif";
      ctx.font = fontStr;
      const tw = ctx.measureText(bannerText).width;

      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.strokeStyle = statusColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-tw / 2 - 8, -10, tw + 16, 20, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f8fafc";
      ctx.fillText(bannerText, -tw / 2, 4);

      ctx.restore();
    }
  }

  private drawHUD(ctx: CanvasRenderingContext2D): void {
    // Current focus indicator at top-left
    if (this.focusedStoryId) {
      ctx.save();
      ctx.font = this.fontsLoaded ? "600 12px Poppins, sans-serif" : "600 12px sans-serif";
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(16, 16, 160, 32, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#38bdf8";
      ctx.fillText(`Focused: Room ${this.focusedStoryId}`, 28, 36);
      ctx.restore();
    }
  }

  /**
   * Click handler: detects room clicks and triggers focus easing.
   */
  private handleCanvasClick(e: MouseEvent): void {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    const clickViewport: Point2D = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    const worldPt = viewportToWorld(
      clickViewport,
      this.camera,
      this.viewportWidth,
      this.viewportHeight
    );

    // Test Level 0 (Life Wing rooms)
    const gridPt0 = screenToGrid(worldPt.x, worldPt.y, 0);
    let clickedRoom: string | null = null;

    for (const [storyId, room] of Object.entries(LIFE_WING_ROOMS)) {
      if (
        gridPt0.col >= room.originCol &&
        gridPt0.col < room.originCol + room.width &&
        gridPt0.row >= room.originRow &&
        gridPt0.row < room.originRow + room.height
      ) {
        clickedRoom = storyId;
        break;
      }
    }

    if (clickedRoom) {
      if (this.focusedStoryId === clickedRoom) {
        this.focusStory(null); // Click focused room toggles back to overview
      } else {
        this.focusStory(clickedRoom);
      }
    } else {
      // Clicked outside rooms returns to overview
      if (this.focusedStoryId) {
        this.focusStory(null);
      }
    }
  }

  /**
   * Keyboard handler: Esc returns to overview.
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === "Escape" && this.focusedStoryId) {
      this.focusStory(null);
    }
  }

  /**
   * Destroys renderer, releases listeners and offscreen canvases.
   */
  public destroy(): void {
    if (this.animationFrameId !== null && typeof cancelAnimationFrame !== "undefined") {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.canvas) {
      this.canvas.removeEventListener("click", this.handleCanvasClickBound);
    }

    if (typeof window !== "undefined") {
      window.removeEventListener("keydown", this.handleKeyDownBound);
    }

    this.staticCanvas = null;
    this.staticCtx = null;
    this.canvas = null;
    this.ctx = null;
  }
}
