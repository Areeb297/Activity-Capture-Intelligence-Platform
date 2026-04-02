"""
POST /analyse/{submission_id}

Kicks off the multi-agent pipeline as a background task.
Returns run_id immediately — client polls /status/{run_id}.
"""
from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, HTTPException

from db.connection import get_conn
from tools.db_tools import create_analysis_run, submission_exists
from orchestrator.runner import run_analysis
from schemas.analysis import StartAnalysisResponse

router = APIRouter(prefix="/analyse", tags=["analyse"])


@router.post("/{submission_id}", response_model=StartAnalysisResponse)
async def start_analysis(submission_id: str, background_tasks: BackgroundTasks):
    with get_conn() as conn:
        if not submission_exists(conn, submission_id):
            raise HTTPException(status_code=404, detail="Submission not found.")
        run_id = create_analysis_run(conn, submission_id)

    background_tasks.add_task(run_analysis, run_id, submission_id)

    return StartAnalysisResponse(
        run_id=run_id,
        message="Analysis started. Poll /status/{run_id} to track progress.",
    )
