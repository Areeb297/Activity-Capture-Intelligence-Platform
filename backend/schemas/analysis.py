from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Literal


class AnalysisRunResponse(BaseModel):
    run_id: UUID
    submission_id: UUID
    status: Literal["pending", "running", "complete", "failed"]
    started_at: datetime
    completed_at: datetime | None
    duplication_status: str
    automation_status: str
    resource_status: str
    narrative_status: str
    collaboration_status: str = "pending"


class StartAnalysisResponse(BaseModel):
    run_id: UUID
    message: str
