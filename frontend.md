# Activity Analyser — Frontend Specification

**Last Updated:** 2026-04-02
**Status:** In Progress
**Stack:** Next.js (App Router) + React + TypeScript + Tailwind CSS

---

## 1. Routes

| Route | Page | Purpose |
|---|---|---|
| `/` | Upload | Admin uploads all employee Excel files |
| `/status/[run_id]` | Progress | Live agent status tracking |
| `/results/[run_id]` | Dashboard | Full analysis results with filters |
| `/results/[run_id]/employee/[employee_id]` | Drill-Down | Single employee detail view |

---

## 2. Design System

| Token | Value |
|---|---|
| Primary colour | `#2563EB` (blue) |
| Secondary colour | `#3B82F6` (lighter blue) |
| CTA / Warning | `#F97316` (orange — used for overload signals) |
| Success / High automation | `#16A34A` (green) |
| Danger / True Duplicate | `#DC2626` (red) |
| Caution / Partial Overlap | `#D97706` (amber) |
| Background | `#F9FAFB` (light) / `#111827` (dark) |
| Heading font | Fira Code |
| Body font | Fira Sans |
| Card transition | `200ms ease-out` |
| Card hover | slight elevation + border colour shift |

---

## 3. Page 1 — Upload (`/`)

**Purpose:** Admin collects all returned Excel files from employees and uploads them in one go.

### Layout
```
┌──────────────────────────────────────────────────────────┐
│  Activity Analyser                              [logo]   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   Head Office Role & Activity Review                     │
│   Upload all employee Excel files to begin analysis      │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                                                     │ │
│  │   Drag & drop .xlsx files here, or click to browse  │ │
│  │                                                     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  Files added:                                            │
│  ┌──────────────────────────────────────────┐           │
│  │ areeb_shafqat.xlsx          Survey ✓  ✕  │           │
│  │ sarah_hr.xlsx               Survey ✓  ✕  │           │
│  │ faisal_pmo.xlsx             Survey ✓  ✕  │           │
│  └──────────────────────────────────────────┘           │
│                                                          │
│              [ Upload & Analyse  → ]                     │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Components
- `DropZone` — drag-and-drop zone, accepts `multiple`, `.xlsx` only
- `FileList` — list of added files with filename, "Survey ✓/✗" badge, remove button
- `UploadButton` — disabled until ≥1 valid file added; shows spinner during upload

### API calls
1. `POST /upload` (multipart, all files) → get `submission_id`
2. `POST /analyse/{submission_id}` → get `run_id`
3. Redirect to `/status/{run_id}?submission_id={submission_id}`

### States
| State | UI |
|---|---|
| `idle` | Drop zone active, button disabled |
| `files_added` | File list shown, button enabled |
| `uploading` | Spinner, button disabled, "Uploading files…" |
| `starting` | Spinner, "Starting analysis…" |
| `error` | Red banner with error message, retry button |

---

## 4. Page 2 — Progress (`/status/[run_id]`)

**Purpose:** Show live agent pipeline status while analysis runs in the background.

### Layout
```
┌──────────────────────────────────────────────────────────┐
│  ← Upload         Analysis in progress…                  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Submission: batch_20260402_143022   12 employees        │
│                                                          │
│  ┌────────────────────┐  ┌────────────────────┐         │
│  │ 🔍 Duplication     │  │ ⚡ Automation       │         │
│  │    Detector        │  │    Scorer           │         │
│  │                    │  │                    │         │
│  │  ● Running…        │  │  ● Running…        │         │
│  └────────────────────┘  └────────────────────┘         │
│                                                          │
│  ┌────────────────────┐  ┌────────────────────┐         │
│  │ 📊 Resource        │  │ 📝 Narrative        │         │
│  │    Analyser        │  │    Synthesiser      │         │
│  │                    │  │                    │         │
│  │  ✓ Complete        │  │  ○ Waiting…        │         │
│  └────────────────────┘  └────────────────────┘         │
│                                                          │
│              [ View Results → ]  (disabled until done)   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Components
- `AgentStatusCards` — 4 cards (Duplication, Automation, Resource, Narrative)
- Each card has: agent name, icon, status badge
- Status badge variants: `pending` (grey) / `running` (blue pulse) / `complete` (green) / `failed` (red)
- `ViewResultsButton` — enabled only when overall status is `complete`

### Polling
- `GET /status/{run_id}` every **2.5 seconds**
- Stop polling when `status === "complete"` or `"failed"`
- Auto-redirect to `/results/{run_id}` on completion

### Agent status field mapping
| Card | DB field |
|---|---|
| Duplication Detector | `duplication_status` |
| Automation Scorer | `automation_status` |
| Resource Analyser | `resource_status` |
| Narrative Synthesiser | `narrative_status` |

---

