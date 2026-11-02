# AI Mystery Room — SPEC.md

> **Note for human/AI implementers:** this document is the single source of truth for the project.
> It is intentionally precise: follow it without needing clarification. Section 12 (Acceptance Criteria) is done-first.

---

## 1. Project Overview

**AI Mystery Room** is a full-stack whodunit web game. The player writes a mystery premise, Gemini (server-side) generates a complete, fair-play murder mystery — story, suspects, clues and hints with a **hidden culprit** — and the player investigates, unlocks evidence, consults hints, and finally accuses a suspect. The backend reveals the verdict and computes the score **only after the accusation is submitted**.

**Problem it solves.** Static puzzle games run out of content. With AI generation (validated + scored server-side), players get an infinite set of unique, self-consistent mysteries with a fair, tamper-proof scoring system.

**Target users.** Casual players 13+, mystery fans, friends wanting a quick 5–10 minute detective experience. No accounts, no login — a single persistent "case" identified by URL.

**UX principles.**
1. Immersion first — noir "case file" aesthetic (ink, paper, gold stamp, typewriter notes).
2. No dead ends — the player can always progress (discover a clue / request a hint / accuse).
3. Progress is always visible (clues x/y, hints n/m, case status stamp).
4. Trust — scores are computed by the server; the client never learns the culprit early.

---

## 2. Tech Stack (exact)

| Layer      | Choice |
|------------|--------|
| Frontend   | React 19 + Vite (template `react`), Tailwind CSS v4 (`@tailwindcss/vite`), react-router-dom v7, axios, framer-motion, lucide-react, canvas-confetti |
| Backend    | Node.js (≥20), Express 5, Mongoose 8 (MongoDB Atlas), zod v4, `@google/genai` SDK → **Gemini flash series** (default alias `gemini-flash-latest` with `gemini-3.5-flash-lite` fallbacks), express-rate-limit |
| Hosting    | Frontend → Vercel · Backend → Render · DB → MongoDB Atlas (M0 free) |

No other libraries are required. No secrets ever live in the frontend.

---

## 3. User Flow (end to end)

1. User opens **Home** → intro + "Open a New Case".
2. User clicks **Create Mystery** → enters a premise, picks a difficulty (Easy / Medium / Hard).
3. Submits → POST `/api/cases` → Gemini generates the mystery; server validates + stores it, never returning the culprit/solution → user lands in the **Investigation Room**.
4. Player reads the story & suspect dossiers; clicks clue cards to **discover** evidence (`POST .../clues/:clueId/discover`).
5. Player may **request hints** (`POST .../hints`) — sequential, limited by difficulty.
6. Player goes to **Accusation**, selects a suspect, confirms.
7. `POST .../accuse` → server computes verdict + score and returns the **result** → **Results** page shows stamp, culprit, explanation, score breakdown.
8. Player clicks "Solve Another Mystery" (back to Create) or Home.

Recent case IDs are kept client-side in `localStorage` so users can resume; the server is stateless per user (no accounts).

---

## 4. Game Rules (server is the rule master)

### 4.1 Difficulty matrix (Gemini output must have exactly)

| Difficulty | Suspects | Clues | Hints | Correct-accusation base |
|------------|----------|-------|-------|--------------------------|
| Easy       | 3        | 5     | 2     | 100 |
| Medium     | 4        | 7     | 3     | 150 |
| Hard       | 5        | 9     | 3     | 200 |

### 4.2 Mechanics
- **Clues**: every clue has a public `title` (e.g. "The cracked pocket watch") and a secret `content` (the actual evidence). Content is only sent to the client after discovery. Discovery is a per-clue POST and is idempotent.
- **Hints**: requested in stored order, one per call; each use is permanent. If all are used → 409 with a friendly message.
- **Accusation**: one per case; case becomes `completed`. Repeated accusation calls return the existing result (idempotent-safe).

### 4.3 Scoring (computed server-side, at accusation time)

```
correct = (accused suspect id === culprit id)
base          = correct ? {easy:100 | medium:150 | hard:200} : 0   (+5 per discovered clue)
clueBonus     = +5 × cluesDiscovered
hintPenalty   = −10 × hintsUsed
score         = clamp(base + clueBonus + hintPenalty, min 0)
```
Example (Medium, correct): 150 + (5 clues × 5) − (1 hint × 10) = **165**.
A wrong accusation earns no base points; clue bonuses and hint penalties still apply.

