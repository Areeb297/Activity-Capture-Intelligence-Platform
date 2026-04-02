# Activity Analyser

AI-powered head office role & activity review tool. Upload employee Activity Capture Templates (Excel), four AI agents analyse them in parallel, and produce a full report in under 90 seconds.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 15, React, TypeScript, Tailwind, Recharts |
| Backend | FastAPI, Python 3.12 |
| Database | NeonDB (PostgreSQL + pgvector) |
| AI | OpenRouter → Claude Haiku (agents) + text-embedding-3-small |

---

## Local Development

### Backend

```bash
cd backend

# First time — create venv and install
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy env and fill in OPENROUTER_API_KEY
cp .env.example .env

# Run with auto-reload
uvicorn main:app --reload --port 8000

# Health check
curl http://localhost:8000/health
```

### Frontend

```bash
cd frontend
npm install

# Point at local backend (default — no .env.local needed)
npm run dev        # → http://localhost:3001
```

---

## VPS Deployment (Hostinger — 145.79.13.137)

### First-time setup

```bash
ssh root@145.79.13.137
cd /root/activity_analyzer/backend

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env with real keys
cp .env.example .env
nano .env
```

### Start backend (survives SSH disconnect)

```bash
cd /root/activity_analyzer/backend
source venv/bin/activate
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > uvicorn.log 2>&1 &

# Verify
curl http://localhost:8000/health
```

### Useful commands

```bash
# View live logs
tail -f /root/activity_analyzer/backend/uvicorn.log

# Stop the server
pkill -f "uvicorn main:app"

# Restart after code update
pkill -f "uvicorn main:app"
git pull
pip install -r requirements.txt   # only if requirements.txt changed
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > uvicorn.log 2>&1 &
```

---

## Connecting Frontend to VPS

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://145.79.13.137:8000
```

The `next.config.ts` proxy reads this variable — if unset it falls back to `http://localhost:8000` (local dev).

---

## Vercel Deployment (Frontend)

1. Push frontend to GitHub
2. Import repo in Vercel
3. Set environment variable in Vercel dashboard:
   ```
   NEXT_PUBLIC_API_URL=http://145.79.13.137:8000
   ```
4. Deploy — Vercel will proxy `/api/*` to the VPS backend

---

## Environment Variables

### `backend/.env`

```
DATABASE_URL=postgresql://neondb_owner:npg_eyT3LVwcU5np@ep-withered-block-am8m6dq0-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
OPENROUTER_API_KEY=sk-or-...
```

### `frontend/.env.local`

```
NEXT_PUBLIC_API_URL=http://145.79.13.137:8000   # VPS
# or leave blank to use http://localhost:8000    # local dev
```
