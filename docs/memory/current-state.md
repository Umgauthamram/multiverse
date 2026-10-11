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
- **Current Focus**: Simulation Engines & Algorithmic Foundation (Phases 9–11)
- **Status**: Ready for Phase 9 (Zero-Token Financial Calculation Engine)

## 3. Recent Progress (Rolling Snapshot - Max 5)
- Phase 7: Resilient LLM Router with automatic fallback & telemetry (`src/lib/ai/router.ts`)
- Phase 6: Vercel AI SDK multi-provider matrix setup (`src/lib/ai/providers.ts`)
- Phase 5: Upstash Redis client with distributed Lua lock engine (`src/lib/redis/client.ts`)
- Phase 4: Serverless MongoDB Atlas client singleton (`src/lib/db/mongodb.ts`)
- Phase 8: Veeshree memory layer client (`src/lib/memory/veeshree.ts`)

## 4. Next Immediate Steps
- [ ] Implement `src/lib/simulation/financeEngine.ts` (Phase 9)
- [ ] Implement statistical boundary clamping & burnout trigger (Phase 10)
- [ ] Implement calibrated weighted random life event roller (Phase 11)
