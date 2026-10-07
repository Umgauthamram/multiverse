# Multiverse You — Master Project Blueprint & Architecture Plan

> **System Status**: Pre-Implementation Design & Technical Specification  
> **Target Framework**: Next.js 15 (App Router, TypeScript)  
> **Core Aesthetic**: Restrained, Product-Focused Game HUD (Anti-AI-Slop / Apple-grade restraint) with **Poppins** typography  
> **Core Principle**: Reflection and simulation tool, *not* a predictive psychic engine.

---

## 1. Project Overview & Product Vision

### 1.1 The Concept
**Multiverse You** is a decision-reflection web application that forks a user's real-world dilemma (e.g., *"Should I take an early-stage startup offer in London or stay at my stable corporate role in Delhi?"*) into **12 to 50 parallel simulated futures**.

Over an accelerated 5-year horizon (simulated in 3-month quarterly chunks = 20 steps), autonomous agents enact the life of the user and their primary circle (partner, manager, parents, close friends) subject to weighted real-world life shocks (layoffs, health scares, windfalls, burnouts, chance meetings).

At the simulation finale, a long-context synthesis narrator analyzes all timelines together to generate a **Regret Heatmap**, a **Ranked Futures Matrix**, and **The 3 Critical Divergence Moments** where small day-to-day choices created irreconcilable life differences.

### 1.2 Core Product Tenets
1. **Simulation $\neq$ Prediction**: The application explicitly frames all outputs as interactive counterfactual simulations for self-reflection, not statistical prophecies.
2. **AI Runs on Language & Logic, Not Vision**: All backend agent execution is powered by low-overhead structured text, delta vectors, and math. The visual map (Canvas/2D HUD) is client-side presentation only. Zero multimodal/vision tokens are wasted.
3. **Mathematical Accounting is Deterministic**: AI never calculates compound interest, savings runaways, or stat bounds. A dedicated **Zero-Token Deterministic Math Engine** handles all arithmetic, financial logic, and boundary clamping.
4. **Anti-AI-Slop Design Ethos**: Reject generic purple gradients, floating confetti orbs, sparkle icons, fake testimonials, and uniform bento cards. The UI is built with typographic hierarchy (Poppins), purposeful game HUD minimalism, dark readable contrast, and a functional 2D branching tree.

---

## 2. Complete Technology Stack

| Layer | Chosen Technology | Role & Strategic Justification |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15 (App Router, TypeScript)** | Full-stack serverless foundation. Provides Server Actions, Route Handlers, Streaming SSR, and edge execution. |
| **Typography** | **Poppins** (Google Fonts) | Clean, geometric sans-serif loaded via `next/font/google` with strict weights (400, 500, 600, 700). |
| **Styling & HUD** | **Tailwind CSS + Vanilla CSS Tokens** | Restrained palette (warm dark slate neutrals, muted zinc borders, single emerald/amber accent). Strict anti-slop rules. |
| **Visual Multiverse Tree** | **HTML5 2D Canvas / Optimized SVG** | 60 FPS procedural branching tree with glowing nodes and color status indicators. No heavy 3D engine overhead. |
| **AI Orchestration** | **Vercel AI SDK (`ai`)** | Unified streaming interface (`generateObject`, `streamObject`) with `@ai-sdk/google` and `@ai-sdk/openai`. |
| **LLM Tier 1: High-Speed Steps** | **Groq (`llama-3.1-8b-instant` / `llama-3.3-70b`)** | Sub-second inference for high-frequency 3-month quarterly timeline step calls. |
| **LLM Tier 2: World Building** | **NVIDIA NIM (`meta/llama-3.1-70b-instruct`)** | Nuanced character personality profiles and creative unexpected life event generation. |
| **LLM Tier 3: Finale Narrator** | **Google Gemini (`gemini-2.5-flash` / `gemini-1.5-pro`)** | 1M+ token context window reads all 12 timeline histories simultaneously for holistic cross-universe analysis. |
| **Queue & Worker Engine** | **Upstash Redis + QStash** | Serverless queue preventing Vercel timeout errors. Dispatches parallel simulation batches with rate-limiting. |
| **Database** | **MongoDB Atlas (NoSQL)** | Document store for flexible timeline trees, nested quarterly logs, character states, and user sessions. |
| **Controllable Memory Layer** | **Veeshree (`https://veeshree.vercel.app/`)** | Controllable memory engine for tracking user persona traits, values, hard constraints, and past choices across sessions. |
| **Voice Input** | **Web Speech API + Whisper API (Fallback)** | Native browser speech-to-text for zero-cost intake, with Whisper fallback for noisy environments. |
| **Math & Finance Engine** | **Custom Deterministic Engine (TS / Node)** | Rule-based engine computing net worth, burn rate, inflation, and clamping stat deltas without using LLM tokens. |

