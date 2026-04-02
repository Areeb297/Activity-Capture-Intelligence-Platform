# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Current date:** 2026-04-02. Always use WebSearch to verify the latest versions of packages (npm, pip) and check for security advisories before pinning any dependency version. Never rely on training-data version knowledge — it will be stale.

> **Detailed docs:**
> - [`docs/architecture.md`](docs/architecture.md) — system design, agent details, folder structure, DB schema
> - [`scope.md`](scope.md) — full PRD, API contracts, UI spec, implementation status
> - [`frontend.md`](frontend.md) — frontend design notes

---

## Package Management Rule

**ALWAYS add new Python packages to `backend/requirements.txt` before telling the user to install.**
Never give a bare `pip install <package>` command. The user runs one command to get everything:

```bash
pip install -r requirements.txt
```

Same rule for frontend — add to `package.json` dependencies and the user runs `npm install`.

---

## VPS Deployment (Hostinger — 145.79.13.137)

### One-time setup on the VPS

```bash
ssh root@145.79.13.137
cd /root/activity_analyzer/backend

# Create and activate venv
python3 -m venv venv
source venv/bin/activate

# Install all dependencies
pip install -r requirements.txt

# Create .env (copy values from below)
cp .env.example .env
nano .env
```

### Start backend (persists after SSH disconnect)

```bash
cd /root/activity_analyzer/backend
source venv/bin/activate

# Start with nohup — logs go to uvicorn.log
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > uvicorn.log 2>&1 &

# Check it started
curl http://localhost:8000/health

# View live logs
tail -f uvicorn.log

# Find and kill the process (to restart)
pkill -f "uvicorn main:app"
```

### Systemd service (recommended for auto-restart on reboot)

```bash
cat > /etc/systemd/system/activity-analyser.service << 'EOF'
[Unit]
Description=Activity Analyser API
After=network.target

[Service]
User=root
WorkingDirectory=/root/activity_analyzer/backend
ExecStart=/root/activity_analyzer/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5
StandardOutput=append:/var/log/activity-analyser.log
StandardError=append:/var/log/activity-analyser.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable activity-analyser
systemctl start activity-analyser
systemctl status activity-analyser

# View logs
journalctl -u activity-analyser -f
```

### Connect local frontend to VPS backend

In `frontend/.env.local` (create if it doesn't exist):
```
NEXT_PUBLIC_API_URL=http://145.79.13.137:8000
```

The `next.config.ts` proxy reads this variable — if unset it falls back to `http://localhost:8000`.

### Push code updates to VPS

```bash
# On VPS — pull latest and restart
cd /root/activity_analyzer/backend
git pull
source venv/bin/activate
pip install -r requirements.txt   # only needed if requirements.txt changed
pkill -f "uvicorn main:app"
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > uvicorn.log 2>&1 &
curl http://localhost:8000/health
```

---

## Commands

### Backend

```bash
cd backend

# Install / update all dependencies (run this whenever requirements.txt changes)
pip install -r requirements.txt

# Run (with auto-reload)
uvicorn main:app --reload --port 8000

# Quick API check
curl http://localhost:8000/health
```

### Frontend

```bash
cd frontend

# Install
npm install

# Dev server (port 3001; proxies /api/* → localhost:8000)
npm run dev

# Build
npm run build
```

### Database DDL

The Neon MCP server is **read-only** — `CREATE TABLE`, `ALTER`, `CREATE EXTENSION` all fail. Always use psycopg2 directly for schema changes:

```python
import psycopg2
conn = psycopg2.connect("postgresql://neondb_owner:npg_eyT3LVwcU5np@ep-withered-block-am8m6dq0-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require")
conn.autocommit = True
cur = conn.cursor()
cur.execute("YOUR DDL HERE")
```

---

## Environment

Copy `backend/.env.example` to `backend/.env` and fill in:

| Key | Source |
|---|---|
| `DATABASE_URL` | Already in `.env.example` (NeonDB production) |
| `OPENROUTER_API_KEY` | Used for both LLM agents and embeddings via OpenRouter |

> Note: agents call OpenRouter (not Anthropic/OpenAI directly). `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` are not needed.

---

## Key Facts (quick reference)

- **LLM:** OpenRouter → `anthropic/claude-4.6-sonnet-20260217` — model set in `agents/base.py`
- **Embeddings:** OpenRouter → `text-embedding-3-small` (1536-dim)
- **DB:** NeonDB `square-meadow-78277597`, branch `production`
- **DB connection:** `postgresql://neondb_owner:npg_eyT3LVwcU5np@ep-withered-block-am8m6dq0-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
- **Parser reads:** only the `Survey` sheet — all `Smpl-*` sheets are ignored
- **Agents (5 total):** DuplicationAgent → pgvector pre-filter (≥0.70) then LLM judge; AutomationAgent → LLM re-scores every activity; ResourceAgent → SQL agg then LLM; CollaborationAgent → cross-dept opportunities; NarrativeAgent → fires after all four complete
- **Orchestration:** `asyncio.gather()` fans out four agents in parallel; `asyncio.to_thread()` wraps synchronous agent code; CollaborationAgent failure is non-blocking
- **Narrative output:** HTML format (`<p>`, `<strong>`, `<ul>`) — concise 2–3 sentences per paragraph; rendered with `dangerouslySetInnerHTML` in `NarrativeSummary.tsx`
- **DB extra column:** `analysis_runs.collaboration_status` (added via ALTER TABLE)
- **Frontend API proxy:** `next.config.ts` proxies `/api/*` → `http://localhost:8000`
- **Badge component:** uses `label` prop (NOT `children`) — `<Badge variant="danger" label="High" />`
- **Build test rule:** ALWAYS run `npm run build` locally in `frontend/` before pushing to avoid Vercel build failures

For full details see [`docs/architecture.md`](docs/architecture.md).
