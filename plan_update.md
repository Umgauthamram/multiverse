# PROMPT: Multiverse Theater — Live Simulation Visualization Layer

> Audience: a coding agent (Claude Code / Cursor / Gemini CLI) working inside the existing `multiverse-you` repo.
> Purpose: add a 2 to 3 minute animated "Theater" that plays while the simulation runs, then reveals 4 finished lives.
> Start and end of the product flow do NOT change. Only the middle changes.

---

## 0. Read this first (hard rules)

1. Before writing anything, read `CLAUDE.md`, `docs/memory/current-state.md`, `docs/memory/constraints.md`, `docs/memory/rejected.md`, and `docs/memory/decisions/*`. Obey them unless Section 14 explicitly amends them.
2. **Zero-Token Math Rule stays.** The Theater adds **zero** new LLM calls and **zero** new LLM tokens. Every number on screen comes from the deterministic engines (`financeEngine`, `statClamper`, `eventRoller`) or from text the Life Agent already returns (`diaryEntry`, `reflection`).
3. **Frontend owns the vocabulary, backend only speaks it.** The backend emits short lines in a closed "Scene Language" (Section 6). The frontend decides what each word looks like. The backend never sends coordinates, sprite names, colors, or animation timings.
4. **Do not rewrite existing engines.** Add hooks and new modules. Do not delete the 12-timeline code (`generate12TimelineSeeds`, tests). The Theater runs **4 stories**; 12 stays supported.
5. **No new runtime dependency for rendering.** Use plain HTML5 Canvas 2D, React 19, TypeScript. No Phaser, Pixi, Three, or sprite-sheet image files. All art is drawn procedurally in code.
6. **Original art only.** The reference images are for layout, mood, and object vocabulary. Do not trace, copy, or embed Habbo sprites, WorkAdventure assets, or TinyFloor code/assets (TinyFloor is AGPL-3.0).
7. Keep the framing line visible at all times during the Theater: **"Reflective Simulation Engine, Not a Future Prediction"**.
8. Ship in the phases of Section 13. Run `npm run ci` at the end of every phase. Update `docs/memory/current-state.md` and `tasks.md` as `CLAUDE.md` requires.

### Reference assets (save these before starting)

Ask the owner to place the three reference images here. If they are missing, work from the text descriptions in this document.

| File | What it is | Used for |
| :--- | :--- | :--- |
| `docs/design/theater/ref-character-style.png` | Thick-outline cartoon character: oversized bald head, glasses, beard, headset, dark polo with small orange chest logo | Character proportions, outline weight, face language |
| `docs/design/theater/ref-agent-roster.png` | Table of 9 agents with role, accent hex, desk-screen content | Agent cast, colors, screen behaviors (reproduced in Section 4) |
| `docs/design/theater/ref-habbo-office.png` | Three-level isometric cutaway office: yellow walls, navy trim, cyan tile floor, desks with monitors, stairs, shelves, plants, bulletin boards, windows with clouds, server racks, a red mailbox, brooms | Building structure, object vocabulary, camera angle |

Behavioral references (not to be copied): **WorkAdventure** (characters walk between zones, rooms have purpose) and **TinyFloor** (16-bit office floor, every desk shows a live status, characters walk up to each other to interact).

---

## 1. The experience in one paragraph

The user submits their dilemma exactly as today. The screen changes to a cutaway **building**. The **top floor is the Agent Office**: 9 cartoon agents at desks whose monitors show live work (a terminal printing the money formula, bar charts moving, a test runner passing or failing). The **lower floor is the Life Wing**: 4 rooms, one per story. In each room the user's cartoon avatar lives one possible future: it sits at a desk, gets promoted, gets laid off, falls ill, gets visited by a partner, a manager, a parent, a friend. Every movement is driven by short Scene Language lines coming from the backend as the real simulation runs. A **Live Ticker** prints the same lines as readable text ("S2 Q7 cash 24,500 + (5,000 - 2,500) x 3 + 0 = 32,000"). After about 2.5 minutes the lights come on, the camera pulls back, and the 4 finished lives are shown as 4 cards leading into the existing tree, drawer, and finale report.

---

## 2. What exists today vs. what must change

I inspected the repo. These gaps decide the work.

| # | Finding in current code | Consequence |
| :--- | :--- | :--- |
| G1 | `src/app/page.tsx` calls the local mock `generateSimulatedMultiverse(values)`. The real pipeline (`/api/simulate/dispatch` → `/step-batch` → SSE) is **not wired to the UI**. | Add a real start route and a Theater view. Keep the mock as an offline/dev data source (Section 7.5). |
| G2 | `/api/simulate/step-batch` does **not** call `runQuarterStep` or the Life Agent. It only applies event stat deltas, uses a hardcoded income `2800`, persists nothing, emits nothing. | Rewrite the worker body to call `runQuarterStep` per quarter so LLM diary + deltas, persistence, and Scene lines are produced. |
| G3 | `BatchJobPayload` has no `decisionPrompt`, branch name, branch location, income, or cost-of-living. | Worker must load these from the `simulations` document by `sessionId` instead of the payload. |
| G4 | `streamManager` is an in-process `EventEmitter`. QStash workers and the SSE route can run on different serverless instances, so live events will silently never arrive. | SSE must **poll MongoDB** for new Scene lines by cursor (Section 7.3). Keep the emitter only as a same-instance fast path. |
| G5 | SSE emits only `quarter_step` after a quarter is fully done. Nothing during the 1 to 3 s LLM call. | Add progress emission **inside** `runQuarterStep` (Section 7.2). |
| G6 | 12 timelines are assumed in `simulationOrchestrator.ts` (copy text, scoring), `dispatch` (`.max(12)`), and likely `MultiverseTreeCanvas` layout. | Introduce `STORY_COUNT = 4`. Remove hardcoded "12" in user-facing copy and layout math. |
| G7 | There is no `/api/simulate/narrator` route although the plan lists it. | Add it. It is triggered when the last story finishes, and it emits `NARRATE` lines. |

