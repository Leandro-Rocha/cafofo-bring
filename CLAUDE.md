# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Cafofo Bring** — a household shopping list app with real-time sync, WhatsApp audio integration (voice-to-list via Groq AI), and Alexa support. Runs as a single Docker container on a home CasaOS server.

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
- **`index.js`** — Express + HTTP server + Socket.IO. Sets up all routes and the WhatsApp audio handler (has access to `db` and `io` directly).
- **`db.js`** — SQLite (better-sqlite3) with WAL. Tables: `items`, `aisles`, `item_defaults` (remembers category per item name), `item_history` (for quick-add suggestions).
- **`whatsapp.js`** — Baileys integration. Manages connection state, QR generation, event batching/flush, audio transcription (Groq Whisper), item extraction (Groq LLaMA), and two configurable groups (list group + notify group). Config persisted to `/data/whatsapp-config.json`.
- **`emojiDetection.js`** — Keyword-based emoji assignment, called on item creation from all sources (API, WhatsApp, Alexa).
- **`routes/notify.js`** — `POST /api/notify/deploy` called by GitHub Actions runner (localhost only, no auth needed) to send deploy status to the notify WhatsApp group.

### Real-time sync
Socket.IO is the primary mechanism for keeping all clients in sync. Every database mutation emits an event (`item:added`, `item:updated`, `item:deleted`, `purchased:cleared`). Frontend subscribes in `App.jsx` and patches local state.

### WhatsApp audio → list item flow
1. Baileys `messages.upsert` → detects `audioMessage` in configured group
2. `downloadMediaMessage` → buffer → Groq Whisper API (transcription)
3. Groq LLaMA (`llama-3.1-8b-instant`) → extracts item names as JSON
4. Items inserted into DB, Socket.IO events emitted, Baileys replies confirming

The Groq API key is stored in `whatsapp-config.json` (set via the in-app UI — no env file needed).

### Frontend (`frontend/src/`)
- **`App.jsx`** — owns all state. `handleTap(id)` opens action sheet; `handleHold(id)` toggles purchased (quick-buy).
- **`api.js`** — all fetch calls + Socket.IO client.
- **`categories.js`** — hardcoded fallback metadata for category colors/emojis (aisles now come from DB, this is a fallback).
- Interaction model: **tap = open action sheet**, **hold (500ms) = mark as bought**.

### Environment variables
| Variable | Default | Purpose |
|---|---|---|
| `PORT` | 3001 | Backend port |
| `DB_PATH` | `/data/shopping.db` | SQLite path |
| `WA_DATA_DIR` | `/data` | Baileys auth + config |
| `WA_NOTIFY_INTERVAL` | 10 | Default batch interval (minutes) |
| `GROQ_API_KEY` | — | Optional fallback; prefer setting via UI |
| `VITE_BUILD_SHA` | `dev` | Injected at Docker build time from `github.sha` |

### Deployment (CasaOS)
- Container port `3001` mapped to host `4001`
- Volume `db-data` mounted at `/data` (persists DB + WhatsApp session)
- Self-hosted GitHub Actions runner handles pull + up after image push to GHCR
- Deploy notifications sent to WhatsApp via `POST http://192.168.0.220:4001/api/notify/deploy` (called from the runner, no auth)