## 5. Page 3 — Dashboard (`/results/[run_id]`)

**Purpose:** Full cross-employee analysis results. Primary results view.

### Layout
```
┌──────────────────────────────────────────────────────────┐
│  Activity Analyser Results          [ Department ▼ ]     │
│                                     [ Employee   ▼ ]     │
├──────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ 12       │ │ 87       │ │ 4        │ │ 23       │   │
│  │ Employees│ │Activities│ │Duplicates│ │ High Auto│   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  ┌──────────┐                                           │
│  │ 3 ⚠      │                                           │
│  │Overloaded│                                           │
│  └──────────┘                                           │
├──────────────────────────────────────────────────────────┤
│  [ Duplication ] [ Automation ] [ Resource ] [ Summary ] │
├──────────────────────────────────────────────────────────┤
│  (active tab content)                                    │
└──────────────────────────────────────────────────────────┘
```

### 5a. KPI Bar

| Card | Value | Source field |
|---|---|---|
| Total Employees | number | `kpis.total_employees` |
| Total Activities | number | `kpis.total_activities` |
| Duplicate Pairs | number (red if >0) | `kpis.duplicate_pairs` |
| Partial Overlaps | number (amber if >0) | `kpis.partial_overlaps` |
| High Automation | number (green) | `kpis.high_automation_count` |
| Overloaded Employees | number + ⚠ (orange if >0) | `kpis.overloaded_employees` |

All KPI values **re-calculate** when department/employee filter changes.

### 5b. Filters

- **Department filter** — multi-select dropdown populated from `functions[]` in dashboard response
- **Employee filter** — single-select, list narrows when department is selected
- Selecting a filter calls `GET /dashboard/{run_id}?function=X&employee_id=Y` and refreshes all panels

### 5c. Tab: Duplication

**Summary line** — e.g. "4 true duplicates and 6 partial overlaps found across 12 employees"

**Pairs list** — one expandable card per pair:

```
┌──────────────────────────────────────────────────────────┐
│  TRUE DUPLICATE               Similarity: 0.87           │
│  ─────────────────────────────────────────────────────── │
│  Areeb Shafqat                Sarah Ahmed                │
│  Healthcare Digitization      HR                         │
│  "Prepare weekly status       "Weekly project status     │
│   reports for PM"              reporting to management"  │
│  ─────────────────────────────────────────────────────── │
│  Recommended owner: Areeb Shafqat                        │
│  Action: Consolidate into one report, share with both    │
│  [▼ Show reasoning]                                      │
└──────────────────────────────────────────────────────────┘
```

Badge colours:
- `True Duplicate` → red background
- `Partial Overlap` → amber background
- Cosine score → grey pill badge (e.g. `0.87`)

### 5d. Tab: Automation

**Bar chart** — X axis = employee names, Y axis = average automation score (0–100). Colour bars by score band.

**Activity table** (sortable, filterable by employee):

| Activity Description | Employee | Function | Score | Confidence | Suggested Tool | Employee Said |
|---|---|---|---|---|---|---|
| Prepare weekly status report | Areeb | HC Digitization | 82 🟢 | High | Power Automate | No |
| Review vendor invoices | Ahmed | Finance | 65 🟡 | Medium | RPA | Not sure |

Score colour coding:
- `≥ 70` → green badge
- `40–69` → amber badge
- `< 40` → red badge

"Employee Said" vs AI Score side-by-side highlights disagreements (employee said No, AI says 82 = highlight row).

### 5e. Tab: Resource Allocation

**Stacked bar chart** — one bar per employee:
- Segments: `Admin` (red), `Review` (blue), `Control` (green), `Unknown` (grey)
- Employees with >60% Admin get a ⚠ overload marker above their bar

**Employee summary table**:

| Employee | Function | % Accounted | Admin % | Review % | Overloaded |
|---|---|---|---|---|---|
| Areeb Shafqat | HC Digitization | 95% | 65% | 20% | ⚠ Yes |
| Sarah Ahmed | HR | 80% | 45% | 35% | — |

Clicking a row → navigates to `/results/[run_id]/employee/[employee_id]`

### 5f. Tab: Narrative Summary

