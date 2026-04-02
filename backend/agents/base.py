"""
Base agent class.

Each concrete agent:
  - Receives its input data via constructor (pre-fetched from DB)
  - Calls self._llm(prompt) to get a response via OpenRouter
  - Returns a Pydantic model as its result

Data flow:
  Orchestrator fetches data from DB → passes as plain Python dicts/lists to Agent.__init__
  Agent builds prompts from that data → calls LLM via OpenRouter → parses structured output
  Orchestrator writes result JSON to agent_results table

This keeps agents decoupled from the DB connection pool.

OpenRouter is OpenAI-SDK compatible — just a different base_url + api_key.
"""
from __future__ import annotations

import json
import re
from abc import ABC, abstractmethod

from json_repair import repair_json

from openai import OpenAI
from core.config import settings

# OpenRouter model ID — swap here to change model for all agents
# SPEED tier  (~5–15s per agent):
#   "google/gemini-2.5-flash"                ← fastest + smart, recommended
#   "google/gemini-2.0-flash-001"            ← very fast, reliable
#   "anthropic/claude-4.5-haiku-20251001"    ← fast Claude
# QUALITY tier (~25–60s per agent):
#   "anthropic/claude-4.6-sonnet-20260217"   ← Claude 4.6 Sonnet (slow but best)
#   "anthropic/claude-4.5-sonnet-20250929"   ← Claude 4.5 Sonnet
MODEL = "anthropic/claude-4.5-haiku-20251001"

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


class BaseAgent(ABC):
    """Abstract base for all analysis agents."""

    def __init__(self, run_id: str):
        self.run_id = run_id
        self._client = OpenAI(
            base_url=OPENROUTER_BASE_URL,
            api_key=settings.openrouter_api_key,
        )

    def _llm(self, system: str, user: str, max_tokens: int = 4096) -> str:
        """
        Call the LLM via OpenRouter. Returns the text content of the response.
        Uses standard OpenAI chat completions format — works with any OpenRouter model.
        """
        response = self._client.chat.completions.create(
            model=MODEL,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            extra_headers={
                "HTTP-Referer": "https://ebttikar.com",
                "X-Title": "Activity Analyser",
            },
        )
        return response.choices[0].message.content

    def _extract_json(self, text: str) -> dict | list:
        """
        Pull JSON out of a model response and repair common LLM formatting errors.
        Handles:
          - ```json ... ``` fences
          - Unescaped quotes inside string values (common with Haiku/Flash)
          - Trailing commas, truncated arrays
        """
        match = re.search(r"```(?:json)?\s*([\s\S]+?)```", text)
        raw = match.group(1).strip() if match else text.strip()
        repaired = repair_json(raw, return_objects=True)
        return repaired

    @abstractmethod
    def run(self) -> dict:
        """Execute the agent. Returns a plain dict (serialisable to JSONB)."""
        ...