---

## 3. Time budget and pacing (strict)

All durations are constants in `src/lib/theater/timing.ts`.

| Constant | Value | Meaning |
| :--- | :--- | :--- |
| `BOOT_MS` | 8000 | Lights on, agents wake, 4 stories fork, cast loads |
| `BEAT_MS` | 6500 | Playback length of one quarter for one story |
| `STORY_STAGGER_MS` | 1600 | Story `i` starts each beat `i * 1600` ms after S1 (so agents visibly cycle through 4 jobs per round) |
| `FINALE_MS` | 12000 | Narrator phase and the pull-back |
| `THEATER_TARGET_MS` | `BOOT + 20 * BEAT + FINALE` = 150000 | Nominal total |
| `THEATER_MIN_MS` | 120000 | Never reveal earlier than this unless the user presses Skip |
| `THEATER_MAX_MS` | 180000 | After this, remaining beats run at 3x speed |
| `THEATER_HARD_TIMEOUT_MS` | 240000 | Stop waiting for the server, reveal whatever is complete, flag partial |

**Compute and show are decoupled.** The server will usually finish all 80 quarter calls (4 stories x 20) in 30 to 70 s. The Theater does not follow the server clock. The server writes Scene lines as fast as it can. The **Director** (client) plays them at `BEAT_MS` per quarter.

Honesty rule for the header status chip:
- Server still running: `Computing`.
- Server finished, Theater still playing: `Playing back your simulation`.
- Never claim live computing when the data is already complete.

Reveal gate: reveal only when **all** are true: server sent `FINISH`, Director queues are empty, `elapsed >= THEATER_MIN_MS`. A `Skip to results` button appears after 15 s. If the server is not done when Skip is pressed, show a blocking "Still finishing the last quarters" state with progress, then reveal.

---

## 4. The Building (world, art direction, agents)

### 4.1 Projection and grid

- Isometric 2:1. `TILE_W = 64`, `TILE_H = 32`. Tile `(col,row)` projects to `x = (col - row) * 32`, `y = (col + row) * 16`.
- Design canvas `1280 x 720`, scale-to-fit with letterboxing, `devicePixelRatio` capped at 2.
- Painter's algorithm: sort by `(level, col + row, z)`. Every entity has a footprint in tiles.
- Characters walk with A* on the tile grid (4-neighbor, blocked tiles from the layout). Speed 2.5 tiles/s. Only two facing directions are drawn (front-left, front-right); the other two are mirrors.

### 4.2 Layout (starting values, tunable)

```
              ROOF / SKY STRIP  (windows show clouds)
 +--------------------------------------------------------+
 | FLOOR 2  AGENT OFFICE   16 x 10 tiles                   |
 |  [NEXUS reception]  stairs                              |
 |  RONIN  SAGE   CIPHER   MUSE    ATLAS                   |
 |  FORGE  ECHO   SPARK    (bulletin board, server rack)   |
 +--------------------------------------------------------+
 | FLOOR 1  LIFE WING   17 x 17 tiles                      |
 |   +-------- S1 --------+  +-------- S2 --------+        |
 |   |  8 x 8 room        |  |  8 x 8 room        |        |
 |   +--------------------+  +--------------------+        |
 |   +-------- S3 --------+  +-------- S4 --------+        |
 |   |  8 x 8 room        |  |  8 x 8 room        |        |
 |   +--------------------+  +--------------------+        |
 |   1-tile corridor between rooms, glass walls            |
 +--------------------------------------------------------+
```

- Floor 2 sits `FLOOR_RISE = 176 px` above floor 1. Both floors are visible at once (cutaway, like the reference image).
- Each room has named **anchors** used by the director and pathfinder: `door`, `desk`, `sofa`, `window`, `kitchen`, `shelf`, `visitor_1`, `visitor_2`.
- Agent Office anchors: `desk_<AGENT>` for each agent, `reception`, `stairs_top`.

### 4.3 Object catalog (build all procedurally)

Agent Office: desks with CRT/flat monitors, office chairs (swivel), server rack, bulletin board with sticky notes, mailbox, plants, water cooler, broom, stairs, windows with cloud pane, wall clock showing the current simulated month.

Life Room (each): desk + monitor, chair, sofa, bed-nook or screen divider, bookshelf, plant, kitchen counter with coffee machine, wall frames (photo frames), window with city view, door, cardboard box (hidden until layoff), envelope, coin stacks, pill bottle, calendar.

Window view lookup (`layout.ts`): match `branchLocation` against `London`, `Delhi`, `Bengaluru`, `San Francisco`; fallback is a generic skyline. A view is a flat-color skyline silhouette, nothing photographic.

### 4.4 Palette (tokens in `src/lib/theater/tokens.ts`, mirrored as CSS variables)

The Theater must feel like the reference but stay inside the product's restrained look. Default is the **muted** variant.

| Token | Muted (default) | Use |
| :--- | :--- | :--- |
| `wall` | `#b8893a` | Interior walls (reference: bright yellow) |
| `wallShade` | `#8f6a2c` | Left wall face |
| `trim` | `#1b2a5c` | Wall edge trim (reference: navy) |
| `floorA` / `floorB` | `#8fb8c0` / `#7fa8b0` | Checker floor (reference: cyan tiles) |
| `furniture` | `#3a3a44`, `#52525b` | Desks, chairs |
| `outline` | `#111114` | 2 px outline on every character and prop |
| `skyline` | `#3f4a63` | Window silhouettes |

Story health colors reuse `STATUS_COLORS` from `MultiverseTreeCanvas` (emerald thriving, amber plateau, rose struggling, slate burnout). Use them **only** for the room frame (2 px border) and a 6% alpha floor tint, never for large fills.

### 4.5 Characters (style from `ref-character-style.png`)

- Chibi proportions: head is about 55% of body height. Thick 2 px outline in `outline`. Flat fills plus **one** highlight shape on the head. No gradients, no blur, no glow.
- Face: heavy half-closed eyelids by default, small round nose, mouth is a single line or an open shape. Expressions: `neutral`, `happy`, `worried`, `sad`, `tired`, `surprised`.
- **Procedural generator** `characterGenerator.ts` takes a look spec and returns an offscreen canvas atlas built once at startup:

