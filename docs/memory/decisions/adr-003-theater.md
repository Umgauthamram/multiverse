# ADR 003: Multiverse Theater Live Visualization Layer

## Context
Simulating 4 parallel life paths across 5 years (20 quarters each = 80 simulation steps) requires between 120 and 180 seconds when communicating with live multi-provider LLMs. Traditional loading spinners or progress bars cause user detachment and fail to convey the deep multi-agent deliberation, financial compounding, and stochastic event processing happening under the hood.

At the same time, introducing a visual layer risked violating core project invariants: the Zero-Token Math Rule, bundle size limits, asset licensing risks, and the strict Anti-AI-Slop design system.

## Decision
We implemented **The Multiverse Theater**: an imperative, zero-dependency 2D HTML5 Canvas procedural isometric simulation engine driven by an append-only, closed **Scene Language** streaming over SSE.

### 1. Architectural Highlights
- **Dual-Floor Isometric Architecture**:
  - **Floor 2 (Agent Office)**: 9 specialized agents (RONIN, SAGE, CIPHER, MUSE, ATLAS, FORGE, ECHO, SPARK, NEXUS) with 8 FPS procedural CRT and flat monitor textures showing real-time code runs, financial balance computations, and test assertions.
  - **Floor 1 (Life Wing)**: 4 parallel story rooms (S1 to S4) where procedural chibi avatars live 4 counterfactual futures, walking between anchors, receiving visitor NPCs, experiencing life events, and reacting with speech bubbles and floating stat pops.
- **Closed Scene Language (`sceneLanguage.ts`)**:
  - The backend emits minimal ASCII verb lines (`@S1 ENTER`, `@S2 CALC`, `@* REROUTE`, `@S3 SAY`, `@ALL FINISH`).
  - Strict separation of concerns: Backend owns semantic state; frontend owns all layout coordinates, pixels, colors, and animation pacing.
- **Zero-Token Math Rule Preserved**:
  - All numbers rendered on monitors, room badges, and live tickers originate strictly from deterministic engines (`financeEngine`, `statClamper`, `eventRoller`) or pre-generated agent responses.
  - Exactly **zero** new LLM tokens and zero new API calls are introduced by the Theater.
- **Zero-Asset Procedural Graphics**:
  - All walls, floors, desks, monitors, characters, expressions, and props are drawn procedurally via code. Zero external PNG sprite sheets or font raster assets are loaded.

### 2. Constraint Amendments & Exceptions (Section 14 of `plan_update.md`)
To maintain architectural integrity, the following 6 explicit amendments were ratified:
1. **Animation**: Animation is strictly permitted inside the Theater `<canvas>` element and must honor OS `prefers-reduced-motion` by providing instant snaps, zero walking interpolation, and calm 3000ms beat pacing.
2. **Palette**: Agent accent colors from the roster (teal, amber, green, magenta, blue, orange, purple, red, silver) are permitted *only* on monitor content, status dots, name-tag underlines, and chest glyphs. No gradients, glows, or blurred shapes are allowed anywhere in the Theater.
3. **Typography**: Google Font `Poppins` remains mandatory for all DOM text and in-canvas labels. Monospace is permitted exclusively inside the CIPHER and RONIN monitor textures for small terminal legibility.
4. **Scene Palette**: The muted isometric building palette (`#b8893a` walls, `#8fb8c0` floors, `#1b2a5c` trim) is strictly scoped to the canvas and does not alter the dark slate HUD design tokens.
5. **Procedural Rendering**: Third-party game engines (Phaser, PixiJS, Three.js) and raster sprite sheets are rejected; Canvas 2D procedural rendering is the sole graphics pipeline.
6. **Story Count**: The Theater visualizes 4 concurrent stories by default (`A-bold`, `A-anxious`, `B-balanced`, `B-workaholic`) while preserving complete backward compatibility with the 12-timeline simulation engine.

## Status
Accepted and verified across automated test suites (`tests/unit/theaterPhase9.test.ts`, `tests/unit/theaterUI.test.tsx`, `tests/unit/theaterReveal.test.tsx`).
