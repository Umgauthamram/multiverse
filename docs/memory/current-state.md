# Current Project State

## 1. System Overview & Purpose
- **Project Name**: multiverse-you
- **Active Branch**: `main`
- **Detected Stack & Architecture**:
  - Fullstack Framework: Next.js 15 (App Router, TypeScript)
  - Styling & Design: Tailwind CSS v4, Poppins Google Font, Anti-AI-Slop restrained dark palette
  - Database: MongoDB Atlas (connection pool singleton in `src/lib/db/mongodb.ts`)
  - Concurrency & Lock Layer: Upstash Redis REST + Lua script locks in `src/lib/redis/client.ts`
  - Multi-Provider AI: Vercel AI SDK with Groq (Llama 3.1/3.3), NVIDIA NIM (Llama 70B), Google Gemini (2.5 Flash)
  - Resilient LLM Router: Automatic 429/5xx fallback chain in `src/lib/ai/router.ts`
  - Memory Layer: Veeshree Client integration in `src/lib/memory/veeshree.ts`
  - Testing & CI: Vitest (198 automated unit tests passing across 27 suites), GitHub Actions CI/CD (`.github/workflows/ci.yml`)

## 2. Active Feature / Milestone
- **Current Focus**: Multiverse Theater — Live Simulation Visualization Layer
- **Status**: Theater Phase 1 through Phase 8 (Reveal Sequence, Life Cards, page flow integration, 4-timeline tree & finale) completed; verified across 45 test suites (282 unit tests passing), `eslint` 0 warnings, TypeScript 0 errors, and Next.js production build passing
- Next up: Theater Phase 9 (Perf, reduced motion, failure scenes, `?demo=1` scenarios)

## 3. Recent Progress (Rolling Snapshot - Max 5)
- Theater Phase 8: Reveal, Life Cards, page flow, 4-timeline tree and finale (`src/components/theater/LifeCards.tsx`, `renderer.ts`, `TheaterView.tsx`, `src/app/page.tsx`, `simulationOrchestrator.ts`, tests: `lifeCards.test.tsx`, `theaterReveal.test.tsx`)
- Theater Phase 7: Theater UI & Master View (`src/components/theater/LiveTicker.tsx`, `TheaterCanvas.tsx`, `StoryFocusBar.tsx`, `TheaterView.tsx`, tests: `theaterUI.test.tsx`)
- Theater Phase 6: Life Wing: 4 Rooms & Visual State Dynamics (`src/lib/theater/sprites/props.ts`, `renderer.ts`, tests: `lifeWing.test.ts`)
- Theater Phase 5: Agent Office Visuals & 9 Monitor Screens (`src/lib/theater/sprites/screens.ts`, `renderer.ts`, `props.ts`, tests: `screens.test.ts`, `agentOffice.test.ts`)
- Theater Phase 4: Renderer Core & Procedural Sprites (`src/lib/theater/tokens.ts`, `iso.ts`, `layout.ts`, `pathfinding.ts`, `sprites/characterGenerator.ts`, `sprites/props.ts`, `renderer.ts`, tests: `layout.test.ts`, `pathfinding.test.ts`, `rendererSmoke.test.ts`)

## 4. Next Immediate Steps
- [x] Theater Phase 1: Scene Language, Compiler & Story Seeds
- [x] Theater Phase 2: Pipeline Wiring (`onStage` hook, `step-batch` rewrite, `sceneStore.ts`, SSE `scene` events, `/start` and `/narrator` routes)
- [x] Theater Phase 3: `mockSceneStream` + `sceneState` reducer + `director`
- [x] Theater Phase 4: Renderer core: iso projection, floors/walls, sprite atlas, character generator, pathfinding
- [x] Theater Phase 5: Agent Office: 9 agents, 9 monitor textures, status tags, handoff packets, NEXUS walk
- [x] Theater Phase 6: Life Wing: 4 rooms, state visuals, event scenes, cast NPCs, text pops
- [x] Theater Phase 7: `TheaterView`, `LiveTicker`, focus camera, Skip, mobile layout, a11y
- [x] Theater Phase 8: Reveal, Life Cards, page flow, 4-timeline tree and finale
- [ ] Theater Phase 9: Perf, reduced motion, failure scenes, `?demo=1` scenarios


