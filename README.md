# Multiverse You

> **A Counterfactual Life-Simulation Engine for High-Stakes Decisions**  
> *"Reflective Simulation Engine, Not a Future Prediction"*

[![CI Pipeline](https://github.com/Umgauthamram/multiverse/actions/workflows/ci.yml/badge.svg)](https://github.com/Umgauthamram/multiverse/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.4-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Vitest](https://img.shields.io/badge/Tests-46%20Suites%20%7C%20292%20Passing-emerald)](https://vitest.dev/)

---

## 1. What Problem It Solves

When people face high-stakes life crossroads—such as choosing between an early-stage startup in London versus a stable corporate leadership role in Delhi—they often suffer from **decision paralysis**, anxiety, and one-dimensional thinking.

Traditional tools fall short:
- **Generic LLM Advice**: Off-the-shelf chatbots produce bland lists of pros and cons, lack temporal grounding, and hallucinate financial numbers.
- **Cognitive Bias**: Humans struggle to model how compounding factors (burnout, lifestyle creep, isolation, relationship stress, or macroeconomic shocks) interact over 5 years.

**Multiverse You** solves this by forking the dilemma into **parallel counterfactual futures** simulated across a 5-year horizon (20 quarterly steps) under distinct psychological personas (*bold*, *anxious*, *balanced*, *workaholic*). 

The platform combines:
1. **Multiverse Theater**: A 2D procedural isometric simulation visualizer showing autonomous AI agents coordinating on the upper floor while parallel lives unfold in dedicated rooms below.
2. **Branching Multiverse Tree**: An interactive canvas enabling scrubbable quarterly deep-dives with granular diary reflections.
3. **Gemini Long-Context Finale Analysis**: Cross-timeline synthesis producing a **Regret Heatmap**, a **Comparative Matrix**, and the **3 Critical Divergence Points**.

> **Important Invariant**: The application is strictly a reflective thought-experiment sandbox, **not** a psychic predictive tool.

---

## 2. What I Personally Implemented

### A. Zero-Token Deterministic Math & State Invariant Engine
- **Financial Engine** ([`src/lib/simulation/financeEngine.ts`](src/lib/simulation/financeEngine.ts)): Strict separation of math and narrative. LLMs are prohibited from performing financial arithmetic. All quarterly net worth changes, income, cost of living, compounding runway, and taxes are computed deterministically.
- **Statistical Clamper & Burnout Rules** ([`src/lib/simulation/statClamper.ts`](src/lib/simulation/statClamper.ts)): Invariant guards ensuring Joy, Health, Relationships, and Career stay strictly bounded in `[0, 100]`. Implemented the non-linear burnout rule: sustained health/joy below 20 triggers career penalties and mandatory recovery states.
- **Stochastic Life Event Roller** ([`src/lib/simulation/eventRoller.ts`](src/lib/simulation/eventRoller.ts)): Seeded pseudo-random event generator with weighted distributions (layoffs, promotions, windfalls, health crises, serendipitous encounters).

### B. Multi-Provider Resilient LLM Router
- **Automated Fallback Router** ([`src/lib/ai/router.ts`](src/lib/ai/router.ts)): Implemented resilient provider routing with zero user-state loss when encountering HTTP 429 rate limits or upstream provider outages.
- **Tiered Multi-LLM Orchestration** ([`src/lib/ai/providers.ts`](src/lib/ai/providers.ts)):
  - **Groq (`llama-3.1-8b-instant` / `llama-3.3-70b`)**: Sub-second execution for quarterly delta steps.
  - **NVIDIA NIM (`llama-3.1-70b-instruct`)**: Nuanced persona seeds and character generation.
  - **Google Gemini 2.5 Flash**: 1M+ token context window used by the Narrator agent to read all 4 parallel timelines simultaneously and synthesize comparative cross-universe regret heatmaps.

### C. Procedural 2D Isometric Multiverse Theater
- **Procedural Canvas Renderer** ([`src/lib/theater/renderer.ts`](src/lib/theater/renderer.ts)): Zero-dependency, 60 FPS HTML5 Canvas isometric engine. All characters, floors, walls, desks, screens, and props are rendered entirely via code with zero external raster/image assets.
- **Floor 2 (Agent Office)** ([`src/lib/theater/sprites/screens.ts`](src/lib/theater/sprites/screens.ts)): 9 animated agents with live monitor textures displaying running code, financial formula calculations, and test assertions.
- **Floor 1 (Life Wing)**: 4 parallel story rooms responding to incoming Scene Language events with dynamic lighting, avatar walking, NPC visits, furniture degradation/upgrades, and text bubbles.
- **A\* Grid Pathfinding** ([`src/lib/theater/pathfinding.ts`](src/lib/theater/pathfinding.ts)): 2D isometric obstacle avoidance for characters navigating between desks, doors, and social hubs.
- **Accessibility & Reduced Motion**: Full automatic detection of OS `prefers-reduced-motion: reduce` with instant coordinate snapping, zero walking interpolation, suppressed packet/pop animations, and relaxed 3-second beat pacing.
- **Resilience & Demo Scenarios**: Interactive testing via `?demo=1&scenario=reroute | error | stall | fast` with NEXUS provider rerouting and SPARK rate-limit recovery.
- **LLM Safety Guardrail**: In-flight crisis interception (`inspectForCrisis`) filtering self-harm language from public ticker feeds and redacting diary entries to `"..."`.
- **Reveal Sequence & Life Cards** ([`src/components/theater/LifeCards.tsx`](src/components/theater/LifeCards.tsx)): End-of-simulation sequence with camera pullback, upper floor dimming, final room stat banners, and interactive cards displaying net worth, clamped stat bars, and status badges.
- **Zero-Network Theater Replay**: Cached scene-operation pipeline allowing instant offline replay of completed simulations.

### D. Distributed Queue & Real-Time SSE Pipeline
- **Upstash QStash & Redis Distributed Locks** ([`src/app/api/simulate/dispatch/route.ts`](src/app/api/simulate/dispatch/route.ts), [`src/lib/redis/client.ts`](src/lib/redis/client.ts)): Serverless asynchronous job distribution preventing Vercel timeout limits.
- **Server-Sent Events (SSE)** ([`src/app/api/simulate/stream/[id]/route.ts`](src/app/api/simulate/stream/[id]/route.ts)): Real-time progress and scene streaming with reconnection catch-up (`?after=line`).
- **MongoDB Atlas Integration** ([`src/lib/db/mongodb.ts`](src/lib/db/mongodb.ts)): Connection-pooled singleton store for timeline states, events, and session journals.

### E. Safety, Ethics & Anti-AI-Slop Design
- **Crisis Interceptor Guardrail** ([`src/lib/safety/crisisInterceptor.ts`](src/lib/safety/crisisInterceptor.ts)): Client-side and server-side safety analyzer that intercepts inputs containing self-harm, severe despair, or crisis keywords, redirecting users immediately to verified support hotlines (988, iCall, Befrienders).
- **Anti-AI-Slop HUD System**: Deliberate avoidance of generic AI tropes (no purple/cyan gradients, floating orbs, or sparkles). Built on a high-contrast warm dark slate palette (`#09090b` / `#121215`), clean **Poppins** typography, and tabular numeric readouts.

---

## 3. How to Run a Minimal Working Example

### Prerequisites
- **Node.js**: `v20.x` or `v22.x`
- **npm**: `v10.x` or higher
- *(Optional)* API keys for live AI generation. If no keys are provided, the system gracefully falls back to the built-in offline mock simulation engine.

### Quickstart

```bash
# 1. Clone the repository
git clone https://github.com/Umgauthamram/multiverse.git
cd multiverse

# 2. Install dependencies
npm ci

# 3. Configure environment variables (optional for local mock mode)
cp .env.example .env

# 4. Start the local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running the Minimal Workflow
1. On the landing page, click **"London Startup vs Delhi Corporate"** (or use any preset dilemma).
2. Click **"Run Simulation"**.
3. Watch the **Multiverse Theater** play live:
   - Observe the 9 agents on Floor 2 coordinate research, calculations, and code.
   - Observe the 4 parallel life paths unfold across the 4 rooms on Floor 1.
4. When the simulation completes, inspect the **Life Cards**, click **"Compare All 4 Futures"** to navigate the interactive **2D Branching Tree**, or click **"Open Finale Report"** to review the regret matrix.

### Demo Scenarios & Query Parameters
To test failure handling and playback modes without live AI quota:
- `http://localhost:3000/?demo=1&scenario=normal`: Standard realistic mock simulation stream (default).
- `http://localhost:3000/?demo=1&scenario=reroute`: Simulates an upstream provider outage triggering NEXUS to dynamically reroute providers with ticker notifications.
- `http://localhost:3000/?demo=1&scenario=error`: Simulates an LLM rate-limit exhaustion error on SPARK with status changes and recovery.
- `http://localhost:3000/?demo=1&scenario=stall`: Simulates a stalled stream testing director 3x speedup and 4-minute hard timeout safeguards.
- `http://localhost:3000/?demo=1&scenario=fast`: High-speed stream completing in ~2 seconds for rapid CI verification.

---

## 4. Which Tests Were Run & What They Verified

The codebase is backed by **46 Vitest test suites containing 292 automated unit, integration, and UI tests**, running with 100% pass rates in under 3.5s.

```bash
# Run all unit and integration tests
npm test

# Run strict TypeScript compiler verification
npm run typecheck

# Run ESLint validation
npm run lint

# Run the complete CI verification pipeline locally
npm run ci
```

### Test Suite Breakdown & Verification Coverage

| Category | Test File | Key Invariants Verified |
| :--- | :--- | :--- |
| **Deterministic Math & Engine** | `tests/unit/financeEngine.test.ts` | Zero-token math invariant, quarterly net worth compounding, income vs expenses, tax deductions. |
| | `tests/unit/statClamper.test.ts` | Invariant bounds `[0, 100]` for Joy, Health, Relationships, Career; burnout triggers and recovery logic. |
| | `tests/unit/eventRoller.test.ts` | Weighted probabilities, deterministic PRNG seeds, and impact delta structures. |
| **Safety & Schemas** | `tests/unit/crisisInterceptor.test.tsx` | Detection of self-harm, hopelessness, and crisis triggers; renders emergency resources and halts simulation. |
| | `tests/unit/intakeSchema.test.ts` | Zod validation rules for dilemmas, path options, constraints, financial inputs, and invalid payloads. |
| | `tests/unit/env.test.ts` | Zod validation of environment variables (`MONGODB_URI`, `GROQ_API_KEY`, etc.). |
| **AI Providers & Resilience** | `tests/unit/router.test.ts` | Automatic HTTP 429/500 failover from Groq $\to$ NVIDIA $\to$ Gemini without crashing. |
| | `tests/unit/providers.test.ts` | Model instantiation and options for `@ai-sdk/openai`, `@ai-sdk/google`. |
| | `tests/unit/worldBuilder.test.ts` | World cast generation, persona diversification, and router fallback. |
| | `tests/unit/lifeAgent.test.ts` | Delta-only quarterly step outputs and schema compliance. |
| | `tests/unit/narratorAgent.test.ts` | Gemini long-context synthesis of cross-timeline regret matrices. |
| **Theater & Isometric Canvas** | `tests/unit/layout.test.ts` | 2-floor isometric bounding box calculations and coordinate transformations. |
| | `tests/unit/pathfinding.test.ts` | A* search correctness, obstacle blocking, diagonal transitions, and unreachable fallbacks. |
| | `tests/unit/screens.test.ts` | Procedural drawing routines for 9 distinct agent monitor displays. |
| | `tests/unit/agentOffice.test.ts` | Floor 2 agent positioning, status tags, packet handoffs, and walking paths. |
| | `tests/unit/lifeWing.test.ts` | Floor 1 room state rendering, visitor NPCs, and furniture dynamics. |
| | `tests/unit/rendererSmoke.test.ts` | Headless HTML5 Canvas context rendering without exceptions. |
| | `tests/unit/theaterPhase9.test.ts` | Reduced motion snapping, failure scenes (REROUTE/ERROR), demo scenarios, crisis redaction, and director safeguards. |
| **Scene Language & Streaming** | `tests/unit/sceneLanguage.test.ts` | Scene language grammar parsing, serialization, and syntax validation. |
| | `tests/unit/sceneCompiler.test.ts` | Compiling timeline step deltas into ISO scene command streams. |
| | `tests/unit/sceneState.test.ts` | Deterministic reducer updates from incoming scene op lines. |
| | `tests/unit/sceneStore.test.ts` | Storing and retrieving scene operation streams in MongoDB. |
| | `tests/unit/sseStream.test.ts` | SSE heartbeat, client reconnection handling, and chunked delivery. |
| | `tests/unit/sseScene.test.ts` | SSE scene stream with `?after=line` replay filtering. |
| **UI Components & Page Flow** | `tests/unit/lifeCards.test.tsx` | Rendering of 4 Life Cards, clamped stat bars, persona badges, net worth formatting, and replay actions. |
| | `tests/unit/theaterReveal.test.tsx` | Easing transition from live simulation to reveal state. |
| | `tests/unit/theaterUI.test.tsx` | Live Ticker, focus bars, Skip button, accessible labels, and mobile controls. |
| | `tests/unit/multiverseTreeCanvas.test.tsx` | Branch rendering, glowing node coordinates, and 4-timeline layout. |
| | `tests/unit/timeScrubber.test.tsx` | Interactive timeline scrubbing between Month 0 and Month 60. |
| | `tests/unit/finaleReportView.test.tsx` | Markdown formatting, regret heatmap display, and divergence point analysis. |
| | `tests/unit/hudDesignSystem.test.tsx` | Anti-AI-slop design token verification and contrast safety. |
| | `tests/unit/systemSmokeTest.test.tsx` | End-to-end smoke test validating the full journey from Intake to Finale. |

---

## 5. Architecture & Technology Stack

```
                          [User Intake]
                               │
                     [Crisis Interceptor]
                               │
                   ┌───────────┴───────────┐
                   ▼                       ▼
          [Live AI Pipeline]       [Offline Mock Stream]
         (Groq / NVIDIA / Gemini)     (?demo=1 / Zero-Key)
                   │                       │
                   └───────────┬───────────┘
                               ▼
                   [Scene Language Compiler]
                               │
                               ▼
             [Multiverse Theater: 2D Iso Canvas]
             ├── Floor 2: Agent Office (9 Agents)
             └── Floor 1: Life Wing (4 Story Rooms)
                               │
                               ▼
                        [Reveal Sequence]
                     (Life Cards & Summary)
                               │
                               ▼
             [Branching Tree Canvas & Time Scrubber]
                               │
                               ▼
                   [Gemini Finale Synthesis]
                     (Regret Heatmap & Matrix)
```

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, Poppins typography.
- **Rendering**: HTML5 2D Canvas with procedural vector sprites.
- **AI Integration**: Vercel AI SDK (`ai`), Groq, NVIDIA NIM, Google Generative AI.
- **Data & Queue**: MongoDB Atlas, Upstash Redis REST, Upstash QStash.
- **Testing**: Vitest, `@testing-library/react`.

---

## 6. License

This project is licensed under the [MIT License](LICENSE).