---

## 3. High-Level System Architecture

```mermaid
graph TD
    subgraph Client ["Client Browser (Next.js + 2D Canvas)"]
        IntakeUI["Intake & Dilemma Input (Text / Voice)"]
        TreeView["2D Branching Multiverse Tree (Canvas)"]
        Scrubber["Time Scrubber (Months 0 -> 60)"]
        DiaryDrawer["Branch Story Drawer & Stat Cards"]
        FinaleReport["Regret Heatmap & Comparative Analysis"]
    end

    subgraph MemoryLayer ["Controllable Memory (Veeshree)"]
        VeeshreeAPI["Veeshree Memory Store<br/>(User traits, constraints, values)"]
    end

    subgraph QueueLayer ["Async Job Orchestration"]
        QStash["Upstash QStash Worker Queue"]
        RedisLock["Upstash Redis (Rate Limiter & Cache)"]
    end

    subgraph BackendAPI ["Next.js App Router Backend"]
        IntakeHandler["/api/intake"]
        DispatchHandler["/api/simulate/dispatch"]
        StepWorker["/api/simulate/step-batch"]
        NarratorHandler["/api/simulate/narrator"]
    end

    subgraph DeterministicEngine ["Zero-Token Deterministic Math Engine"]
        FinanceCalc["Financial Projection (Runway, Savings, Inflation)"]
        StatClamper["Bounded Stat Normalizer (0-100 clamping)"]
        EventRoller["Weighted Random Event Engine (Job, Health, Windfall)"]
    end

    subgraph AIProviders ["Multi-Model Provider Matrix"]
        Groq["Groq API (Llama 3.1 / 3.3)<br/>Quarterly Life Simulation Steps"]
        Nvidia["NVIDIA NIM (Llama 70B)<br/>Character Creation & Event Flavour"]
        Gemini["Google Gemini (2.5 Flash)<br/>Narrator Reading All Timelines"]
    end

    subgraph Storage ["Persistent Database"]
        MongoDB[(MongoDB Atlas - Sessions, Timelines, Events)]
    end

    %% Flow Connections
    IntakeUI -->|User Decision + Voice| IntakeHandler
    IntakeHandler <-->|Retrieve/Update Persona| VeeshreeAPI
    IntakeHandler -->|Generate Characters| Nvidia
    IntakeHandler -->|Init Session & 12 Branches| MongoDB
    IntakeHandler -->|Trigger Simulation Job| QStash

    QStash -->|Scheduled Chunks| StepWorker
    StepWorker -->|Check Rate Limit (RPM)| RedisLock
    StepWorker -->|Generate Life Narratives| Groq
    StepWorker -->|Calculate Hard Numbers & Clamps| DeterministicEngine
    StepWorker -->|Save Timeline Step| MongoDB
    StepWorker -->|Stream Realtime Events SSE| TreeView

    MongoDB -->|Fetch All 12 Full Timelines| NarratorHandler
    NarratorHandler -->|Dense Digest Synthesis| Gemini
    NarratorHandler -->|Save Finale Report| MongoDB
    NarratorHandler -->|Send Summary| FinaleReport

    TreeView --> Scrubber
    TreeView --> DiaryDrawer
```

---

## 4. Multi-Agent System Roles & Data Contracts

### 4.1 Agent Roles
1. **Intake Agent (NVIDIA NIM)**: Ingests user input (typed or via voice), conducts a 5-question structured profiling (age, liquid savings, risk tolerance, core fears, relationship status), and defines **Path A (London Startup)** vs **Path B (Corporate Delhi)** plus optional **Path C (Hybrid)**.
2. **World Builder Agent (NVIDIA NIM)**: Creates 3–5 supporting figures (e.g., *Priya - Partner, Anxious about distance*, *Vikram - Startup Founder, High charisma/low stability*, *Mr. Sharma - Traditional Father*).
3. **Quarterly Life Agent (Groq - Llama 3.1/3.3)**: Simulates life in 3-month increments. Receives current state + persona twist + rolled event, and produces a single compact narrative sentence and proposed psychological shifts.
4. **Deterministic Life Arbiter (Internal Engine)**: Adjusts bank balance based on cost of living, income deltas, and clamped health/happiness ranges.
5. **Narrator & Synthesis Agent (Google Gemini 2.5 Flash)**: Aggregates all 12 timeline histories into a single context, evaluating life scores, regret inflections, and pivotal branch differences.

