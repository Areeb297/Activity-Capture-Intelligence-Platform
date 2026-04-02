"""
GET /dashboard/{run_id}?function=Finance&employee_id=abc-123

Single endpoint the frontend calls for everything.
Loads agent_results from DB, merges them into one structured payload,
and applies optional server-side filtering by function or employee_id.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from db.connection import get_conn
from tools.db_tools import fetch_run_status, fetch_agent_results

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _filter_duplication(pairs: list[dict], function: str | None, employee_id: str | None) -> list[dict]:
    if function:
        pairs = [
            p for p in pairs
            if p.get("function_a") == function or p.get("function_b") == function
        ]
    if employee_id:
        pairs = [
            p for p in pairs
            if p.get("employee_id_a") == employee_id or p.get("employee_id_b") == employee_id
        ]
    return pairs


def _filter_automation(activities: list[dict], function: str | None, employee_id: str | None) -> list[dict]:
    if function:
        activities = [a for a in activities if a.get("function") == function]
    if employee_id:
        activities = [a for a in activities if a.get("employee_id") == employee_id]
    return activities


def _filter_resource(employees: list[dict], function: str | None, employee_id: str | None) -> list[dict]:
    if function:
        employees = [e for e in employees if e.get("function") == function]
    if employee_id:
        employees = [e for e in employees if e.get("employee_id") == employee_id]
    return employees


def _recalculate_kpis(duplication: list[dict], automation: list[dict], resource: list[dict]) -> dict:
    return {
        "duplicate_pairs": sum(1 for p in duplication if p.get("duplicate_type") == "True Duplicate"),
        "partial_overlaps": sum(1 for p in duplication if p.get("duplicate_type") == "Partial Overlap"),
        "high_automation_count": sum(1 for a in automation if (a.get("automation_score") or 0) >= 70),
        "overloaded_employees": sum(1 for e in resource if e.get("overloaded")),
    }


@router.get("/{run_id}")
def get_dashboard(
    run_id: str,
    function: str | None = Query(default=None, description="Filter by department/function name"),
    employee_id: str | None = Query(default=None, description="Filter by employee UUID"),
):
    with get_conn() as conn:
        run = fetch_run_status(conn, run_id)
        if not run:
            raise HTTPException(status_code=404, detail="Run not found.")

        if run["status"] not in ("complete", "running"):
            raise HTTPException(
                status_code=202,
                detail=f"Analysis is still {run['status']}. Poll /status/{run_id} first.",
            )

        raw_results = fetch_agent_results(conn, run_id)

        # Fetch employee list for function filter dropdown
        with conn.cursor() as cur:
            cur.execute(
                "SELECT DISTINCT function FROM employees WHERE submission_id = %s AND function IS NOT NULL ORDER BY function",
                (str(run["submission_id"]),),
            )
            functions = [row[0] for row in cur.fetchall()]

            cur.execute(
                "SELECT COUNT(*) FROM employees WHERE submission_id = %s",
                (str(run["submission_id"]),),
            )
            total_employees = cur.fetchone()[0]

            cur.execute(
                """
                SELECT COUNT(*) FROM activities a
                JOIN employees e ON e.id = a.employee_id
                WHERE e.submission_id = %s
                """,
                (str(run["submission_id"]),),
            )
            total_activities = cur.fetchone()[0]

    # Index results by agent name
    by_agent = {r["agent_name"]: r["result_json"] for r in raw_results}

    dup_data       = by_agent.get("duplication", {})
    auto_data      = by_agent.get("automation", {})
    res_data       = by_agent.get("resource", {})
    collab_data    = by_agent.get("collaboration", {})
    narrative_data = by_agent.get("narrative", {})

    # Apply filters
    pairs = _filter_duplication(dup_data.get("confirmed_duplicates", []), function, employee_id)
    activities = _filter_automation(auto_data.get("scored_activities", []), function, employee_id)
    employees = _filter_resource(res_data.get("employees", []), function, employee_id)

    # Recalculate KPIs against filtered data
    filtered_kpis = _recalculate_kpis(pairs, activities, employees)

    return {
        "run_id": run_id,
        "submission_id": str(run["submission_id"]),
        "status": run["status"],
        "kpis": {
            "total_employees": total_employees,
            "total_activities": total_activities,
            **filtered_kpis,
        },
        "functions": functions,
        "duplication": {
            "summary": dup_data.get("summary", ""),
            "total_pairs_evaluated": dup_data.get("total_pairs_evaluated", 0),
            "pairs": pairs,
        },
        "automation": {
            "summary": auto_data.get("summary", ""),
            "high_potential_count": filtered_kpis["high_automation_count"],
            "scored_activities": activities,
        },
        "resource": {
            "summary": res_data.get("summary", ""),
            "overloaded_count": filtered_kpis["overloaded_employees"],
            "employees": employees,
        },
        "collaboration": {
            "summary": collab_data.get("summary", ""),
            "opportunities": collab_data.get("opportunities", []),
        },
        "narrative": narrative_data,
    }
