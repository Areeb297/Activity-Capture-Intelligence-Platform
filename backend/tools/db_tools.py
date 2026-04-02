"""
Reusable DB query helpers used by agents and routers.

All queries use psycopg2 parameterised placeholders (%s).
No string interpolation — safe against SQL injection.

Agents never hold a raw connection. They call these functions,
passing a `conn` obtained from db.connection.get_conn().
"""
from __future__ import annotations

from uuid import UUID
import psycopg2.extras


# ── Submission helpers ─────────────────────────────────────────────────────────

def submission_exists(conn, submission_id: str) -> bool:
    """Return True if a submission with this UUID exists."""
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM submissions WHERE id = %s", (submission_id,))
        return cur.fetchone() is not None


def insert_submission(conn, filename: str) -> str:
    """Insert a new submission row and return its UUID string."""
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO submissions (filename) VALUES (%s) RETURNING id",
            (filename,),
        )
        return str(cur.fetchone()[0])


def insert_employee(conn, submission_id: str, **fields) -> str:
    """Insert an employee row and return its UUID string."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO employees
                (submission_id, employee_name, employee_number, function, job_title, direct_manager)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                submission_id,
                fields.get("employee_name"),
                fields.get("employee_number"),
                fields.get("function"),
                fields.get("job_title"),
                fields.get("direct_manager"),
            ),
        )
        return str(cur.fetchone()[0])


def insert_activity(conn, employee_id: str, **fields) -> str:
    """Insert an activity row (without embedding) and return its UUID string."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO activities
                (employee_id, row_index, description, frequency, pct_time,
                 output_deliverable, who_uses_it, value_type, if_stopped, can_be_automated)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                employee_id,
                fields["row_index"],
                fields["description"],
                fields.get("frequency"),
                fields.get("pct_time"),
                fields.get("output_deliverable"),
                fields.get("who_uses_it"),
                fields.get("value_type"),
                fields.get("if_stopped"),
                fields.get("can_be_automated"),
            ),
        )
        return str(cur.fetchone()[0])


def update_activity_embedding(conn, activity_id: str, embedding: list[float]) -> None:
    """Store the embedding vector for an activity row."""
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE activities SET embedding = %s::vector WHERE id = %s",
            (str(embedding), activity_id),
        )


# ── Run helpers ────────────────────────────────────────────────────────────────

def create_analysis_run(conn, submission_id: str) -> str:
    """Create a new analysis_runs row and return its UUID string."""
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO analysis_runs (submission_id, status) VALUES (%s, 'pending') RETURNING id",
            (submission_id,),
        )
        return str(cur.fetchone()[0])


def update_run_status(conn, run_id: str, status: str) -> None:
    sql = "UPDATE analysis_runs SET status = %s WHERE id = %s"
    if status == "complete":
        sql = "UPDATE analysis_runs SET status = %s, completed_at = now() WHERE id = %s"
    with conn.cursor() as cur:
        cur.execute(sql, (status, run_id))


def update_agent_status(conn, run_id: str, agent_name: str, status: str) -> None:
    """Update the per-agent status column in analysis_runs."""
    col = f"{agent_name}_status"
    allowed = {"duplication_status", "automation_status", "resource_status", "narrative_status", "collaboration_status"}
    if col not in allowed:
        raise ValueError(f"Unknown agent status column: {col}")
    with conn.cursor() as cur:
        cur.execute(f"UPDATE analysis_runs SET {col} = %s WHERE id = %s", (status, run_id))


def insert_agent_result(conn, run_id: str, agent_name: str, result_json: dict) -> None:
    """Upsert agent result JSON into agent_results."""
    import json
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO agent_results (run_id, agent_name, result_json)
            VALUES (%s, %s, %s)
            ON CONFLICT DO NOTHING
            """,
            (run_id, agent_name, json.dumps(result_json)),
        )


# ── Query helpers (used by agents) ────────────────────────────────────────────

def fetch_activities_for_submission(conn, submission_id: str) -> list[dict]:
    """Return all activity rows for a submission, joined with employee info."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                a.id, a.row_index, a.description, a.frequency, a.pct_time,
                a.output_deliverable, a.who_uses_it, a.value_type,
                a.if_stopped, a.can_be_automated,
                e.id AS employee_id, e.employee_name, e.function, e.job_title
            FROM activities a
            JOIN employees e ON e.id = a.employee_id
            WHERE e.submission_id = %s
            ORDER BY e.id, a.row_index
            """,
            (submission_id,),
        )
        return [dict(row) for row in cur.fetchall()]


def fetch_similar_activity_pairs(
    conn, submission_id: str, threshold: float = 0.70
) -> list[dict]:
    """
    Use pgvector cosine similarity to find candidate duplicate pairs.
    Returns pairs with cosine_score >= threshold (wide net — LLM judges later).
    Only returns pairs where the two activities are from different employees.
    """
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                a1.id AS activity_id_a,
                a2.id AS activity_id_b,
                e1.id AS employee_id_a,
                e2.id AS employee_id_b,
                a1.description AS description_a,
                a2.description AS description_b,
                e1.employee_name AS employee_a,
                e2.employee_name AS employee_b,
                e1.function AS function_a,
                e2.function AS function_b,
                a1.frequency AS frequency_a,
                a2.frequency AS frequency_b,
                a1.value_type AS value_type_a,
                a2.value_type AS value_type_b,
                a1.output_deliverable AS output_a,
                a2.output_deliverable AS output_b,
                1 - (a1.embedding <=> a2.embedding) AS cosine_score
            FROM activities a1
            JOIN activities a2 ON a1.id < a2.id
            JOIN employees e1 ON e1.id = a1.employee_id
            JOIN employees e2 ON e2.id = a2.employee_id
            WHERE e1.submission_id = %s
              AND e2.submission_id = %s
              AND e1.id != e2.id
              AND a1.embedding IS NOT NULL
              AND a2.embedding IS NOT NULL
              AND 1 - (a1.embedding <=> a2.embedding) >= %s
            ORDER BY cosine_score DESC
            """,
            (submission_id, submission_id, threshold),
        )
        return [dict(row) for row in cur.fetchall()]


def fetch_run_status(conn, run_id: str) -> dict | None:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id AS run_id, submission_id, status, started_at, completed_at,
                   duplication_status, automation_status, resource_status, narrative_status,
                   COALESCE(collaboration_status, 'pending') AS collaboration_status
            FROM analysis_runs WHERE id = %s
            """,
            (run_id,),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def fetch_agent_results(conn, run_id: str) -> list[dict]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT agent_name, result_json, created_at FROM agent_results WHERE run_id = %s",
            (run_id,),
        )
        return [dict(row) for row in cur.fetchall()]
