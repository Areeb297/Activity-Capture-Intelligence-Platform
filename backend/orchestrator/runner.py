"""
Orchestrator — fan-out / fan-in multi-agent runner.

Flow:
  1. Fetch all activities + embeddings from DB
  2. Run DuplicationAgent, AutomationAgent, ResourceAgent in parallel (asyncio)
  3. When all three complete → run NarrativeAgent
  4. Write all results to agent_results; update analysis_runs status throughout

Agents are CPU/IO-bound (LLM calls), so we use asyncio.to_thread() to run
them without blocking the FastAPI event loop.
"""
from __future__ import annotations

import asyncio
import logging
import time
import traceback
from uuid import UUID

from db.connection import get_conn
from tools.db_tools import (
    fetch_activities_for_submission,
    fetch_similar_activity_pairs,
    update_activity_embedding,
    update_run_status,
    update_agent_status,
    insert_agent_result,
)
from tools.embedding import embed_batch

from agents.duplication_agent import DuplicationAgent
from agents.automation_agent import AutomationAgent
from agents.resource_agent import ResourceAgent
from agents.narrative_agent import NarrativeAgent
from agents.collaboration_agent import CollaborationAgent

log = logging.getLogger("activity_analyser")


# ── Embedding step ─────────────────────────────────────────────────────────────

async def generate_and_store_embeddings(submission_id: str) -> None:
    """
    Embed all activity descriptions for a submission that don't have embeddings yet.
    Batches the API calls for efficiency.
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT a.id, a.description FROM activities a
                JOIN employees e ON e.id = a.employee_id
                WHERE e.submission_id = %s AND a.embedding IS NULL
                """,
                (submission_id,),
            )
            rows = cur.fetchall()

    if not rows:
        log.info("[embeddings] All activities already embedded — skipping.")
        return

    log.info("[embeddings] Embedding %d activities via OpenRouter...", len(rows))
    t0 = time.time()

    ids = [str(r[0]) for r in rows]
    texts = [r[1] for r in rows]

    embeddings = await embed_batch(texts)

    with get_conn() as conn:
        for activity_id, embedding in zip(ids, embeddings):
            update_activity_embedding(conn, activity_id, embedding)

    log.info("[embeddings] Done in %.1fs — stored %d vectors.", time.time() - t0, len(embeddings))


# ── Individual agent runners ───────────────────────────────────────────────────

def _run_duplication(run_id: str, submission_id: str) -> dict:
    log.info("[duplication] Fetching candidate pairs from DB...")
    with get_conn() as conn:
        pairs = fetch_similar_activity_pairs(conn, submission_id, threshold=0.70)
    log.info("[duplication] Found %d candidate pair(s) above 0.70 cosine threshold.", len(pairs))
    log.info("[duplication] Calling LLM to judge pairs...")
    t0 = time.time()
    agent = DuplicationAgent(run_id=run_id, candidate_pairs=pairs)
    result = agent.run()
    log.info("[duplication] Done in %.1fs.", time.time() - t0)
    return result


def _run_automation(run_id: str, activities: list[dict]) -> dict:
    log.info("[automation] Scoring %d activities via LLM...", len(activities))
    t0 = time.time()
    agent = AutomationAgent(run_id=run_id, activities=activities)
    result = agent.run()
    log.info("[automation] Done in %.1fs.", time.time() - t0)
    return result


def _run_resource(run_id: str, activities: list[dict]) -> dict:
    log.info("[resource] Analysing time allocation for %d activities via LLM...", len(activities))
    t0 = time.time()
    agent = ResourceAgent(run_id=run_id, activities=activities)
    result = agent.run()
    log.info("[resource] Done in %.1fs.", time.time() - t0)
    return result


def _run_collaboration(run_id: str, activities: list[dict]) -> dict:
    log.info("[collaboration] Mapping cross-department opportunities for %d activities...", len(activities))
    t0 = time.time()
    agent = CollaborationAgent(run_id=run_id, activities=activities)
    result = agent.run()
    log.info("[collaboration] Done in %.1fs.", time.time() - t0)
    return result


