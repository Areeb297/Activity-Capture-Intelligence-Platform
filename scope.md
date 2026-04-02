# Activity Analyser System — Product Requirements Document (v0.3)

**Last Updated:** 2026-04-02
**Version:** 0.4
**Status:** Active Development — Backend scaffolded, Frontend in progress

---

## 1. Product Overview

The **Activity Analyser System** is an AI-powered tool built for Ebttikar's Head Office Role & Activity Review Exercise (deadline: Tuesday 6 April 2026, per MD directive).

**Business context:** The MD sent all head office employees the Activity Capture Template and asked each person to fill in their own `Survey` sheet and return it. The system ingests all returned files, runs a multi-agent AI analysis pipeline, and produces structured insights on duplication, automation opportunities, and resource allocation — replacing what would otherwise be a manual consulting engagement.

**Core value proposition:** Admin collects all returned Excel files → uploads them as a batch → AI agents automatically identify duplicated work across roles, what can be automated, and who is overloaded.

---

## 2. Input: Excel File Structure

### How submissions work

- The MD distributed **one Excel template** to all head office employees
- Each employee fills in **only the `Survey` sheet** with their own activities
- Each employee returns their **own copy** of the file (one file per person)
- The admin uploads **all files together** as a single batch for cross-employee analysis

### Workbook layout (Activity Capture Template)

| Sheet | Purpose | Parsed? |
|---|---|---|
| `Survey` | **The employee's real activity data** — the only sheet that matters | ✅ Yes |
| `Smpl-FIN`, `Smpl-HR`, `Smpl-PMO`, `Smpl-Procurement`, `Smpl-Exec Assist` | Sample examples embedded in the template to guide employees | ❌ No — ignored |
| `data` | Dropdown validation lists | ❌ No — ignored |

> **Important:** The parser reads ONLY the `Survey` sheet from each file. All `Smpl-*` sheets are template guidance examples — they contain fake sample data, not real employee submissions.

### Cell map (exact — verified against live file)

**Header block** — always starts at row 1, column A/B:

| Row | Col A | Col B (value) |
|---|---|---|
| 1 | `A. Individual Activity Sheet` | — |
| 3 | `Field` | `Description` |
| 4 | `Employee Name` | e.g. `Areeb Shafqat` |
| 5 | `Employee Number` | e.g. `20783` |
| 6 | `Function` | e.g. `Healthcare Digitization` |
| 7 | `Job Title` | e.g. `Senior AI Engineer` |
| 8 | `Direct Manager` | e.g. `Atif Ahsan` |

**Table header sentinel** — row where col A = `"#"` (row 10 in current file):

| Col | Field |
|---|---|
| A | `#` (integer row index) |
| B | `Activity Description` |
| C | `Frequency` (Daily / Weekly / Monthly / Annual) |
| D | `% Time` (decimal, e.g. `0.15` = 15%) |
| E | `Output/Deliverable` |
| F | `Who Uses It?` |
| G | `Value Type` (Rev / Control / Admin / Administer / Review) |
| H | `If Stopped What Happens?` |
| I | `Can Be Automated? (Y/N)` |

**Parser stop condition:** col A is no longer an integer → end of data rows.

### Validation values (from `data` sheet)

- **Frequency:** Daily, Weekly, Monthly, Annual
- **Automation:** Yes, No, Not sure, Partial
- **Value Type:** Review, Control, Administer
- **Impact if stopped:** Nothing, Financial loss, Customer unhappy, Other departments delayed, my boss is upset

---

## 3. System Architecture

### 3.1 High-level flow

```
Admin collects all returned Excel files (one per employee)
     │
     ▼
POST /upload  (multi-file upload — all files in one request)
     │  Parses Survey sheet from each file
     │  Ignores all Smpl-* sheets
     ▼
NeonDB: one submission_id → many employees → many activities
     │
     ▼
POST /analyse/{submission_id}
     │
     ▼
Orchestrator  ──── spawns ────►  [Duplication Agent]  ← pgvector similarity across ALL employees
                                 [Automation Agent ]  ← scores every activity (parallel)
                                 [Resource Agent   ]  ← % time per employee (parallel)
                                         │
                                         ▼ (all three complete)
                                 [Narrative Agent  ]  ← synthesises executive summary
                                         │
                                         ▼
                              GET /results/{run_id}  ──►  Frontend Dashboard
```

