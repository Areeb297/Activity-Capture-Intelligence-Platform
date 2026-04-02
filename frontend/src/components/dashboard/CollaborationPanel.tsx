"use client";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { ArrowRight, Users, AlertTriangle, GitMerge } from "lucide-react";
import type { CollaborationOpportunity } from "@/lib/types";

interface Props {
  opportunities: CollaborationOpportunity[];
}

const typeConfig: Record<string, { label: string; icon: React.ElementType; badge: string }> = {
  "Joint Ownership": { label: "Joint Ownership", icon: Users, badge: "info" },
  "Dependency Gap":  { label: "Dependency Gap",  icon: AlertTriangle, badge: "warning" },
  "Consolidation":   { label: "Consolidation",   icon: GitMerge, badge: "default" },
};

const impactBadge: Record<string, "danger" | "warning" | "default"> = {
  High:   "danger",
  Medium: "warning",
  Low:    "default",
};

export default function CollaborationPanel({ opportunities }: Props) {
  if (!opportunities || opportunities.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-500">
          No cross-department collaboration opportunities identified for this submission.
          This typically means all uploaded files belong to a single department.
        </p>
      </Card>
    );
  }

  const high   = opportunities.filter((o) => o.impact === "High");
  const medium = opportunities.filter((o) => o.impact === "Medium");
  const low    = opportunities.filter((o) => o.impact === "Low");

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="flex flex-wrap gap-3">
        {high.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
            <span className="size-2 rounded-full bg-red-500" />
            <span className="text-xs font-semibold text-red-700">{high.length} High impact</span>
          </div>
        )}
        {medium.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
            <span className="size-2 rounded-full bg-amber-500" />
            <span className="text-xs font-semibold text-amber-700">{medium.length} Medium impact</span>
          </div>
        )}
        {low.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
            <span className="size-2 rounded-full bg-slate-400" />
            <span className="text-xs font-semibold text-slate-600">{low.length} Low impact</span>
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {opportunities.map((opp, i) => {
          const config = typeConfig[opp.opportunity_type] ?? typeConfig["Consolidation"];
          const TypeIcon = config.icon;
          return (
            <Card key={i} className="space-y-3">
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 border border-blue-100">
                    <TypeIcon className="size-3.5 text-blue-600" strokeWidth={1.5} />
                  </div>
                  <span className="font-heading text-xs font-semibold text-slate-700">
                    {config.label}
                  </span>
                </div>
                <Badge variant={impactBadge[opp.impact] ?? "default"} label={opp.impact} />
              </div>

              {/* Department pair */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2 py-1 font-heading text-xs font-semibold text-indigo-700">
                  {opp.dept_a}
                </span>
                <ArrowRight className="size-3.5 shrink-0 text-slate-400" />
                <span className="rounded-md bg-purple-50 border border-purple-200 px-2 py-1 font-heading text-xs font-semibold text-purple-700">
                  {opp.dept_b}
                </span>
              </div>

              {/* Activity descriptions */}
              <div className="space-y-1.5 rounded-lg bg-slate-50 border border-slate-100 p-3">
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-indigo-600">{opp.dept_a}:</span>{" "}
                  {opp.activity_a_description}
                </p>
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-purple-600">{opp.dept_b}:</span>{" "}
                  {opp.activity_b_description}
                </p>
              </div>

              {/* Suggested action */}
              <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                <p className="text-xs font-semibold text-green-700 mb-0.5">Suggested Action</p>
                <p className="text-xs text-green-800">{opp.suggested_action}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
