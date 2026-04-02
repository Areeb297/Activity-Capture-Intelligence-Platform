"""
Collaboration Mapper Agent

Analyses all activities grouped by department/function to identify:
1. Activities across departments that should be jointly owned
2. Dependency gaps — where one dept relies on another's output with no coordination
3. Siloed complementary work that could be consolidated
4. Quick-win cross-department collaboration opportunities

Aligned to MD objectives 2 (duplication/complexity) and 4 (consolidation).
"""
from __future__ import annotations

import json
from agents.base import BaseAgent
from schemas.agent_outputs import CollaborationOpportunity, CollaborationResult


SYSTEM_PROMPT = """You are an organisational design expert reviewing cross-departmental work patterns.

You will receive all employee activities grouped by department/function.

Your task: identify concrete collaboration opportunities across departments. Look for:
1. Activities in different departments that produce similar outputs or serve the same stakeholders
2. Activities that clearly depend on another department's deliverable but have no coordination mechanism
3. Complementary work happening in silos that could be streamlined with a shared process or owner
4. Quick-win consolidations where two departments are duplicating administrative effort

RULES:
- Only flag real opportunities — do NOT generate generic management advice
- Be specific: name the actual activity descriptions, not vague categories
- If departments have very different functions with no overlap, say so and return an empty list
- Maximum 8 opportunities — quality over quantity

Respond ONLY with a JSON array:
[
  {
    "dept_a": "Healthcare Digitization",
    "dept_b": "Finance",
    "activity_a_description": "Prepare weekly status report for project tracking",
    "activity_b_description": "Compile project cost tracker for weekly finance review",
    "opportunity_type": "Joint Ownership" | "Dependency Gap" | "Consolidation",
    "impact": "High" | "Medium" | "Low",
    "suggested_action": "Merge both reports into a single cross-functional weekly update owned by PMO"
  }
]

opportunity_type definitions:
- Joint Ownership: two departments doing the same task independently — should have one owner
- Dependency Gap: dept A produces something dept B needs, but no formal handover exists
- Consolidation: similar processes in two departments that could be merged into one shared workflow
"""


class CollaborationAgent(BaseAgent):
    """
    Args:
        run_id:     The analysis run UUID.
        activities: List of activity dicts from fetch_activities_for_submission().
    """

    def __init__(self, run_id: str, activities: list[dict]):
        super().__init__(run_id)
        self.activities = activities

    def run(self) -> dict:
        if not self.activities:
            result = CollaborationResult(
                opportunities=[],
                summary="No activities found to analyse.",
            )
            return result.model_dump()

        # Group activities by function/department
        by_dept: dict[str, list[dict]] = {}
        for a in self.activities:
            fn = a.get("function") or "Unassigned"
            by_dept.setdefault(fn, []).append({
                "employee": a.get("employee_name"),
                "description": a.get("description"),
                "frequency": a.get("frequency"),
                "value_type": a.get("value_type"),
                "who_uses_it": a.get("who_uses_it"),
                "output_deliverable": a.get("output_deliverable"),
            })

        if len(by_dept) < 2:
            result = CollaborationResult(
                opportunities=[],
                summary="Only one department present — cross-department analysis not applicable.",
            )
            return result.model_dump()

        user_msg = (
            f"Identify cross-department collaboration opportunities for the following "
            f"{len(by_dept)} departments. Be specific and concrete.\n\n"
            f"ACTIVITIES BY DEPARTMENT:\n{json.dumps(by_dept, indent=2, default=str)}"
        )

        raw = self._llm(SYSTEM_PROMPT, user_msg, max_tokens=4096)
        items_raw = self._extract_json(raw)
        if not isinstance(items_raw, list):
            items_raw = []

        opportunities = [
            CollaborationOpportunity(**item)
            for item in items_raw
            if isinstance(item, dict)
        ]

        high_count = sum(1 for o in opportunities if o.impact == "High")
        summary = (
            f"Identified {len(opportunities)} cross-department collaboration "
            f"opportunities across {len(by_dept)} departments. "
            f"{high_count} rated High impact."
        )

        result = CollaborationResult(
            opportunities=opportunities,
            summary=summary,
        )
        return result.model_dump()
