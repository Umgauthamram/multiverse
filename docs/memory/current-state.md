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
  - Testing & CI: Vitest (36 automated unit tests passing), GitHub Actions CI/CD (`.github/workflows/ci.yml`)

## 2. Active Feature / Milestone
- **Current Focus**: MongoDB Simulation Model & Indexing Strategy (Phase 20)
- **Status**: Phase 19 completed (Server-Sent Events Progress Streaming); Ready for Phase 20

## 3. Recent Progress (Rolling Snapshot - Max 5)
- Phase 19: Server-Sent Events (SSE) Progress Streaming (`src/app/api/simulate/stream/[id]/route.ts`, `src/lib/simulation/streamManager.ts`)
- Phase 18: Timeline Orchestrator & Multi-Step Batch Runner (`src/lib/simulation/timelineRunner.ts`)
- Phase 17: Delta-Only Life Simulation Agent via Groq (`src/lib/ai/agents/lifeAgent.ts`)
- Phase 16: Upstash QStash Worker & Async Job Dispatcher (`src/lib/queue/qstash.ts`, `/api/simulate/dispatch`, `/api/simulate/step-batch`)
- Phase 15: Persona Seed Generator for 12 Timelines (`src/lib/simulation/personaSeeder.ts`)

## 4. Next Immediate Steps
- [ ] Finalize MongoDB Simulation Model & Indexing Strategy in `src/lib/db/models/Simulation.ts` (Phase 20)
- [ ] Build Anti-AI-Slop Dark HUD foundation in `src/components/hud/` (Phase 21)
- [ ] Build 2D HTML5 Canvas Branching Tree Visualizer in `src/components/tree/MultiverseTreeCanvas.tsx` (Phase 22)
