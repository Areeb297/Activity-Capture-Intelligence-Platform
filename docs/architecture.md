# Architecture — Activity Analyser System

> **See also:** [`scope.md`](../scope.md) for full PRD, [`frontend.md`](../frontend.md) for frontend design notes.

---

## Overview

Employees fill in one copy each of **Activity Capture Template.xlsx** and return it. An admin uploads all files in a single batch. A multi-agent AI pipeline then analyses the full dataset across all employees simultaneously and produces a structured dashboard covering duplicated work, automation opportunities, and resource overload.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.12), uvicorn |
| LLM | OpenRouter → `anthropic/claude-4.6-sonnet-20260217` (all agents) |
| Embeddings | OpenRouter → `text-embedding-3-small` (1536-dim) via OpenAI-compatible SDK |
| Vector DB | NeonDB (PostgreSQL) + pgvector 0.8.0 |
| Frontend | Next.js (App Router), React, TypeScript, Tailwind CSS |
| Config | pydantic-settings, `.env` file |

---

## Request Lifecycle

```
POST /upload  (multi-file, one submission)
  → parser.excel_parser.parse_workbook()
      reads only the "Survey" sheet per file
      ignores all Smpl-* sheets and the data sheet
  → DB writes: submissions → employees → activities (embedding = NULL)
  → returns { submission_id, employee_count, activity_count }

POST /analyse/{submission_id}
  → creates analysis_runs row (status=pending)
  → launches FastAPI BackgroundTask: orchestrator.runner.run_analysis()
  → returns { run_id } immediately

  Background task flow:
    Step 1 — embed_batch()
      fetch all activities WHERE embedding IS NULL
      call OpenRouter embeddings API in batch
      UPDATE activities SET embedding = vector

    Step 2 — asyncio.gather() [parallel]
      asyncio.to_thread(_run_duplication)   → DuplicationAgent
      asyncio.to_thread(_run_automation)    → AutomationAgent
      asyncio.to_thread(_run_resource)      → ResourceAgent

    Step 3 — NarrativeAgent (only fires after Step 2 fully succeeds)

    Each agent: writes result → agent_results table
    Orchestrator: updates analysis_runs status columns throughout

GET /status/{run_id}           — polled every 2.5s by frontend
GET /results/{run_id}          — raw JSONB output (debug)
GET /dashboard/{run_id}        — structured payload for UI (supports ?function= ?employee_id=)
```

---

## Folder Structure

```
backend/
├── main.py                  # FastAPI app, CORS, lifespan events, router includes
├── core/
│   └── config.py            # pydantic-settings: database_url, openrouter_api_key
├── db/
│   └── connection.py        # psycopg2 connection pool (init_pool / get_conn / close_pool)
├── routers/
│   ├── upload.py            # POST /upload
│   ├── analyse.py           # POST /analyse/{submission_id}
│   ├── status.py            # GET /status/{run_id}
│   ├── results.py           # GET /results/{run_id}
│   └── dashboard.py         # GET /dashboard/{run_id}
├── parser/
│   └── excel_parser.py      # openpyxl — reads Survey sheet only
├── agents/
│   ├── base.py              # BaseAgent: _llm(), _extract_json(), abstract run()
│   ├── duplication_agent.py # pgvector pre-filter → LLM judge
│   ├── automation_agent.py  # LLM re-scores every activity
│   ├── resource_agent.py    # SQL agg → LLM interprets % time
│   └── narrative_agent.py   # Synthesises summary from all three agents
├── orchestrator/
│   └── runner.py            # Fan-out/fan-in async orchestration
├── schemas/
│   ├── submission.py        # Pydantic models for upload/analyse responses
│   ├── analysis.py          # Run status / results models
│   └── agent_outputs.py     # Typed output models per agent
└── tools/
    ├── db_tools.py          # All parameterised SQL helpers (insert, fetch, update)
    ├── embedding.py         # embed_batch() — calls OpenRouter embeddings endpoint
    └── similarity_search.py # pgvector cosine query helpers

frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx                      # Redirect → /upload
│   │   ├── upload/page.tsx               # Drag-and-drop upload + trigger analysis
│   │   ├── status/[run_id]/page.tsx      # Polling progress view
│   │   ├── results/[run_id]/page.tsx     # Main dashboard (4 panels + filters)
│   │   ├── layout.tsx
│   │   └── globals.css                   # Design tokens, .card-hover, .skeleton
│   ├── components/
│   │   ├── upload/
│   │   │   ├── DropZone.tsx
│   │   │   └── FileList.tsx
│   │   ├── progress/
│   │   │   └── AgentStatusCards.tsx
│   │   ├── dashboard/
│   │   │   ├── KPICards.tsx
│   │   │   ├── DepartmentFilter.tsx
│   │   │   ├── DuplicationPanel.tsx
│   │   │   ├── AutomationPanel.tsx
│   │   │   ├── ResourcePanel.tsx
│   │   │   └── NarrativeSummary.tsx
│   │   └── ui/
│   │       ├── Badge.tsx
│   │       ├── Card.tsx
│   │       └── Spinner.tsx
│   ├── hooks/
│   │   └── useRunStatus.ts   # Polls /status every 2.5s, auto-redirects on complete
│   └── lib/
│       ├── api.ts            # All fetch calls — single source of truth
│       ├── types.ts          # TypeScript interfaces matching API response shapes
│       └── utils.ts          # cn(), formatPct(), scoreColor() etc.
```

