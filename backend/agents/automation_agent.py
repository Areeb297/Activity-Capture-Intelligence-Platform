"""
Automation Scorer Agent

Scores each activity on automation potential (0-100), ignoring the employee's
self-reported "Can Be Automated?" answer — Claude re-assesses independently.

Input: all activities for the submission (with full context rows)
Output: AutomationResult with per-activity scores
"""
from __future__ import annotations

import json
from agents.base import BaseAgent
from schemas.agent_outputs import AutomationScore, AutomationResult


SYSTEM_PROMPT = """You are an expert in business process automation and AI/RPA implementation.
You will receive a list of employee work activities from an activity capture exercise.

For each activity, independently assess its automation potential on a scale of 0 to 100:
  80-100: Highly automatable — repetitive, rule-based, structured data, low judgement required
  60-79:  Likely automatable — some complexity but clear patterns, good AI/RPA candidate
  40-59:  Partial automation — can be assisted but requires human review
  20-39:  Difficult to automate — high judgement, relationship-dependent, or creative
  0-19:   Not automatable — requires human presence, empathy, or unique expertise

Use ALL these signals (do NOT rely on the employee's own answer):
- activity description
- frequency (Daily activities are higher-value automation targets)
- output/deliverable (is the output structured? digital? rule-based?)
- value type (Admin/Administer activities often more automatable than Review/Control)
- "if stopped what happens" (high-impact + automatable = urgent priority)

Respond ONLY with a JSON array:
[
  {
    "activity_id": "...",
    "employee_id": "...",
    "description": "...",
    "employee_name": "...",
    "function": "...",
    "pct_time": 0.15,
    "frequency": "Daily | Weekly | Monthly | Quarterly | Ad-hoc",
    "automation_score": 75,
    "confidence": "High" | "Medium" | "Low",
    "suggested_tool": "RPA / Power Automate | Python script | AI agent | Not applicable | ...",
    "reasoning": "...",
    "employee_said": "Yes | No | Not sure | Partial | null"
  }
]

Copy "employee_id", "function", "pct_time", and "frequency" directly from the input activity — do not modify them.
Include every activity in the response, even if score is 0.
"""


class AutomationAgent(BaseAgent):
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
            result = AutomationResult(
                scored_activities=[],
                high_potential_count=0,
                summary="No activities found to score.",
            )
            return result.model_dump()

        # Strip the embedding field before sending to LLM (not useful, wastes tokens)
        clean_activities = [
            {k: v for k, v in a.items() if k != "embedding"}
            for a in self.activities
        ]

        user_msg = (
            f"Score the following {len(clean_activities)} activities for automation potential.\n\n"
            f"ACTIVITIES:\n{json.dumps(clean_activities, indent=2, default=str)}"
        )

        raw = self._llm(SYSTEM_PROMPT, user_msg, max_tokens=8192)
        scores_raw = self._extract_json(raw)
        if not isinstance(scores_raw, list):
            scores_raw = []

        scored = [AutomationScore(**s) for s in scores_raw if isinstance(s, dict)]
        high_potential = sum(1 for s in scored if s.automation_score >= 70)

        summary = (
            f"Scored {len(scored)} activities. "
            f"{high_potential} have high automation potential (score ≥ 70)."
        )

        result = AutomationResult(
            scored_activities=scored,
            high_potential_count=high_potential,
            summary=summary,
        )
        return result.model_dump()
