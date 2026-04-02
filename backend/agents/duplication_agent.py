"""
Duplication Detector Agent

Two-stage pipeline:
  1. Pre-filter  — pgvector cosine similarity ≥ 0.70 → candidate pairs (cheap, SQL)
  2. LLM judge   — Claude evaluates each pair with full context rows

The cosine score is passed to Claude as *one signal*, not a verdict.
Claude decides: True Duplicate | Partial Overlap | Not a Duplicate
"""
from __future__ import annotations

import json
from agents.base import BaseAgent
from schemas.agent_outputs import DuplicatePair, DuplicationResult


SYSTEM_PROMPT = """You are an expert organisational analyst reviewing employee activity data
to identify genuine duplicated work across roles and departments.

You will receive candidate pairs of activities that have high textual similarity.
Your job is to judge whether they represent actual duplicate work, partial overlap, or just similar wording.

For each pair, consider:
- Are these truly the same task being done by two different people?
- Could the difference in function/department make them legitimately different?
- Does the output/deliverable confirm or deny duplication?
- What would be the impact of consolidating them?

The cosine similarity score is a starting hint — do NOT treat it as a verdict.
Two activities in the same team with score 0.71 may be a real duplicate.
Two activities in different departments with score 0.85 may be legitimate parallel work.

Respond ONLY with a JSON array of objects matching this schema exactly:
[
  {
    "activity_id_a": "...",
    "activity_id_b": "...",
    "employee_id_a": "...",
    "employee_id_b": "...",
    "employee_a": "...",
    "employee_b": "...",
    "function_a": "...",
    "function_b": "...",
    "description_a": "...",
    "description_b": "...",
    "cosine_score": 0.0,
    "duplicate_type": "True Duplicate" | "Partial Overlap" | "Not a Duplicate",
    "recommended_owner": "...",
    "consolidation_action": "...",
    "reasoning": "..."
  }
]

Copy "employee_id_a" and "employee_id_b" directly from the input pair — do not modify them.

Include ALL pairs in the response, including those you classify as Not a Duplicate.
"""


class DuplicationAgent(BaseAgent):
    """
    Receives candidate pairs (pre-filtered by pgvector) and LLM-judges each.

    Args:
        run_id: The analysis run UUID.
        candidate_pairs: List of dicts from tools.db_tools.fetch_similar_activity_pairs().
                         Each dict has activity_id_a/b, employee_id_a/b, descriptions,
                         employee info, and cosine_score.
    """

    def __init__(self, run_id: str, candidate_pairs: list[dict]):
        super().__init__(run_id)
        self.candidate_pairs = candidate_pairs

    def run(self) -> dict:
        if not self.candidate_pairs:
            result = DuplicationResult(
                total_pairs_evaluated=0,
                confirmed_duplicates=[],
                summary="No candidate pairs found — all activities appear unique.",
            )
            return result.model_dump()

        # Build the user message with all pairs as structured JSON context
        user_msg = (
            f"Analyse the following {len(self.candidate_pairs)} candidate activity pairs "
            f"for duplication. Each pair was flagged by cosine similarity.\n\n"
            f"CANDIDATE PAIRS:\n{json.dumps(self.candidate_pairs, indent=2, default=str)}"
        )

        raw = self._llm(SYSTEM_PROMPT, user_msg, max_tokens=8192)
        judgements = self._extract_json(raw)
        if not isinstance(judgements, list):
            judgements = []

        confirmed = [
            DuplicatePair(**j)
            for j in judgements
            if isinstance(j, dict) and j.get("duplicate_type") in ("True Duplicate", "Partial Overlap")
        ]

        true_dups = sum(1 for p in confirmed if p.duplicate_type == "True Duplicate")
        partial = sum(1 for p in confirmed if p.duplicate_type == "Partial Overlap")

        summary = (
            f"Evaluated {len(self.candidate_pairs)} candidate pairs. "
            f"Found {true_dups} true duplicate(s) and {partial} partial overlap(s)."
        )

        result = DuplicationResult(
            total_pairs_evaluated=len(self.candidate_pairs),
            confirmed_duplicates=confirmed,
            summary=summary,
        )
        return result.model_dump()