```ts
interface LookSpec {
  skin: string; hair: "bald" | "short" | "long" | "cap" | "grey";
  glasses: boolean; beard: "none" | "stubble" | "full";
  headset: boolean; shirt: string; chestGlyph?: string; // glyph drawn in accent color
  accessory?: "lanyard" | "tie" | "hoodie" | "jacket" | "none";
}
```

- Animation set (frames per direction): `idle` (2), `walk` (4), `type` (2), `sit` (1), `talk` (2, mouth toggle), `react_up` (2, arms raised), `react_down` (2, slump), `carry_box` (2), `hold_chest` (2).
- **NEXUS** uses the reference character as the base template (bald, glasses, beard, headset, dark polo, small chest logo) because the role is "reception desk operator". Recreate it procedurally; do not trace the image.
- **YOU** (user avatar): the same face in all 4 stories (it is the same person), different outfit per persona seed. Hair tone derives from age (under 30 dark, 30 to 45 dark with grey temples, over 45 grey).

| Persona seed | Outfit and idle quirk |
| :--- | :--- |
| `bold` | Jacket, confident stance, taps desk |
| `anxious` | Hoodie, wrings hands, looks at door |
| `workaholic` | Shirt sleeves up, two coffee cups on desk, never leaves desk in `steady` |
| `balanced` | Casual shirt, plant on desk, stretches |
| `pragmatist` | Shirt + notebook, glances at wall calendar |
| `burnout_risk` | Rumpled shirt, extra papers on desk, rubs eyes |

- **Cast NPCs** (from `worldCast`): `partner`, `manager` (tie + lanyard), `parent` (grey hair), `friend` (casual). They spawn at `door`, walk to the target anchor, interact, walk out. They exist in a room only while an op needs them.

### 4.6 The 9 agents (from `ref-agent-roster.png`) mapped to real backend stages

Names, roles, accents, and screens are taken from the roster image. The **Backend stage** column is the new mapping that ties each cartoon to real work.

| Agent | Role | Accent | Desk screen (from image) | Backend stage it represents | Scene verbs it reacts to |
| :--- | :--- | :--- | :--- | :--- | :--- |
| RONIN | The Builder | `#0DEEF3` Teal | Helmet logo + scrolling code | Life Agent (Groq LLM call) | `THINK`, `DELTA` |
| SAGE | The Analyst | `#F5A623` Amber | Live bar charts + trend lines | Stat tracking per story | `CLAMP` |
| CIPHER | The Coder | `#00E676` Green | Terminal with blinking cursor | Deterministic finance engine | `CALC` |
| MUSE | The Creative | `#E040FB` Magenta | Color swatches + floating dots | Life event roller and flavor | `ROLL` |
| ATLAS | The Strategist | `#448AFF` Blue | Connected node map | Branch forker, status per story | `FORK`, `STATUS` |
| FORGE | The Deployer | `#FF9100` Orange | Deploy progress bar + build # | Queue progress, then Narrator | `PROGRESS`, `NARRATE` |
| ECHO | The Researcher | `#7C4DFF` Purple | Research docs with markdown | World builder + Veeshree memory | `CAST`, `SAY` |
| SPARK | The Tester | `#FF5252` Red | Test suite pass/fail runner | Invariants: clamp `[0,100]`, burnout rule, crisis scan | `CLAMP`, `STATUS`, `ERROR` |
| NEXUS | The Coordinator | `#CCDDEE` Silver | Reception desk operator | Orchestrator, QStash dispatch, provider fallback | `BOOT`, `REROUTE`, `FINISH` |

Agent presentation rules:
- Every agent wears the same dark polo with a small chest glyph in its accent color. Headsets: NEXUS and RONIN only.
- Each desk has a TinyFloor-style **status tag**: dot + 2 to 3 words. Dot colors: grey idle, accent working, `#10b981` done, `#ef4444` error. Example: `working S2 Q7`.
- Each monitor is a procedurally drawn 48 x 32 texture refreshed at 8 fps. Content per agent:
  - **CIPHER**: types the `CALC` formula one char at a time, blinking cursor; cash result flashes the status color for 400 ms. Monospace is allowed **only** inside this texture and RONIN's.
  - **RONIN**: `THINK` shows scrolling code rows (looping glyph rows, faster while waiting); `DELTA` freezes on the four deltas.
  - **SAGE**: four bars (joy, health, rel, career) for the story in focus, easing to the clamped values; trend line of the last 8 quarters from scene state.
  - **MUSE**: `ROLL` pops a swatch chip colored by event severity, with 6 to 10 small square dots drifting upward (hard-edged pixels, never blurred).
  - **ATLAS**: node map with 4 nodes (S1 to S4) colored by story status; the active story pulses.
  - **FORGE**: progress bar = `done/total` from `PROGRESS`; `build #` = current round (1 to 20). During `NARRATE` it becomes a 3-step bar: digest, narrator, report.
  - **ECHO**: a doc with tiny markdown lines (`# Priya`, `- anxious`, `- partner`). On `SAY` a new line is appended (the diary is being archived to memory).
  - **SPARK**: rows like `clamp_range`, `burnout_rule`, `crisis_scan`. Pass = drawn check; fail = drawn cross plus 300 ms red flash. No emoji.
  - **NEXUS**: phone-ringing idle, short speech bubble ("Routing S2 to backup").
- **Handoff packets**: when a story's job moves between agents (`ROLL` → `CALC` → `THINK` → `CLAMP` → `SAY`), a small document sprite slides along a straight line from the previous agent's desk to the next over 400 ms. Agents do not walk between desks. Only NEXUS may walk (to the stairs on `FORK`, to the Life Wing corridor on `FINISH`).
- Agent accent colors may appear only on: monitor content, status dot, name tag underline, chest glyph. **Never** as large fills, gradients, or glows (Section 14).

