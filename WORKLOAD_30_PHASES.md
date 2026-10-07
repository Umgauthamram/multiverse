# Multiverse You — 30-Phase Workload & CI/CD Testing Roadmap

> **Document Type**: Engineering Execution Plan & Automated Verification Matrix  
> **Structure**: 30 Granular Sequential Phases  
> **Verification Standard**: Every phase includes explicit **Unit/Manual Tests** and automated **CI Pipeline Verification** (GitHub Actions / Vitest / Playwright).

---

## CI Pipeline Baseline Architecture

Every commit or PR triggers an automated workflow in `.github/workflows/ci.yml`:
1. **Lint & Format**: `eslint` + `prettier --check`
2. **Type Safety**: `tsc --noEmit` (strict TypeScript validation)
3. **Unit & Logic Tests**: `vitest run` (deterministic math, schemas, state clamping)
4. **Integration Tests**: Mocked LLM responses, MongoDB in-memory, Upstash mock
5. **E2E Browser Tests**: `playwright test` (Canvas rendering, scrubber, intake modal)

---

## 30-Phase Workload Breakdown

### Phase 1: Next.js 15 & Poppins Typography Initialization
- **Workload**: Initialize Next.js 15 App Router with TypeScript and Tailwind CSS. Configure Google Font `Poppins` via `next/font/google` with CSS variables `--font-poppins` as the global sans-serif font.
- **Local Test**: Verify font loads without layout shift and inspect `getComputedStyle(document.body).fontFamily` includes `Poppins`.
- **CI Test**: `npm run build` runs clean without hydration warnings or Google Font download timeouts.

---

