"""
Resource Allocation Analyser Agent

SQL-aggregates % time by Value Type and Frequency per employee,
then passes the breakdown to Claude for interpretation and rebalancing recommendations.

Flags employees where >60% of time is spent on Admin/Administer activities.
"""
from __future__ import annotations

import json
from collections import defaultdict
from agents.base import BaseAgent
from schemas.agent_outputs import EmployeeTimeBreakdown, ResourceResult


SYSTEM_PROMPT = """You are an organisational effectiveness consultant.
You will receive a breakdown of how employees allocate their time across work activities,
grouped by value type (Review, Control, Admin, Administer) and frequency.

Your job:
1. Interpret the time distribution for each employee
2. Identify employees who are overloaded with low-value or administrative work
3. Suggest practical rebalancing recommendations

An employee is considered overloaded if >60% of their time is on Admin/Administer activities.
Frame recommendations constructively — what should be delegated, automated, or eliminated?

Respond ONLY with a JSON array:
[
  {
    "employee_id": "...",
    "employee_name": "...",
    "function": "...",
    "job_title": "...",
    "total_pct_accounted": 0.85,
    "by_value_type": {"Admin": 0.45, "Review": 0.30, "Control": 0.10},
    "by_frequency": {"Daily": 0.60, "Weekly": 0.25},
    "overloaded": true,
    "rebalancing_recommendation": "..."
  }
]

Copy "job_title" directly from the input employee data — do not modify it.
"""


def _aggregate_employee(activities: list[dict]) -> dict:
    """
    Compute time breakdowns from a list of activity dicts for one employee.
    Returns a dict ready to pass to the LLM.
    """
    by_value_type: dict[str, float] = defaultdict(float)
    by_frequency: dict[str, float] = defaultdict(float)
    total = 0.0

    for a in activities:
        pct = float(a.get("pct_time") or 0)
        vt = a.get("value_type") or "Unknown"
        freq = a.get("frequency") or "Unknown"
        by_value_type[vt] += pct
        by_frequency[freq] += pct
        total += pct

    admin_pct = by_value_type.get("Admin", 0) + by_value_type.get("Administer", 0)
    overloaded = admin_pct > 0.60

    return {
        "employee_id": activities[0]["employee_id"],
        "employee_name": activities[0]["employee_name"],
        "function": activities[0]["function"],
        "job_title": activities[0].get("job_title"),
        "total_pct_accounted": round(total, 4),
        "by_value_type": {k: round(v, 4) for k, v in by_value_type.items()},
        "by_frequency": {k: round(v, 4) for k, v in by_frequency.items()},
        "overloaded": overloaded,
        "raw_activities": [
            {
                "description": a["description"],
                "pct_time": a.get("pct_time"),
                "value_type": a.get("value_type"),
                "frequency": a.get("frequency"),
            }
            for a in activities
        ],
    }


class ResourceAgent(BaseAgent):
    """
    Args:
        run_id: The analysis run UUID.
        activities: List of activity dicts from tools.db_tools.fetch_activities_for_submission().
    """

    def __init__(self, run_id: str, activities: list[dict]):
        super().__init__(run_id)
        self.activities = activities

    def run(self) -> dict:
        if not self.activities:
            result = ResourceResult(employees=[], overloaded_count=0, summary="No activities found.")
            return result.model_dump()

        # Group activities by employee
        by_employee: dict[str, list[dict]] = defaultdict(list)
        for a in self.activities:
            by_employee[a["employee_id"]].append(a)

        employee_summaries = [_aggregate_employee(acts) for acts in by_employee.values()]

        user_msg = (
            f"Analyse the time allocation for {len(employee_summaries)} employee(s). "
            f"Provide rebalancing recommendations where needed.\n\n"
            f"EMPLOYEE DATA:\n{json.dumps(employee_summaries, indent=2, default=str)}"
        )

        raw = self._llm(SYSTEM_PROMPT, user_msg, max_tokens=4096)
        breakdowns_raw = self._extract_json(raw)
        if not isinstance(breakdowns_raw, list):
            breakdowns_raw = []

        breakdowns = [EmployeeTimeBreakdown(**b) for b in breakdowns_raw if isinstance(b, dict)]
        overloaded_count = sum(1 for b in breakdowns if b.overloaded)

        summary = (
            f"Analysed {len(breakdowns)} employee(s). "
            f"{overloaded_count} flagged as overloaded (>60% time on Admin/Administer)."
        )

        result = ResourceResult(
            employees=breakdowns,
            overloaded_count=overloaded_count,
            summary=summary,
        )
        return result.model_dump()
