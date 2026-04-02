"""
POST /upload

Accepts multiple .xlsx files (one per employee) uploaded as a batch.
Each file must have a "Survey" sheet — all Smpl-* sheets are ignored (template examples).

All files in one request are grouped under a single submission_id so that
the analysis agent can compare activities across all employees in the batch.

Returns:
  submission_id  — use this to call POST /analyse/{submission_id}
  files_accepted — how many files were successfully parsed
  files_skipped  — filenames that had no valid Survey sheet
  employee_count — total employees written to DB
  activity_count — total activities written to DB
"""
from __future__ import annotations

from datetime import datetime, timezone
from fastapi import APIRouter, UploadFile, File, HTTPException

from db.connection import get_conn
from parser.excel_parser import parse_workbook
from tools.db_tools import insert_submission, insert_employee, insert_activity

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("")
async def upload_files(files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    # Validate all are .xlsx before touching the DB
    for f in files:
        if not f.filename.endswith(".xlsx"):
            raise HTTPException(
                status_code=400,
                detail=f"'{f.filename}' is not an .xlsx file. Only Excel files accepted.",
            )

    parsed_employees = []
    skipped = []

    for f in files:
        file_bytes = await f.read()
        employee = parse_workbook(file_bytes)
        if employee is None:
            skipped.append(f.filename)
        else:
            employee.source_filename = f.filename   # attach filename for traceability
            parsed_employees.append(employee)

    if not parsed_employees:
        raise HTTPException(
            status_code=422,
            detail=(
                "None of the uploaded files contained a valid 'Survey' sheet with activity data. "
                f"Skipped: {skipped}"
            ),
        )

    # Write all employees from this batch under one submission
    batch_label = f"batch_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
    activity_count = 0

    with get_conn() as conn:
        submission_id = insert_submission(conn, batch_label)

        for emp in parsed_employees:
            employee_id = insert_employee(
                conn,
                submission_id,
                employee_name=emp.employee_name,
                employee_number=emp.employee_number,
                function=emp.function,
                job_title=emp.job_title,
                direct_manager=emp.direct_manager,
            )
            for act in emp.activities:
                insert_activity(
                    conn,
                    employee_id,
                    row_index=act.row_index,
                    description=act.description,
                    frequency=act.frequency,
                    pct_time=act.pct_time,
                    output_deliverable=act.output_deliverable,
                    who_uses_it=act.who_uses_it,
                    value_type=act.value_type,
                    if_stopped=act.if_stopped,
                    can_be_automated=act.can_be_automated,
                )
                activity_count += 1

    # Group employees by department/function for folder-tree UI
    departments: dict[str, list[str]] = {}
    for emp in parsed_employees:
        fn = emp.function or "Unassigned"
        departments.setdefault(fn, []).append(emp.employee_name or "Unknown")

    return {
        "submission_id": submission_id,
        "batch_label": batch_label,
        "files_accepted": len(parsed_employees),
        "files_skipped": skipped,
        "employee_count": len(parsed_employees),
        "activity_count": activity_count,
        "departments": departments,
        "next_step": f"POST /analyse/{submission_id}",
    }
