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
- **Current Focus**: User Interface & Intake Pipeline (Phase 12)
- **Status**: Ready for Phase 12 (Decision Intake Form & Zod Schema Definition)

## 3. Recent Progress (Rolling Snapshot - Max 5)
- Phase 11: Weighted random life event roller (`src/lib/simulation/eventRoller.ts`)
- Phase 10: Statistical clamping and burnout invariant engine (`src/lib/simulation/statClamper.ts`)
- Phase 9: Zero-token financial calculation engine (`src/lib/simulation/financeEngine.ts`)
- Phase 8: Veeshree memory layer integration client (`src/lib/memory/veeshree.ts`)
- Phase 7: Resilient LLM Router with automatic fallback & telemetry (`src/lib/ai/router.ts`)

## 4. Next Immediate Steps
- [ ] Build 5-question intake UI and Zod schema in `src/lib/schemas/intake.ts` (Phase 12)
- [ ] Voice-to-text input via Web Speech API & Whisper fallback (Phase 13)
- [ ] NVIDIA NIM World-Builder Agent for cast creation (Phase 14)