---

## 5. Database Model (Mongoose, collection `cases`)

```js
{
  premise: String,                       // user's input (≤ 400 chars)
  difficulty: 'easy' | 'medium' | 'hard',
  title: String,                         // ≤ ~80 chars
  setting: String,                       // one-line location/date context
  victim: String,                        // victim name + short descriptor
  story: String,                         // 3+ paragraphs, \n\n separated
  suspects: [{ id: 's1', name, role, description, alibi }],
  clues:    [{ id: 'c1', title, content, discovered: Boolean, discoveredAt: Date|null }],
  hints:    [{ id: 'h1', text, used: Boolean, usedAt: Date|null }],
  culpritId: String,                     // PRIVATE (select: false)
  solution:  String,                     // PRIVATE (select: false) — step-by-step explanation
  completed: Boolean (default false),
  accusedId: String|null, accusedName: String|null,   // stored once accused (public-safe)
  correct:   Boolean|null,               // PRIVATE
  score:     Number|null,                // PRIVATE
  breakdown: { base, clueBonus, hintPenalty, total } | null,   // PRIVATE
}, { timestamps: true })
```

**Privacy defense-in-depth:** private fields use `select: false`, and every response is built by a single serializer (`utils/publicCase.js`) — a raw Mongo doc is never `res.json()`-ed.

## 6. Privacy Rules (hard requirements)

1. `culpritId`, `solution`, `correct`, `score`, `breakdown` never leave the backend **before** the accusation is submitted.
2. Undiscovered clue `content` and unused hint `text` are never sent to the client.
3. The client cannot choose which suspect is the culprit via any endpoint; verdict logic runs only on the server.
4. No Gemini API key, Mongo URI, or other secrets in the frontend bundle or the git repo (`.env` files are git-ignored; `.env.example` documents them).

---

## 7. API Specification

Base URL: `/api`. All responses use the envelope `{ success: true, ... }`; errors: `{ success: false, message: string }` (+ `errors` with field details for 400s). Content-type JSON.

| # | Endpoint | Purpose |
|---|----------|---------|
| 1 | `GET  /api/health` | Liveness + DB status. |
| 2 | `POST /api/cases` | Generate a new mystery (Gemini). |
| 3 | `GET  /api/cases/:id` | Public snapshot of an active case. |
| 4 | `POST /api/cases/:id/clues/:clueId/discover` | Discover a clue (idempotent). |
| 5 | `POST /api/cases/:id/hints` | Reveal the next hint (sequential). |
| 6 | `POST /api/cases/:id/accuse` | Submit the accusation; returns result. |
| 7 | `GET  /api/cases/:id/result` | Result of a completed case. |

### 7.1 `GET /api/health` → 200
```json
{ "success": true, "status": "ok", "db": "connected", "model": "gemini-2.5-flash" }
```

### 7.2 `POST /api/cases`
Request: `{ "premise": "string (10–400 chars)", "difficulty": "easy|medium|hard" }` (zod-validated).
Side effects: 1 Gemini call (≤3 attempts), 1 insert. Rate limit: **10 requests / 15 min / IP** (429 otherwise).
Response `201`:
```json
{ "success": true, "case": {
  "id": "66f3…", "title": "The Vanishing Violinist", "difficulty": "medium",
  "setting": "A grand concert hall, winter 1932.", "victim": "Alma Reyes — the celebrated violinist",
  "story": "……\n\n…",
  "suspects": [ { "id": "s1", "name": "Victor Hale", "role": "Conductor", "description": "…", "alibi": "…" }, … ],
  "clues": [ { "id": "c1", "title": "Snapped violin string", "discovered": false }, … ],
  "cluesDiscovered": 0, "cluesTotal": 7, "hintsUsed": 0, "hintsTotal": 3, "completed": false
} }
```
Errors: `400` invalid premise/difficulty (zod details) · `429` rate limit · `502` Gemini/validation failure (friendly retry message) · `504` Gemini timeout.

### 7.3 `GET /api/cases/:id`
Same shape as above with player progress included; `404` for unknown id. If `completed` is true it includes `accused: { id, name }` — the client should then fetch `/result`.

### 7.4 `POST /api/cases/:id/clues/:clueId/discover` → 200
```json
{ "success": true, "clue": { "id": "c3", "title": "…", "content": "…", "discovered": true, "discoveredAt": "2026-…" },
  "progress": { "cluesDiscovered": 3, "cluesTotal": 7 } }
```
Errors: `404` unknown case/clue · `409` case already completed ("This case is already closed, detective."). Re-discovering an already discovered clue returns it again with `alreadyDiscovered: true` (idempotent, not an error).

