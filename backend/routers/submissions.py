"""
GET  /submissions          — list all past submissions with their latest run
DELETE /submissions/{id}   — delete a submission and all associated data
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
import psycopg2.extras

from db.connection import get_conn

router = APIRouter(prefix="/submissions", tags=["submissions"])


@router.get("")
def list_submissions():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    s.id                  AS submission_id,
                    s.filename            AS batch_label,
                    s.uploaded_at,
                    COUNT(DISTINCT e.id)  AS employee_count,
                    COUNT(DISTINCT a.id)  AS activity_count,
                    r.id                  AS run_id,
                    r.status,
                    r.duplication_status,
                    r.automation_status,
                    r.resource_status,
                    r.narrative_status,
                    r.started_at,
                    r.completed_at
                FROM submissions s
                LEFT JOIN employees e ON e.submission_id = s.id
                LEFT JOIN activities a ON a.employee_id = e.id
                LEFT JOIN LATERAL (
                    SELECT id, status, duplication_status, automation_status,
                           resource_status, narrative_status, started_at, completed_at
                    FROM analysis_runs
                    WHERE submission_id = s.id
                    ORDER BY started_at DESC
                    LIMIT 1
                ) r ON true
                GROUP BY s.id, s.filename, s.uploaded_at,
                         r.id, r.status, r.duplication_status, r.automation_status,
                         r.resource_status, r.narrative_status, r.started_at, r.completed_at
                ORDER BY s.uploaded_at DESC
                """,
            )
            return [dict(row) for row in cur.fetchall()]


@router.delete("/{submission_id}")
def delete_submission(submission_id: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM submissions WHERE id = %s", (submission_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Submission not found.")

            cur.execute(
                "DELETE FROM agent_results WHERE run_id IN "
                "(SELECT id FROM analysis_runs WHERE submission_id = %s)",
                (submission_id,),
            )
            cur.execute("DELETE FROM analysis_runs WHERE submission_id = %s", (submission_id,))
            cur.execute(
                "DELETE FROM activities WHERE employee_id IN "
                "(SELECT id FROM employees WHERE submission_id = %s)",
                (submission_id,),
            )
            cur.execute("DELETE FROM employees WHERE submission_id = %s", (submission_id,))
            cur.execute("DELETE FROM submissions WHERE id = %s", (submission_id,))
        conn.commit()

    return {"deleted": submission_id}
