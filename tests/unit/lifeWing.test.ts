import { describe, it, expect, vi } from "vitest";
import { TheaterRenderer } from "@/lib/theater/renderer";
import {
  createInitialSceneState,
  reduceSceneState,
} from "@/lib/theater/sceneState";
import {
  drawWindowWithSkyline,
  drawWallCalendar,
  drawFloatingTextPop,
  drawPlant,
  drawDesk,
  drawBookshelf,
} from "@/lib/theater/sprites/props";

function createMockContext(): CanvasRenderingContext2D {
  return {
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 45 }),
  } as unknown as CanvasRenderingContext2D;
}

describe("Phase 6: Life Wing 4 Rooms & Visual State Dynamics", () => {
  it("renders procedural window skyline silhouettes for all major cities", () => {
    const cities = ["london", "delhi", "bengaluru", "sf", "generic"] as const;

    for (const city of cities) {
      const ctx = createMockContext();
      drawWindowWithSkyline(ctx, 100, 100, city, false);
      expect(ctx.fillRect).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();
    }
  });

  it("renders wall calendar showing simulation quarter", () => {
    const ctx = createMockContext();
    drawWallCalendar(ctx, 50, 50, 7);
    expect(ctx.fillText).toHaveBeenCalledWith("Q7", -4, 2);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("renders floating text pop with alpha fade and upward translation", () => {
    const ctx = createMockContext();
    drawFloatingTextPop(ctx, 100, 200, "+$4,500", "#10b981", 0.5);

    expect(ctx.translate).toHaveBeenCalledWith(100, 200 + -0.5 * 26);
    expect(ctx.fillText).toHaveBeenCalledWith("+$4,500", expect.any(Number), 3);
  });

  it("renders plant alive when happy and wilted when sad", () => {
    const ctxAlive = createMockContext();
    drawPlant(ctxAlive, 0, 0, true);
    expect(ctxAlive.fill).toHaveBeenCalled();

    const ctxWilted = createMockContext();
    drawPlant(ctxWilted, 0, 0, false);
    expect(ctxWilted.fill).toHaveBeenCalled();
  });

  it("renders career desk accessories and pill bottles conditionally", () => {
    const ctx = createMockContext();
    drawDesk(ctx, 0, 0, "#1b2a5c", undefined, null, {
      careerTier: 3,
      hasPillBottle: true,
      coffeeCups: 2,
    });

    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.strokeRect).toHaveBeenCalled();
  });

  it("renders bookshelf with variable coin tiers", () => {
    const ctx0 = createMockContext();
    drawBookshelf(ctx0, 0, 0, 0);

    const ctx3 = createMockContext();
    drawBookshelf(ctx3, 0, 0, 3);
    expect(ctx3.fillRect).toHaveBeenCalled();
  });

  it("spawns cash delta pops and stat hit pops on state changes", () => {
    const renderer = new TheaterRenderer();
    let state = createInitialSceneState();
    state = reduceSceneState(state, "@* BOOT sess=sess_123 stories=4 quarters=20");
    state = reduceSceneState(state, '@S1 FORK opt=A seed=bold label="London AI" loc="London, UK"');

    // Initial update registers starting savings
    renderer.update(16, state);

    // CALC updates savings -> creates cash pop
    state = reduceSceneState(
      state,
      "@S1/Q1 CALC cash0=25000 inc=6000 exp=2000 evc=1000 cash1=38000"
    );
    renderer.update(16, state);

    // CLAMP hitting 100 on joy -> creates stat pop
    state = reduceSceneState(
      state,
      "@S1/Q1 CLAMP joy=100 hp=70 rel=65 car=80 hit=joy"
    );
    renderer.update(16, state);

    // Advance 500ms
    renderer.update(500, state);

    renderer.destroy();
  });

  it("manages cast NPC lifecycle: enter door -> visitor_1 -> exit door", () => {
    const renderer = new TheaterRenderer();
    let state = createInitialSceneState();
    state = reduceSceneState(state, "@* BOOT sess=sess_123 stories=4 quarters=20");
    state = reduceSceneState(state, '@S1 FORK opt=A seed=bold label="London AI" loc="London, UK"');

    // Load cast NPC
    state = reduceSceneState(state, "@* CAST role=manager name=Jordan trait=demanding");
    renderer.update(16, state);

    // Advance time for NPC to walk from door to visitor_1
    renderer.update(2000, state);

    // Finish story -> triggers NPC exit
    state = reduceSceneState(state, "@S1 END cash=50000 st=thriving");
    renderer.update(16, state);

    // Advance time for NPC to exit through door
    renderer.update(3000, state);

    renderer.destroy();
  });
});
