/**
 * Theater Layout & Building Blueprint
 *
 * Defines the dual-floor architecture of The Multiverse Complex:
 * - Floor 1: Life Wing (17 x 17 tiles, 4 rooms with 1-tile corridor)
 * - Floor 2: Agent Office (16 x 10 tiles, 9 agent stations + reception)
 * - Named anchors per room and office station
 * - Blocked tile collision grid for A* pathfinding
 * - City skyline silhouette selector
 *
 * Implements Section 4.2 & 4.3 of plan_update.md.
 */

import { GridCoord } from "@/lib/theater/iso";

export type TileType =
  | "floor_a"
  | "floor_b"
  | "wall_nw"
  | "wall_ne"
  | "corridor"
  | "glass_wall"
  | "void";

export interface RoomAnchorMap {
  door: GridCoord;
  desk: GridCoord;
  sofa: GridCoord;
  window: GridCoord;
  kitchen: GridCoord;
  shelf: GridCoord;
  visitor_1: GridCoord;
  visitor_2: GridCoord;
}

export interface RoomDefinition {
  storyId: string;
  originCol: number;
  originRow: number;
  width: number;
  height: number;
  anchors: RoomAnchorMap;
}

export interface AgentOfficeLayout {
  width: number;
  height: number;
  anchors: {
    reception: GridCoord;
    stairs_top: GridCoord;
    desk_RONIN: GridCoord;
    desk_SAGE: GridCoord;
    desk_CIPHER: GridCoord;
    desk_MUSE: GridCoord;
    desk_ATLAS: GridCoord;
    desk_FORGE: GridCoord;
    desk_ECHO: GridCoord;
    desk_SPARK: GridCoord;
    bulletin_board: GridCoord;
    server_rack: GridCoord;
    water_cooler: GridCoord;
  };
}

// -------------------------------------------------------------
// FLOOR 1: LIFE WING (4 Rooms, 17 x 17 Grid)
// -------------------------------------------------------------
export const LIFE_WING_ROOMS: Record<string, RoomDefinition> = {
  S1: {
    storyId: "S1",
    originCol: 0,
    originRow: 0,
    width: 8,
    height: 8,
    anchors: {
      door: { col: 7, row: 4, level: 0 },
      desk: { col: 3, row: 2, level: 0 },
      sofa: { col: 5, row: 6, level: 0 },
      window: { col: 1, row: 1, level: 0 },
      kitchen: { col: 1, row: 5, level: 0 },
      shelf: { col: 5, row: 1, level: 0 },
      visitor_1: { col: 4, row: 3, level: 0 },
      visitor_2: { col: 5, row: 4, level: 0 },
    },
  },
  S2: {
    storyId: "S2",
    originCol: 9,
    originRow: 0,
    width: 8,
    height: 8,
    anchors: {
      door: { col: 9, row: 4, level: 0 },
      desk: { col: 12, row: 2, level: 0 },
      sofa: { col: 14, row: 6, level: 0 },
      window: { col: 10, row: 1, level: 0 },
      kitchen: { col: 10, row: 5, level: 0 },
      shelf: { col: 14, row: 1, level: 0 },
      visitor_1: { col: 13, row: 3, level: 0 },
      visitor_2: { col: 14, row: 4, level: 0 },
    },
  },
  S3: {
    storyId: "S3",
    originCol: 0,
    originRow: 9,
    width: 8,
    height: 8,
    anchors: {
      door: { col: 7, row: 13, level: 0 },
      desk: { col: 3, row: 11, level: 0 },
      sofa: { col: 5, row: 15, level: 0 },
      window: { col: 1, row: 10, level: 0 },
      kitchen: { col: 1, row: 14, level: 0 },
      shelf: { col: 5, row: 10, level: 0 },
      visitor_1: { col: 4, row: 12, level: 0 },
      visitor_2: { col: 5, row: 13, level: 0 },
    },
  },
  S4: {
    storyId: "S4",
    originCol: 9,
    originRow: 9,
    width: 8,
    height: 8,
    anchors: {
      door: { col: 9, row: 13, level: 0 },
      desk: { col: 12, row: 11, level: 0 },
      sofa: { col: 14, row: 15, level: 0 },
      window: { col: 10, row: 10, level: 0 },
      kitchen: { col: 10, row: 14, level: 0 },
      shelf: { col: 14, row: 10, level: 0 },
      visitor_1: { col: 13, row: 12, level: 0 },
      visitor_2: { col: 14, row: 13, level: 0 },
    },
  },
};

