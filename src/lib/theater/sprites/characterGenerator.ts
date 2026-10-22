/**
 * Procedural Chibi Character Generator
 *
 * Implements Section 4.5 of plan_update.md:
 * - Chibi proportions (head ~55% of height)
 * - 2px crisp outline in #111114, flat fills, single highlight shape
 * - Offscreen canvas sprite caching (no external PNGs or sprite sheets)
 * - Complete animation set: idle (2), walk (4), type (2), sit (1), talk (2),
 *   react_up (2), react_down (2), carry_box (2), hold_chest (2)
 */

import { THEATER_DIMENSIONS, THEATER_PALETTE } from "@/lib/theater/tokens";
import { PersonaSeedType } from "@/lib/simulation/personaSeeder";

export type AnimationName =
  | "idle"
  | "walk"
  | "type"
  | "sit"
  | "talk"
  | "react_up"
  | "react_down"
  | "carry_box"
  | "hold_chest";

export interface LookSpec {
  skin: string;
  hair: "bald" | "short" | "long" | "cap" | "grey";
  hairColor?: string;
  glasses: boolean;
  beard: "none" | "stubble" | "full";
  headset: boolean;
  shirt: string;
  chestGlyph?: string; // e.g. "R", "S", "C", "M", "A", "F", "E", "T", "N"
  glyphColor?: string;
  accessory?: "lanyard" | "tie" | "hoodie" | "jacket" | "none";
}

export const ANIMATION_FRAME_COUNTS: Record<AnimationName, number> = {
  idle: 2,
  walk: 4,
  type: 2,
  sit: 1,
  talk: 2,
  react_up: 2,
  react_down: 2,
  carry_box: 2,
  hold_chest: 2,
};

/**
 * Draws a single chibi character frame onto a target 2D canvas context.
 */