---

## 5. The 4 Stories

### 5.1 Selection

Add `generateStorySeeds(intake, count = 4)` in `src/lib/scene/storySeeds.ts`. Default roster, deterministic:

| Story | Option | Persona seed |
| :--- | :--- | :--- |
| S1 | A | `bold` |
| S2 | A | `anxious` |
| S3 | B | `balanced` |
| S4 | B | `workaholic` |

This gives two lives per path with opposite temperaments, so the final comparison separates "the path" from "the person". The roster is a single exported constant so it can change later.

### 5.2 Per-quarter simulation

Each story runs the existing 20-quarter loop through `runQuarterStep`. Total LLM calls: 80. Concurrency of the 4 stories: 4 (one QStash chain per story, 5-quarter chunks as today).

### 5.3 Room state visuals (reducer output → drawing)

These are persistent looks driven by scene state, independent of the current event.

| State | Visual rule |
| :--- | :--- |
| Cash vs initial savings | Coin stacks on shelf: `<25%` = 0, `25 to 75%` = 1, `75 to 150%` = 2, `>150%` = 3 |
| Happiness | `>=65` happy face, plant alive; `35 to 64` neutral; `<35` sad face, plant wilted, lamp dim |
| Health | `<40` tired face + eye bags + slumped posture; `<20` also coffee cups pile up |
| Relationships | Number of photo frames on wall: `<30`=0, `30 to 59`=1, `60 to 79`=2, `>=80`=3; partner and friend visit more often when high |
| Career | Desk tier: `<40` one monitor; `40 to 69` two monitors; `>=70` two monitors + nameplate; `>=90` plus corner plant and framed certificate |
| Status `thriving` | Room frame emerald, lights warm |
| Status `plateau` | Room frame amber |
| Status `struggling` | Room frame rose, one lamp off |
| Status `burnout` | Room frame slate, lights off, floor tint desaturated, YOU lies on sofa, monitor black. This is a rest state. It must never look like self-harm. |

### 5.4 Event scenes (triggered by `ROLL`, 1100 ms of the beat, remaining reaction plays through `DELTA` and `CLAMP`)

| `ev` | Cast needed | Sequence |
| :--- | :--- | :--- |
| `promotion` | manager | Manager walks in, hands an envelope, YOU `react_up`, certificate frame appears on wall |
| `layoff` | manager | Manager hands a box, YOU `carry_box` from desk to door anchor, monitor goes dark, YOU sits on sofa |
| `health_shock` | none | YOU `hold_chest` then sits, pill bottle appears on desk. Mild. No ambulance, no hospital, no death |
| `windfall` | none | Envelope lands on desk, coin stack grows one tier, `+amount` text pop above desk |
| `serendipity` | friend or new NPC | NPC walks to visitor anchor, both `talk`, speech bubbles with "..." only, relationship chip pops |
| `steady` | none | YOU `type`, sips coffee, persona idle quirk |

Text pops (`+7,500`, `joy -8`) are plain Poppins text that rise 12 px and fade over 900 ms. Chips use stat colors (joy amber, health emerald, rel blue, career teal). **No sparkles, confetti, stars, or emoji.**

---

## 6. The Scene Language (the "new language")

A closed, line-based language. One line = one fact. The backend writes it. The frontend parses, validates, reduces it into scene state, renders it, and also prints it in the ticker. **One line feeds both the animation and the text**, so what the user reads is exactly what they see.

### 6.1 Grammar

```
line     := scope SP verb { SP arg }
scope    := "@*"                      ; global
          | "@" storyId               ; story-level, e.g. @S2
          | "@" storyId "/Q" int      ; quarter-level, e.g. @S2/Q7
arg      := key "=" value
key      := [a-z][a-z0-9_]*
value    := int                       ; -?[0-9]+  (explicit +/- allowed on deltas)
          | ident                     ; [a-z][a-z0-9_]*
          | quoted                    ; "..."  with \" escape, max 220 chars
```

Rules: ASCII only. Integers only (money in whole currency units, no decimals). Max line length 280 chars. Unknown verb or unknown key → the frontend **drops the line and logs a dev warning**, never crashes. All strings from the LLM (`text`) must be sanitized: strip control characters and newlines before emitting.

### 6.2 Vocabulary v1 (closed set)

