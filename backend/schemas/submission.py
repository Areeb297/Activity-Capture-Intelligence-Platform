from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class SubmissionResponse(BaseModel):
    submission_id: UUID
    filename: str
    uploaded_at: datetime
    employee_count: int
    activity_count: int


class EmployeeResponse(BaseModel):
    id: UUID
    employee_name: str | None
    employee_number: str | None
    function: str | None
    job_title: str | None
    direct_manager: str | None


class ActivityResponse(BaseModel):
    id: UUID
    row_index: int
    description: str
    frequency: str | None
    pct_time: float | None
    output_deliverable: str | None
    who_uses_it: str | None
    value_type: str | None
    if_stopped: str | None
    can_be_automated: str | None