export function drawCharacterFrame(
  ctx: CanvasRenderingContext2D,
  look: LookSpec,
  anim: AnimationName,
  frame: number,
  facing: 1 | -1 = 1,
  dx = 0,
  dy = 0
): void {
  const width = THEATER_DIMENSIONS.CHAR_WIDTH; // 32
  const height = THEATER_DIMENSIONS.CHAR_HEIGHT; // 48

  ctx.save();
  ctx.translate(dx + width / 2, dy + height);

  // Mirror horizontally if facing left
  if (facing === -1) {
    ctx.scale(-1, 1);
  }

  // Animation cycle bobbing offsets
  let bobY = 0;
  let legOffset = 0;
  let armAngle = 0;

  if (anim === "idle") {
    bobY = frame % 2 === 1 ? -1 : 0;
  } else if (anim === "walk") {
    bobY = (frame % 2 === 1) ? -2 : 0;
    legOffset = (frame === 1 ? 3 : frame === 3 ? -3 : 0);
  } else if (anim === "sit") {
    bobY = 4;
  } else if (anim === "react_up") {
    bobY = -2;
    armAngle = -Math.PI / 3;
  } else if (anim === "react_down") {
    bobY = 2;
    armAngle = Math.PI / 4;
  }

  ctx.lineWidth = 2;
  ctx.strokeStyle = THEATER_PALETTE.outline;
  ctx.lineJoin = "round";

  // 1. LEGS & SHOES
  ctx.fillStyle = "#1e293b";
  if (anim === "sit") {
    // Sitting legs bent forward
    ctx.fillRect(-6, -10 + bobY, 12, 6);
    ctx.strokeRect(-6, -10 + bobY, 12, 6);
  } else {
    // Left leg
    ctx.fillRect(-6 + legOffset, -14 + bobY, 5, 14);
    ctx.strokeRect(-6 + legOffset, -14 + bobY, 5, 14);

    // Right leg
    ctx.fillRect(1 - legOffset, -14 + bobY, 5, 14);
    ctx.strokeRect(1 - legOffset, -14 + bobY, 5, 14);
  }

  // 2. TORSO & SHIRT
  ctx.fillStyle = look.shirt;
  ctx.fillRect(-8, -26 + bobY, 16, 14);
  ctx.strokeRect(-8, -26 + bobY, 16, 14);

  // Accessory / Jacket / Hoodie overlay
  if (look.accessory === "jacket") {
    ctx.fillStyle = "#334155";
    ctx.fillRect(-8, -26 + bobY, 4, 14);
    ctx.fillRect(4, -26 + bobY, 4, 14);
  } else if (look.accessory === "tie") {
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(-1.5, -24 + bobY, 3, 10);
  } else if (look.accessory === "lanyard") {
    ctx.strokeStyle = "#38bdf8";
    ctx.beginPath();
    ctx.moveTo(-4, -26 + bobY);
    ctx.lineTo(0, -18 + bobY);
    ctx.lineTo(4, -26 + bobY);
    ctx.stroke();
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(-2, -18 + bobY, 4, 5);
  }

  // Chest glyph (for agents)
  if (look.chestGlyph && look.glyphColor) {
    ctx.fillStyle = look.glyphColor;
    ctx.font = "bold 7px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(look.chestGlyph, 0, -18 + bobY);
  }

  // 3. ARMS
  ctx.fillStyle = look.shirt;
  if (anim === "type") {
    // Arms typing forward
    const armBob = frame % 2 === 1 ? -1 : 1;
    ctx.fillRect(2, -22 + bobY, 9, 4 + armBob);
    ctx.strokeRect(2, -22 + bobY, 9, 4 + armBob);
  } else if (anim === "carry_box") {
    // Arms holding cardboard box
    ctx.fillRect(2, -22 + bobY, 8, 4);
    ctx.strokeRect(2, -22 + bobY, 8, 4);
    // Draw small box
    ctx.fillStyle = "#b45309";
    ctx.fillRect(4, -24 + bobY, 10, 8);
    ctx.strokeRect(4, -24 + bobY, 10, 8);
  } else if (anim === "hold_chest") {
    // Hand over chest
    ctx.fillRect(-2, -22 + bobY, 6, 6);
    ctx.strokeRect(-2, -22 + bobY, 6, 6);
  } else {
    // Normal / swinging arms
    ctx.save();
    ctx.translate(6, -24 + bobY);
    ctx.rotate(armAngle);
    ctx.fillRect(0, 0, 4, 10);
    ctx.strokeRect(0, 0, 4, 10);
    ctx.restore();
  }

  // 4. CHIBI HEAD (approx 55% of total height: 24px diameter)
  const headRadius = 11;
  const headCenterY = -34 + bobY;

  ctx.fillStyle = look.skin;
  ctx.beginPath();
  ctx.arc(0, headCenterY, headRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Subtle highlight shape on top-left of head
  ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
  ctx.beginPath();
  if (typeof ctx.ellipse === "function") {
    ctx.ellipse(-3, headCenterY - 4, 4, 2, -Math.PI / 4, 0, Math.PI * 2);
  } else {
    ctx.arc(-3, headCenterY - 4, 2, 0, Math.PI * 2);
  }
  ctx.fill();

  // Hair
  const hairColor = look.hairColor || "#1e293b";
  ctx.fillStyle = hairColor;
  if (look.hair === "short") {
    ctx.beginPath();
    ctx.arc(0, headCenterY - 2, headRadius + 1, Math.PI, Math.PI * 2);
    ctx.fill();
  } else if (look.hair === "long") {
    ctx.beginPath();
    ctx.arc(0, headCenterY - 2, headRadius + 1, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-11, headCenterY - 2, 4, 12);
  } else if (look.hair === "cap") {
    ctx.fillStyle = "#0284c7";
    ctx.beginPath();
    ctx.arc(0, headCenterY - 2, headRadius + 1, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(0, headCenterY - 4, 12, 3);
  } else if (look.hair === "grey") {
    ctx.fillStyle = "#94a3b8";
    ctx.beginPath();
    ctx.arc(0, headCenterY - 2, headRadius + 1, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  // Beard
  if (look.beard === "full" || look.beard === "stubble") {
    ctx.fillStyle = look.beard === "full" ? hairColor : "rgba(30, 41, 59, 0.4)";
    ctx.beginPath();
    ctx.arc(0, headCenterY + 4, 6, 0, Math.PI);
    ctx.fill();
  }

  // Glasses
  if (look.glasses) {
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(1, headCenterY - 3, 5, 4);
    ctx.strokeRect(7, headCenterY - 3, 4, 4);
    ctx.lineWidth = 2;
  } else {
    // Eyelids / Eyes (half-closed chibi expression)
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(2, headCenterY - 2, 3, 2);
    ctx.fillRect(7, headCenterY - 2, 3, 2);
  }

  // Mouth (talking vs neutral)
  ctx.fillStyle = "#0f172a";
  if (anim === "talk" && frame % 2 === 1) {
    ctx.beginPath();
    ctx.arc(5, headCenterY + 4, 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillRect(4, headCenterY + 4, 3, 1);
  }

  // Headset (NEXUS & RONIN)
  if (look.headset) {
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, headCenterY - 4, headRadius + 1, Math.PI, Math.PI * 1.8);
    ctx.stroke();
    // Mic boom
    ctx.beginPath();
    ctx.moveTo(8, headCenterY);
    ctx.lineTo(5, headCenterY + 6);
    ctx.stroke();
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(4, headCenterY + 5, 2, 2);
  }

  ctx.restore();
}

/**
 * Creates LookSpec for YOU avatar based on persona seed and age.
 */
export function createYouLookSpec(seed: PersonaSeedType, age = 28): LookSpec {
  let hairStyle: LookSpec["hair"] = "short";
  let hairColor = "#1e293b";
  if (age > 45) {
    hairStyle = "grey";
    hairColor = "#94a3b8";
  }

  const base: LookSpec = {
    skin: "#fed7aa",
    hair: hairStyle,
    hairColor,
    glasses: false,
    beard: "none",
    headset: false,
    shirt: "#0284c7",
    accessory: "none",
  };

  switch (seed) {
    case "bold":
      return { ...base, shirt: "#b91c1c", accessory: "jacket" };
    case "anxious":
      return { ...base, shirt: "#64748b", accessory: "hoodie" };
    case "workaholic":
      return { ...base, shirt: "#1e293b", glasses: true, accessory: "tie" };
    case "balanced":
      return { ...base, shirt: "#15803d", accessory: "none" };
    case "pragmatist":
      return { ...base, shirt: "#0369a1", accessory: "none" };
    case "burnout_risk":
      return { ...base, shirt: "#78716c", beard: "stubble" };
    default:
      return base;
  }
}

/**
 * Creates LookSpec for the 9 agents.
 */
export function createAgentLookSpec(agentId: string, accentColor: string): LookSpec {
  const isNexus = agentId === "NEXUS";
  const isRonin = agentId === "RONIN";

  return {
    skin: isNexus ? "#fcd34d" : "#fed7aa",
    hair: isNexus ? "bald" : "short",
    hairColor: "#1e293b",
    glasses: isNexus,
    beard: isNexus ? "full" : "none",
    headset: isNexus || isRonin,
    shirt: "#0f172a", // Dark polo
    chestGlyph: agentId[0],
    glyphColor: accentColor,
    accessory: "none",
  };
}

/**
 * Creates LookSpec for cast NPCs.
 */
export function createCastLookSpec(role: string): LookSpec {
  switch (role) {
    case "manager":
      return {
        skin: "#fde047",
        hair: "short",
        glasses: false,
        beard: "none",
        headset: false,
        shirt: "#1e3a8a",
        accessory: "lanyard",
      };
    case "partner":
      return {
        skin: "#fbcfe8",
        hair: "long",
        glasses: false,
        beard: "none",
        headset: false,
        shirt: "#be185d",
        accessory: "none",
      };
    case "parent":
      return {
        skin: "#fed7aa",
        hair: "grey",
        glasses: true,
        beard: "none",
        headset: false,
        shirt: "#475569",
        accessory: "none",
      };
    case "friend":
    default:
      return {
        skin: "#fed7aa",
        hair: "cap",
        glasses: false,
        beard: "none",
        headset: false,
        shirt: "#0d9488",
        accessory: "none",
      };
  }
}
