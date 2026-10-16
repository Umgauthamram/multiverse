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
- **Current Focus**: Safety Guardrails & Crisis Interceptor (Phase 29)
- **Status**: Phase 28 completed (Finale Screen & Regret Heatmap Visualization); Ready for Phase 29

## 3. Recent Progress (Rolling Snapshot - Max 5)
- Phase 28: Finale Screen & Regret Heatmap (`src/components/finale/FinaleReportView.tsx`, `tests/unit/finaleReportView.test.tsx`)
- Phase 27: Gemini 2.5 Flash Narrator Agent (`src/lib/ai/agents/narratorAgent.ts`, `tests/unit/narratorAgent.test.ts`)
- Phase 26: Dense Digest Serializer (`src/lib/simulation/digestSerializer.ts`, `tests/unit/digestSerializer.test.ts`)
- Phase 25: Branch Deep-Dive Diary Drawer (`src/components/tree/BranchDetailDrawer.tsx`, `tests/unit/branchDetailDrawer.test.tsx`)
- Phase 24: Interactive Time Scrubber (`src/components/tree/TimeScrubber.tsx`, `tests/unit/timeScrubber.test.tsx`)

## 4. Next Immediate Steps
- [ ] Safety Guardrails & Crisis Interceptor in `src/lib/safety/crisisInterceptor.ts` (Phase 29)
- [ ] End-to-End System Smoke Test & Deployment Readiness (Phase 30)
