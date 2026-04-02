# Activity Analyser — Backend

FastAPI multi-agent backend for the Ebttikar Head Office Role & Activity Review System.

---

## Setup

### 1. Create and activate virtual environment

```bash
# Navigate to backend folder
cd "C:\Users\areeb\OneDrive\Documents\Activity Analyser System\backend"

# Create venv
python -m venv venv

# Activate (Windows)
venv\Scripts\activate
source venv/bin/activate
# You should see (venv) at the start of your terminal prompt
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
copy .env.example .env
```

Open `.env` and fill in:

```
DATABASE_URL=postgresql://neondb_owner:...@....neon.tech/neondb?sslmode=require&channel_binding=require
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

> **One key for everything:** `OPENROUTER_API_KEY` is used for both LLM agents (`anthropic/claude-sonnet-4-6`)
> and embeddings (`openai/text-embedding-3-small`) — no separate OpenAI key needed.

### 4. Run the server

```bash
uvicorn main:app --reload --port 8000
```

Open `http://localhost:8000/docs` to see the interactive API (Swagger UI).

---

## Project Structure

```
backend/
├── main.py                  # FastAPI app entry point
├── requirements.txt
├── .env.example
│
├── core/
│   └── config.py            # Loads .env settings (DATABASE_URL, API keys)
│
├── db/
│   └── connection.py        # psycopg2 connection pool — get_conn() context manager
│
├── parser/
│   └── excel_parser.py      # Reads Survey sheet from each .xlsx file
│
├── tools/
│   ├── db_tools.py          # All SQL queries (parameterised — no string interpolation)
│   ├── embedding.py         # OpenAI text-embedding-3-small (1536-dim)
│   └── similarity_search.py # pgvector cosine similarity wrapper
│
├── agents/
│   ├── base.py              # BaseAgent — _llm(), _extract_json() helpers
│   ├── duplication_agent.py # pgvector pairs → Claude judges each pair
│   ├── automation_agent.py  # Claude re-scores every activity (0–100)
│   ├── resource_agent.py    # SQL aggregation + Claude interpretation
│   └── narrative_agent.py   # Synthesises all 3 results into exec summary
│
├── orchestrator/
│   └── runner.py            # asyncio fan-out (3 agents parallel) → narrative
│
├── routers/
│   ├── upload.py            # POST /upload
│   ├── analyse.py           # POST /analyse/{submission_id}
│   ├── status.py            # GET  /status/{run_id}
│   ├── results.py           # GET  /results/{run_id}, /employees, /activities
│   └── dashboard.py         # GET  /dashboard/{run_id}?function=X&employee_id=Y
│
└── schemas/
    ├── submission.py        # Upload + employee response models
    ├── analysis.py          # Run status response models
    └── agent_outputs.py     # Pydantic shapes for each agent's output
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/upload` | Upload multiple `.xlsx` files (one per employee). Returns `submission_id`. |
| `POST` | `/analyse/{submission_id}` | Start analysis. Returns `run_id` immediately. |
| `GET`  | `/status/{run_id}` | Per-agent status. Poll every 2–3s until `complete`. |
| `GET`  | `/dashboard/{run_id}` | All results + KPIs. Accepts `?function=` and `?employee_id=` filters. |
| `GET`  | `/employees/{submission_id}` | List employees in a submission. |
| `GET`  | `/activities/{employee_id}` | All activities for one employee. |
| `GET`  | `/results/{run_id}` | Raw agent JSON outputs (debugging). |
| `GET`  | `/health` | Health check. |

---

## How the analysis pipeline works

```
POST /upload
  └─ Parse Survey sheet from each .xlsx
  └─ Write: submissions → employees → activities (NeonDB)

POST /analyse/{submission_id}
  └─ Generate OpenAI embeddings for all activity descriptions
  └─ Fan out (asyncio.gather):
       ├─ DuplicationAgent  — pgvector similarity ≥ 0.70 → Claude judges pairs
       ├─ AutomationAgent   — Claude scores each activity 0–100
       └─ ResourceAgent     — SQL aggregates % time → Claude interprets
  └─ NarrativeAgent fires when all 3 complete
  └─ All results stored in agent_results (JSONB)

GET /dashboard/{run_id}
  └─ Loads all agent results
  └─ Applies ?function / ?employee_id filters
  └─ Returns merged payload: KPIs + duplication + automation + resource + narrative
```

---

## Deactivate venv when done

```bash
deactivate
```
