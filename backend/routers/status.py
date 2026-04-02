"""
GET /status/{run_id}

Returns current status of the analysis run — poll every 2-3 seconds from frontend.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from db.connection import get_conn
from tools.db_tools import fetch_run_status
from schemas.analysis import AnalysisRunResponse

router = APIRouter(prefix="/status", tags=["status"])


@router.get("/{run_id}", response_model=AnalysisRunResponse)
def get_status(run_id: str):
    with get_conn() as conn:
        row = fetch_run_status(conn, run_id)

    if not row:
        raise HTTPException(status_code=404, detail="Run not found.")

    return AnalysisRunResponse(**row)
