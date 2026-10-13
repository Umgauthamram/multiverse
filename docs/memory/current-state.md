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
- **Current Focus**: Async Simulation Dispatch & Queue Pipeline (Phase 16)
- **Status**: Ready for Phase 16 (Upstash QStash Worker & Async Job Dispatcher)

## 3. Recent Progress (Rolling Snapshot - Max 5)
- Phase 15: Persona Seed Generator for 12 Timelines (`src/lib/simulation/personaSeeder.ts`)
- Phase 14: World-Builder Agent via NVIDIA NIM (`src/lib/ai/agents/worldBuilder.ts`)
- Phase 13: Voice-to-Text input via Web Speech API & fallback (`src/lib/audio/speechRecognition.ts`, `src/components/intake/VoiceInput.tsx`)
- Phase 12: Decision intake form & Zod schema definition (`src/lib/schemas/intake.ts`, `src/components/intake/IntakeForm.tsx`)
- Phase 11: Weighted random life event roller (`src/lib/simulation/eventRoller.ts`)

## 4. Next Immediate Steps
- [ ] Implement Upstash QStash dispatch route and step batch worker with signature verification (Phase 16)
- [ ] Implement Groq Delta-Only Life Simulation Agent in `src/lib/ai/agents/lifeAgent.ts` (Phase 17)
- [ ] Implement 20-quarter batch coordinator with concurrency rate limits (Phase 18)
