# Project Tasks & Milestones

## Completed Tasks
- [x] Phase 1: Next.js 15 App Router, Poppins typography, and dark restrained landing page
- [x] Phase 2: Runtime environment validation schema with Zod in `src/lib/env.ts`
- [x] Phase 3: Automated GitHub Actions CI/CD pipeline (`.github/workflows/ci.yml`) and local `npm run ci`
- [x] Phase 4: Serverless MongoDB Atlas client singleton and connection pool in `src/lib/db/mongodb.ts`
- [x] Phase 5: Upstash Redis REST client and distributed atomic lock engine in `src/lib/redis/client.ts`
- [x] Phase 6: Vercel AI SDK multi-provider matrix (Groq, NVIDIA NIM, Gemini) in `src/lib/ai/providers.ts`
- [x] Phase 7: Resilient LLM Router with automatic fallback and telemetry in `src/lib/ai/router.ts`
- [x] Phase 8: Veeshree memory layer integration client in `src/lib/memory/veeshree.ts`
- [x] Phase 9: Zero-token financial calculation engine in `src/lib/simulation/financeEngine.ts`
- [x] Phase 10: Statistical clamping and burnout invariant engine in `src/lib/simulation/statClamper.ts`

- [x] Phase 11: Weighted random life event roller in `src/lib/simulation/eventRoller.ts`

- [x] Phase 12: Decision intake form & Zod schema definition in `src/lib/schemas/intake.ts`

- [x] Phase 13: Voice-to-Text input via Web Speech API & Whisper fallback in `src/components/intake/VoiceInput.tsx`

- [x] Phase 14: World-Builder Agent (NVIDIA NIM) in `src/lib/ai/agents/worldBuilder.ts`

- [x] Phase 15: Persona Seed Generator for 12 Timelines in `src/lib/simulation/personaSeeder.ts`

- [x] Phase 16: Upstash QStash Worker & Async Job Dispatcher in `src/app/api/simulate/dispatch/route.ts` & `src/app/api/simulate/step-batch/route.ts`
- [x] Phase 17: Delta-Only Life Simulation Agent (Groq) in `src/lib/ai/agents/lifeAgent.ts`
- [x] Phase 18: Timeline Orchestrator & Multi-Step Batch Runner in `src/lib/simulation/timelineRunner.ts`
- [x] Phase 19: Server-Sent Events (SSE) Progress Streaming in `src/app/api/simulate/stream/[id]/route.ts`
- [x] Phase 20: MongoDB Simulation Model & Indexing Strategy in `src/lib/db/models/Simulation.ts`
- [x] Phase 21: Anti-AI-Slop Design System & Dark HUD Foundation in `src/components/hud/`
- [x] Phase 22: 2D HTML5 Canvas Branching Tree Visualizer in `src/components/tree/MultiverseTreeCanvas.tsx`
- [x] Phase 23: Dynamic Branch Color States & Event Popups in `src/components/tree/BranchNodePopup.tsx`

- [x] Phase 24: Interactive Time Scrubber (Months 0 to 60) in `src/components/tree/TimeScrubber.tsx`
- [x] Phase 25: Branch Deep-Dive Diary Drawer in `src/components/tree/BranchDetailDrawer.tsx`
- [x] Phase 26: Dense Digest Serializer for Gemini Synthesis in `src/lib/simulation/digestSerializer.ts`

- [x] Phase 27: Gemini 2.5 Flash Narrator & Comparative Analyst in `src/lib/ai/agents/narratorAgent.ts`

- [x] Phase 28: Finale Screen & Regret Heatmap Visualization in `src/components/finale/FinaleReportView.tsx`
- [x] Phase 29: Safety Guardrails & Crisis Interceptor in `src/lib/safety/crisisInterceptor.ts` and `src/components/safety/CrisisDialog.tsx`
- [x] Phase 30: End-to-End System Smoke Test & Deployment Readiness in `tests/unit/systemSmokeTest.test.tsx` and `src/app/page.tsx`
- [x] Theater Phase 1: Scene Language, Compiler & Story Seeds in `src/lib/scene/` (`sceneLanguage.ts`, `sceneCompiler.ts`, `storySeeds.ts`)
- [x] Theater Phase 2: Pipeline Wiring (`onStage` hook, `step-batch` rewrite, `sceneStore.ts`, SSE `scene` events, `/start` and `/narrator` routes)
- [x] Theater Phase 3: `mockSceneStream` + `sceneState` reducer + `director` (`src/lib/scene/mockSceneStream.ts`, `src/lib/theater/sceneState.ts`, `src/lib/theater/director.ts`, tests: `sceneState.test.ts`, `director.test.ts`)

- [x] Theater Phase 4: Renderer core: iso projection, floors/walls, sprite atlas, character generator, pathfinding (`src/lib/theater/tokens.ts`, `iso.ts`, `layout.ts`, `pathfinding.ts`, `sprites/characterGenerator.ts`, `sprites/props.ts`, `renderer.ts`, tests: `layout.test.ts`, `pathfinding.test.ts`, `rendererSmoke.test.ts`)

- [x] Theater Phase 5: Agent Office: 9 agents, 9 monitor textures, status tags, handoff packets, NEXUS walk (`src/lib/theater/sprites/screens.ts`, `renderer.ts`, `props.ts`, tests: `screens.test.ts`, `agentOffice.test.ts`)
- [x] Theater Phase 6: Life Wing: 4 rooms, state visuals, event scenes, cast NPCs, text pops (`src/lib/theater/sprites/props.ts`, `renderer.ts`, tests: `lifeWing.test.ts`)
- [x] Theater Phase 7: `TheaterView`, `LiveTicker`, focus camera, Skip, mobile layout, a11y (`src/components/theater/`, tests: `theaterUI.test.tsx`)
- [x] Theater Phase 8: Reveal, Life Cards, page flow, 4-timeline tree and finale (`src/components/theater/LifeCards.tsx`, `renderer.ts`, `TheaterView.tsx`, `src/app/page.tsx`, `simulationOrchestrator.ts`, tests: `lifeCards.test.tsx`, `theaterReveal.test.tsx`)

## Active Tasks
- [ ] Theater Phase 9: Perf, reduced motion, failure scenes, `?demo=1` scenarios

## Backlog (Upcoming Theater Phases)
- [ ] Theater Phase 9: Perf, reduced motion, failure scenes, `?demo=1` scenarios
- [ ] Theater Phase 10: ADR, constraints amendment, memory docs, README section
