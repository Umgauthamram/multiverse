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