### 3.2 Agent descriptions

#### Agent 1 — Duplication Detector
- **Input:** All activity rows across all uploaded employees
- **Method:** Two-stage hybrid pipeline:
  1. **Pre-filter (pgvector):** Run cosine similarity on `description` embeddings with a *wide* threshold ≥ 0.70 to produce candidate pairs cheaply. This eliminates ~90% of the O(n²) comparison space without needing LLM calls.
  2. **LLM judge:** Pass each candidate pair to the agent with the cosine score as *one signal among many*. The full context row is included: `description`, `function`, `frequency`, `output`, `who_uses_it`, `value_type`. The agent decides:
     - `True Duplicate` — same work being done by two or more people
     - `Partial Overlap` — related but distinct, worth consolidating
     - `Not a Duplicate` — similar wording, different purpose
  - The LLM is explicitly instructed that the cosine score is a hint, not a verdict. Two activities in different functions with score 0.82 may be legitimate; two in the same function with score 0.71 may still be a real duplicate based on context.
- **Output:** Confirmed duplicates with: similarity score, duplicate type, employee names, functions, recommended owner, consolidation action

#### Agent 2 — Automation Scorer
- **Input:** Each activity row
- **Method:** LLM re-scores automation potential regardless of employee's self-reported `Can Be Automated?` field; uses `Value Type`, `Frequency`, `Output/Deliverable`, and `If Stopped` as context
- **Output:** Per-activity automation score (0–100), confidence level, suggested tool/approach

#### Agent 3 — Resource Allocation Analyser
- **Input:** `% Time` per activity per employee
- **Method:** Aggregates % time by Value Type and Frequency; flags employees where >60% time is on Admin/Administer activities; compares against function norms
- **Output:** Per-employee time distribution, overload signals, rebalancing recommendations

#### Agent 4 — Narrative Synthesiser (runs after 1, 2, 3 complete)
- **Input:** Outputs of all three agents
- **Method:** LLM prompt with structured JSON from agents → generates executive summary paragraphs
- **Output:** Plain-language summary (3–5 paragraphs), bullet-point action list, priority ranking

### 3.3 Orchestrator
- Tracks run status of all three parallel agents
- Triggers Narrative agent only when all three reach terminal state
- Stores per-run status in `analysis_runs` table
- Exposes `/status/{run_id}` endpoint for polling

---

## 4. Database (NeonDB — PostgreSQL)

**Project ID:** `square-meadow-78277597`
**Branch:** `production` (Default)
**Connection string:**
```
postgresql://neondb_owner:npg_eyT3LVwcU5np@ep-withered-block-am8m6dq0-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

**Extension installed:** `pgvector 0.8.0` — active on production branch.

> **Note:** Neon MCP is read-only. All DDL must be run via psycopg2 directly (conn.autocommit = True).

### Schema (live — created 2026-04-02)

```sql
-- Uploaded workbooks
CREATE TABLE IF NOT EXISTS submissions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename     TEXT NOT NULL,
    uploaded_at  TIMESTAMPTZ DEFAULT now()
);

-- Parsed employee header block (rows 4–8 of each sheet)
CREATE TABLE IF NOT EXISTS employees (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id   UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    employee_name   TEXT,
    employee_number TEXT,
    function        TEXT,
    job_title       TEXT,
    direct_manager  TEXT
);

