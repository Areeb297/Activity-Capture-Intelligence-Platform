// ─── Upload ────────────────────────────────────────────────────────────────

export interface UploadResponse {
  submission_id: string;
  batch_label: string;
  files_accepted: number;
  files_skipped: string[];
  employee_count: number;
  activity_count: number;
  departments: Record<string, string[]>;
}

// ─── Status ────────────────────────────────────────────────────────────────

export type AgentStatus = "pending" | "running" | "complete" | "failed";

export interface RunStatus {
  run_id: string;
  status: AgentStatus;
  duplication_status: AgentStatus;
  automation_status: AgentStatus;
  resource_status: AgentStatus;
  narrative_status: AgentStatus;
  collaboration_status: AgentStatus;
  started_at: string;
  completed_at: string | null;
}

// ─── Results ───────────────────────────────────────────────────────────────

export interface DuplicationPair {
  activity_id_a: string;
  activity_id_b: string;
  employee_a: string;
  function_a: string;
  description_a: string;
  employee_b: string;
  function_b: string;
  description_b: string;
  cosine_score: number;
  duplicate_type: "True Duplicate" | "Partial Overlap" | "Not a Duplicate";
  recommended_owner: string | null;
  consolidation_action: string | null;
  reasoning: string;
}

export interface AutomationActivity {
  activity_id: string;
  description: string;
  employee_name: string;
  function: string | null;
  pct_time: number | null;
  frequency: string | null;
  automation_score: number;
  confidence: "High" | "Medium" | "Low";
  suggested_tool: string | null;
  reasoning: string;
  employee_said: string | null;
}

export interface ResourceEmployee {
  employee_id: string;
  employee_name: string;
  function: string;
  job_title: string | null;
  total_pct_accounted: number;
  by_value_type: Record<string, number>;
  by_frequency: Record<string, number>;
  overloaded: boolean;
  rebalancing_recommendation: string | null;
}

export interface ActionItem {
  priority: "High" | "Medium" | "Low";
  action: string;
  owner_suggestion: string | null;
  rationale: string;
}

export interface CollaborationOpportunity {
  dept_a: string;
  dept_b: string;
  activity_a_description: string;
  activity_b_description: string;
  opportunity_type: "Joint Ownership" | "Dependency Gap" | "Consolidation";
  impact: "High" | "Medium" | "Low";
  suggested_action: string;
}

export interface Results {
  run_id: string;
  duplication: DuplicationPair[];
  automation: AutomationActivity[];
  resource: ResourceEmployee[];
  collaboration: CollaborationOpportunity[];
  narrative: {
    executive_summary: string;
    key_findings: string[];
    action_items: ActionItem[];
  };
}

// ─── History ───────────────────────────────────────────────────────────────

export interface HistoryRun {
  submission_id: string;
  batch_label: string;
  uploaded_at: string;
  employee_count: number;
  activity_count: number;
  run_id: string | null;
  status: "pending" | "running" | "complete" | "failed" | null;
  duplication_status: AgentStatus | null;
  automation_status: AgentStatus | null;
  resource_status: AgentStatus | null;
  narrative_status: AgentStatus | null;
  collaboration_status: AgentStatus | null;
  started_at: string | null;
  completed_at: string | null;
}

// ─── Employee ──────────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  employee_name: string;
  employee_number: string;
  function: string;
  job_title: string;
  direct_manager: string;
}
