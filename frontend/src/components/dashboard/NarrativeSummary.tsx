import Card from "@/components/ui/Card";
import { FileText, ListChecks, ArrowUpRight } from "lucide-react";
import type { Results, ActionItem } from "@/lib/types";

interface Props {
  narrative: Results["narrative"];
}

const priorityColor: Record<string, string> = {
  High:   "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low:    "bg-slate-100 text-slate-600",
};

export default function NarrativeSummary({ narrative }: Props) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* Executive summary */}
      <Card className="lg:col-span-2">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="size-4 text-brand-primary" />
          <h3 className="font-heading text-sm font-semibold text-brand-text">Executive Summary</h3>
        </div>
        <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">
          {narrative.executive_summary}
        </p>
      </Card>

      {/* Action items + key findings */}
      <div className="space-y-4">
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <ListChecks className="size-4 text-brand-cta" />
            <h3 className="font-heading text-sm font-semibold text-brand-text">Action Items</h3>
          </div>
          <ol className="space-y-3">
            {narrative.action_items.map((item: ActionItem, i: number) => (
              <li key={i} className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-brand-cta shrink-0 text-sm">{i + 1}.</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${priorityColor[item.priority] ?? priorityColor.Low}`}>
                    {item.priority}
                  </span>
                </div>
                <p className="pl-5 text-sm text-slate-700">{item.action}</p>
                {item.owner_suggestion && (
                  <p className="pl-5 text-xs text-slate-400">Owner: {item.owner_suggestion}</p>
                )}
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <div className="mb-3 flex items-center gap-2">
            <ArrowUpRight className="size-4 text-brand-primary" />
            <h3 className="font-heading text-sm font-semibold text-brand-text">Key Findings</h3>
          </div>
          <ul className="space-y-1.5">
            {narrative.key_findings.map((finding: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                <span className="mt-0.5 size-5 shrink-0 flex items-center justify-center rounded-full bg-brand-primary/10 font-heading text-[10px] font-bold text-brand-primary">
                  {i + 1}
                </span>
                {finding}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