### 7.5 `POST /api/cases/:id/hints` → 200
```json
{ "success": true, "hint": { "id": "h2", "text": "…", "used": true },
  "progress": { "hintsUsed": 1, "hintsTotal": 3 } }
```
Errors: `404` unknown case · `409` case closed or **no hints remaining**.

### 7.6 `POST /api/cases/:id/accuse`
Request: `{ "suspectId": "s2" }`. → 200:
```json
{ "success": true, "result": {
  "correct": true,
  "accused": { "id": "s2", "name": "Mira Vance" },
  "culprit": { "id": "s2", "name": "Mira Vance", "role": "Concertmaster" },
  "explanation": "step-by-step solution text…",
  "score": 165,
  "breakdown": { "base": 150, "clueBonus": 25, "hintPenalty": -10, "total": 165 },
  "stats": { "cluesDiscovered": 5, "cluesTotal": 7, "hintsUsed": 1, "difficulty": "medium" },
  "alreadyCompleted": false
} }
```
Errors: `400` unknown suspectId · `404` unknown case. If the case was already completed the response is the stored result with `alreadyCompleted: true` (no double scoring).

### 7.7 `GET /api/cases/:id/result`
200 with the same `result` object (no new scoring), or `409 { message: "Case not solved yet." }`, `404` unknown id.

**Status codes used:** 200, 201, 400, 403 (rare), 404, 409, 429, 500, 502, 504. Unknown routes → 404 JSON. All unexpected errors log server-side and return a generic 500.

---

## 8. AI Behavior (Gemini integration)

- Model: Gemini flash family via `@google/genai`, `responseMimeType: "application/json"` **and** a strict `responseSchema` (structured output). Default `GEMINI_MODEL=gemini-flash-latest`; fallback chain `gemini-3.5-flash-lite` → `gemini-flash-lite-latest` absorbs 503/504 demand spikes.
- System prompt: "The Architect" — a fair-play whodunit designer. Fair-play contract: every clue is honest, the culprit is always among the suspects, red herrings are plausible but clearable, no gore/realpeople, unique tone per generation.
- Key output fields: `title, setting, victim, story, suspects[{name, role, description, alibi}], clues[{title, content}], hints[], culpritName, solution`.
- Server-side **validation pipeline** (must pass before saving):
  1. JSON parse (`JSON.parse`).
  2. zod validation with **exact counts** per difficulty, string length ranges (title 4–90, story ≥ 400 chars, suspect description ≥ 30, clue content ≥ 40/≤ 500, hint ≥ 15, solution ≥ 120).
  3. Suspect/clue/hint array sanity: unique suspect names; culpritName must equal exactly one suspect's name.
  4. Server then assigns ids `s1..`, `c1..`, `h1..` and converts `culpritName → culpritId`.
- **Retry policy:** ≤ 3 attempts per request (temperatures 1.0 → 0.75 → 0.5). If all fail: `502 { message: "The AI failed to write a consistent mystery. Please try again." }`. AI output is never trusted for scores or ids.

---

## 9. UI / Page Specifications

### 9.1 Design system
- **Theme:** film-noir "case file" — near-black ink `#0A0908`, warm paper text `#EDE6D6`, panels `rgba(255,255,255,0.03)` with hairline `rgba(255,255,255,0.08)` borders, gold accent `#D4A03C`, blood red `#B91C1C`, moss green `#3E7C59`. Subtle film-grain overlay + vignette on every page.
- **Type:** *Playfair Display* (display serif for titles), *Special Elite* (typewriter for stamps/labels/kickers), *Inter* (UI body).
- **Motion:** framer-motion; route fades, staggered paragraph reveals, flip/stamp reveals for clues, count-up score. Respect `prefers-reduced-motion`.
- **Components:** Nav (logo + Home), Footer, `Loader` (fullscreen generation overlay with rotating status lines), `ErrorState` card (with Retry), `Stamp` (rotated typewriter stamp), suspect/clue cards, sticky "Make Your Accusation" action bar.
- **States:** skeletons/rotating copy for loading; friendly inline errors (never raw stack traces); empty states; 404 page. All interactive elements have visible focus rings; contrast ≥ 4.5:1.
- **Responsive:** mobile-first; investigation room becomes a single column (< lg) with the accusation bar sticky at the bottom; dense hover effects degrade gracefully to tap.