| Verb | Scope | Args | Emitted when | Agent | Room / world reaction | Ticker template |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `BOOT` | `@*` | `sess` `stories` `quarters` | Session created | NEXUS | Lights on, agents wake, NEXUS walks stairs | `Session ready: {stories} lives x {quarters} quarters` |
| `FORK` | `@S` | `opt` `seed` `label` `loc` | Story seeded | ATLAS | Room powers on, YOU spawns at door, walks to desk | `{storyId} forked: {label}` |
| `CAST` | `@*` | `role` `name` `trait` | Cast loaded | ECHO | ECHO doc gains a line; NPC definition registered | `Cast loaded: {name} ({role}, {trait})` |
| `ROLL` | `@S/Q` | `ev` `sev` `title` | Event rolled | MUSE | Event scene (5.4) | `{storyId} Q{q} event: {title} ({sev})` |
| `CALC` | `@S/Q` | `cash0` `inc` `exp` `evc` `cash1` | Finance computed | CIPHER | Cash text pop, coin tier update | `{storyId} Q{q} {cash0} + ({inc} - {exp}) x 3 + {evc} = {cash1}` |
| `THINK` | `@S/Q` | `prov` | Before LLM call | RONIN | YOU thought bubble "...", RONIN code scrolls | `{storyId} Q{q} life agent drafting via {prov}` |
| `DELTA` | `@S/Q` | `joy` `hp` `rel` `car` | LLM returned (combined raw deltas) | RONIN | Stat chips pop over YOU | `{storyId} Q{q} delta joy {joy} / health {hp} / rel {rel} / career {car}` |
| `CLAMP` | `@S/Q` | `joy` `hp` `rel` `car` `hit` | After `applyAndClampStats` | SPARK → SAGE | Bars ease, face/props update (5.3). `hit` = `none` or the stat that hit 0 or 100 | `{storyId} Q{q} clamped to joy {joy} / health {hp} / rel {rel} / career {car}` |
| `STATUS` | `@S/Q` | `st` `burn` | After clamp | ATLAS (+ SPARK if `burn=1`) | Room frame color, burnout state | `{storyId} Q{q} status: {st}` |
| `SAY` | `@S/Q` | `who` `text` | Diary available | ECHO | Speech bubble over `who` (first 90 chars + ellipsis) | `{storyId} Q{q} diary: {text}` |
| `DONE` | `@S/Q` | none | Quarter finished | none | Beat bookkeeping, clock chip advances | none (not printed) |
| `END` | `@S` | `cash` `st` | Story finished 20 quarters | ATLAS | Story banner "Month 60" | `{storyId} finished: cash {cash}, {st}` |
| `PROGRESS` | `@*` | `done` `total` | After each quarter | FORGE | Progress bar | none (bar only) |
| `REROUTE` | `@*` | `from` `to` | Router fell back (429/5xx) | NEXUS | NEXUS speech bubble, phone rings, SPARK shows a brief fail then pass | `Provider {from} busy, rerouting to {to}` |
| `ERROR` | `@S/Q` | `code` | A quarter failed all providers | SPARK, NEXUS | Room dims to "signal lost" idle | `{storyId} Q{q} failed: {code}, retrying` |
| `NARRATE` | `@*` | `phase` (`digest`\|`gemini`\|`report`\|`done`) | Finale pipeline | FORGE | 3-step bar, agents converge toward the reception area | `Finale: {phase}` |
| `FINISH` | `@*` | none | Narrator report saved | NEXUS | Reveal gate input | `All lives complete` |

`ev` values: `promotion|layoff|health_shock|windfall|serendipity|steady`. `sev`: `pos|neg|neu`. `st`: `thriving|plateau|struggling|burnout`. `who`: `you` or a cast `role`. `hit`: `none|joy|hp|rel|car`.

### 6.3 Example stream (one story, one quarter, plus globals)

```
@*    BOOT sess=ab12cd stories=4 quarters=20
@S1   FORK opt=A seed=bold label="London / Bold" loc="London, UK"
@*    CAST role=partner name="Priya" trait=anxious
@S2/Q7 ROLL ev=promotion sev=pos title="Promotion granted"
@S2/Q7 CALC cash0=24500 inc=5000 exp=2500 evc=0 cash1=32000
@S2/Q7 THINK prov=groq
@S2/Q7 DELTA joy=-8 hp=-5 rel=-12 car=+15
@S2/Q7 CLAMP joy=62 hp=65 rel=48 car=85 hit=none
@S2/Q7 STATUS st=thriving burn=0
@S2/Q7 SAY who=you text="Got the Senior title and equity, but an empty apartment greeted me at midnight."
@S2/Q7 DONE
@*    PROGRESS done=47 total=80
```

### 6.4 Files

```
src/lib/scene/sceneLanguage.ts   // VERBS table, types, parseLine, formatLine, validateLine, ticker templates
src/lib/scene/sceneCompiler.ts   // compile*(...) -> SceneLine[]  (pure, deterministic, zero tokens)
```

`parseLine(formatLine(x))` must round-trip for every verb. `sceneLanguage.ts` is the single source of truth for verbs; the compiler and the frontend both import from it.

---

## 7. Backend changes

### 7.1 New and changed modules

| Path | Change |
| :--- | :--- |
| `src/lib/scene/sceneLanguage.ts` | New (6.4) |
| `src/lib/scene/sceneCompiler.ts` | New: `compileBoot`, `compileFork`, `compileCast`, `compileQuarterStage(stage, ctx)`, `compileEnd`, `compileFinish` |
| `src/lib/scene/sceneStore.ts` | New: `appendLines(sessionId, lines[])`, `readLinesAfter(sessionId, cursor, limit)` on Mongo collection `scene_ops` |
| `src/lib/scene/storySeeds.ts` | New: `generateStorySeeds`, `STORY_ROSTER` constant |
| `src/lib/scene/mockSceneStream.ts` | New: dev/offline source (7.5) |
| `src/lib/simulation/timelineRunner.ts` | Add optional `onStage?: (stage: QuarterStage) => void \| Promise<void>` to `QuarterStepConfig`. No behavior change when omitted |
| `src/app/api/simulate/start/route.ts` | New: validates intake, runs crisis interceptor, runs world builder, creates `simulations` doc, creates 4 story seeds, appends `BOOT`/`FORK`/`CAST` lines, calls dispatch logic, returns `{ sessionId }` |
| `src/app/api/simulate/step-batch/route.ts` | Rewrite worker body to call `runQuarterStep` (G2, G3), with `onStage` writing Scene lines via `sceneStore` |
| `src/app/api/simulate/stream/[id]/route.ts` | Add `scene` event and cursor polling (7.3). Keep `quarter_step` and `simulation_complete` |
| `src/app/api/simulate/narrator/route.ts` | New (G7): builds digest, calls narrator, saves report, appends `NARRATE` then `FINISH` |
| `src/app/api/simulate/dispatch/route.ts` | Keep, but import shared dispatch helper used by `start` |
| `src/lib/simulation/simulationOrchestrator.ts`, `digestSerializer.ts`, finale components | Remove hardcoded "12" assumptions; derive from `timelines.length` |

### 7.2 Stage hook inside `runQuarterStep`

`QuarterStage` is a discriminated union. Emit points, in order, inside the existing function:

1. After `rollQuarterEvent` → `{ stage: "roll", event }`
2. After `calculateQuarterFinance` → `{ stage: "calc", cash0, inc, exp, evc, cash1 }` (all from existing variables)
3. Immediately before `simulateQuarterStep` → `{ stage: "think", provider }` (the first provider in the chain)
4. After the LLM returns → `{ stage: "delta", rawDelta (the combined deltas) }`
5. After `applyAndClampStats` → `{ stage: "clamp", stats, hit }` then `{ stage: "status", status, burn }`
6. After the record is built → `{ stage: "say", text: diaryEntry }` then `{ stage: "done" }`

