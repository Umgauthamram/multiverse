# System Constraints & Invariants

## 1. Architectural Constraints
- **Zero-Token Math Rule**: Never use LLMs for financial arithmetic, compounding, or running balance tracking. All currency and runway accounting must be computed deterministically in code.
- **Statistical Invariants**: Player psychological metrics (`happiness`, `health`, `relationships`, `career`) must remain strictly clamped within `[0, 100]`.
- **Token Optimization**: Simulation turns must run in 3-month quarterly blocks (20 steps per timeline) returning only delta JSON objects (`< 80` tokens per step).
- **Multi-Provider Fallback**: Calls must route through `src/lib/ai/router.ts`. HTTP 429 rate limits or transient errors must automatically fall back across the provider chain without dropping user session state.
- **Serverless Database Safety**: MongoDB connections must use the cached singleton in `src/lib/db/mongodb.ts` to prevent connection exhaustion during Next.js serverless execution.

## 2. Design & Aesthetic Constraints (Anti-AI-Slop Manifesto)
- **Typography**: Google Font `Poppins` must be used for all headings, labels, and badges.
- **Color Palette**: Restrained dark warm slate (`#09090b` / `#121215`) with functional status accents (Emerald for thriving, Amber for plateau, Crimson for crisis, Slate for terminated).
- **Prohibited Clichés**: No generic purple/cyan gradient overlays, no sparkle emojis/icons, no floating blurred orbs, and no fake marketing testimonials.
- **Framing Invariant**: The UI and prompts must always state: *"Reflective Simulation Engine, Not a Future Prediction"*.

## 3. Theater Invariants & Exceptions (ADR-003 Amendments)
- **Animation**: Animation is permitted strictly inside the `<canvas>` element of the Multiverse Theater and must strictly honor OS `prefers-reduced-motion` with instant coordinate snaps and relaxed beat pacing.
- **Palette**: Agent accent colors from the roster (teal, amber, green, magenta, blue, orange, purple, red, silver) are permitted *only* on monitor content, status dots, name-tag underlines, and chest glyphs. No gradients, glows, or blurred shapes anywhere in the Theater. The prohibition against purple/cyan gradient overlays remains in full force.
- **Typography**: Google Font `Poppins` remains mandatory for all DOM text and in-canvas labels. Monospace is permitted exclusively inside the CIPHER and RONIN monitor textures for small terminal legibility.
- **Scene Palette**: The building palette (`#b8893a` walls, `#8fb8c0` floors, `#1b2a5c` trim) is strictly scoped to the canvas and does not alter the dark HUD tokens.
- **Zero-Asset Procedural Rendering**: HTML5 Canvas 2D procedural rendering is the sole graphics pipeline. Heavy game engines (Phaser, PixiJS) and PNG sprite sheets are prohibited.
- **Story Count**: The Theater visualizes 4 concurrent stories (`A-bold`, `A-anxious`, `B-balanced`, `B-workaholic`) by default, while the 12-timeline engine remains fully supported through `generate12TimelineSeeds`.