### 9.2 Pages
| Route | Purpose | Key elements |
|-------|---------|--------------|
| `/` Home | Intro & entry | Hero (tagline "Every room hides a secret. Every clue tells a story."), CTA "Open a New Case", how-it-works (4 steps), difficulty explainer, recent cases (from localStorage, resume). |
| `/create` Create Mystery | Premise + difficulty | 10–400 char premise textarea with counter + sample-premise shuffle, difficulty cards showing suspect/clue/hint/base-score counts, dossier preview card, submit with generation overlay ("Summoning suspects…", "Planting red herrings…"). |
| `/case/:id` Investigation Room | Play | Story panel (drop-cap typography, setting/victim meta), suspect dossiers (avatar, role, description, *claimed alibi*), evidence board (locked cards → discover → stamped content), hints panel ("Consult the Oracle"), progress chips, sticky accuse bar. If completed → shows "Case closed" → result. |
| `/case/:id/accuse` Accusation | Final choice | Suspect select list (radio cards), progress summary, confirmation dialog ("The verdict is final"), submitting overlay. |
| `/case/:id/result` Results | Verdict | CASE CLOSED (gold/green + confetti) or CASE COLD (red) stamp, culprit reveal card, full explanation panel, animated score breakdown (base ±bonus −penalty = total), stats, CTA "Solve Another Mystery" + Home. |
| `*` NotFound | 404 | Detective-flavored empty state + link home. |

**Copy tone:** noir but clear; errors are playful yet actionable (e.g. "The line to HQ is dead — check your connection and try again.").

## 10. Environment Variables
- **server/.env** → `PORT=5000`, `MONGODB_URI=…Atlas…`, `GEMINI_API_KEY=…`, `CLIENT_URL=http://localhost:5173` (comma-separated allow-list in prod), `NODE_ENV`.
- **client/.env** → `VITE_API_URL=https://<backend-host>` (production; dev uses the Vite proxy `/api`).

## 11. Project Structure
```
ai-mystery-room/
  SPEC.md  README.md  .gitignore
  server/  (package.json, .env/.env.example, src/{index.js, config/, models/, routes/, services/, validation/, utils/})
  client/  (Vite app: src/{pages/, components/, lib/, main.jsx, App.jsx, index.css}, public/, vite.config.js, .env)
```

## 12. Acceptance Criteria (definition of done)
- [ ] Mysteries generate successfully on **all three** difficulty levels with the exact suspects/clues/hints counts.
- [ ] Players can investigate (discover clues), request hints, and submit accusations through the UI.
- [ ] The culprit, explanation, verdict, and scores are **never** visible via the network before the accusation (verified with curl).
- [ ] Undiscovered clue contents and unused hint texts are also never exposed.
- [ ] Scores are computed **only** by the backend (base + clue bonus − hint penalty, floor 0) and shown with a breakdown.
- [ ] Gemini failures/bad JSON are handled with retries (≤3) and a friendly error; input validation (10–400 chars, valid difficulty) with 400 + messages.
- [ ] Results page displays the correct culprit + explanation; wrong accusation earns no base points and reveals the real culprit.
- [ ] Re-visit URLs behave: unknown id → 404 page; completed case → results; resuming before completion → investigation room.
- [ ] Responsive layout works on mobile; loading/error states on every page.
- [ ] `npm run build` (client) passes; app works on the deployed site (Vercel + Render + Atlas).

## 13. Deployment Plan
1. **MongoDB Atlas:** M0 cluster, DB user, network access `0.0.0.0/0`, connection string into Render env.
2. **Backend on Render:** Node web service, root `server/`, `npm start`, env: `PORT, MONGODB_URI, GEMINI_API_KEY, CLIENT_URL=<vercel-url>`; health check `GET /api/health`.
3. **Frontend on Vercel:** root `client/`, build `npm run build`, env `VITE_API_URL=<render-url>` so the client calls the Render backend (`/api`).
4. **Smoke test:** create case at each difficulty → investigate → accuse → verify scoring → resume case via URL.

## 14. Limitations / Out of Scope
No accounts/auth, no leaderboards, no multiplayer or timers, no image assets for suspects (styled text avatars), mystery text only. Rate limits protect the Gemini quota (10 generations / 15 min / IP). localStorage archives are device-local.
