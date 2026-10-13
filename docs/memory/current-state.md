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
- **Current Focus**: Anti-AI-Slop Design System & Dark HUD Foundation (Phase 21)
- **Status**: Phase 20 completed (MongoDB Simulation Model & Indexing Strategy); Ready for Phase 21

## 3. Recent Progress (Rolling Snapshot - Max 5)
- Phase 20: MongoDB Simulation Model & Indexing Strategy (`src/lib/db/models/Simulation.ts`)
- Phase 19: Server-Sent Events (SSE) Progress Streaming (`src/app/api/simulate/stream/[id]/route.ts`, `src/lib/simulation/streamManager.ts`)
- Phase 18: Timeline Orchestrator & Multi-Step Batch Runner (`src/lib/simulation/timelineRunner.ts`)
- Phase 17: Delta-Only Life Simulation Agent via Groq (`src/lib/ai/agents/lifeAgent.ts`)
- Phase 16: Upstash QStash Worker & Async Job Dispatcher (`src/lib/queue/qstash.ts`, `/api/simulate/dispatch`, `/api/simulate/step-batch`)

## 4. Next Immediate Steps
- [ ] Build Anti-AI-Slop Dark HUD foundation in `src/components/hud/` (Phase 21)
- [ ] Build 2D HTML5 Canvas Branching Tree Visualizer in `src/components/tree/MultiverseTreeCanvas.tsx` (Phase 22)
- [ ] Implement Dynamic Branch Color States & Event Popups (Phase 23)
