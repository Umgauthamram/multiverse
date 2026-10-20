import { describe, it, expect } from "vitest";
import {
  findPath,
  createWalker,
  setWalkerDestination,
  updateWalker,
} from "@/lib/theater/pathfinding";
import { GridCoord } from "@/lib/theater/iso";

describe("Phase 4: Pathfinding Engine", () => {
  it("finds zero-length path when start equals destination", () => {
    const start: GridCoord = { col: 4, row: 4, level: 0 };
    const path = findPath(start, start, 0);

    expect(path).toHaveLength(1);
    expect(path[0].col).toBe(4);
    expect(path[0].row).toBe(4);
  });

  it("finds deterministic 4-neighbor path between walkable tiles", () => {
    const start: GridCoord = { col: 8, row: 2, level: 0 }; // Corridor tile
    const end: GridCoord = { col: 8, row: 6, level: 0 }; // Corridor tile

    const path1 = findPath(start, end, 0);
    const path2 = findPath(start, end, 0);

    expect(path1.length).toBeGreaterThan(1);
    expect(path1).toEqual(path2); // Strict determinism

    expect(path1[0]).toEqual({ col: 8, row: 2, level: 0 });
    expect(path1[path1.length - 1]).toEqual({ col: 8, row: 6, level: 0 });
  });

  it("navigates in Agent Office (level 1)", () => {
    const start: GridCoord = { col: 3, row: 3, level: 1 };
    const end: GridCoord = { col: 6, row: 5, level: 1 };

    const path = findPath(start, end, 1);
    expect(path.length).toBeGreaterThanOrEqual(2);
    expect(path[0].col).toBe(3);
    expect(path[path.length - 1].col).toBe(6);
    expect(path[path.length - 1].row).toBe(5);
  });

  it("creates and updates walker movement along path", () => {
    const start: GridCoord = { col: 8, row: 2, level: 0 };
    const dest: GridCoord = { col: 8, row: 5, level: 0 };

    const walker = createWalker(start);
    expect(walker.isMoving).toBe(false);
    expect(walker.currentIndex).toBe(0);

    setWalkerDestination(walker, dest);
    expect(walker.isMoving).toBe(true);
    expect(walker.path.length).toBeGreaterThan(1);

    const initialPixelY = walker.currentPixel.y;

    // Simulate 400ms (at 2.5 tiles/sec = 1 tile traversed)
    updateWalker(walker, 400);
    expect(walker.currentPixel.y).not.toBe(initialPixelY);

    // Simulate enough time to complete journey (e.g. 5000ms)
    updateWalker(walker, 5000);
    expect(walker.isMoving).toBe(false);
    expect(walker.currentIndex).toBe(walker.path.length - 1);
  });
});