// -------------------------------------------------------------
// FLOOR 2: AGENT OFFICE (16 x 10 Grid)
// -------------------------------------------------------------
export const AGENT_OFFICE: AgentOfficeLayout = {
  width: 16,
  height: 10,
  anchors: {
    reception: { col: 2, row: 2, level: 1 },
    stairs_top: { col: 14, row: 2, level: 1 },
    desk_RONIN: { col: 4, row: 4, level: 1 },
    desk_SAGE: { col: 7, row: 4, level: 1 },
    desk_CIPHER: { col: 10, row: 4, level: 1 },
    desk_MUSE: { col: 13, row: 4, level: 1 },
    desk_ATLAS: { col: 4, row: 7, level: 1 },
    desk_FORGE: { col: 7, row: 7, level: 1 },
    desk_ECHO: { col: 10, row: 7, level: 1 },
    desk_SPARK: { col: 13, row: 7, level: 1 },
    bulletin_board: { col: 1, row: 8, level: 1 },
    server_rack: { col: 14, row: 8, level: 1 },
    water_cooler: { col: 1, row: 4, level: 1 },
  },
};

/**
 * Checks whether a specific tile is blocked for walking collision.
 * Level 0 = Life Wing, Level 1 = Agent Office.
 */
export function isTileBlocked(col: number, row: number, level = 0): boolean {
  if (level === 0) {
    // Floor 1 bounds: 0..16, 0..16
    if (col < 0 || col > 16 || row < 0 || row > 16) return true;

    // Outer perimeter walls
    if (col === 0 && row === 0) return true;

    // Room internal perimeter walls (except door openings)
    for (const room of Object.values(LIFE_WING_ROOMS)) {
      const isInside =
        col >= room.originCol &&
        col < room.originCol + room.width &&
        row >= room.originRow &&
        row < room.originRow + room.height;

      if (isInside) {
        // Walls at north-west (row === originRow) and south-west (col === originCol)
        if (col === room.originCol || row === room.originRow) {
          return true;
        }

        // Check if furniture occupies this tile (desks/shelves/sofas)
        // Desks are blocked: character stands adjacent to it (at visitor_1 or chair)
        // Note: anchors themselves are walkable locations!
      }
    }

    // Corridor at col 8 and row 8 is fully walkable
    return false;
  }

  if (level === 1) {
    // Floor 2 bounds: 0..15, 0..9
    if (col < 0 || col > 15 || row < 0 || row > 9) return true;

    // Outer perimeter walls
    if (col === 0 || row === 0) return true;

    // Certain props block tiles (server rack, water cooler)
    if (col === 14 && row === 8) return false; // server rack anchor tile is accessible
    if (col === 1 && row === 8) return false; // bulletin board is accessible

    return false;
  }

  return true;
}

/**
 * Resolves window city view silhouette based on location string.
 */
export function resolveWindowView(location: string): "london" | "delhi" | "bengaluru" | "sf" | "generic" {
  const loc = (location || "").toLowerCase();
  if (loc.includes("london") || loc.includes("uk")) return "london";
  if (loc.includes("delhi") || loc.includes("ncr")) return "delhi";
  if (loc.includes("bengaluru") || loc.includes("bangalore")) return "bengaluru";
  if (loc.includes("san francisco") || loc.includes("sf") || loc.includes("bay area")) return "sf";
  return "generic";
}
