import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import type { DuplicationPair } from "@/lib/types";
import { verdictColor } from "@/lib/utils";

interface Props {
  pairs: DuplicationPair[];
}

export default function DuplicationPanel({ pairs }: Props) {
  const trueDups = pairs.filter((p) => p.duplicate_type === "True Duplicate");
  const partials  = pairs.filter((p) => p.duplicate_type === "Partial Overlap");
  const display   = [...trueDups, ...partials];

  if (!display.length) {
    return (
      <Card>
        <p className="text-sm text-slate-500">No duplicates or overlaps detected.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {display.map((pair, i) => (
        <Card key={i} hoverable>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${verdictColor(pair.duplicate_type)}`}>
              {pair.duplicate_type}
            </span>
            <span className="font-heading text-xs text-slate-400">
              Similarity: {Math.round(pair.cosine_score * 100)}%
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs font-semibold text-brand-primary">{pair.employee_a}</p>
              <p className="text-xs text-slate-500">{pair.function_a}</p>
              <p className="mt-1.5 text-sm text-brand-text">{pair.description_a}</p>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs font-semibold text-brand-primary">{pair.employee_b}</p>
              <p className="text-xs text-slate-500">{pair.function_b}</p>
              <p className="mt-1.5 text-sm text-brand-text">{pair.description_b}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge label={`Owner: ${pair.recommended_owner}`} variant="info" />
            <span className="text-xs text-slate-500">{pair.consolidation_action}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