---

## 5. Token Optimization Blueprint (Slashing Tokens by 75%)

To prevent runaway API costs and avoid free-tier rate limits (Groq RPM / NVIDIA TPM), the application adheres to strict data minimization principles:

### 5.1 Chunking: 3-Month Steps Instead of Single Months
- Simulating month-by-month for 5 years across 12 timelines requires $12 \times 60 = 720$ LLM calls.
- Simulating in **3-Month Quarters (20 steps total)** requires $12 \times 20 = 240$ calls.
- **Reduction**: **66.7% fewer calls**.

### 5.2 Delta-Only JSON Schemas
The LLM never re-outputs past logs or full stat blocks. It returns strictly delta updates:
```json
{
  "delta_happiness": -8,
  "delta_health": -5,
  "delta_relationships": -12,
  "delta_career": +15,
  "event_flavor": "Promotion granted after grueling 70-hour weeks. Missed anniversary dinner.",
  "diary": "Got the Senior title and equity, but an empty apartment greeted me at midnight."
}
```
*Average Output Size*: ~40–60 tokens per call.

### 5.3 Compressed State Prompting
Rather than passing all previous 10 quarters of diary entries, the prompt only provides:
- The user's active seed (*"Timeline 3: London / Workaholic Persona"*).
- Numerical state at start of quarter (*`Money: $24,500 | Happiness: 58 | Health: 70`*).
- Injected event for this quarter (*`Rolled Event: Co-founder disagreement`*).

### 5.4 Gemini Finale Table Digest
Gemini does not receive raw multi-page transcripts. The backend condenses all 12 timelines into a structured **Markdown Digest Table**:
```markdown
| Timeline | Path | Seed | Final Net Worth | Peak Happiness | Burnout Month | Critical Shocks |
|---|---|---|---|---|---|---|
| T1 | London | Bold | $185,000 | 82 (M24) | Never | M12 Angel funding, M36 Exit |
| T2 | London | Anxious | $42,000 | 45 (M6) | M18 | M18 Layoff, M24 Visa panic |
| T7 | Delhi | Stable | $68,000 | 79 (M60) | Never | M15 Marriage, M30 Home purchase |
```
Gemini consumes this entire 5-year multi-timeline simulation in **under 2,500 tokens**, producing the finale report in a single response.

---

## 6. The Zero-Token Deterministic Math & Finance Engine

LLMs cannot perform reliable compound calculations or preserve balance integrity over 20 steps. All mathematical tracking is handled by an isolated TypeScript engine:

### 6.1 Formulae & Logic
1. **Financial Balance Update**:
   $$\text{Money}_{t+1} = \text{Money}_t + (\text{Income} - \text{Rent} - \text{LivingExpenses}) \times 3 + \text{EventCashImpact}$$
2. **Stat Bounding**:
   $$\text{Stat}_{t+1} = \max(0, \min(100, \text{Stat}_t + \Delta_{\text{LLM}} + \Delta_{\text{Event}}))$$
3. **Burnout Trigger Condition**:
   $$\text{If } \text{Health} < 20 \text{ and } \text{Happiness} < 25 \implies \text{Force Burnout Shock (Loss of income, forced rest)}$$
4. **Weighted Probability Life Event Roller**:
   - Promotion: 12% probability
   - Startup Down-round / Layoff: 8% probability
   - Sudden Health Expense: 4% probability
   - Serendipitous Connection / Romance: 7% probability
   - Normal Steady Quarter: 69% probability

---

## 7. Anti-AI-Slop Design & Aesthetic Guidelines

Adhering strictly to the **AI Action Letter #81** principles and user preferences:

