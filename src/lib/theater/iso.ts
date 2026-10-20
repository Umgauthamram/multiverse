/**
 * Isometric Projection & Geometry Engine
 *
 * Implements Section 4.1 & 4.2 of plan_update.md:
 * - 2:1 Isometric projection (TILE_W = 64, TILE_H = 32)
 * - Two-floor vertical rise (FLOOR_RISE = 176 px)
 * - Painter's algorithm depth sort by (level, col + row, z)
 * - Camera panning & 2x smooth room focusing
 */

import { THEATER_DIMENSIONS } from "@/lib/theater/tokens";

export interface Point2D {
  x: number;
  y: number;
}

export interface GridCoord {
  col: number;
  row: number;
  level?: number; // 0 for Life Wing (Floor 1), 1 for Agent Office (Floor 2)
  z?: number; // Vertical offset in pixels above floor
}

export interface Camera {
  x: number; // Center X in world pixels
  y: number; // Center Y in world pixels
  zoom: number; // Default 1.0, 2.0 when focused on room
  targetX: number;
  targetY: number;
  targetZoom: number;
}

export interface DepthSortable {
  level: number;
  col: number;
  row: number;
  z?: number;
  sortOrderOffset?: number; // Minor priority offset for props on the same tile
}

const HALF_W = THEATER_DIMENSIONS.TILE_WIDTH / 2; // 32
const HALF_H = THEATER_DIMENSIONS.TILE_HEIGHT / 2; // 16
const RISE = THEATER_DIMENSIONS.FLOOR_RISE; // 176

/**
 * Projects a 3D isometric tile coordinate into 2D world pixel coordinates.
 */
export function gridToScreen(
  col: number,
  row: number,
  level: number = 0,
  z: number = 0
): Point2D {
  const x = (col - row) * HALF_W;
  const y = (col + row) * HALF_H - level * RISE - z;
  return { x, y };
}

/**
 * Inverse projects a 2D world pixel coordinate back into grid coordinates for a given level.
 */
export function screenToGrid(x: number, y: number, level: number = 0): { col: number; row: number } {
  const adjustedY = y + level * RISE;
  const col = (x / HALF_W + adjustedY / HALF_H) / 2;
  const row = (adjustedY / HALF_H - x / HALF_W) / 2;
  return {
    col: Math.floor(col),
    row: Math.floor(row),
  };
}

/**
 * Transforms a world pixel coordinate to viewport canvas coordinates using the camera state.
 */
export function worldToViewport(
  worldPoint: Point2D,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number
): Point2D {
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  return {
    x: (worldPoint.x - camera.x) * camera.zoom + cx,
    y: (worldPoint.y - camera.y) * camera.zoom + cy,
  };
}

/**
 * Transforms a viewport canvas coordinate (e.g. mouse click) back to world coordinates.
 */
export function viewportToWorld(
  viewportPoint: Point2D,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number
): Point2D {
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  return {
    x: (viewportPoint.x - cx) / camera.zoom + camera.x,
    y: (viewportPoint.y - cy) / camera.zoom + camera.y,
  };
}

/**
 * Painter's algorithm comparator.
 * Sorts entities so that back-to-front rendering produces correct occlusion.
 * Order: Level ASC -> (col + row) ASC -> z ASC -> sortOrderOffset ASC.
 */
export function compareDepth(a: DepthSortable, b: DepthSortable): number {
  if (a.level !== b.level) {
    return a.level - b.level;
  }

  const depthA = a.col + a.row;
  const depthB = b.col + b.row;
  if (Math.abs(depthA - depthB) > 0.001) {
    return depthA - depthB;
  }

  const zA = a.z || 0;
  const zB = b.z || 0;
  if (zA !== zB) {
    return zA - zB;
  }

  return (a.sortOrderOffset || 0) - (b.sortOrderOffset || 0);
}

/**
 * Smoothly interpolates camera toward target position and zoom (e.g. 400ms focus).
 */
export function updateCamera(camera: Camera, dtMs: number, speed = 8): void {
  const factor = Math.min(1.0, (dtMs / 1000) * speed);
  camera.x += (camera.targetX - camera.x) * factor;
  camera.y += (camera.targetY - camera.y) * factor;
  camera.zoom += (camera.targetZoom - camera.zoom) * factor;
}

/**
 * Creates default camera centered on the building overview.
 */
export function createDefaultCamera(): Camera {
  return {
    x: 0,
    y: 80,
    zoom: 1.0,
    targetX: 0,
    targetY: 80,
    targetZoom: 1.0,
  };
}
