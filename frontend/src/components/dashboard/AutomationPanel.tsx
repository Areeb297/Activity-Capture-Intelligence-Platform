import Card from "@/components/ui/Card";
import type { AutomationActivity } from "@/lib/types";
import { scoreColor, pct } from "@/lib/utils";

interface Props {
  activities: AutomationActivity[];
}

export default function AutomationPanel({ activities }: Props) {
  const sorted = [...activities].sort((a, b) => b.automation_score - a.automation_score);
  const high   = sorted.filter((a) => a.automation_score >= 70);

  if (!high.length) {
    return <Card><p className="text-sm text-slate-500">No high-automation activities found.</p></Card>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm" aria-label="Automation opportunities">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            {["Employee", "Function", "Activity", "Time %", "AI Score", "Suggested Tool"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {high.map((a, i) => (
            <tr key={i} className="table-row-hover border-b border-slate-100 last:border-0">
              <td className="px-4 py-3 font-medium text-brand-text">{a.employee_name}</td>
              <td className="px-4 py-3 text-slate-500">{a.function}</td>
              <td className="max-w-xs px-4 py-3 text-slate-700">{a.description}</td>
              <td className="px-4 py-3 font-heading text-xs text-slate-600">{a.pct_time != null ? pct(a.pct_time) : "—"}</td>
              <td className="px-4 py-3">
                <span className={`inline-block rounded-full px-2 py-0.5 font-heading text-xs font-bold ${scoreColor(a.automation_score)}`}>
                  {a.automation_score}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">{a.suggested_tool}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
