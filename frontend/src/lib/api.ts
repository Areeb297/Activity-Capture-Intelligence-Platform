import type { UploadResponse, RunStatus, Results, Employee, HistoryRun } from "./types";

const BASE = "/api";

export async function uploadFiles(files: File[]): Promise<UploadResponse> {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const res = await fetch(`${BASE}/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function startAnalysis(submissionId: string): Promise<{ run_id: string }> {
  const res = await fetch(`${BASE}/analyse/${submissionId}`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getRunStatus(runId: string): Promise<RunStatus> {
  const res = await fetch(`${BASE}/status/${runId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getResults(runId: string): Promise<Results> {
  const res = await fetch(`${BASE}/dashboard/${runId}`);
  if (!res.ok) throw new Error(await res.text());
  const dash = await res.json();
  return {
    run_id: dash.run_id,
    duplication: dash.duplication?.pairs ?? [],
    automation: dash.automation?.scored_activities ?? [],
    resource: dash.resource?.employees ?? [],
    collaboration: dash.collaboration?.opportunities ?? [],
    narrative: dash.narrative ?? { executive_summary: "", key_findings: [], action_items: [] },
  };
}

export async function getEmployees(submissionId: string): Promise<Employee[]> {
  const res = await fetch(`${BASE}/employees/${submissionId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getHistory(): Promise<HistoryRun[]> {
  const res = await fetch(`${BASE}/history`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteSubmission(submissionId: string): Promise<void> {
  const res = await fetch(`${BASE}/submissions/${submissionId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}
