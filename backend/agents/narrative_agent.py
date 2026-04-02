"""
Narrative Synthesiser Agent

Fires only after Duplication, Automation, and Resource agents all complete.
Receives all three JSON outputs, generates an executive summary and action list.
"""
from __future__ import annotations

import json
from agents.base import BaseAgent
from schemas.agent_outputs import ActionItem, NarrativeResult


SYSTEM_PROMPT = """You are a senior management consultant preparing a Head Office Role & Activity Review report for the Managing Director of Ebttikar.

The MD launched this exercise to understand four specific things:
  1. How time and effort are currently being spent across head office functions
  2. Where there may be duplication or unnecessary complexity
  3. Which activities are critical to business performance and control (vs mundane/admin)
  4. Where simplification, automation, or consolidation may be possible

You will receive structured outputs from four AI agents:
  - Duplication Detector: pairs of employees doing overlapping or identical work
  - Automation Scorer: every activity scored 0-100 for automation potential
  - Resource Analyser: per-employee time breakdown by value type, flagging admin overload
  - Collaboration Mapper: cross-department coordination gaps and joint-ownership opportunities

CRITICAL TONE AND FORMAT RULES:
- Each paragraph: 2-3 sentences MAX. No waffle. No filler.
- Name specific job titles, functions, and activity types. Never be generic.
- Board-ready: the MD wants facts and numbers, not management-speak.
- executive_summary field must be valid HTML using only: <p>, <strong>, <ul>, <li>. NO other tags.

Your output must address ALL FOUR MD objectives. Structure:

1. Executive Summary — 5 short HTML paragraphs:
   - Para 1 (<p>): <strong>Time allocation:</strong> How is time actually split across functions? Name the functions with heaviest admin load and give the %-split if available.
   - Para 2 (<p>): <strong>Duplication:</strong> Which specific job titles / function pairs have overlapping work? State the cosine score and activity description.
   - Para 3 (<p>): <strong>Critical vs mundane:</strong> Which activities are genuinely business-critical? Name any employee where admin exceeds 60% of their time.
   - Para 4 (<p>): <strong>Automation & cross-department gaps:</strong> Name the highest-scoring automation activities and any cross-department collaboration opportunities identified.
   - Para 5 (<p>): <strong>Recommendation:</strong> One clear sentence on urgency and top priority action.

2. Key Findings (6-10 bullets):
   - Each starts with an action verb
   - Covers all four MD objectives
   - Names functions, job titles, or activity types

3. Action Items (5-10 items):
   - At least one per MD objective
   - Concrete: "Consolidate X and Y under Z role" not "review processes"
   - Prioritised by business impact

Respond ONLY with JSON matching this schema exactly:
{
  "executive_summary": "<p><strong>Time allocation:</strong> ...</p><p><strong>Duplication:</strong> ...</p><p><strong>Critical vs mundane:</strong> ...</p><p><strong>Automation &amp; cross-department gaps:</strong> ...</p><p><strong>Recommendation:</strong> ...</p>",
  "key_findings": ["Finding one", "Finding two"],
  "action_items": [
    {
      "priority": "High" | "Medium" | "Low",
      "action": "...",
      "owner_suggestion": "HR / IT / Department Manager / MD / ...",
      "rationale": "..."
    }
  ]
}
"""


class NarrativeAgent(BaseAgent):
    """
    Args:
        run_id: The analysis run UUID.
        duplication_result:   dict output from DuplicationAgent.run()
        automation_result:    dict output from AutomationAgent.run()
        resource_result:      dict output from ResourceAgent.run()
        collaboration_result: dict output from CollaborationAgent.run() (optional)
    """

    def __init__(
        self,
        run_id: str,
        duplication_result: dict,
        automation_result: dict,
        resource_result: dict,
        collaboration_result: dict | None = None,
    ):
        super().__init__(run_id)
        self.duplication_result = duplication_result
        self.automation_result = automation_result
        self.resource_result = resource_result
        self.collaboration_result = collaboration_result or {}

    def run(self) -> dict:
        combined = {
            "duplication_analysis": self.duplication_result,
            "automation_analysis": self.automation_result,
            "resource_analysis": self.resource_result,
            "collaboration_analysis": self.collaboration_result,
        }

        user_msg = (
            "Generate an executive summary and action plan based on the following "
            "analysis results. Remember: HTML format, 2-3 sentences per paragraph, "
            "specific names and numbers only.\n\n"
            f"{json.dumps(combined, indent=2, default=str)}"
        )

        raw = self._llm(SYSTEM_PROMPT, user_msg, max_tokens=4096)
        data = self._extract_json(raw)
        if not isinstance(data, dict):
            data = {}

        action_items = [
            ActionItem(**a)
            for a in data.get("action_items", [])
            if isinstance(a, dict)
        ]

        result = NarrativeResult(
            executive_summary=data.get("executive_summary", ""),
            key_findings=data.get("key_findings", []),
            action_items=action_items,
        )
        return result.model_dump()
