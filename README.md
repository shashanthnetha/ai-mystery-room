# 🔎 AI Mystery Room

An AI-powered whodunit web game. Give **Gemini** a premise, receive an original fair-play murder
mystery — then investigate the suspects, uncover evidence, spend hints, and put your finger on the
culprit. The culprit, solution, and scores live **only on the backend** until your accusation is in.

> Full blueprint: see [`SPEC.md`](./SPEC.md) — requirements, API contract, game rules, UI specs and
> acceptance criteria.

## Gameplay

1. **Home** → "Open a New Case".
2. **Create** → write a premise (10–400 chars), pick **Easy / Medium / Hard**.
3. Gemini (server-side, structured output + strict validation) generates the story, suspects,
   clues, hints and a hidden culprit.
4. **Investigation Room** → reveal clues from the evidence board (+5 pts each), consult the
   oracle for hints (−10 pts each), then **make your accusation**.
5. **Results** → CASE CLOSED / CASE COLD stamp, the real culprit, a full explanation and your
   animated score breakdown.

### Difficulty & scoring (enforced server-side)

| Difficulty | Suspects | Clues | Hints | Correct accusation |
|------------|----------|-------|-------|--------------------|
| Easy       | 3        | 5     | 2     | 100 pts            |
| Medium     | 4        | 7     | 3     | 150 pts            |
| Hard       | 5        | 9     | 3     | 200 pts            |

`score = clamp(base + 5 × cluesDiscovered − 10 × hintsUsed, min 0)` — a wrong accusation earns no base points; clue bonuses and hint penalties still apply.

## Tech Stack

| Layer    | Stack |
|----------|-------|
| Frontend | React 19 · Vite · Tailwind CSS v4 · React Router · Axios · Framer Motion · lucide-react |
| Backend  | Node.js · Express 5 · Mongoose 9 (MongoDB Atlas) · zod · `@google/genai` (Gemini 2.5 Flash) · express-rate-limit |
| Hosting  | Vercel (frontend) · Render (backend) · MongoDB Atlas |

## Repository Layout

```
ai-mystery-room/
├── SPEC.md          # the blueprint — read first
├── client/          # React + Vite frontend
│   └── src/{pages,components,lib}
└── server/          # Express + Gemini backend
    └── src/{config,models,routes,services,validation,utils}
```

## Local Development

**Prerequisites:** Node.js ≥ 20, a MongoDB Atlas URI and a Gemini API key
(free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)).

### 1. Backend

```bash
cd server
npm install
cp .env.example .env      # then fill in MONGODB_URI + GEMINI_API_KEY
npm run dev               # → http://localhost:5000  (GET /api/health)
```

Gemini pipeline check (no browser needed): `npm run check:gemini`

### 2. Frontend

```bash
cd client
npm install
npm run dev               # → http://localhost:5173  (proxies /api → :5000)
```

## API (summary)

| Endpoint | Purpose |
|----------|---------|
| `GET  /api/health` | Liveness + DB status |
| `POST /api/cases` | Generate a mystery (`{ premise, difficulty }`) |
| `GET  /api/cases/:id` | Public snapshot (progress, no secrets) |
| `POST /api/cases/:id/clues/:clueId/discover` | Reveal a clue (idempotent) |
| `POST /api/cases/:id/hints` | Reveal the next hint |
| `POST /api/cases/:id/accuse` | Final verdict + server-computed score |
| `GET  /api/cases/:id/result` | Result of a completed case |

Errors use `{ success: false, message }`. See **SPEC.md §7** for full request/response examples.

## Security & AI Validation

- `culpritId`, `solution`, `correct`, `score`, `breakdown` are `select: false` and are serialized only
  after an accusation; undiscovered clue content / unused hint text are also never sent.
- Gemini calls use structured output (`responseSchema`) + zod validation (exact suspect/clue/hint
  counts, length rules, unique suspect names, `culpritName` must match a suspect) with ≤3 attempts.
- Generation is rate-limited to 10 requests / 15 min / IP.

## Deployment

1. **Backend → Render**: root `server/`, build `npm install`, start `npm start`. Env:
   `MONGODB_URI`, `GEMINI_API_KEY`, `CLIENT_URL=https://<your-vercel-url>`, `NODE_ENV=production`.
   Health check path: `/api/health`.
2. **Frontend → Vercel**: root `client/`, framework Vite. Env: `VITE_API_URL=https://<your-render-url>`.
3. **MongoDB Atlas**: M0 cluster, database user, network access `0.0.0.0/0`.

---

Built with ♥ for the AI Mystery Room project challenge — plan (SPEC.md) → build → test → deploy.
