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

## Active Tasks
- [ ] Phase 19: Server-Sent Events (SSE) Progress Streaming in `src/app/api/simulate/stream/[id]/route.ts`

## Backlog (Upcoming Phases)
- [ ] Phases 13–15: Voice STT input, NVIDIA world builder, persona seed generator
- [ ] Phases 16–20: Upstash QStash async job dispatcher, Groq life agent, SSE streaming
- [ ] Phases 21–25: 2D Canvas multiverse branching tree, time scrubber (Months 0–60), diary drawer
- [ ] Phases 26–30: Gemini long-context narrator, regret heatmap, safety guardrails, production launch