def _run_narrative(run_id: str, dup: dict, auto: dict, res: dict, collab: dict) -> dict:
    log.info("[narrative] Synthesising executive summary from all four agents...")
    t0 = time.time()
    agent = NarrativeAgent(
        run_id=run_id,
        duplication_result=dup,
        automation_result=auto,
        resource_result=res,
        collaboration_result=collab,
    )
    result = agent.run()
    log.info("[narrative] Done in %.1fs.", time.time() - t0)
    return result


# ── Main orchestration entry point ────────────────────────────────────────────

async def run_analysis(run_id: str, submission_id: str) -> None:
    """
    Full pipeline. Called as a background task from the /analyse endpoint.
    Updates analysis_runs status fields throughout.
    """
    t_start = time.time()
    log.info("=== Analysis started | run_id=%s | submission_id=%s ===", run_id, submission_id)

    def set_status(agent_name: str | None, status: str) -> None:
        with get_conn() as conn:
            if agent_name:
                update_agent_status(conn, run_id, agent_name, status)
            else:
                update_run_status(conn, run_id, status)

    def save_result(agent_name: str, result: dict) -> None:
        with get_conn() as conn:
            insert_agent_result(conn, run_id, agent_name, result)

    try:
        set_status(None, "running")

        # Step 1: embeddings (needed for duplication pre-filter)
        log.info("[step 1/3] Generating embeddings...")
        await generate_and_store_embeddings(submission_id)

        # Step 2: fetch activities once — shared by Automation, Resource, and Collaboration agents
        with get_conn() as conn:
            activities = fetch_activities_for_submission(conn, submission_id)
        log.info("[step 2/3] Fanning out — 4 agents running in parallel (%d activities)...", len(activities))
        set_status("duplication", "running")
        set_status("automation", "running")
        set_status("resource", "running")
        set_status("collaboration", "running")

        dup_task    = asyncio.to_thread(_run_duplication, run_id, submission_id)
        auto_task   = asyncio.to_thread(_run_automation, run_id, activities)
        res_task    = asyncio.to_thread(_run_resource, run_id, activities)
        collab_task = asyncio.to_thread(_run_collaboration, run_id, activities)

        results = await asyncio.gather(dup_task, auto_task, res_task, collab_task, return_exceptions=True)

        dup_result, auto_result, res_result, collab_result = results

        # Handle per-agent failures gracefully
        for name, result in [
            ("duplication",   dup_result),
            ("automation",    auto_result),
            ("resource",      res_result),
            ("collaboration", collab_result),
        ]:
            if isinstance(result, Exception):
                log.error("[%s] FAILED: %s", name, result, exc_info=result)
                set_status(name, "failed")
            else:
                log.info("[%s] complete — saving result.", name)
                set_status(name, "complete")
                save_result(name, result)

        # Step 3: Narrative — only if core three succeeded (collaboration failure is non-blocking)
        core_failed = any(isinstance(r, Exception) for r in [dup_result, auto_result, res_result])
        if core_failed:
            log.error("[step 3/3] Skipping narrative — one or more core agents failed.")
            set_status("narrative", "failed")
            set_status(None, "failed")
            return

        safe_collab = collab_result if not isinstance(collab_result, Exception) else {}
        log.info("[step 3/3] Running narrative agent...")
        set_status("narrative", "running")
        narrative_result = await asyncio.to_thread(
            _run_narrative, run_id, dup_result, auto_result, res_result, safe_collab
        )
        set_status("narrative", "complete")
        save_result("narrative", narrative_result)

        set_status(None, "complete")
        log.info("=== Analysis COMPLETE | run_id=%s | total=%.1fs ===", run_id, time.time() - t_start)

    except Exception:
        log.error("=== Analysis FAILED | run_id=%s ===", run_id, exc_info=True)
        traceback.print_exc()
        set_status(None, "failed")
