/**
 * Procedural Isometric Props & Furniture
 *
 * Implements Section 4.3 of plan_update.md:
 * - Anti-AI-slop restrained isometric props
 * - Office furniture (desks, monitors, server rack, bulletin board, water cooler)
 * - Life Wing room furniture (desks, chairs, sofas, bookshelves, coin stacks, plants, kitchen)
 * - 2px crisp outline in #111114, flat fills, strictly no blurred glows
 */

import { THEATER_PALETTE } from "@/lib/theater/tokens";

const OUTLINE = THEATER_PALETTE.outline;
const FURNITURE_DARK = THEATER_PALETTE.furnitureDark;
const FURNITURE_LIGHT = THEATER_PALETTE.furnitureLight;

function safeEllipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  rotation = 0
): void {
  if (typeof ctx.ellipse === "function") {
    ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  } else {
    ctx.save();
    ctx.translate(x, y);
    if (rotation !== 0) ctx.rotate(rotation);
    ctx.scale(rx, ry);
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.restore();
  }
}

function safeRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  if (typeof ctx.rect === "function") {
    ctx.rect(x, y, w, h);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  }
}

/**
 * Draws an isometric office desk with monitor.
 * Centered at tile anchor (x, y).
 */
export function drawDesk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  accentColor: string = THEATER_PALETTE.trim,
  monitorData?: { label?: string; progress?: number; code?: string },
  screenSource?: CanvasImageSource | null,
  options?: {
    careerTier?: number;
    hasPillBottle?: boolean;
    coffeeCups?: number;
  }
): void {
  ctx.save();
  ctx.translate(x, y);

  ctx.lineWidth = 2;
  ctx.strokeStyle = OUTLINE;
  ctx.lineJoin = "round";

  // Desk surface (isometric diamond / rectangle)
  ctx.fillStyle = FURNITURE_LIGHT;
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(24, -2);
  ctx.lineTo(0, 10);
  ctx.lineTo(-24, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Desk legs & front face
  ctx.fillStyle = FURNITURE_DARK;
  ctx.beginPath();
  ctx.moveTo(-24, -2);
  ctx.lineTo(0, 10);
  ctx.lineTo(0, 20);
  ctx.lineTo(-24, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(24, -2);
  ctx.lineTo(24, 8);
  ctx.lineTo(0, 20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Monitor stand
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(-3, -18, 6, 6);
  ctx.strokeRect(-3, -18, 6, 6);

  // Monitor bezel
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.roundRect(-16, -34, 32, 20, 2);
  ctx.fill();
  ctx.stroke();

  // Monitor screen (procedural texture area)
  ctx.fillStyle = "#020617";
  ctx.fillRect(-14, -32, 28, 16);

  // Draw real 48x32 monitor texture if available
  if (screenSource) {
    try {
      ctx.drawImage(screenSource, -14, -32, 28, 16);
    } catch {
      // Fallback
    }
  } else if (accentColor) {
    // Tiny screen content representation
    ctx.fillStyle = accentColor;
    ctx.fillRect(-12, -30, 8, 2);
    ctx.fillRect(-12, -26, 16, 2);
    ctx.fillRect(-12, -22, 12, 2);

    if (monitorData?.progress !== undefined) {
      // Small progress line
      ctx.fillStyle = accentColor;
      ctx.fillRect(-12, -19, Math.floor(24 * Math.min(1, monitorData.progress)), 2);
    }
  }

  // Career setup accessories
  const careerTier = options?.careerTier ?? 1;
  if (careerTier >= 1) {
    // Small notebook
    ctx.fillStyle = "#fef08a";
    ctx.fillRect(-18, 0, 7, 5);
    ctx.strokeRect(-18, 0, 7, 5);
  }
  if (careerTier >= 3) {
    // Award plaque on desk corner
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(16, -8, 5, 8);
    ctx.strokeRect(16, -8, 5, 8);
  }

  // Health < 35 Pill bottle
  if (options?.hasPillBottle) {
    ctx.fillStyle = "#ea580c";
    ctx.fillRect(-16, -6, 5, 7);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-16, -8, 5, 3);
    ctx.strokeRect(-16, -8, 5, 9);
  }

  // Coffee cups (for workaholic / tired)
  const cups = options?.coffeeCups ?? 0;
  for (let c = 0; c < Math.min(2, cups); c++) {
    const cx = 10 + c * 6;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(cx, 1, 4, 5);
    ctx.strokeRect(cx, 1, 4, 5);
  }

  ctx.restore();
}

/**
 * Draws an isometric office chair.
 */
export function drawChair(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);

  ctx.lineWidth = 2;
  ctx.strokeStyle = OUTLINE;

  // Seat
  ctx.fillStyle = "#334155";
  ctx.beginPath();
  safeEllipse(ctx, 0, 0, 10, 6, 0);
  ctx.fill();
  ctx.stroke();

  // Backrest
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.roundRect(-8, -16, 16, 12, 3);
  ctx.fill();
  ctx.stroke();

  // Stand
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(-2, 3, 4, 8);

  ctx.restore();
}

/**
 * Draws reception desk for NEXUS.
 */
export function drawReceptionDesk(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  screenSource?: CanvasImageSource | null
): void {
  ctx.save();
  ctx.translate(x, y);

  ctx.lineWidth = 2;
  ctx.strokeStyle = OUTLINE;

  // Countertop
  ctx.fillStyle = "#475569";
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(32, -2);
  ctx.lineTo(0, 14);
  ctx.lineTo(-32, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Front panel
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.moveTo(-32, -2);
  ctx.lineTo(0, 14);
  ctx.lineTo(0, 28);
  ctx.lineTo(-32, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.lineTo(32, -2);
  ctx.lineTo(32, 12);
  ctx.lineTo(0, 28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Small receptionist sign
  ctx.fillStyle = THEATER_PALETTE.agentAccents.NEXUS;
  ctx.fillRect(-10, 6, 20, 4);

  // Reception terminal screen if available
  if (screenSource) {
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(8, -26, 22, 15);
    ctx.strokeRect(8, -26, 22, 15);
    try {
      ctx.drawImage(screenSource, 9, -25, 20, 13);
    } catch {
      // Fallback
    }
  }

  ctx.restore();
}

/**
 * Draws server rack with blinking activity LEDs.
 */
export function drawServerRack(ctx: CanvasRenderingContext2D, x: number, y: number, frameTick = 0): void {
  ctx.save();
  ctx.translate(x, y);

  ctx.lineWidth = 2;
  ctx.strokeStyle = OUTLINE;

  // Server rack cabinet
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.moveTo(0, -36);
  ctx.lineTo(18, -26);
  ctx.lineTo(0, -16);
  ctx.lineTo(-18, -26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.moveTo(-18, -26);
  ctx.lineTo(0, -16);
  ctx.lineTo(0, 18);
  ctx.lineTo(-18, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#090d16";
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(18, -26);
  ctx.lineTo(18, 8);
  ctx.lineTo(0, 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Server slot blades & LEDs
  for (let i = 0; i < 4; i++) {
    const slotY = -10 + i * 7;
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(2, slotY);
    ctx.lineTo(14, slotY - 6);
    ctx.stroke();

    // Blinking green/amber LEDs
    const isLit = (frameTick + i) % 3 === 0;
    ctx.fillStyle = isLit ? "#00E676" : "#0d9488";
    ctx.fillRect(4, slotY - 1, 2, 2);
    ctx.fillStyle = (frameTick + i) % 2 === 0 ? "#F5A623" : "#78350f";
    ctx.fillRect(8, slotY - 3, 2, 2);
  }

  ctx.restore();
}

/**
 * Draws water cooler.
 */
export function drawWaterCooler(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);

  ctx.lineWidth = 2;
  ctx.strokeStyle = OUTLINE;

  // Base
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(-6, -6, 12, 16);
  ctx.strokeRect(-6, -6, 12, 16);

  // Water bottle (blue translucent)
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  ctx.roundRect(-5, -22, 10, 16, [4, 4, 1, 1]);
  ctx.fill();
  ctx.stroke();

  // Water level
  ctx.fillStyle = "#0284c7";
  ctx.fillRect(-4, -14, 8, 7);

  ctx.restore();
}

/**
 * Draws bulletin board.
 */
export function drawBulletinBoard(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);

  ctx.lineWidth = 2;
  ctx.strokeStyle = OUTLINE;

  // Cork board
  ctx.fillStyle = "#b45309";
  ctx.fillRect(-16, -24, 32, 20);
  ctx.strokeRect(-16, -24, 32, 20);

  // Sticky notes
  ctx.fillStyle = "#fef08a"; // Yellow note
  ctx.fillRect(-12, -20, 6, 6);
  ctx.fillStyle = "#fed7aa"; // Orange note
  ctx.fillRect(-2, -18, 7, 7);
  ctx.fillStyle = "#a7f3d0"; // Green note
  ctx.fillRect(7, -21, 6, 6);

  ctx.restore();
}

/**
 * Draws living room sofa.
 */
export function drawSofa(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);

  ctx.lineWidth = 2;
  ctx.strokeStyle = OUTLINE;

  // Seat cushion
  ctx.fillStyle = "#475569";
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(22, 1);
  ctx.lineTo(0, 12);
  ctx.lineTo(-22, 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Backrest
  ctx.fillStyle = "#334155";
  ctx.beginPath();
  ctx.moveTo(-22, 1);
  ctx.lineTo(-22, -12);
  ctx.lineTo(0, -23);
  ctx.lineTo(22, -12);
  ctx.lineTo(22, 1);
  ctx.lineTo(0, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws bookshelf with variable coin stacks.
 * coinTier: 0 (<25%), 1 (25-75%), 2 (75-150%), 3 (>150%)
 */
export function drawBookshelf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  coinTier = 2
): void {
  ctx.save();
  ctx.translate(x, y);

  ctx.lineWidth = 2;
  ctx.strokeStyle = OUTLINE;

  // Shelf frame
  ctx.fillStyle = "#78350f";
  ctx.fillRect(-14, -30, 28, 36);
  ctx.strokeRect(-14, -30, 28, 36);

  // Shelf divisions
  ctx.fillStyle = "#451a03";
  ctx.fillRect(-12, -28, 24, 10);
  ctx.fillRect(-12, -15, 24, 10);
  ctx.fillRect(-12, -2, 24, 6);

  // Books (colored spines)
  ctx.fillStyle = "#dc2626";
  ctx.fillRect(-10, -27, 4, 8);
  ctx.fillStyle = "#2563eb";
  ctx.fillRect(-5, -27, 3, 8);
  ctx.fillStyle = "#16a34a";
  ctx.fillRect(-1, -27, 4, 8);

  // Coin stacks on middle/bottom shelf
  drawCoinStacks(ctx, 4, -8, coinTier);

  ctx.restore();
}

/**
 * Draws coin stacks (0 to 3 stacks).
 */
export function drawCoinStacks(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tier: number
): void {
  if (tier <= 0) return;

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = "#f59e0b";
  ctx.strokeStyle = "#78350f";
  ctx.lineWidth = 1;

  for (let s = 0; s < tier; s++) {
    const stackX = s * 5;
    const heightCoins = s === 0 ? 3 : s === 1 ? 5 : 7;
    for (let c = 0; c < heightCoins; c++) {
      const cy = -c * 2;
      ctx.beginPath();
      safeEllipse(ctx, stackX, cy, 3, 1.5, 0);
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Draws kitchen counter with coffee machine.
 */
export function drawKitchenCounter(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);

  ctx.lineWidth = 2;
  ctx.strokeStyle = OUTLINE;

  // Countertop
  ctx.fillStyle = "#94a3b8";
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(20, -2);
  ctx.lineTo(0, 8);
  ctx.lineTo(-20, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cabinet base
  ctx.fillStyle = "#475569";
  ctx.beginPath();
  ctx.moveTo(-20, -2);
  ctx.lineTo(0, 8);
  ctx.lineTo(0, 22);
  ctx.lineTo(-20, 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(20, -2);
  ctx.lineTo(20, 12);
  ctx.lineTo(0, 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Coffee machine
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(-6, -22, 10, 12);
  ctx.strokeRect(-6, -22, 10, 12);

  // Tiny red indicator LED
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(-4, -14, 2, 2);

  ctx.restore();
}

/**
 * Draws house plant.
 * Alive if happiness >= 35, wilted if sad/burnout.
 */
export function drawPlant(ctx: CanvasRenderingContext2D, x: number, y: number, isAlive = true): void {
  ctx.save();
  ctx.translate(x, y);

  ctx.lineWidth = 2;
  ctx.strokeStyle = OUTLINE;

  // Pot
  ctx.fillStyle = "#b45309";
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(6, 0);
  ctx.lineTo(4, 10);
  ctx.lineTo(-4, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Leaves
  if (isAlive) {
    ctx.fillStyle = "#15803d";
    ctx.beginPath();
    safeEllipse(ctx, 0, -8, 7, 10, 0);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    safeEllipse(ctx, 4, -6, 5, 7, Math.PI / 4);
    ctx.fill();
    ctx.stroke();
  } else {
    // Wilted brownish leaves
    ctx.fillStyle = "#78350f";
    ctx.beginPath();
    safeEllipse(ctx, 3, -2, 6, 4, Math.PI / 3);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws cardboard box (visible on layoff/struggling).
 */
export function drawCardboardBox(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);

  ctx.lineWidth = 2;
  ctx.strokeStyle = OUTLINE;

  ctx.fillStyle = "#d97706";
  ctx.fillRect(-8, -6, 16, 12);
  ctx.strokeRect(-8, -6, 16, 12);

  // Flaps
  ctx.strokeStyle = "#92400e";
  ctx.beginPath();
  ctx.moveTo(-8, -2);
  ctx.lineTo(8, -2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws relationship photo frame on wall.
 */
export function drawWallPhotoFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  tier: number
): void {
  if (tier <= 0) return;

  ctx.save();
  ctx.translate(x, y);

  ctx.lineWidth = 2;
  ctx.strokeStyle = OUTLINE;

  // Wood frame
  ctx.fillStyle = "#78350f";
  ctx.fillRect(-8, -10, 16, 14);
  ctx.strokeRect(-8, -10, 16, 14);

  // Photo insert
  ctx.fillStyle = tier >= 2 ? "#f472b6" : "#cbd5e1";
  ctx.fillRect(-6, -8, 12, 10);

  // Small heart or silhouettes
  if (tier >= 2) {
    ctx.fillStyle = "#be185d";
    ctx.fillRect(-2, -4, 4, 3);
  }

  ctx.restore();
}

/**
 * Draws room window with city skyline silhouette.
 * Flat-color restrained silhouette in THEATER_PALETTE.skyline.
 */
export function drawWindowWithSkyline(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  city: "london" | "delhi" | "bengaluru" | "sf" | "generic" = "generic",
  isDim = false
): void {
  ctx.save();
  ctx.translate(x, y);

  ctx.lineWidth = 2;
  ctx.strokeStyle = OUTLINE;

  const skyColor = isDim ? "#1a2233" : "#22334d";
  const silhouetteColor = isDim ? "#2b354b" : THEATER_PALETTE.skyline;

  // Window frame & sky pane
  ctx.fillStyle = skyColor;
  ctx.fillRect(-20, -32, 40, 32);
  ctx.strokeRect(-20, -32, 40, 32);

  // City Skyline Silhouettes
  ctx.fillStyle = silhouetteColor;
  ctx.beginPath();
  if (city === "london") {
    safeRect(ctx, -16, -26, 6, 26); // Big Ben tower
    safeRect(ctx, -17, -29, 8, 3);  // Spire base
    safeRect(ctx, -8, -14, 12, 14); // Low-rise
    ctx.arc(10, -12, 7, Math.PI, 0); // London Eye arch
  } else if (city === "delhi") {
    safeRect(ctx, -18, -12, 8, 12);
    safeRect(ctx, -8, -22, 16, 22); // India Gate frame
    safeRect(ctx, 10, -14, 8, 14);
  } else if (city === "bengaluru") {
    safeRect(ctx, -18, -16, 12, 16);
    ctx.arc(-12, -16, 5, Math.PI, 0); // Vidhana Soudha dome
    safeRect(ctx, -2, -26, 10, 26); // Modern IT tower
    safeRect(ctx, 10, -20, 8, 20);
  } else if (city === "sf") {
    safeRect(ctx, -18, -28, 4, 28); // Bridge tower
    safeRect(ctx, -12, -28, 4, 28);
    // Transamerica pyramid
    ctx.moveTo(8, -4);
    ctx.lineTo(13, -28);
    ctx.lineTo(18, -4);
    ctx.closePath();
  } else {
    // Generic city towers
    safeRect(ctx, -18, -20, 8, 20);
    safeRect(ctx, -8, -28, 12, 28);
    safeRect(ctx, 6, -22, 12, 22);
  }
  ctx.fill();

  // Window mullions (cross panes)
  ctx.strokeStyle = THEATER_PALETTE.trim;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -32);
  ctx.lineTo(0, 0);
  ctx.moveTo(-20, -16);
  ctx.lineTo(20, -16);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws small wall calendar showing current simulation quarter.
 */
export function drawWallCalendar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  quarter = 1
): void {
  ctx.save();
  ctx.translate(x, y);

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = OUTLINE;

  // White calendar sheet
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(-6, -8, 12, 14);
  ctx.strokeRect(-6, -8, 12, 14);

  // Red header
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(-6, -8, 12, 4);

  // Quarter text
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 6px sans-serif";
  ctx.fillText(`Q${quarter}`, -4, 2);

  ctx.restore();
}

/**
 * Draws in-canvas floating text pop (cash delta or stat hit) drifting upward.
 */
export function drawFloatingTextPop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
  progress: number // 0.0 to 1.0
): void {
  ctx.save();
  const offsetY = -progress * 26;
  ctx.translate(x, y + offsetY);

  const alpha = Math.max(0, 1.0 - progress * progress);
  ctx.globalAlpha = alpha;

  ctx.font = "bold 11px sans-serif";
  const tw = ctx.measureText(text).width;

  // Dark pill container for contrast
  ctx.fillStyle = "rgba(11, 15, 25, 0.85)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-tw / 2 - 5, -10, tw + 10, 17, 4);
  ctx.fill();
  ctx.stroke();

  // Crisp text
  ctx.fillStyle = color;
  ctx.fillText(text, -tw / 2, 3);

  ctx.restore();
}
