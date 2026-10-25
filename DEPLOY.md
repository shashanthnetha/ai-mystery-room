# 🚀 Deployment Runbook — AI Mystery Room

Do these in order. Values to copy-paste are in boxes.

---

## Step 1 — GitHub repository (needed for Render + Vercel)

1. Go to https://github.com/new
2. Repository name: `ai-mystery-room`
3. Keep it **Public** (submission requires the source anyway). Do NOT tick "Add a README" (we already have one).
4. Click **Create repository**.
5. In your terminal, run (replace `YOUR_GITHUB_USERNAME`):

```bash
cd /Users/netha/Documents/NxtWave_pro/ai-mystery-room
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/ai-mystery-room.git
git push -u origin main
```

> GitHub will ask you to log in via browser on first push — that's normal.

---

## Step 2 — MongoDB Atlas is already configured ✅

* Cluster: `shas` (M0 free) — connection string is already in `server/.env`.
* Database used by the app: `mystery_room` (auto-created on first save).
* **Network Access must allow `0.0.0.0/0`** (Atlas → Network Access → Add IP Address → Allow access from anywhere) so Render can reach it.

---

## Step 3 — Backend on Render (free)

1. Go to https://dashboard.render.com → **New +** → **Blueprint** (this reads the `render.yaml` I added).
2. Choose the **`ai-mystery-room`** repo → Render detects the `mystery-room-api` service automatically.
3. In the service's *Environment Variables* section it will ask for 3 secrets — paste:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | *(Atlas URI — open `server/.env` locally and copy)* |
| `GEMINI_API_KEY` | *(your Gemini key from server/.env)* |
| `CLIENT_URL` | `*` *(temporarily; lock it in Step 5)* |

4. Click **Create Services** → Build starts automatically. Verify `✓ Live`.
5. Open `https://mystery-room-api.onrender.com/api/health` — should return `{"success":true,...,"db":"connected"}`.
6. **Copy your backend URL** — you need it in Step 4.

> Note: free Render services sleep after ~15 min idle; the first request after sleep takes ~30–50 s to wake.

<details><summary>Manual alternative (if you prefer going through "New Web Service")</summary>

- **Language / Framework:** Node · **Root Directory:** `server` · **Build:** `npm install` · **Start:** `npm start`
- **Health Check Path:** `/api/health` · **Instance:** Free — plus the same env vars as above and:
- `NODE_ENV=production`, `GEMINI_MODEL=gemini-flash-latest`
</details>

---

## Step 4 — Frontend on Vercel (free)

1. Go to https://vercel.com/new → import the same `ai-mystery-room` repo.
2. Vercel auto-detects Vite (build `npm run build`, output `dist`). Set:
   - **Root Directory:** `client`
3. Under **Environment Variables** add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | *(your backend URL from Step 3, e.g. `https://mystery-room-api.onrender.com` — no trailing `/`, no `/api`)* |

4. Click **Deploy**.

---

## Step 5 — Lock the backend CORS

1. Once Vercel gives you the URL (e.g. `https://ai-mystery-room.vercel.app`), go to Render → your service
   → **Environment** → edit `CLIENT_URL` and set it to the Vercel URL(s):

```
https://ai-mystery-room.vercel.app,https://ai-mystery-room.vercel.app/
```

2. Server redeploys automatically. (Keeping `*` also works since the app holds no private user data,
   but a specific allow-list is cleaner for the submission.)

---

## Step 6 — Smoke test the LIVE site

- [ ] `/` renders (noir homepage).
- [ ] Create a case on **Easy**, **Medium**, **Hard**.
- [ ] Discover clues (content appears), request a hint.
- [ ] Accuse → verdict page shows culprit + explanation + score breakdown.
- [ ] Wrong accusation → CASE COLD + score 0.
- [ ] Revisit `/case/<id>` → completed ones jump to the verdict; open ones resume.
- [ ] `https://<backend>/api/health` returns `db: "connected"`.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Health shows `db: disconnected` | Atlas → Network Access → ensure `0.0.0.0/0` allowed |
| 502 on generation | Render → Logs: check `GEMINI_API_KEY` present; the chain retries lite models automatically |
| Empty page on Vercel | Confirm Root Directory is `client` and `VITE_API_URL` was set **before** the build (redeploy for env changes) |
| CORS error in console (prod only) | Backend `CLIENT_URL` must exactly include your Vercel origin |