---

## Agent Design Pattern

All agents inherit `BaseAgent` (`agents/base.py`):

```
BaseAgent
  ├── __init__(run_id)       — creates OpenAI client pointed at OpenRouter
  ├── _llm(system, user)     — calls MODEL via OpenRouter chat completions
  ├── _extract_json(text)    — strips ```json fences before json.loads
  └── run() → dict           — abstract; implemented by each agent
```

Key rules:
- **Agents are DB-decoupled.** Orchestrator fetches data and passes plain Python dicts/lists to the agent constructor. Agents never hold a DB connection.
- Agents are **synchronous Python**. The orchestrator wraps them in `asyncio.to_thread()` to avoid blocking the event loop.
- `run()` always returns a plain `dict` (from `Pydantic.model_dump()`) that is stored as JSONB.
- The LLM model is set once in `agents/base.py` — change `MODEL` there to switch all agents.

---

## Agent Details

### DuplicationAgent

Two-stage hybrid:
1. **pgvector pre-filter** (`fetch_similar_activity_pairs`, threshold ≥ 0.70) — eliminates ~90% of O(n²) comparisons cheaply. Only cross-employee pairs.
2. **LLM judge** — receives full activity context (description, function, frequency, output, who_uses_it, value_type + cosine score as a hint). Classifies as: `True Duplicate` / `Partial Overlap` / `Not a Duplicate`.

LLM is explicitly instructed: cosine score is one signal, not a verdict.

### AutomationAgent

Receives all activity rows. For each activity, LLM re-scores automation potential (0–100) regardless of the employee's self-reported `can_be_automated` field. Uses `value_type`, `frequency`, `output_deliverable`, and `if_stopped` as scoring context. Returns confidence level and suggested tool/approach.

### ResourceAgent

SQL aggregates `pct_time` by `value_type` and `frequency` per employee. Flags employees where >60% time is on Admin/Administer activities. LLM interprets the aggregated data and generates per-employee rebalancing recommendations.

### NarrativeAgent

Receives the full JSON output from the three parallel agents. Generates a 3–5 paragraph executive summary, a key findings bullet list, and a prioritised action items table.

---

## Database Schema

NeonDB PostgreSQL + pgvector 0.8.0. **Project ID:** `square-meadow-78277597`

```
submissions  ──< employees ──< activities (VECTOR(1536))
     └──< analysis_runs ──< agent_results
```

| Table | Purpose |
|---|---|
| `submissions` | One row per upload batch |
| `employees` | One row per parsed Survey sheet |
| `activities` | One row per activity line item; `embedding VECTOR(1536)` |
| `analysis_runs` | Orchestration state; per-agent status columns |
| `agent_results` | JSONB output per agent per run |

Key indexes:
- `HNSW` index on `activities.embedding` (vector_cosine_ops) — powers pgvector similarity search
- FK indexes on `employees(submission_id)`, `activities(employee_id)`, `analysis_runs(submission_id)`, `agent_results(run_id)`

> **DDL note:** Neon MCP is read-only. Always run schema changes via `psycopg2` directly with `conn.autocommit = True`. See `CLAUDE.md` for the snippet.

---

## Frontend Routing

| Route | Purpose |
|---|---|
| `/upload` | Drag-and-drop zone; calls `POST /upload` then `POST /analyse`; redirects to `/status/[run_id]` |
| `/status/[run_id]` | Polls `GET /status` every 2.5s via `useRunStatus`; auto-redirects to `/results` on complete |
| `/results/[run_id]` | Fetches `GET /dashboard/{run_id}` once; `DepartmentFilter` chips filter all four panels simultaneously |

All API calls go through `src/lib/api.ts`. Types are in `src/lib/types.ts`. `next.config.ts` proxies `/api/*` → `http://localhost:8000`.

---

## Design System

| Token | Value |
|---|---|
| Primary blue | `#2563EB` |
| Secondary blue | `#3B82F6` |
| CTA / overload signal | `#F97316` |
| Heading font | Fira Code |
| Body font | Fira Sans |

- `.card-hover` — `translateY(-2px)` + shadow + border shift (defined in `globals.css`)
- `.skeleton` — shimmer animation for loading states

---

## Environment Variables

| Key | Purpose |
|---|---|
| `DATABASE_URL` | NeonDB connection string (already in `.env.example`) |
| `OPENROUTER_API_KEY` | Used for both LLM calls and embeddings |

> `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` are **not used directly** — all model calls route through OpenRouter using its OpenAI-compatible SDK.

---

## Key Invariants (do not break)

- `tools/similarity_search.py` **does not exist** — it was deleted; the orchestrator calls `tools.db_tools.fetch_similar_activity_pairs()` directly.
- `asyncpg` is **not installed** — all DB access uses `psycopg2` via `db.connection.get_conn()`.
- `fetch_activities_for_submission` is called **once** in `orchestrator/runner.py` before the fan-out and passed to both `AutomationAgent` and `ResourceAgent` — do not add duplicate fetches.
- `DuplicatePair` includes `employee_id_a` and `employee_id_b` — the SQL query in `fetch_similar_activity_pairs` must keep returning `e1.id AS employee_id_a, e2.id AS employee_id_b`.
- `AutomationScore` includes `employee_id` — the LLM is instructed to copy it from input; the dashboard `_filter_automation` depends on this field.
- All agents guard against non-list/non-dict LLM responses with `isinstance` checks before constructing Pydantic models.