The router must also report fallbacks: when `routeGenerateObject` switches provider, call an optional `onFallback(from, to)` that the worker turns into `REROUTE`. This is additive; existing tests must still pass without the callback.

Compiler rules:
- `compileQuarterStage` is **pure**. Same input → identical line. No `Date.now()`, no `Math.random()`.
- `hit` = first stat equal to 0 or 100 after clamping, else `none`.
- `STATUS` uses the existing `resolveBranchColor` / `TimelineHealthStatus` logic. Do not reinvent thresholds.
- `evc = lumpSumWindfall - lumpSumExpense` (already computed as `netEventCashImpact`).

### 7.3 Persistence and transport

`scene_ops` document:

```ts
{ sessionId: string; storyId: string | "*"; quarter: number; idx: number;
  line: string; createdAt: Date }
```

- Unique index `{ sessionId, storyId, quarter, idx }`. Writes are **upserts**, so QStash retries are idempotent. `idx` is the position inside that quarter's stage list (deterministic). Global lines that repeat (`REROUTE`, `PROGRESS`) use `quarter = 0` and `idx = Date.now()` (the one place a timestamp is allowed).
- TTL index on `createdAt`, 24 h.
- Cursor = `{ createdAt, _id }`. `readLinesAfter` returns lines ordered by `(createdAt, _id)`.
- SSE route: after replaying existing `timeline_steps` (as today), it replays all `scene_ops` for the session, then **polls every 500 ms** for new ones and writes `event: scene` with `data: { cursor, lines: string[] }`. It supports `?after=<cursor>` so reconnects resume. The in-process emitter is an optional low-latency path only.
- Heartbeat every 15 s as today. Stop polling and close after `FINISH` has been delivered.

### 7.4 Failure behavior

- Provider fallback is a scene, not an error: `REROUTE` shows NEXUS rerouting.
- All providers exhausted for one quarter: emit `ERROR`, QStash retries that chunk. After the final retry, the story is marked partial, the Theater idles that room in "signal lost", and the reveal flags "Story S2 incomplete" with the quarters it did finish.
- Crisis interceptor runs in `/start` **before** any scene is emitted. If it trips, no Theater is shown; the existing `CrisisDialog` appears.

### 7.5 Offline / dev stream

`mockSceneStream.ts` produces the same Scene lines for 4 stories x 20 quarters from the existing `generateSimulatedMultiverse` data, using the real compiler. It exposes the same interface as the SSE client (`subscribe(onLines)`), with a configurable emission speed (instant, realistic 2 s per quarter, slow, stalled, with injected `REROUTE` and `ERROR`). Route `/?demo=1` and all Theater tests use it, so the Theater can be built and tested without any API keys.

---

## 8. Frontend architecture

### 8.1 Layers (strict separation)

```
SSE client / mock  →  Director (pacing)  →  sceneState reducer (pure)  →  Renderer (canvas)  →  pixels
                                        ↘  Ticker store (text)  →  LiveTicker (DOM)
```

| Module | Responsibility | Must be pure? |
| :--- | :--- | :--- |
| `src/lib/theater/sceneState.ts` | `reduce(state, line) → state`. Holds per-story stats, cash, status, current event, cast presence, per-agent job, ticker entries | Yes |
| `src/lib/theater/director.ts` | Buffers incoming lines per story, schedules playback at `BEAT_MS`, applies stagger, speed-up, skip, reveal gate | Time injected (`now()`), so testable with fake timers |
| `src/lib/theater/layout.ts` | Building grid, rooms, anchors, blocked tiles, window views | Yes |
| `src/lib/theater/iso.ts`, `pathfinding.ts` | Projection, depth sort, A* | Yes |
| `src/lib/theater/sprites/*` | `characterGenerator`, `props`, `screens` (monitor textures), `atlas` | Draw-only |
| `src/lib/theater/renderer.ts` | `TheaterRenderer` class: `attach(canvas)`, `update(dt, state)`, `draw()`, `resize()`, `focusStory(id|null)`, `destroy()` | No React inside |
| `src/components/theater/TheaterView.tsx` | Page shell: header, canvas host, ticker, focus bar, skip button, reveal | React |
| `src/components/theater/TheaterCanvas.tsx` | Mounts the renderer, `ResizeObserver`, cleanup | React |
| `src/components/theater/LiveTicker.tsx` | Scrolling log, filters All / S1 / S2 / S3 / S4 / Agents | React |
| `src/components/theater/LifeCards.tsx` | 4 result cards (Section 10) | React |

The renderer is imperative and framework-free. React only owns mount/unmount and DOM panels. The reducer output is the **only** thing the renderer reads.

### 8.2 Director rules (the part that makes it feel alive)

1. One FIFO queue per story. A quarter is **playable** when its `DONE` line has arrived.
2. Story `i` plays quarter `k` at `t0 + BOOT_MS + (k-1) * BEAT_MS + i * STORY_STAGGER_MS`, but never before quarter `k-1` has finished playing and never before quarter `k` is playable.
3. Inside a beat, the sub-beats are fixed. Total 6500 ms:

| Sub-beat | Lines | Start offset | Duration |
| :--- | :--- | :--- | :--- |
| Event | `ROLL` | 0 | 1100 |
| Math | `CALC` | 1100 | 1300 |
| Think | `THINK` | 2400 | 1200 |
| Result | `DELTA`, `CLAMP` | 3600 | 1400 |
| Story | `STATUS`, `SAY`, `DONE` | 5000 | 1500 |

