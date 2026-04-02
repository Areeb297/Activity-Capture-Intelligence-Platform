"use client";
import { CheckCircle, Circle, XCircle, Search, Zap, Users, FileText, Network } from "lucide-react";
import type { AgentStatus, RunStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const AGENTS: {
  key: keyof Pick<RunStatus, "duplication_status" | "automation_status" | "resource_status" | "collaboration_status" | "narrative_status">;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}[] = [
  {
    key: "duplication_status",
    label: "Duplication Detector",
    description: "Finds overlapping activities across employees using embeddings + LLM",
    icon: Search,
    color: "text-rose-500",
    bg: "bg-rose-50 border-rose-100",
  },
  {
    key: "automation_status",
    label: "Automation Scorer",
    description: "Re-scores automation potential for every activity using AI",
    icon: Zap,
    color: "text-amber-500",
    bg: "bg-amber-50 border-amber-100",
  },
  {
    key: "resource_status",
    label: "Resource Analyser",
    description: "Maps time allocation per employee and flags overloaded roles",
    icon: Users,
    color: "text-orange-500",
    bg: "bg-orange-50 border-orange-100",
  },
  {
    key: "collaboration_status",
    label: "Collaboration Mapper",
    description: "Identifies cross-department coordination opportunities and dependency gaps",
    icon: Network,
    color: "text-indigo-500",
    bg: "bg-indigo-50 border-indigo-100",
  },
  {
    key: "narrative_status",
    label: "Narrative Synthesiser",
    description: "Writes executive summary and action items from all four agents",
    icon: FileText,
    color: "text-blue-500",
    bg: "bg-blue-50 border-blue-100",
  },
];

function StatusDot({ status }: { status: AgentStatus }) {
  if (status === "complete") return (
    <span className="flex size-5 items-center justify-center rounded-full bg-green-100">
      <CheckCircle className="size-4 text-green-500" />
    </span>
  );
  if (status === "running") return (
    <span className="relative flex size-5 items-center justify-center">
      <span className="absolute inline-flex size-4 animate-ping rounded-full bg-blue-400 opacity-50" />
      <span className="relative inline-flex size-3 rounded-full bg-blue-500" />
    </span>
  );
  if (status === "failed") return (
    <span className="flex size-5 items-center justify-center rounded-full bg-red-100">
      <XCircle className="size-4 text-red-500" />
    </span>
  );
  return <span className="flex size-5 items-center justify-center"><Circle className="size-4 text-slate-300" /></span>;
}

const statusLabel: Record<AgentStatus, string> = {
  pending:  "Waiting",
  running:  "Running…",
  complete: "Done",
  failed:   "Failed",
};

const statusColor: Record<AgentStatus, string> = {
  pending:  "text-slate-400",
  running:  "text-blue-600 font-semibold",
  complete: "text-green-600 font-semibold",
  failed:   "text-red-600 font-semibold",
};

interface Props { runStatus: RunStatus }

export default function AgentStatusCards({ runStatus }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {AGENTS.map(({ key, label, description, icon: Icon, color, bg }, idx) => {
        const status = runStatus[key] ?? "pending";
        const isNarrative = idx === 4; // Narrative Synthesiser spans full width
        return (
          <div
            key={key}
            className={cn(
              "glow-card flex items-start gap-4 rounded-2xl border bg-white p-5",
              isNarrative && "sm:col-span-2",
              status === "running" && "border-blue-200 bg-blue-50/40 shadow-lg shadow-blue-500/10",
              status === "complete" && "border-green-200",
              status === "failed" && "border-red-200 bg-red-50/30",
            )}
          >
            {/* Icon box */}
            <div className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border", bg)}>
              <Icon className={cn("size-4", color)} strokeWidth={1.5} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-heading text-sm font-semibold text-slate-800">{label}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <span className={cn("text-xs", statusColor[status])}>
                {statusLabel[status]}
              </span>
              <StatusDot status={status} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
