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
- **Current Focus**: World Building & Cast Creation (Phase 14)
- **Status**: Ready for Phase 14 (World-Builder Agent via NVIDIA NIM)

## 3. Recent Progress (Rolling Snapshot - Max 5)
- Phase 13: Voice-to-Text input via Web Speech API & fallback (`src/lib/audio/speechRecognition.ts`, `src/components/intake/VoiceInput.tsx`)
- Phase 12: Decision intake form & Zod schema definition (`src/lib/schemas/intake.ts`, `src/components/intake/IntakeForm.tsx`)
- Phase 11: Weighted random life event roller (`src/lib/simulation/eventRoller.ts`)
- Phase 10: Statistical clamping and burnout invariant engine (`src/lib/simulation/statClamper.ts`)
- Phase 9: Zero-token financial calculation engine (`src/lib/simulation/financeEngine.ts`)

## 4. Next Immediate Steps
- [ ] Build World-Builder Agent with NVIDIA NIM (`meta/llama-3.1-70b-instruct`) in `src/lib/ai/agents/worldBuilder.ts` (Phase 14)
- [ ] Implement Persona Seed Generator for 12 timeline branches in `src/lib/simulation/personaSeeder.ts` (Phase 15)
- [ ] Upstash QStash async job dispatcher and batch worker (Phase 16)
