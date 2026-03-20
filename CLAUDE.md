# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Cafofo Bring** — a household shopping list app with real-time sync, WhatsApp audio integration (voice-to-list via Groq AI), and Alexa support. Runs as a single Docker container on a home CasaOS server. **WhatsApp is handled entirely by cafofo-zap** (a separate service); this app communicates with it via HTTP.

## Commands

### Backend (backend/)
```bash
npm run dev       # nodemon on port 3001
```

### Frontend (frontend/)
```bash
npm run dev       # Vite dev server (proxies /api and /socket.io to localhost:3001)
npm run build     # outputs to dist/
```

### Production
```bash
# Build & run single container (frontend served as static by backend)
docker build --build-arg BUILD_SHA=$(git rev-parse HEAD) -t cafofo-bring .
docker compose -f docker-compose.casaos.yml up -d
```

Deploy happens automatically on push to `main` via GitHub Actions (self-hosted runner on CasaOS).

## Architecture

### Single-container production setup
The root `Dockerfile` is a multi-stage build: Vite builds the frontend, then the backend serves `frontend/dist/` as static files via `express.static`. There is no separate frontend server in production.

### Backend (`backend/src/`)
- **`index.js`** — Express + HTTP server + Socket.IO. Sets up all routes, the WhatsApp audio handler, and `POST /webhook/zap` (receives events from cafofo-zap). Uses `express.json({ limit: '20mb' })` — audioBase64 payloads can be large.
- **`db.js`** — SQLite (better-sqlite3) with WAL. Tables: `items`, `aisles`, `item_defaults` (remembers category per item name), `item_history` (for quick-add suggestions).
- **`zap.js`** — HTTP client for cafofo-zap. Drop-in replacement for the old `whatsapp.js`. Manages local config at `/data/whatsapp-config.json` (groupId, notifyGroupId, webhookId, intervalMinutes, groqApiKey). Handles webhook registration with cafofo-zap on startup and group change. **This is NOT Baileys** — it delegates all WhatsApp to cafofo-zap via REST.
- **`emojiDetection.js`** — Keyword-based emoji assignment, called on item creation from all sources (API, WhatsApp, Alexa).
- **`routes/notify.js`** — `POST /api/notify/deploy` called by GitHub Actions runner; delegates to `zap.sendNotifyMessage()`.
- **`routes/whatsapp.js`** — WhatsApp setup UI routes; `GET /api/whatsapp/status` is async (calls cafofo-zap).

### WhatsApp audio → list item flow (via cafofo-zap webhook)
1. cafofo-zap receives audio in the configured group → transcribes via Groq Whisper → POSTs to `POST /webhook/zap`
2. `index.js` receives webhook: if `transcription` present, passes directly to handler; else downloads `audioBase64` and transcribes locally
3. Groq LLaMA (`llama-3.1-8b-instant`) → extracts item names as JSON (`zap.parseItemsFromText()`)
4. Items inserted into DB, Socket.IO events emitted

### Real-time sync
Socket.IO is the primary mechanism for keeping all clients in sync. Every database mutation emits an event (`item:added`, `item:updated`, `item:deleted`, `purchased:cleared`). Frontend subscribes in `App.jsx` and patches local state.

### Frontend (`frontend/src/`)
- **`App.jsx`** — owns all state. `handleTap(id)` opens action sheet; `handleHold(id)` toggles purchased (quick-buy).
- **`api.js`** — all fetch calls + Socket.IO client.
- **`categories.js`** — hardcoded fallback metadata for category colors/emojis (aisles now come from DB, this is a fallback).
- **`components/WhatsAppSetup.jsx`** — shows group picker; status fetched from cafofo-zap via backend proxy. No QR or disconnect UI (managed in cafofo-zap admin at `192.168.0.220:3010`).
- Interaction model: **tap = open action sheet**, **hold (500ms) = mark as bought**.

### Environment variables
| Variable | Default | Purpose |
|---|---|---|
| `PORT` | 3001 | Backend port |
| `DB_PATH` | `/data/shopping.db` | SQLite path |
| `ZAP_URL` | — | **Required.** URL of cafofo-zap (e.g. `http://192.168.0.220:3010`) |
| `SELF_URL` | — | **Required.** Own public URL for webhook registration (e.g. `http://192.168.0.220:4001`) |
| `WA_NOTIFY_INTERVAL` | 10 | Default batch interval (minutes) for list notifications |
| `GROQ_API_KEY` | — | Optional fallback for local transcription; prefer setting via UI (stored in `whatsapp-config.json`) |
| `VITE_BUILD_SHA` | `dev` | Injected at Docker build time from `github.sha` |

### Deployment (CasaOS)
- Container port `3001` mapped to host `4001`
- Volume `db-data` mounted at `/data` (persists DB + whatsapp-config.json)
- Self-hosted GitHub Actions runner handles pull + up after image push to GHCR
- Deploy notifications sent via `POST http://192.168.0.220:3010/notify/deploy` (cafofo-zap, not bring)
