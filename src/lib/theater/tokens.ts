/**
 * Multiverse Theater Design Tokens
 *
 * Implements Section 4.4 and Section 14 (Constraint Amendments) of plan_update.md:
 * - Anti-AI-slop restrained isometric palette
 * - Tile dimensions and floor rise
 * - Agent accent colors restricted to status dots, monitors, chest glyphs
 * - Strict prohibition on large glow/gradient fills
 */

export const THEATER_DIMENSIONS = {
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,
  TILE_WIDTH: 64,
  TILE_HEIGHT: 32,
  FLOOR_RISE: 176, // Height floor 2 sits above floor 1 in screen pixels
  CHAR_WIDTH: 32,
  CHAR_HEIGHT: 48,
  WALK_SPEED_TILES_PER_SEC: 2.5,
  MONITOR_WIDTH: 48,
  MONITOR_HEIGHT: 32,
} as const;

export const THEATER_PALETTE = {
  // Building architectural tokens (muted default)
  wall: "#b8893a", // Interior walls
  wallShade: "#8f6a2c", // Left wall shadow face
  trim: "#1b2a5c", // Wall edge trim
  floorA: "#8fb8c0", // Checker floor tile A
  floorB: "#7fa8b0", // Checker floor tile B
  furnitureDark: "#3a3a44",
  furnitureLight: "#52525b",
  outline: "#111114", // 2px crisp outline
  skyline: "#3f4a63", // Window silhouettes
  windowGlass: "#22334d",
  windowClouds: "#4d5b78",

  // Agent accent colors (strictly used on dots, chest glyphs, monitor textures)
  agentAccents: {
    RONIN: "#0DEEF3", // Teal
    SAGE: "#F5A623", // Amber
    CIPHER: "#00E676", // Green
    MUSE: "#E040FB", // Magenta
    ATLAS: "#448AFF", // Blue
    FORGE: "#FF9100", // Orange
    ECHO: "#7C4DFF", // Purple
    SPARK: "#FF5252", // Red
    NEXUS: "#CCDDEE", // Silver
  },

  // Story health frame borders (2px room border, 6% alpha floor tint)
  statusColors: {
    thriving: "#10b981", // Emerald
    plateau: "#f59e0b", // Amber
    struggling: "#f43f5e", // Rose
    burnout: "#64748b", // Slate
  },

  // Stat chip colors
  statColors: {
    happiness: "#f59e0b",
    health: "#10b981",
    relationships: "#3b82f6",
    career: "#06b6d4",
  },
} as const;

export const AGENT_ROSTER_INFO = {
  RONIN: { name: "RONIN", role: "The Builder", accent: THEATER_PALETTE.agentAccents.RONIN },
  SAGE: { name: "SAGE", role: "The Analyst", accent: THEATER_PALETTE.agentAccents.SAGE },
  CIPHER: { name: "CIPHER", role: "The Coder", accent: THEATER_PALETTE.agentAccents.CIPHER },
  MUSE: { name: "MUSE", role: "The Creative", accent: THEATER_PALETTE.agentAccents.MUSE },
  ATLAS: { name: "ATLAS", role: "The Strategist", accent: THEATER_PALETTE.agentAccents.ATLAS },
  FORGE: { name: "FORGE", role: "The Deployer", accent: THEATER_PALETTE.agentAccents.FORGE },
  ECHO: { name: "ECHO", role: "The Researcher", accent: THEATER_PALETTE.agentAccents.ECHO },
  SPARK: { name: "SPARK", role: "The Tester", accent: THEATER_PALETTE.agentAccents.SPARK },
  NEXUS: { name: "NEXUS", role: "The Coordinator", accent: THEATER_PALETTE.agentAccents.NEXUS },
} as const;
