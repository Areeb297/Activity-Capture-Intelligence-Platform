"""
GET /results/{run_id}       — all agent outputs
GET /employees/{submission_id} — employee list
GET /activities/{employee_id}  — activities for one employee
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
import psycopg2.extras

from db.connection import get_conn
from tools.db_tools import fetch_agent_results
from schemas.submission import EmployeeResponse, ActivityResponse

router = APIRouter(tags=["results"])


@router.get("/results/{run_id}")
def get_results(run_id: str):
    with get_conn() as conn:
        rows = fetch_agent_results(conn, run_id)

    if not rows:
        raise HTTPException(status_code=404, detail="No results found for this run.")

    return {row["agent_name"]: row["result_json"] for row in rows}


@router.get("/employees/{submission_id}", response_model=list[EmployeeResponse])
def get_employees(submission_id: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, employee_name, employee_number, function, job_title, direct_manager
                FROM employees WHERE submission_id = %s ORDER BY employee_name
                """,
                (submission_id,),
            )
            rows = cur.fetchall()

    if not rows:
        raise HTTPException(status_code=404, detail="No employees found for this submission.")

    return [EmployeeResponse(**dict(r)) for r in rows]


@router.get("/activities/{employee_id}", response_model=list[ActivityResponse])
def get_activities(employee_id: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, row_index, description, frequency, pct_time,
                       output_deliverable, who_uses_it, value_type, if_stopped, can_be_automated
                FROM activities WHERE employee_id = %s ORDER BY row_index
                """,
                (employee_id,),
            )
            rows = cur.fetchall()

    return [ActivityResponse(**dict(r)) for r in rows]
