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
- **Status**: Theater Phase 1 completed (Scene Language, Compiler, Story Seeds), verified across 31 test suites (215 unit tests passing), and production-compiled with Next.js 16 / Turbopack

## 3. Recent Progress (Rolling Snapshot - Max 5)
- Theater Phase 1: Scene Language, Deterministic Compiler & 4-Story Seeds (`src/lib/scene/`, `tests/unit/sceneLanguage.test.ts`, `tests/unit/sceneCompiler.test.ts`, `tests/unit/storySeeds.test.ts`)
- Phase 30: End-to-End System Smoke Test & Deployment Readiness (`tests/unit/systemSmokeTest.test.tsx`, `src/lib/simulation/simulationOrchestrator.ts`, `src/app/page.tsx`)
- Phase 29: Safety Guardrails & Crisis Interceptor (`src/lib/safety/crisisInterceptor.ts`, `src/components/safety/CrisisDialog.tsx`, `tests/unit/crisisInterceptor.test.tsx`)
- Phase 28: Finale Screen & Regret Heatmap (`src/components/finale/FinaleReportView.tsx`, `tests/unit/finaleReportView.test.tsx`)
- Phase 27: Gemini 2.5 Flash Narrator Agent (`src/lib/ai/agents/narratorAgent.ts`, `tests/unit/narratorAgent.test.ts`)

## 4. Next Immediate Steps
- [x] Theater Phase 1: Scene Language, Compiler & Story Seeds
- [ ] Theater Phase 2: Pipeline Wiring (`onStage` hook, `step-batch` rewrite, `sceneStore.ts`, SSE `scene` events, `/start` and `/narrator` routes)