```
┌──────────────────────────────────────────────────────────┐
│  Executive Summary                                       │
│  ─────────────────────────────────────────────────────── │
│  [paragraph 1]                                           │
│  [paragraph 2]                                           │
│  [paragraph 3]                                           │
│                                                          │
│  Key Findings                                            │
│  • Finding one                                           │
│  • Finding two                                           │
│                                                          │
│  Action Items                                            │
│  ┌──────────┬──────────────────────┬──────────┬───────┐  │
│  │ Priority │ Action               │ Owner    │ Why   │  │
│  ├──────────┼──────────────────────┼──────────┼───────┤  │
│  │ 🔴 High  │ Consolidate weekly…  │ Mgmt     │ ...   │  │
│  │ 🟡 Med   │ Automate invoice…    │ Finance  │ ...   │  │
│  └──────────┴──────────────────────┴──────────┴───────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## 6. Page 4 — Employee Drill-Down (`/results/[run_id]/employee/[employee_id]`)

**Accessed by:** clicking any employee name or row in the dashboard.

### Layout
```
┌──────────────────────────────────────────────────────────┐
│  ← Back to Dashboard                                     │
├──────────────────────────────────────────────────────────┤
│  Areeb Shafqat                              ⚠ Overloaded │
│  Senior AI Engineer · Healthcare Digitization            │
│  Manager: Atif Ahsan                                     │
│  11 activities · 95% time accounted                      │
├──────────────────────────────────────────────────────────┤
│  [Donut chart: time by value type]  [Activity cards →]   │
├──────────────────────────────────────────────────────────┤
│  Activity Cards                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Prepare weekly status reports for PM       Daily │   │
│  │ 15% of time   Admin   Auto Score: 82 🟢           │   │
│  │ Employee said: No — AI disagrees ⚠                │   │
│  │ [▼ Show details]                                 │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ...next activity card                           │   │
│  └──────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────┤
│  Duplicates Involving This Employee                      │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [duplicate pair card, same as dashboard]        │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Components

**Employee header card:**
- Name, job title, function, direct manager
- Total activity count + total % accounted
- Overload warning badge (if `overloaded: true`)

**Activity summary cards** (one per activity):
- Description (bold)
- Frequency badge (Daily / Weekly / Monthly / Annual)
- % Time pill (e.g. `15%`)
- Value Type badge
- Automation score badge (colour-coded)
- "Employee said" vs "AI score" — if they disagree, show ⚠ mismatch flag
- Expand arrow → reveals `output_deliverable`, `who_uses_it`, `if_stopped`

**Time breakdown donut chart:**
- Segments by Value Type
- Centre text shows highest segment (e.g. "65% Admin")

**Duplicates panel:**
- Filtered list of duplicate/overlap pairs where this employee appears
- Same card design as dashboard duplication tab

### API calls
- `GET /activities/{employee_id}` → activity cards + donut chart
- `GET /dashboard/{run_id}?employee_id={employee_id}` → automation scores + duplicates

---

## 7. Shared Components

| Component | Used in | Description |
|---|---|---|
| `KPICard` | Dashboard | Number + label + optional colour variant |
| `AgentStatusCard` | Progress page | Agent name + icon + status badge with pulse animation |
| `DuplicatePairCard` | Dashboard, Drill-down | Expandable card showing two activities side-by-side |
| `ActivityCard` | Drill-down | Single activity with score badges, expand for details |
| `AutomationBadge` | Dashboard table, ActivityCard | Colour-coded score pill (green/amber/red) |
| `OverloadBadge` | Dashboard table, Drill-down header | Orange ⚠ warning |
| `DepartmentFilter` | Dashboard | Multi-select dropdown, populates from `functions[]` |
| `EmployeeFilter` | Dashboard | Single-select, filters by selected department |
| `StackedBarChart` | Resource tab | recharts BarChart with value-type segments |
| `AverageScoreBarChart` | Automation tab | recharts BarChart, one bar per employee |
| `DonutChart` | Drill-down | recharts PieChart showing time by value type |
| `Spinner` | Upload, Progress | Loading indicator |
| `SkeletonCard` | Dashboard loading state | Placeholder shimmer while data loads |

---

## 8. API Integration Summary

| Page | Endpoint | When |
|---|---|---|
| Upload | `POST /upload` | On submit |
| Upload | `POST /analyse/{submission_id}` | Immediately after upload |
| Progress | `GET /status/{run_id}` | Every 2.5s until complete |
| Dashboard | `GET /dashboard/{run_id}` | On page load + on filter change |
| Dashboard (filters) | `GET /dashboard/{run_id}?function=X` | When department filter changes |
| Drill-down | `GET /activities/{employee_id}` | On page load |
| Drill-down | `GET /dashboard/{run_id}?employee_id=X` | On page load (for scores + duplicates) |

**Base URL:** configured via `NEXT_PUBLIC_API_URL` env var (default: `http://localhost:8000`)

---

## 9. Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 10. Implementation Status

| Component | Status |
|---|---|
| Upload page + DropZone | 🔄 In progress |
| Progress page + polling | 🔄 In progress |
| Dashboard KPI bar | 🔄 In progress |
| Department filter | 🔄 In progress |
| Duplication tab | 🔄 In progress |
| Automation tab | ⏳ Pending |
| Resource tab | ⏳ Pending |
| Narrative tab | ⏳ Pending |
| Employee drill-down | ⏳ Pending |