-- Individual activity rows (row where col A = "#" onward, stop when col A not integer)
CREATE TABLE IF NOT EXISTS activities (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    row_index           INTEGER NOT NULL,
    description         TEXT NOT NULL,
    frequency           TEXT,           -- Daily | Weekly | Monthly | Annual
    pct_time            NUMERIC(5,4),   -- e.g. 0.15 = 15%
    output_deliverable  TEXT,
    who_uses_it         TEXT,
    value_type          TEXT,           -- Review | Control | Administer
    if_stopped          TEXT,
    can_be_automated    TEXT,           -- Yes | No | Not sure | Partial
    embedding           VECTOR(1536)    -- OpenAI text-embedding-3-small
);

-- Per-run orchestration state
CREATE TABLE IF NOT EXISTS analysis_runs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id       UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    started_at          TIMESTAMPTZ DEFAULT now(),
    completed_at        TIMESTAMPTZ,
    status              TEXT DEFAULT 'pending',   -- pending | running | complete | failed
    duplication_status  TEXT DEFAULT 'pending',
    automation_status   TEXT DEFAULT 'pending',
    resource_status     TEXT DEFAULT 'pending',
    narrative_status    TEXT DEFAULT 'pending'
);

-- Agent outputs (one row per agent per run)
CREATE TABLE IF NOT EXISTS agent_results (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id      UUID NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
    agent_name  TEXT NOT NULL,   -- duplication | automation | resource | narrative
    result_json JSONB NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employees_submission ON employees(submission_id);
CREATE INDEX IF NOT EXISTS idx_activities_employee  ON activities(employee_id);
CREATE INDEX IF NOT EXISTS idx_activities_embedding ON activities USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_runs_submission      ON analysis_runs(submission_id);
CREATE INDEX IF NOT EXISTS idx_results_run          ON agent_results(run_id);
CREATE INDEX IF NOT EXISTS idx_results_agent        ON agent_results(run_id, agent_name);
```

### Table summary

| Table | Rows purpose | Key columns |
|---|---|---|
| `submissions` | One row per uploaded Excel file | `id`, `filename`, `uploaded_at` |
| `employees` | One row per employee sheet parsed | `submission_id`, `function`, `job_title` |
| `activities` | One row per activity line item | `employee_id`, `description`, `pct_time`, `embedding` |
| `analysis_runs` | Tracks orchestration state per run | `submission_id`, `status`, per-agent status fields |
| `agent_results` | Stores JSONB output from each agent | `run_id`, `agent_name`, `result_json` |

---

## 5. API Endpoints (FastAPI)

### Core endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/upload` | Accept **multiple `.xlsx` files**. Parses only `Survey` sheet. Groups all under one `submission_id`. |
| `POST` | `/analyse/{submission_id}` | Kick off multi-agent run, return `run_id` immediately (background task) |
| `GET` | `/status/{run_id}` | Per-agent status + overall status — poll every 2-3 seconds |
| `GET` | `/results/{run_id}` | Raw agent outputs (full JSONB) — for debugging |
| `GET` | `/employees/{submission_id}` | List employees in a submission — used to populate filters |
| `GET` | `/activities/{employee_id}` | All activities for one employee — used in drill-down |

### Dashboard endpoint (primary endpoint for frontend)

```
GET /dashboard/{run_id}?function=Finance&employee_id=abc-123
```

Returns a single structured payload covering everything the dashboard needs.
Both query params are optional — omitting them returns unfiltered data.

**Response shape:**
```json
{
  "run_id": "...",
  "submission_id": "...",
  "status": "complete",
  "kpis": {
    "total_employees": 12,
    "total_activities": 87,
    "duplicate_pairs": 4,
    "partial_overlaps": 6,
    "high_automation_count": 23,
    "overloaded_employees": 3
  },
  "functions": ["Finance", "HR", "PMO", "Healthcare Digitization"],
  "duplication": {
    "summary": "...",
    "pairs": [
      {
        "employee_a": "Areeb Shafqat", "function_a": "Healthcare Digitization",
        "employee_b": "Sarah Ahmed",   "function_b": "HR",
        "description_a": "...", "description_b": "...",
        "cosine_score": 0.87,
        "duplicate_type": "True Duplicate",
        "recommended_owner": "...", "consolidation_action": "...", "reasoning": "..."
      }
    ]
  },
  "automation": {
    "summary": "...",
    "high_potential_count": 23,
    "scored_activities": [
      {
        "activity_id": "...", "description": "...",
        "employee_name": "...", "function": "...",
        "automation_score": 82, "confidence": "High",
        "suggested_tool": "RPA / Power Automate",
        "employee_said": "No", "reasoning": "..."
      }
    ]
  },
  "resource": {
    "summary": "...",
    "overloaded_count": 3,
    "employees": [
      {
        "employee_id": "...", "employee_name": "...", "function": "...",
        "total_pct_accounted": 0.95,
        "by_value_type": { "Admin": 0.65, "Review": 0.20, "Control": 0.10 },
        "by_frequency": { "Daily": 0.55, "Weekly": 0.40 },
        "overloaded": true,
        "rebalancing_recommendation": "..."
      }
    ]
  },
  "narrative": {
    "executive_summary": "...",
    "key_findings": ["...", "..."],
    "action_items": [
      { "priority": "High", "action": "...", "owner_suggestion": "...", "rationale": "..." }
    ]
  }
}
```

Filtering behaviour:
- `?function=Finance` — filters `duplication.pairs`, `automation.scored_activities`, and `resource.employees` to only include people in that function. KPIs recalculate against the filtered set.
- `?employee_id=abc` — narrows further to one employee (for drill-down page API calls)

---

## 6. Frontend (Dashboard)

**Stack:** Next.js / React

---

### Page 1 — Upload & Run

**Purpose:** Admin uploads all returned Excel files and triggers analysis.

**Components:**
- Drag-and-drop multi-file zone (accepts multiple `.xlsx` at once)
- File list preview showing filename + "Survey sheet found ✓ / ✗" per file
- Submit button → calls `POST /upload`, then immediately calls `POST /analyse/{submission_id}`
- **Agent status cards** (one per agent, updates via polling `/status/{run_id}`):
  - Duplication Detector — `pending → running → complete`
  - Automation Scorer — `pending → running → complete`
  - Resource Analyser — `pending → running → complete`
  - Narrative Synthesiser — `pending → running → complete` (fires last)
- Once all complete → "View Results" button navigates to Dashboard

---

### Page 2 — Dashboard (main results view)

**Purpose:** Executive-level overview of the full analysis across all employees.

#### 2a. Top KPI Bar

| Card | Data source |
|---|---|
| Total Employees Analysed | `employee_count` from upload response |
| Total Activities Captured | `activity_count` from upload response |
| Duplicate / Overlap Pairs Found | `confirmed_duplicates.length` from duplication result |
| High Automation Potential | `high_potential_count` from automation result |
| Overloaded Employees | `overloaded_count` from resource result |

#### 2b. Filters (apply across all sections below)

- **Department / Function** — multi-select dropdown populated from distinct `function` values in the submission (e.g. Healthcare Digitization, Finance, HR, PMO)
- **Employee** — single-select or multi-select, filtered by selected department
- Both filters work together and narrow every chart and table on the page

#### 2c. Duplication Section

- **Duplication heatmap or table** — rows = employees, cols = employees, cell = number of overlap pairs between them (only show pairs within selected department filter)
- **Duplicate pairs list** — expandable cards, one per confirmed duplicate/overlap:
  - Employee A name + function
  - Employee B name + function
  - Activity A description
  - Activity B description
  - Cosine similarity score (badge)
  - Type badge: `True Duplicate` (red) / `Partial Overlap` (amber)
  - Recommended owner + consolidation action

#### 2d. Automation Section

- **Bar chart** — employees on X axis, average automation score on Y axis (filtered by department)
- **Activity table** — filterable by employee, sortable by automation score:

| Activity | Employee | Function | Automation Score | Confidence | Suggested Tool |
|---|---|---|---|---|---|

- Score colour coding: ≥70 green, 40-69 amber, <40 red

#### 2e. Resource Allocation Section

- **Stacked bar chart** — one bar per employee, segments = Value Type (Admin / Review / Control), coloured by type
- Overloaded employees highlighted with a warning icon (>60% Admin/Administer)
- **Per-employee summary row** showing total % accounted, top value type, overload flag

#### 2f. Narrative Summary Panel

- Executive summary text (3–5 paragraphs, from Narrative agent)
- Key findings as a bulleted list
- Action items table:

| Priority | Action | Suggested Owner | Rationale |
|---|---|---|---|
| High (red) | ... | ... | ... |
| Medium (amber) | ... | ... | ... |

---

### Page 3 — Employee Detail Drill-Down

**Accessed by:** clicking an employee name anywhere in the dashboard.

**Components:**

- **Employee header card**
  - Name, Job Title, Function, Direct Manager
  - Total activities, total % time accounted
  - Overload warning badge (if applicable)

- **Activity Summary Cards** — one card per activity, showing:
  - Description
  - Frequency badge (Daily / Weekly / Monthly / Annual)
  - % Time (e.g. 15%)
  - Value Type badge
  - Automation Score badge (colour-coded)
  - "Can Be Automated?" — employee's answer vs AI score side-by-side
  - Expand arrow → shows Output/Deliverable, Who Uses It, If Stopped

- **Time breakdown donut chart** — segments by Value Type

- **Duplicates involving this employee** — filtered list from duplication results showing only pairs where this employee appears

---

### API endpoints needed to support dashboard (additions to section 5)

| Method | Path | Description |
|---|---|---|
| `GET` | `/dashboard/{run_id}` | Single endpoint returning all data the dashboard needs: KPIs, filtered duplication pairs, automation scores, resource breakdowns, narrative. Accepts `?function=` and `?employee_id=` query params for server-side filtering. |
| `GET` | `/employees/{submission_id}` | Already exists — used to populate filter dropdowns |
| `GET` | `/activities/{employee_id}` | Already exists — used for employee drill-down |

---

## 7. Implementation Sequence & Status

| # | Task | Owner | Status |
|---|---|---|---|
| 1 | NeonDB schema + pgvector | Backend | ✅ Done |
| 2 | Excel parser (`Survey` sheet only) | Backend | ✅ Done |
| 3 | `POST /upload` (multi-file batch) | Backend | ✅ Done |
| 4 | `POST /analyse` + orchestrator | Backend | ✅ Done |
| 5 | Embedding generation (OpenAI) | Backend | ✅ Done |
| 6 | Duplication agent (pgvector + Claude) | Backend | ✅ Done |
| 7 | Automation agent (Claude) | Backend | ✅ Done |
| 8 | Resource agent (SQL agg + Claude) | Backend | ✅ Done |
| 9 | Narrative agent (Claude) | Backend | ✅ Done |
| 10 | `GET /status` + `GET /results` | Backend | ✅ Done |
| 11 | `GET /dashboard` with filtering | Backend | ✅ Done |
| 12 | Frontend: Upload page | Frontend | 🔄 In progress |
| 13 | Frontend: Status/progress page | Frontend | 🔄 In progress |
| 14 | Frontend: Dashboard (filters + KPIs) | Frontend | 🔄 In progress |
| 15 | Frontend: Employee drill-down page | Frontend | ⏳ Pending |
| 16 | End-to-end test with real submissions | Both | ⏳ Pending |

---

## 8. Sample Data Available

For development and testing, use your own completed file (`Activity Capture Template Areeb.xlsx`).
Upload it as a single-file batch to test the pipeline end-to-end.

| File | Employee | Function | Sheet used |
|---|---|---|---|
| `Activity Capture Template Areeb.xlsx` | Areeb Shafqat | Healthcare Digitization | `Survey` only |

When real submissions come in from other employees, upload all files together in one `/upload` request.
The `Smpl-*` sheets in Areeb's file contain fake sample data — the parser ignores them.

---

## 9. Out of Scope (v1)

- Real-time collaboration / multi-user editing
- Role-based access control
- Email/notification delivery
- Integration with HRMS systems
- Arabic language UI