```
+----------------------------------------------------------------------------------+
|  MULTIVERSE YOU                                   [Persona: 26yo Engineer] [Exit] |
+----------------------------------------------------------------------------------+
|                                                                                  |
|   BRANCHING TIMELINES (YEAR 0 TO YEAR 5)                          [Scrubber: M36] |
|   =============================================================================  |
|                                                                                  |
|   T1 (London - Bold)      o-----o-----o-----o-----o-----o (Thriving $180k)       |
|   T2 (London - Cautious)  o-----o-----x (Terminated M18: Visa Expired)           |
|   T3 (Delhi - Balanced)   o-----o-----o-----o-----o-----o (Stable 84% Joy)       |
|   T4 (Delhi - Workaholic) o-----o-----o-----o-----! (Burnout Warning)            |
|                                                                                  |
+------------------------------------+---------------------------------------------+
| ACTIVE TIMELINE INSPECTOR: T1      | COMPARATIVE STATS AT MONTH 36               |
| Quarter 12 (Month 36)              |                                             |
| Status: Thriving                   | Net Worth:     $142,000   [=======---]      |
| Event: Closed Series A Funding     | Happiness:     76/100     [======----]      |
| Diary: "We signed term sheets at   | Health:        68/100     [=====-----]      |
| 2 AM. Relieved, but I haven't seen | Relationships: 48/100     [====------]      |
| my family in 14 months."           |                                             |
+------------------------------------+---------------------------------------------+
```

### 7.1 What We Explicitly AVOID
- **NO Generic Purple-to-Cyan Gradients**: No generic AI theme presets.
- **NO Sparkle Icons & Magic Wands**: No emojis or decorative AI particles.
- **NO Fake Testimonials or Bento Grid Clutter**: Every element has an active interactive function.
- **NO Floating Blurred Gradient Orbs**: Keep surfaces clean and grounded.
- **NO Unnecessary Animations**: Animations are strictly limited to branch node progression and scrubber scrubbing.

### 7.2 What We Use Instead
- **Typography**: Google Font **Poppins** across all headings, badges, and monospace figures.
- **Backgrounds**: Deep warm graphite and dark zinc (`#09090b`, `#121215`, `#18181b`).
- **Accents**: Restrained functional status colors:
  - Thriving: Muted Sage / Emerald (`#10b981`)
  - Plateau: Subdued Amber (`#f59e0b`)
  - Crisis / Low Reserves: Rose / Crimson (`#f43f5e`)
  - Terminated / Dormant: Muted Slate (`#64748b`)
- **Data Presentation**: Clear horizontal timelines, real-time stat bars with numerical values, and direct diary transcripts.

---

## 8. Database Schema (MongoDB Atlas)

### 8.1 Collection: `simulations`
```typescript
interface SimulationDocument {
  _id: string; // ObjectId string
  userId: string;
  createdAt: Date;
  status: "draft" | "processing" | "completed" | "failed";
  
  // User Profile from Intake
  userProfile: {
    age: number;
    currentLocation: string;
    liquidSavings: number;
    monthlyBurn: number;
    corePriorities: ("wealth" | "peace" | "relationships" | "career")[];
    decisionPrompt: string;
    optionA: { name: string; location: string; description: string };
    optionB: { name: string; location: string; description: string };
  };

  // World Characters
  worldCast: {
    id: string;
    name: string;
    role: "partner" | "parent" | "manager" | "friend";
    personality: string;
  }[];

  // 12 Parallel Timelines
  timelines: {
    timelineId: string;
    branchOption: "A" | "B";
    personaSeed: "bold" | "anxious" | "workaholic" | "social" | "pragmatist" | "burnout_risk";
    status: "active" | "terminated" | "thriving" | "struggling";
    
    quarters: {
      quarter: number; // 1 to 20
      month: number;   // 3 to 60
      stats: {
        money: number;
        happiness: number; // 0-100
        health: number;    // 0-100
        relationships: number; // 0-100
        career: number;    // 0-100
      };
      eventTitle: string;
      eventImpactSummary: string;
      diaryEntry: string;
    }[];
  }[];

  // Finale Narrator Synthesis
  finaleReport?: {
    rankedTimelines: { timelineId: string; score: number; rationale: string }[];
    regretHeatmap: { month: number; timelineId: string; dropMagnitude: number; cause: string }[];
    threePivotalMoments: {
      quarter: number;
      choiceDescription: string;
      divergenceOutcome: string;
    }[];
    reflectiveAdvice: string;
  };
}
```

---

## 9. Environment Configuration (`.env.example`)

Below is the required environment configuration file template:

