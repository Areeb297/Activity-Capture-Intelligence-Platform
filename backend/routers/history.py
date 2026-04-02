"""
GET /history — analysis history, served at /history for frontend compatibility.
"""
from __future__ import annotations

from fastapi import APIRouter
import psycopg2.extras

from db.connection import get_conn

router = APIRouter(prefix="/history", tags=["history"])


@router.get("")
def list_history():
    """Return all submissions ordered newest-first with their latest run status."""
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
