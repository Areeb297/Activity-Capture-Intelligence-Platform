"use client";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
import Spinner from "@/components/ui/Spinner";
import { useRunStatus } from "@/hooks/useRunStatus";
import { ArrowRight, CheckCircle, Circle, XCircle, Search, Zap, Users, Network, FileText } from "lucide-react";
import type { AgentStatus, RunStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

// ── Stepper step definitions ───────────────────────────────────────────────────

function StepDot({ done, active, failed }: { done: boolean; active: boolean; failed: boolean }) {
  if (failed) return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-red-100 border-2 border-red-300">
      <XCircle className="size-4 text-red-500" />
    </span>
  );
  if (done) return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-green-100 border-2 border-green-300">
      <CheckCircle className="size-4 text-green-500" />
    </span>
  );
  if (active) return (
    <span className="relative flex size-7 shrink-0 items-center justify-center">
      <span className="absolute size-7 animate-ping rounded-full bg-blue-400 opacity-30" />
      <span className="relative flex size-7 items-center justify-center rounded-full bg-blue-100 border-2 border-blue-400">
        <span className="size-2.5 rounded-full bg-blue-500" />
      </span>
    </span>
  );
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-slate-200 bg-white">
      <Circle className="size-3.5 text-slate-300" />
    </span>
  );
}

const agentCards: {
  key: keyof Pick<RunStatus, "duplication_status" | "automation_status" | "resource_status" | "collaboration_status">;
  label: string;
  icon: React.ElementType;
  color: string;
}[] = [
  { key: "duplication_status",   label: "Duplication Detector",  icon: Search,  color: "text-rose-500"   },
  { key: "automation_status",    label: "Automation Scorer",      icon: Zap,     color: "text-amber-500"  },
  { key: "resource_status",      label: "Resource Analyser",      icon: Users,   color: "text-orange-500" },
  { key: "collaboration_status", label: "Collaboration Mapper",   icon: Network, color: "text-indigo-500" },
];

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

// ── Derive high-level steps from status ───────────────────────────────────────

function deriveSteps(status: RunStatus) {
  const overall = status.status;
  const agentStatuses = [
    status.duplication_status,
    status.automation_status,
    status.resource_status,
    status.collaboration_status ?? "pending",
  ];
  const agentsDone    = agentStatuses.filter((s) => s === "complete").length;
  const agentsFailed  = agentStatuses.some((s) => s === "failed");
  const agentsRunning = agentStatuses.some((s) => s === "running");
  const allAgentsDone = agentsDone === 4;

  return [
    {
      label: "Files uploaded & parsed",
      done: true,
      active: false,
      failed: false,
    },
    {
      label: "Generating activity embeddings",
      done: agentsRunning || allAgentsDone || status.narrative_status !== "pending",
      active: !agentsRunning && !allAgentsDone && status.narrative_status === "pending" && overall === "running",
      failed: false,
    },
    {
      label: `Parallel analysis (${agentsDone}/4 agents complete)`,
      done: allAgentsDone,
      active: agentsRunning,
      failed: agentsFailed,
    },
    {
      label: "Generating executive report",
      done: status.narrative_status === "complete",
      active: status.narrative_status === "running",
      failed: status.narrative_status === "failed",
    },
    {
      label: "Complete",
      done: overall === "complete",
      active: false,
      failed: overall === "failed",
    },
  ];
}

// ── Main component ─────────────────────────────────────────────────────────────

function StatusContent() {
  const { run_id } = useParams<{ run_id: string }>();
  const params     = useSearchParams();
  const router     = useRouter();

  const rawEmployees = params.get("employees");
  const employees    = rawEmployees && rawEmployees !== "undefined" ? rawEmployees : null;

  const { status, error } = useRunStatus(run_id);

  useEffect(() => {
    if (status?.status === "complete") {
      router.push(`/results/${run_id}`);
    }
  }, [status, run_id, router]);

  const steps = status ? deriveSteps(status) : null;
  const agentsActive = status
    ? [status.duplication_status, status.automation_status, status.resource_status, status.collaboration_status ?? "pending"]
        .some((s) => s === "running")
    : false;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-brand-text">Analysis in Progress</h1>
        <p className="mt-2 text-sm text-slate-500">
          {employees
            ? <>Running across <strong>{employees}</strong> employee submission{Number(employees) !== 1 ? "s" : ""}.</>
            : <>Running analysis across uploaded submissions.</>
          }{" "}
          This typically takes 60–120 seconds with 5 agents.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {!status ? (
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Spinner className="size-5" /> Connecting…
        </div>
      ) : (
        <div className="space-y-5">
          {/* Progress stepper */}
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 space-y-0">
            {steps!.map((step, i) => (
              <div key={i} className="flex gap-3">
                {/* Left: dot + connector */}
                <div className="flex flex-col items-center">
                  <StepDot done={step.done} active={step.active} failed={step.failed} />
                  {i < steps!.length - 1 && (
                    <div className={cn(
                      "w-0.5 flex-1 my-1 rounded-full min-h-[20px]",
                      step.done ? "bg-green-300" : "bg-slate-200"
                    )} />
                  )}
                </div>

                {/* Right: content */}
                <div className={cn("pb-4 min-w-0 flex-1", i === steps!.length - 1 && "pb-0")}>
                  <p className={cn(
                    "text-sm font-medium mt-0.5",
                    step.failed  ? "text-red-600" :
                    step.done    ? "text-green-700" :
                    step.active  ? "text-brand-primary" :
                    "text-slate-400"
                  )}>
                    {step.label}
                  </p>

                  {/* Sub-agent cards (only on step 3 — parallel analysis) */}
                  {i === 2 && agentsActive && (
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {agentCards.map(({ key, label, icon: Icon, color }) => {
                        const st = (status[key] ?? "pending") as AgentStatus;
                        return (
                          <div
                            key={key}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors",
                              st === "complete" && "border-green-200 bg-green-50",
                              st === "running"  && "border-blue-200 bg-blue-50",
                              st === "failed"   && "border-red-200 bg-red-50",
                              st === "pending"  && "border-slate-200 bg-slate-50",
                            )}
                          >
                            <Icon className={cn("size-3 shrink-0", color)} strokeWidth={1.5} />
                            <span className="truncate font-medium text-slate-700">{label}</span>
                            <span className={cn("ml-auto shrink-0", statusColor[st])}>
                              {statusLabel[st]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Overall status pill */}
          <div className="rounded-lg border border-slate-200 bg-white px-5 py-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Overall</span>
            <span className={cn(
              "font-heading text-sm font-semibold capitalize",
              status.status === "failed"   ? "text-red-500" :
              status.status === "complete" ? "text-green-600" :
              "text-brand-primary"
            )}>
              {status.status === "complete" ? "Done — redirecting…" : status.status}
            </span>
          </div>

          {status.status === "complete" && (
            <div className="flex justify-end">
              <button
                onClick={() => router.push(`/results/${run_id}`)}
                className="flex min-h-[44px] items-center gap-2 rounded-lg bg-brand-cta px-5 py-2.5 font-heading text-sm font-semibold text-white hover:opacity-90"
              >
                View Results <ArrowRight className="size-4" />
              </button>
            </div>
          )}

          {status.status === "failed" && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Analysis failed. Check that your API keys are set in{" "}
              <code className="font-heading text-xs">backend/.env</code> and try again.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <Spinner className="size-5" /> Loading…
      </div>
    }>
      <StatusContent />
    </Suspense>
  );
}