### Phase 2: Environment Schema Validation & Config Guard
- **Workload**: Create `src/lib/env.ts` using `@t3-oss/env-nextjs` or `zod` to validate all runtime environment variables (`MONGODB_URI`, `GROQ_API_KEY`, `NVIDIA_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `UPSTASH_REDIS_REST_URL`).
- **Local Test**: Run app with missing keys to confirm descriptive startup errors.
- **CI Test**: Run `vitest tests/unit/env.test.ts` with valid and invalid mocks to verify schema rejection.

---

### Phase 3: GitHub Actions CI/CD Pipeline Setup
- **Workload**: Create `.github/workflows/ci.yml` defining jobs for `lint`, `typecheck`, `unit-tests`, and `e2e-smoke`. Cache npm dependencies.
- **Local Test**: Run `npx act` or local npm scripts (`npm run lint && npm run typecheck && npm test`).
- **CI Test**: Push branch to GitHub and verify all 4 check runs pass with green status.

---

### Phase 4: MongoDB Atlas Client & Connection Pool
- **Workload**: Create `src/lib/db/mongodb.ts` implementing a singleton cached MongoClient connection supporting serverless environments.
- **Local Test**: Run test script inserting and retrieving a ping document from MongoDB Atlas.
- **CI Test**: Vitest test using `mongodb-memory-server` to verify pool reconnection and clean teardown in CI.

---

### Phase 5: Upstash Redis & Distributed Lock Engine
- **Workload**: Implement `src/lib/redis/client.ts` with Upstash Redis REST SDK. Implement distributed locking helper (`acquireLock`, `releaseLock`) for queue isolation.
- **Local Test**: Test concurrent lock requests locally to confirm only one runner acquires the lock.
- **CI Test**: Vitest test mocking `@upstash/redis` verifying lock expiry and mutual exclusion logic.

---

### Phase 6: Vercel AI SDK Core Setup & Providers Matrix
- **Workload**: Configure `@ai-sdk/openai` and `@ai-sdk/google` in `src/lib/ai/providers.ts`. Export configured clients for Groq, NVIDIA NIM, and Gemini.
- **Local Test**: Issue a 5-token ping completion to all three providers and log latency.
- **CI Test**: Mocked provider test validating request headers, auth tokens, and base URLs without hitting live quotas.

---

### Phase 7: Resilient LLM Router with Automatic Fallback
- **Workload**: Create `src/lib/ai/router.ts` with retry policies using `tenacity` principles. If Groq returns 429 / 5xx, transparently fall back to NVIDIA NIM, then Gemini.
- **Local Test**: Simulate a 429 response from Groq mock and observe automatic failover to NVIDIA.
- **CI Test**: Vitest test simulating rate limits across providers to assert fallback routing and telemetry metrics.

---

### Phase 8: Veeshree Memory Layer Integration Client
- **Workload**: Create `src/lib/memory/veeshree.ts` integrating with Veeshree API (`https://veeshree.vercel.app/api`) to store and retrieve long-term user constraints and values.
- **Local Test**: Fetch, write, and invalidate user persona memory tags via Veeshree test endpoints.
- **CI Test**: Mocked HTTP test validating payload structure, auth headers, and timeout handling.

---

### Phase 9: Zero-Token Financial Calculation Engine
- **Workload**: Implement `src/lib/simulation/financeEngine.ts` to compute net worth, quarterly savings rate, living cost inflation, and runway without LLM tokens.
- **Local Test**: Feed 20 quarters of sample cash flows and assert mathematical net worth matches ground truth.
- **CI Test**: Vitest test running 100 random financial edge cases (negative balance, sudden large windfalls, high inflation).

---

### Phase 10: Statistical Clamping & Burnout Invariant Engine
- **Workload**: Implement `src/lib/simulation/statClamper.ts` ensuring `happiness`, `health`, `relationships`, and `career` strictly remain inside `[0, 100]`. Trigger burnout state if thresholds breach.
- **Local Test**: Feed extreme values (`-50`, `+250`) and confirm safe clamping to `0` and `100`.
- **CI Test**: Vitest unit test suite validating mathematical invariants and boundary conditions.

---

### Phase 11: Weighted Random Life Event Roller
- **Workload**: Create `src/lib/simulation/eventRoller.ts` with calibrated probabilities (Promotion 12%, Layoff 8%, Health Shock 4%, Windfall 1%, Steady 69%) and deterministic seed support.
- **Local Test**: Roll 10,000 simulated quarters and assert event frequencies match target distributions within 2% margin.
- **CI Test**: Vitest statistical test ensuring uniform RNG distribution given seeded timelines.

---

### Phase 12: Decision Intake Form & Zod Schema Definition
- **Workload**: Build the 5-question intake UI (Age, Savings, Priorities, Dilemma Path A vs Path B). Define `IntakeSchema` in `src/lib/schemas/intake.ts`.
- **Local Test**: Manually submit complete and incomplete form responses; observe clean validation feedback.
- **CI Test**: Vitest schema validation test asserting invalid inputs (negative age, blank options) are rejected.

---

### Phase 13: Voice-to-Text Input via Web Speech API & Whisper Fallback
- **Workload**: Create `src/components/intake/VoiceInput.tsx` utilizing browser `webkitSpeechRecognition` / `SpeechRecognition` with an API fallback to Whisper.
- **Local Test**: Speak a sample dilemma in browser; confirm speech converts to text in real-time.
- **CI Test**: Unit test verifying browser speech capability detection and fallback toggle logic.

---

### Phase 14: World-Builder Agent (NVIDIA NIM)
- **Workload**: Create `src/lib/ai/agents/worldBuilder.ts` using NVIDIA NIM (`meta/llama-3.1-70b-instruct`) to generate 3–5 supporting cast members with distinct personality archetypes.
- **Local Test**: Generate cast for a career change dilemma; verify characters reflect the user's social context.
- **CI Test**: Vitest test validating the generated cast satisfies `WorldCastSchema` with strict Zod types.

---

### Phase 15: Persona Seed Generator for 12 Timelines
- **Workload**: Create `src/lib/simulation/personaSeeder.ts` assigning 6 distinct behavior seeds to Path A and 6 to Path B (*Bold, Anxious, Workaholic, Balanced, Pragmatist, Burnout Risk*).
- **Local Test**: Verify that 12 unique timeline seeds are generated with balanced distribution between options A and B.
- **CI Test**: Vitest test asserting exact 12-branch split and unique seed assignments.

---

### Phase 16: Upstash QStash Worker & Async Job Dispatcher
- **Workload**: Implement `src/app/api/simulate/dispatch/route.ts` and `src/app/api/simulate/step-batch/route.ts` secured with QStash signature verification.
- **Local Test**: Dispatch a mock batch job via local QStash CLI and observe worker execution.
- **CI Test**: Integration test validating QStash signature verification and unauthorized request rejection.

---

### Phase 17: Delta-Only Life Simulation Agent (Groq)
- **Workload**: Implement `src/lib/ai/agents/lifeAgent.ts` using Groq (`llama-3.1-8b-instant`). Prompts enforce delta-only JSON responses without historical clutter.
- **Local Test**: Run a single 3-month step; measure token usage (must be under 80 total tokens).
- **CI Test**: Vitest test asserting output JSON matches `QuarterDeltaSchema` using mocked Groq response.

---

### Phase 18: Timeline Orchestrator & Multi-Step Batch Runner
- **Workload**: Build `src/lib/simulation/timelineRunner.ts` to execute quarters 1 through 20 across parallel timelines, combining LLM narrative deltas with deterministic math.
- **Local Test**: Run a 5-year simulation headless; verify all 20 quarters write to MongoDB.
- **CI Test**: Vitest integration test running 5-step mock simulation verifying database state persistence.

---

### Phase 19: Server-Sent Events (SSE) Progress Streaming
- **Workload**: Build `src/app/api/simulate/stream/[id]/route.ts` delivering real-time quarter updates to the client as branches progress.
- **Local Test**: Subscribe via `EventSource` in browser console and observe live JSON updates.
- **CI Test**: Vitest HTTP test verifying SSE headers (`text/event-stream`, `no-cache`) and stream termination.

---

### Phase 20: MongoDB Simulation Model & Indexing Strategy
- **Workload**: Finalize MongoDB Mongoose/native schema with indexes on `userId`, `status`, and `createdAt` in `src/lib/db/models/Simulation.ts`.
- **Local Test**: Perform query benchmark retrieving 50-quarter simulation documents in under 15ms.
- **CI Test**: Vitest test running index checks and schema validation assertions.

---

### Phase 21: Anti-AI-Slop Design System & Dark HUD Foundation
- **Workload**: Build `src/components/hud/` layout components following Anti-AI-Slop guidelines: warm dark slate background, no generic purple gradients, Poppins headings, clean tabular numbers.
- **Local Test**: Visual inspection against design criteria; verify zero unapproved color gradients or sparkle icons.
- **CI Test**: Playwright visual regression snapshot test comparing base layout against reference screenshot.

---

### Phase 22: 2D HTML5 Canvas Branching Tree Visualizer
- **Workload**: Build `src/components/tree/MultiverseTreeCanvas.tsx`. Procedurally draws glowing trunk (today) branching out into 12 horizontal bezier curves.
- **Local Test**: Render canvas in browser at 60 FPS; resize window to confirm dynamic canvas DPI scaling.
- **CI Test**: Playwright test asserting canvas element mounts and renders without WebGL or context errors.

---

### Phase 23: Dynamic Branch Color States & Event Popups
- **Workload**: Implement branch state coloring: Emerald (Thriving), Amber (Plateau), Crimson (Struggling), Muted Slate (Terminated). Render flash event nodes on branches.
- **Local Test**: Inject mock crisis and promotion events; verify branches dynamically update color transitions.
- **CI Test**: Vitest test validating color calculation logic for varying health/happiness combinations.

---

### Phase 24: Interactive Time Scrubber (Months 0 to 60)
- **Workload**: Build `src/components/tree/TimeScrubber.tsx` slider allowing the user to drag from Month 0 to Month 60. Syncs all 12 timeline head positions simultaneously.
- **Local Test**: Drag scrubber smoothly; observe stats and branch node highlights update synchronously.
- **CI Test**: Playwright E2E test verifying slider keyboard controls (`ArrowRight`, `ArrowLeft`) trigger state changes.

---

### Phase 25: Branch Deep-Dive Diary Drawer
- **Workload**: Build `src/components/tree/BranchDetailDrawer.tsx` slide-out panel showing character profile, month-by-month diary stories, and mini stat sparklines.
- **Local Test**: Click branch node 14; verify drawer slides out displaying quarter 14 diary and exact net worth.
- **CI Test**: Playwright E2E test clicking a branch node and asserting drawer text content matches mock data.

---

### Phase 26: Dense Digest Serializer for Gemini Synthesis
- **Workload**: Create `src/lib/simulation/digestSerializer.ts` condensing 12 full timelines into a compact Markdown summary table under 2,500 tokens.
- **Local Test**: Convert a full 20-quarter simulation run into markdown digest; verify character count and token estimate.
- **CI Test**: Vitest test ensuring digest contains critical milestones, final net worth, and lowest happiness points.

---

### Phase 27: Gemini 2.5 Flash Narrator & Comparative Analyst
- **Workload**: Implement `src/lib/ai/agents/narratorAgent.ts` using Google Gemini 2.5 Flash. Generates ranked futures, regret hotspots, and 3 pivotal divergence moments.
- **Local Test**: Run narrator with serialized digest; inspect the qualitative depth and honesty of output.
- **CI Test**: Vitest test validating narrator response matches `FinaleReportSchema` with strict Zod parsing.

---

### Phase 28: Finale Screen & Regret Heatmap Visualization
- **Workload**: Build `src/components/finale/FinaleReportView.tsx` with Regret Heatmap matrix (Months vs Timelines), ranked futures cards, and pivotal choices.
- **Local Test**: Review finale screen on 1080p and mobile screens; verify layout readability and clean contrast.
- **CI Test**: Playwright E2E test asserting all report sections render without console errors.

---

### Phase 29: Safety Guardrails & Crisis Interceptor
- **Workload**: Implement `src/lib/safety/crisisInterceptor.ts` scanning dilemma inputs for self-harm or critical medical queries. Immediately display verified support helplines.
- **Local Test**: Enter test phrase containing flagged keywords; verify simulation halts and renders support dialog.
- **CI Test**: Vitest security test running positive and negative test cases against crisis wordlists.

---

### Phase 30: End-to-End System Smoke Test & Deployment Readiness
- **Workload**: Complete full integration flow: User intake $\to$ World building $\to$ 12-branch parallel simulation $\to$ Canvas tree interaction $\to$ Time scrubbing $\to$ Gemini finale. Audit bundle size.
- **Local Test**: Execute entire user journey from browser; verify zero console errors and execution completes under 45 seconds.
- **CI Test**: Full Playwright E2E test suite running against production build (`next build && next start`) in GitHub Actions.

---

## Phase Matrix & Verification Summary

| Phase Range | Subsystem | Primary Tech | Verification Mechanism |
| :--- | :--- | :--- | :--- |
| **Phases 1–5** | Foundation & Infrastructure | Next.js 15, Poppins, Mongo, Redis | TypeScript compiler, Vitest, Memory DB mock |
| **Phases 6–11** | Core AI & Deterministic Engines | Vercel AI SDK, Groq, NVIDIA, Math Engine | Unit tests, Statistical distribution tests |
| **Phases 12–15** | Intake & World Generation | Web Speech, Zod, NVIDIA NIM | Form validation tests, Schema match tests |
| **Phases 16–20** | Simulation Engine & Streaming | Upstash QStash, Groq, SSE, MongoDB | Worker mock tests, SSE stream tests |
| **Phases 21–25** | Visual Multiverse HUD | HTML5 Canvas, Tailwind, Scrubber | Playwright visual & interaction tests |
| **Phases 26–30** | Finale Narrator & Production Prep | Gemini 2.5 Flash, Heatmap, Safety | Full E2E Playwright suite, Safety interceptor tests |
