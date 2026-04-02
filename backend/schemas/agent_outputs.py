"""
Pydantic models for structured agent outputs.
Each agent writes one of these as JSONB to agent_results.result_json.
"""
from pydantic import BaseModel
from typing import Literal


# ── Duplication Agent ──────────────────────────────────────────────────────────

class DuplicatePair(BaseModel):
    activity_id_a: str
    activity_id_b: str
    employee_id_a: str       # UUID of employee A — used for dashboard employee_id filter
    employee_id_b: str       # UUID of employee B — used for dashboard employee_id filter
    employee_a: str
    employee_b: str
    function_a: str
    function_b: str
    description_a: str
    description_b: str
    cosine_score: float
    duplicate_type: Literal["True Duplicate", "Partial Overlap", "Not a Duplicate"]
    recommended_owner: str | None
    consolidation_action: str | None
    reasoning: str


class DuplicationResult(BaseModel):
    total_pairs_evaluated: int
    confirmed_duplicates: list[DuplicatePair]
    summary: str


# ── Automation Agent ───────────────────────────────────────────────────────────

class AutomationScore(BaseModel):
    activity_id: str
    employee_id: str               # UUID of the employee — used for dashboard employee_id filter
    description: str = ""
    employee_name: str = ""
    function: str | None = None    # department/function the employee belongs to
    pct_time: float | None = None  # % of time spent on this activity
    frequency: str | None = None   # Daily / Weekly / Monthly / etc.
    automation_score: int = 0      # 0–100
    confidence: str = "Medium"     # High / Medium / Low
    suggested_tool: str | None = None   # e.g. "RPA / Power Automate", "Python script"
    reasoning: str = ""
    employee_said: str | None = None    # original Can Be Automated? value


class AutomationResult(BaseModel):
    scored_activities: list[AutomationScore]
    high_potential_count: int      # score >= 70
    summary: str


# ── Resource Agent ─────────────────────────────────────────────────────────────

class EmployeeTimeBreakdown(BaseModel):
    employee_id: str
    employee_name: str
    function: str
    job_title: str | None = None
    total_pct_accounted: float
    by_value_type: dict[str, float]   # {"Admin": 0.45, "Review": 0.30, ...}
    by_frequency: dict[str, float]    # {"Daily": 0.60, "Weekly": 0.25, ...}
    overloaded: bool                  # True if >60% time on Admin/Administer
    rebalancing_recommendation: str | None


class ResourceResult(BaseModel):
    employees: list[EmployeeTimeBreakdown]
    overloaded_count: int
    summary: str


# ── Collaboration Agent ────────────────────────────────────────────────────────

class CollaborationOpportunity(BaseModel):
    dept_a: str
    dept_b: str
    activity_a_description: str
    activity_b_description: str
    opportunity_type: Literal["Joint Ownership", "Dependency Gap", "Consolidation"]
    impact: Literal["High", "Medium", "Low"]
    suggested_action: str


class CollaborationResult(BaseModel):
    opportunities: list[CollaborationOpportunity]
    summary: str


# ── Narrative Agent ────────────────────────────────────────────────────────────

class ActionItem(BaseModel):
    priority: Literal["High", "Medium", "Low"]
    action: str
    owner_suggestion: str | None
    rationale: str


class NarrativeResult(BaseModel):
    executive_summary: str           # 3–5 paragraphs
    key_findings: list[str]          # bullet points
    action_items: list[ActionItem]   # prioritised list