```env
# -------------------------------------------------------------
# APPLICATION CONFIGURATION
# -------------------------------------------------------------
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# -------------------------------------------------------------
# DATABASE (MongoDB Atlas)
# -------------------------------------------------------------
# Connection string from MongoDB Atlas cluster
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/multiverse_you?retryWrites=true&w=majority

# -------------------------------------------------------------
# BACKGROUND QUEUE & CACHE (Upstash)
# -------------------------------------------------------------
# Upstash Redis for distributed locks and rate limiting
UPSTASH_REDIS_REST_URL=https://<your-redis-instance>.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token_here

# Upstash QStash for dispatching async simulation batches
QSTASH_URL=https://qstash.upstash.io/v2
QSTASH_TOKEN=your_qstash_token_here
QSTASH_CURRENT_SIGNING_KEY=your_qstash_signing_key_here
QSTASH_NEXT_SIGNING_KEY=your_qstash_next_signing_key_here

# -------------------------------------------------------------
# AI PROVIDERS (Vercel AI SDK Integration)
# -------------------------------------------------------------
# 1. Groq (High-Frequency Quarterly Life Steps)
GROQ_API_KEY=gsk_your_groq_api_key_here

# 2. NVIDIA NIM (Creative Personas & Life Events)
NVIDIA_API_KEY=nvapi-your_nvidia_nim_api_key_here
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1

# 3. Google Gemini (Narrator Long-Context Synthesis)
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy_your_gemini_api_key_here

# -------------------------------------------------------------
# MEMORY ENGINE (Veeshree)
# -------------------------------------------------------------
# Controllable memory layer for user traits and historical context
VEESHREE_API_URL=https://veeshree.vercel.app/api
VEESHREE_API_KEY=your_veeshree_access_token_here

# -------------------------------------------------------------
# VOICE & AUDIO (Optional Fallbacks)
# -------------------------------------------------------------
# OpenAI key for server-side Whisper transcription fallback
OPENAI_API_KEY=sk-your_openai_key_here
```

---

## 10. Repository `.gitignore` Specification

```gitignore
# Dependencies
/node_modules
/.pnp
.pnp.js
.yarn/cache

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Next.js Build Outputs
/.next/
/out/

# Production Build
/build

# Debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# System & Editor Files
.DS_Store
Thumbs.db
*.sublime-workspace
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json
.idea/

# Upstash & Local DB scratch
.upstash
/scratch
```

---

## 11. Day-by-Day Implementation Roadmap

| Day | Focus Area | Detailed Deliverables |
| :---: | :--- | :--- |
| **Day 1** | **Foundation & AI Providers** | Initialize Next.js 15, Poppins font configuration, `.env.example`, `.gitignore`, MongoDB client connection, and Vercel AI SDK adapters for Groq, NVIDIA NIM, and Gemini. |
| **Day 2** | **Intake, Voice & Veeshree Memory** | Build the decision questionnaire with Web Speech API voice capture, Veeshree controllable memory persistence, and NVIDIA NIM world-builder agent. |
| **Day 3** | **Deterministic Math & Queue Engine** | Implement zero-token calculation engine (financial runway, stat clamps, weighted event roller). Configure Upstash QStash worker batch dispatcher. |
| **Day 4** | **Parallel Multiverse Simulator** | Implement parallel simulation runner (12 timelines $\times$ 20 quarters). Enforce delta-only JSON extraction with Groq + fallback router. Stream progress to MongoDB. |
| **Day 5** | **2D Canvas Tree & HUD Interface** | Develop the 2D branching Canvas visualizer with glowing node states, time scrubber (Months 0–60), and click-to-view diary slideout drawer. |
| **Day 6** | **Gemini Finale Narrator & Heatmap** | Build dense digest serializer, invoke Gemini 2.5 Flash for holistic evaluation, construct the Regret Heatmap matrix, and highlight the 3 pivotal moments. |
| **Day 7** | **Polish, Audio Cues & Launch Prep** | Audit against Anti-AI-Slop design guidelines, refine responsive layout, verify error fallbacks and rate limits, and finalize user documentation. |

---

## 12. Verification & Safety Criteria

1. **Safety Disclaimers**: Render persistent notice on both the intake modal and the final report:
   > *"Multiverse You is a cognitive reflection and counterfactual simulation experiment. It does not predict future events or guarantee financial/personal outcomes."*
2. **Crisis Safeguard Interceptor**: If user enters keywords involving self-harm, severe clinical depression, or unlawful activity, the simulation immediately halts and provides direct links to verified international helplines.
3. **Graceful Provider Fallback**: If Groq encounters HTTP 429 during timeline generation, the router transparently shifts the active batch to NVIDIA NIM or Gemini without dropping user state.