4. If a story's next quarter is not playable when due, that room shows its idle pose with a "..." bubble. Other stories continue. Never freeze the whole stage.
5. If elapsed time passes `THEATER_MAX_MS`, play remaining beats at 3x (compress the sub-beats, keep every line's ticker output and final state).
6. `Skip` jumps every story to its final state instantly (apply all remaining lines through the reducer without animating), then runs the reveal transition.
7. Global lines (`REROUTE`, `NARRATE`, `PROGRESS`) are not paced; they apply when received, except `NARRATE` and `FINISH`, which are held until all stories finish playing.
8. Tab hidden: use wall-clock time. On return, fast-forward to the correct beat position and play the last 1.5 s normally.
9. `prefers-reduced-motion`: no walking, no packets, no text pops. Characters swap poses instantly, the ticker and stat chips still update, beats shorten to 3000 ms.

### 8.3 Interaction

- Click a room → camera eases (400 ms) to a 2x focus on that room; Esc or click outside returns to overview. The ticker filters to that story while focused.
- Hover a character or agent → tooltip (name, role, current job).
- Click a `SAY` bubble → pins the full text in a side panel.
- `Skip to results` (after 15 s). A pause button is **not** provided in v1.
- Keyboard: Tab cycles S1 to S4 focus buttons in `StoryFocusBar`; Enter focuses; Esc resets.

### 8.4 Screen layout

Desktop (>= 1024 px): header strip (title, status chip, round `Q k / 20`, wall-clock month), canvas left 70%, Live Ticker right 30%, safety line at bottom.
Mobile (< 768 px): header, canvas showing **one room at a time** with a swipe/tabs bar for S1 to S4, an agent status row (9 dots with names) replacing the Agent Office view, Live Ticker as a bottom sheet (peek height 96 px).

### 8.5 Performance and accessibility

- Target 60 fps desktop, 30 fps mobile. Logic step at 30 Hz, render on `requestAnimationFrame`.
- Static layers (floors, walls) rendered once to an offscreen canvas and redrawn only on resize or focus change. Sprite atlas built once. Monitor textures refresh at 8 fps. Sort only entities, not tiles.
- Max live entities: 9 agents + 4 YOU + ~8 NPCs + props < 400 draw calls per frame.
- The canvas has `role="img"` and an `aria-label` summarizing the current round. The ticker is `aria-live="polite"` and only announces `ROLL`, `STATUS`, and `END`, not every line.
- Color is never the only signal: statuses also have text labels and icons drawn on the room banner.
- Wait for `document.fonts.load("600 14px Poppins")` before drawing any in-canvas text.

---

## 9. Page flow changes (`src/app/page.tsx`)

`AppViewMode` becomes `"welcome" | "intake" | "theater" | "multiverse" | "finale"`.

1. `intake` submit → `POST /api/simulate/start` → `{ sessionId }` → `viewMode = "theater"`.
2. `TheaterView` opens the SSE stream (or the mock when `?demo=1`) and mounts the renderer.
3. When the Director reports `revealReady`, `TheaterView` runs the reveal (Section 10) and calls `onRevealComplete(timelines, steps, finaleReport)`.
4. `page.tsx` stores the real persisted data and switches to `multiverse` (existing tree + scrubber + drawer) with 4 branches. Finale view works as today, fed by the narrator report.
5. The preset quick-start buttons also go through `/start`.
6. `generateSimulatedMultiverse` remains only for `?demo=1` and tests.

---

## 10. Reveal: from Theater to the 4 lives

Sequence (about 4 s):
1. `FINISH` plays: NEXUS says "All lives complete", all room characters take their final pose.
2. Agent Office dims to 40% opacity; camera pulls back to the Life Wing (600 ms).
3. Each room freezes; its frame stays in its final status color; a banner appears: `S2  London / Anxious  Final: $41,200  Joy 38  Health 52  Rel 61  Career 70`.
4. Four **Life Cards** slide up (DOM, not canvas), one per story: path name and location, persona label, final net worth, 4 stat bars with numbers, status badge (color + text), the last diary line, and a `Open timeline` button.
5. Primary button: `Compare all 4 futures` → existing `MultiverseTreeCanvas` with 4 branches, then Finale report.
6. Secondary button: `Replay the theater` (re-plays the stored `scene_ops` with the same Director, no server calls).

If any story is partial, its card shows `Incomplete: N of 20 quarters` and the finale excludes it from ranking.

---

## 11. Content and safety rules for scenes

- No depictions of death, self-harm, suicide, injury, hospital emergencies, substance use, or violence. `health_shock` is a mild "feeling unwell" scene. `burnout` is rest.
- Layoff is shown as an envelope and a box, never as conflict.
- Cast NPC names come from the world builder; render them as given but never render a real person's likeness.
- `SAY` text comes from the LLM: run it through the same crisis keyword check as intake before display. If it trips, replace the bubble with `...` and omit the text from the ticker.
- The persistent safety line is visible in the Theater: **"Reflective Simulation Engine, Not a Future Prediction."**

---

## 12. Tests (Vitest, in `tests/unit/`)

| Test file | Must prove |
| :--- | :--- |
| `sceneLanguage.test.ts` | Every verb round-trips `format → parse`; unknown verb/key is dropped; quotes, `\"`, and 220-char limit; ASCII only; line <= 280 chars |
| `sceneCompiler.test.ts` | Pure and deterministic (same record → byte-identical lines); `evc` math; `hit` detection; `STATUS` agrees with `resolveBranchColor`; **no LLM call count change**: running a 20-quarter story with a counting executor yields exactly 20 calls |
| `sceneStore.test.ts` | Upsert idempotency (same quarter written twice → one row); `readLinesAfter` cursor ordering and resume |
| `sseScene.test.ts` | Stream replays history then new lines; `?after=` resumes; closes after `FINISH`; works when lines are written by a different "instance" (no emitter) |
| `stepBatchWorker.test.ts` | Worker calls `runQuarterStep`, persists steps, writes Scene lines, loads names and prompt from the simulation doc, still chains the next chunk |
| `storySeeds.test.ts` | Roster is `A-bold, A-anxious, B-balanced, B-workaholic`; deterministic; count param honored |
| `sceneState.test.ts` | Reducer: stat clamping mirrors engine, status transitions, cast presence, agent job assignment |
| `director.test.ts` | Fake timers: instant server → total playback within `[120 s, 180 s]`; slow server → rooms idle but others proceed; `Skip` reaches final state; `THEATER_MAX_MS` triggers 3x; hard timeout reveals partial; reveal gate needs `FINISH` + empty queues + min time |
| `layout.test.ts`, `pathfinding.test.ts` | Anchors reachable from `door`; no anchor on a blocked tile; A* deterministic |
| `liveTicker.test.tsx`, `theaterView.test.tsx` | Ticker renders templates from lines; filters work; Skip button appears after 15 s; safety line present; reduced-motion path |
| Updated `multiverseTreeCanvas.test.tsx`, `finaleReportView.test.tsx`, `digestSerializer.test.ts` | Work with 4 timelines |

Canvas drawing is not unit-tested pixel by pixel. Test the pure modules and add one smoke test that the renderer constructs, updates, and destroys without throwing (mock `getContext`).

---

## 13. Build order (phases, each ends with `npm run ci` green)

| Phase | Deliverable | Definition of done |
| :---: | :--- | :--- |
| 1 | Scene Language + compiler + story seeds + tests | Section 12 first three rows green; no runtime wiring yet |
| 2 | Pipeline wiring: `onStage` hook, `step-batch` rewrite, `scene_ops`, SSE `scene` events, `/start`, narrator route | A real or mock-LLM session produces a full 4 x 20 stream; replay works after reconnect |
| 3 | `mockSceneStream` + `sceneState` reducer + `director` | Director tests green; a headless run prints a paced ticker |
| 4 | Renderer core: iso projection, floors/walls, sprite atlas, character generator, pathfinding | One room with YOU walking door → desk at 60 fps |
| 5 | Agent Office: 9 agents, 9 monitor textures, status tags, handoff packets, NEXUS walk | Each agent reacts only to its verbs (Section 4.6) |
| 6 | Life Wing: 4 rooms, state visuals (5.3), event scenes (5.4), cast NPCs, text pops | All six events and four statuses render correctly in the mock stream |
| 7 | `TheaterView`, `LiveTicker`, focus camera, Skip, mobile layout, a11y | Matches Section 8.4 and 8.5 |
| 8 | Reveal, Life Cards, page flow, 4-timeline tree and finale | End-to-end: intake → theater → 4 cards → tree → finale |
| 9 | Perf, reduced motion, failure scenes, `?demo=1` scenarios (stall, reroute, error) | Section 3 timing met with real and mock streams |
| 10 | ADR, constraints amendment, memory docs, README section | Section 14 done |

---

## 14. Constraint amendments (write these down, do not silently break rules)

Create `docs/memory/decisions/adr-003-theater.md` and update `docs/memory/constraints.md` with exactly these exceptions, then update `current-state.md`:

1. **Animation.** The earlier rule "animations limited to branch node progression and scrubber" gains one exception: animation is allowed **inside the Theater canvas only**, and must honor `prefers-reduced-motion`.
2. **Palette.** Agent accent colors from the roster (teal, amber, green, magenta, blue, orange, purple, red, silver) are allowed **only** on monitor content, status dots, name-tag underlines, and chest glyphs. No gradients, glows, or blurred shapes anywhere in the Theater. The prohibition on purple/cyan gradient overlays is unchanged.
3. **Typography.** Poppins remains the font for all DOM text and all in-canvas labels. Monospace is allowed only inside the CIPHER and RONIN monitor textures, where Poppins is illegible at that size.
4. **Scene palette.** The building palette (Section 4.4) is scoped to the canvas and does not change the dark HUD tokens.
5. **Rendering.** Canvas 2D with procedural art is the chosen approach. Add to `rejected.md`: "Phaser/Pixi and sprite-sheet PNG pipelines: rejected for bundle size, asset licensing risk, and the project's zero-asset principle."
6. **Story count.** Theater default is 4 stories; the 12-timeline engine remains supported through `STORY_COUNT`.

---

## 15. Acceptance criteria (the owner will check these by hand)

1. Submitting the intake shows the Theater, not the old instant result.
2. Within 8 s the user sees 9 agents at desks and 4 rooms, each with the user's avatar in a different outfit.
3. Every 6.5 s, each room plays one quarter with a visible event scene, a coin/stat reaction, and a speech bubble.
4. The CIPHER monitor prints the real money formula for the quarter that matches the ticker line exactly.
5. SAGE bars, SPARK pass/fail, and the room frame color always agree with the numbers in the ticker.
6. Forcing a provider failure (`?demo=1&scenario=reroute`) shows NEXUS rerouting and the simulation continuing.
7. The reveal occurs between 120 s and 180 s (unless Skip), and shows exactly 4 Life Cards.
8. No frame shows a sparkle, emoji, gradient, glow, or confetti.
9. The safety line is visible throughout.
10. With the network blocked after `FINISH`, `Replay the theater` still works.
11. Total LLM calls per session remain 80 (life steps) + world builder + narrator, with **no** additional calls caused by the Theater.
12. `npm run ci` passes.

---

## 16. Defaults I chose (change here if you disagree)

| Decision | Default | Alternative |
| :--- | :--- | :--- |
| Camera | Isometric 2:1 like the Habbo reference; top-down WorkAdventure/TinyFloor behavior (walking, status tags, proximity interaction) | Pure top-down 16-bit |
| Renderer | Canvas 2D, no engine | PixiJS v8 if you later need > 100 animated sprites |
| Palette | Muted version of the reference (Section 4.4) | Faithful bright yellow/cyan/navy |
| Story set | A-bold, A-anxious, B-balanced, B-workaholic | Any 4 of the 6 existing seeds |
| Pacing | 150 s target, independent per-story queues with 1.6 s stagger | Strict lockstep rounds |
| Agent to stage mapping | Section 4.6 | Rename or merge agents freely; keep verb mapping |
| Audio | None in v1 | Optional muted-by-default cues later |
| Pause button | Not in v1 | Add if users want to read the ticker |
