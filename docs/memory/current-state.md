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
- **Current Focus**: Dense Digest Serializer for Gemini Synthesis (Phase 26)
- **Status**: Phase 25 completed (Branch Deep-Dive Diary Drawer); Ready for Phase 26

## 3. Recent Progress (Rolling Snapshot - Max 5)
- Phase 25: Branch Deep-Dive Diary Drawer (`src/components/tree/BranchDetailDrawer.tsx`, `tests/unit/branchDetailDrawer.test.tsx`)
- Phase 24: Interactive Time Scrubber (`src/components/tree/TimeScrubber.tsx`, `tests/unit/timeScrubber.test.tsx`)
- Phase 23: Dynamic Branch Color States & Event Popups (`src/components/tree/BranchNodePopup.tsx`, `src/lib/simulation/branchColorEngine.ts`)
- Phase 22: 2D HTML5 Canvas Branching Tree Visualizer (`src/components/tree/MultiverseTreeCanvas.tsx`)
- Phase 21: Anti-AI-Slop Design System & Dark HUD Foundation (`src/components/hud/`, `src/lib/design/antiSlopGuard.ts`)

## 4. Next Immediate Steps
- [ ] Create Dense Digest Serializer for Gemini Synthesis in `src/lib/simulation/digestSerializer.ts` (Phase 26)
- [ ] Gemini Long-Context Cross-Timeline Narrator in `src/lib/ai/agents/narratorAgent.ts` (Phase 27)
- [ ] Finale Screen & Regret Heatmap Visualization in `src/components/finale/FinaleReportView.tsx` (Phase 28)
