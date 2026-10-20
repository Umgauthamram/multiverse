import { describe, it, expect, vi } from "vitest";
import { TheaterRenderer } from "@/lib/theater/renderer";
import { createInitialSceneState, reduceSceneState } from "@/lib/theater/sceneState";

function createMockCanvas(): HTMLCanvasElement {
  const ctx = {
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    translate: vi.fn(),
    arc: vi.fn(),
    ellipse: vi.fn(),
    roundRect: vi.fn(),
    drawImage: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 40 }),
    fillText: vi.fn(),
    imageSmoothingEnabled: true,
  } as unknown as CanvasRenderingContext2D;

  const canvas = {
    width: 1280,
    height: 720,
    style: {},
    getContext: vi.fn().mockReturnValue(ctx),
    getBoundingClientRect: vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 1280,
      height: 720,
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as HTMLCanvasElement;

  return canvas;
}

describe("Phase 4: Theater Renderer Smoke", () => {
  it("instantiates and focuses story rooms", () => {
    const renderer = new TheaterRenderer();
    expect(renderer.focusedStoryId).toBeNull();

    renderer.focusStory("S1");
    expect(renderer.focusedStoryId).toBe("S1");

    renderer.focusStory("S2");
    expect(renderer.focusedStoryId).toBe("S2");

    renderer.focusStory(null);
    expect(renderer.focusedStoryId).toBeNull();

    renderer.destroy();
  });

  it("updates camera easing across simulation steps", () => {
    const renderer = new TheaterRenderer();

    // Trigger room focus
    renderer.focusStory("S1");

    // Before update, target is set
    renderer.update(16); // 1 frame
    renderer.update(200); // 200ms easing

    // Renderer still holds focused story
    expect(renderer.focusedStoryId).toBe("S1");

    renderer.destroy();
  });

  it("attaches to canvas and executes render loop without errors", () => {
    const renderer = new TheaterRenderer();
    const mockCanvas = createMockCanvas();

    renderer.attach(mockCanvas);

    let state = createInitialSceneState();
    state = reduceSceneState(state, "@* BOOT sess=sess_123 stories=4 quarters=20");
    state = reduceSceneState(state, '@S1 FORK opt=A seed=bold label="London Tech" loc="London, UK"');
    state = reduceSceneState(state, "@S1/Q1 ROLL ev=promo sev=pos title=\"Senior Promotion\"");

    renderer.update(16, state);
    renderer.draw(state);

    renderer.resize(1920, 1080);
    renderer.draw(state);

    renderer.destroy();
  });
});
