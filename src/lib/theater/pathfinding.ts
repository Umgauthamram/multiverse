/**
 * Deterministic A* Pathfinding Engine
 *
 * Implements 4-neighbor tile grid pathfinding for characters and agents
 * with strict tie-breaking for repeatable paths and smooth isometric interpolation.
 *
 * Implements Section 4.1 & 8.1 of plan_update.md.
 */

import { GridCoord, gridToScreen, Point2D } from "@/lib/theater/iso";
import { isTileBlocked } from "@/lib/theater/layout";
import { THEATER_DIMENSIONS } from "@/lib/theater/tokens";

interface Node {
  col: number;
  row: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

const NEIGHBOR_OFFSETS = [
  { dc: 0, dr: -1 }, // North
  { dc: 1, dr: 0 },  // East
  { dc: 0, dr: 1 },  // South
  { dc: -1, dr: 0 }, // West
];

function manhattan(c1: number, r1: number, c2: number, r2: number): number {
  return Math.abs(c1 - c2) + Math.abs(r1 - r2);
}

/**
 * Finds the shortest walkable path between two tile coordinates using A*.
 * Fully deterministic: identical start and end points produce identical paths.
 */
export function findPath(
  start: GridCoord,
  end: GridCoord,
  level = 0
): GridCoord[] {
  // If start is end, return single point
  if (start.col === end.col && start.row === end.row) {
    return [{ col: start.col, row: start.row, level }];
  }

  const openList: Node[] = [];
  const closedSet = new Set<string>();

  const startNode: Node = {
    col: start.col,
    row: start.row,
    g: 0,
    h: manhattan(start.col, start.row, end.col, end.row),
    f: manhattan(start.col, start.row, end.col, end.row),
    parent: null,
  };

  openList.push(startNode);

  while (openList.length > 0) {
    // Pick node with lowest f (deterministic tie-breaking by lowest h)
    openList.sort((a, b) => (a.f !== b.f ? a.f - b.f : a.h - b.h));
    const current = openList.shift()!;

    if (current.col === end.col && current.row === end.row) {
      // Reconstruct path
      const path: GridCoord[] = [];
      let curr: Node | null = current;
      while (curr) {
        path.unshift({ col: curr.col, row: curr.row, level });
        curr = curr.parent;
      }
      return path;
    }

    const key = `${current.col},${current.row}`;
    closedSet.add(key);

    for (const offset of NEIGHBOR_OFFSETS) {
      const nextCol = current.col + offset.dc;
      const nextRow = current.row + offset.dr;
      const nextKey = `${nextCol},${nextRow}`;

      if (closedSet.has(nextKey)) continue;

      // Allow end tile even if strictly blocked by desk prop
      const isDestination = nextCol === end.col && nextRow === end.row;
      if (!isDestination && isTileBlocked(nextCol, nextRow, level)) {
        continue;
      }

      const tentativeG = current.g + 1;
      let existingNode = openList.find((n) => n.col === nextCol && n.row === nextRow);

      if (!existingNode) {
        const h = manhattan(nextCol, nextRow, end.col, end.row);
        existingNode = {
          col: nextCol,
          row: nextRow,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parent: current,
        };
        openList.push(existingNode);
      } else if (tentativeG < existingNode.g) {
        existingNode.g = tentativeG;
        existingNode.f = tentativeG + existingNode.h;
        existingNode.parent = current;
      }
    }
  }

  // Fallback: direct 1-step or straight line if no route
  return [
    { col: start.col, row: start.row, level },
    { col: end.col, row: end.row, level },
  ];
}

export interface WalkerState {
  path: GridCoord[];
  currentIndex: number;
  segmentProgress: number; // 0.0 to 1.0 along current tile segment
  facing: 1 | -1; // 1 = right, -1 = left
  isMoving: boolean;
  currentPixel: Point2D;
}

/**
 * Creates initial walker state stationed at a starting tile.
 */
export function createWalker(start: GridCoord): WalkerState {
  const pixel = gridToScreen(start.col, start.row, start.level || 0);
  return {
    path: [start],
    currentIndex: 0,
    segmentProgress: 0,
    facing: 1,
    isMoving: false,
    currentPixel: pixel,
  };
}

/**
 * Assigns a new walking destination to a walker state.
 */
export function setWalkerDestination(
  walker: WalkerState,
  destination: GridCoord
): void {
  const currentCoord = walker.path[walker.currentIndex] || destination;
  const path = findPath(currentCoord, destination, destination.level || 0);
  walker.path = path;
  walker.currentIndex = 0;
  walker.segmentProgress = 0;
  walker.isMoving = path.length > 1;
}

/**
 * Updates walker along its path based on elapsed time dt (in ms).
 */
export function updateWalker(walker: WalkerState, dtMs: number): void {
  if (!walker.isMoving || walker.path.length <= 1) {
    walker.isMoving = false;
    return;
  }

  const speedTilesPerSec = THEATER_DIMENSIONS.WALK_SPEED_TILES_PER_SEC;
  const deltaProgress = (dtMs / 1000) * speedTilesPerSec;
  walker.segmentProgress += deltaProgress;

  const currentCoord = walker.path[walker.currentIndex];
  const nextCoord = walker.path[walker.currentIndex + 1];

  if (!nextCoord) {
    walker.isMoving = false;
    return;
  }

  // Determine facing direction
  if (nextCoord.col > currentCoord.col || nextCoord.row < currentCoord.row) {
    walker.facing = 1;
  } else if (nextCoord.col < currentCoord.col || nextCoord.row > currentCoord.row) {
    walker.facing = -1;
  }

  // Segment completed
  if (walker.segmentProgress >= 1.0) {
    const tilesAdvanced = Math.floor(walker.segmentProgress);
    walker.segmentProgress -= tilesAdvanced;
    walker.currentIndex += tilesAdvanced;

    if (walker.currentIndex >= walker.path.length - 1) {
      walker.isMoving = false;
      walker.currentIndex = walker.path.length - 1;
      const finalCoord = walker.path[walker.path.length - 1];
      walker.currentPixel = gridToScreen(finalCoord.col, finalCoord.row, finalCoord.level || 0);
      return;
    }
  }

  const activeCoord = walker.path[walker.currentIndex];
  const targetCoord = walker.path[walker.currentIndex + 1];
  if (!targetCoord) {
    walker.isMoving = false;
    walker.currentPixel = gridToScreen(activeCoord.col, activeCoord.row, activeCoord.level || 0);
    return;
  }

  // Smooth isometric interpolation
  const fromPixel = gridToScreen(activeCoord.col, activeCoord.row, activeCoord.level || 0);
  const toPixel = gridToScreen(targetCoord.col, targetCoord.row, targetCoord.level || 0);
  const t = Math.min(1.0, Math.max(0.0, walker.segmentProgress));

  walker.currentPixel = {
    x: fromPixel.x + (toPixel.x - fromPixel.x) * t,
    y: fromPixel.y + (toPixel.y - fromPixel.y) * t,
  };
}

/**
 * Instantly snaps a walker to the end of its current path (used for reduced motion).
 */
export function snapWalkerToDestination(walker: WalkerState): void {
  if (walker.path.length > 0) {
    walker.currentIndex = walker.path.length - 1;
    walker.segmentProgress = 0;
    walker.isMoving = false;
    const finalCoord = walker.path[walker.path.length - 1];
    walker.currentPixel = gridToScreen(finalCoord.col, finalCoord.row, finalCoord.level || 0);
  }
}

