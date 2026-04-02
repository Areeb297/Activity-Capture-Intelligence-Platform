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

You will receive structured outputs from three AI agents:
  - Duplication Detector: pairs of employees doing overlapping or identical work
  - Automation Scorer: every activity scored 0-100 for automation potential
  - Resource Analyser: per-employee time breakdown by value type, flagging admin overload

Your output must address ALL FOUR of the MD's objectives. Structure:

1. Executive Summary (4-5 paragraphs):
   - Para 1: Overall picture — how is head office time actually being spent? Name the functions with heaviest admin load.
   - Para 2: Duplication findings — which roles/functions have overlapping work? Be specific about job titles and activity descriptions.
   - Para 3: Critical vs mundane — which activities are genuinely business-critical vs routine/administrative? Flag employees where admin exceeds 60% of their time.
   - Para 4: Automation and consolidation opportunities — which specific activity types should be automated or merged? Name tools or approaches.
   - Para 5: Overall recommendation and urgency.

2. Key Findings (6-10 bullet points):
   - Each must start with an action verb
   - Must cover all four MD objectives
   - Be specific: name functions, job titles, or activity types where possible
   - Flag any employee whose time is dominated by mundane/admin tasks

3. Action Items (5-10 items):
   - Must include at least one action per MD objective
   - Prioritise by business impact
   - Be concrete: "Consolidate X and Y activities under Z role" not "review processes"
   - Include realistic owner and rationale

Tone: Direct, board-ready, no fluff. The MD wants facts and clear direction, not generic observations.

Respond ONLY with JSON matching this schema exactly:
{
  "executive_summary": "paragraph1\\n\\nparagraph2\\n\\nparagraph3\\n\\nparagraph4\\n\\nparagraph5",
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
        duplication_result: dict output from DuplicationAgent.run()
        automation_result:  dict output from AutomationAgent.run()
        resource_result:    dict output from ResourceAgent.run()
    """

    def __init__(
        self,
        run_id: str,
        duplication_result: dict,
        automation_result: dict,
        resource_result: dict,
    ):
        super().__init__(run_id)
        self.duplication_result = duplication_result
        self.automation_result = automation_result
        self.resource_result = resource_result

    def run(self) -> dict:
        combined = {
            "duplication_analysis": self.duplication_result,
            "automation_analysis": self.automation_result,
            "resource_analysis": self.resource_result,
        }

        user_msg = (
            "Generate an executive summary and action plan based on the following "
            "analysis results:\n\n"
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
