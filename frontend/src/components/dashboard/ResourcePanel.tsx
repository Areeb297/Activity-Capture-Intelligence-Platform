"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import type { ResourceEmployee } from "@/lib/types";
import { pct } from "@/lib/utils";

interface Props {
  employees: ResourceEmployee[];
}

export default function ResourcePanel({ employees }: Props) {
  if (!employees.length) {
    return <Card><p className="text-sm text-slate-500">No resource data available.</p></Card>;
  }

  const chartData = employees.map((e) => ({
    name: e.employee_name.split(" ")[0],
    admin: Math.round((e.by_value_type["Administer"] ?? 0) * 100),
    control: Math.round((e.by_value_type["Control"] ?? 0) * 100),
    review: Math.round((e.by_value_type["Review"] ?? 0) * 100),
    overload: e.overloaded,
  }));

  return (
    <div className="space-y-6">
      {/* Stacked bar chart */}
      <Card>
        <p className="mb-4 font-heading text-xs font-semibold uppercase tracking-wide text-slate-500">
          Time Allocation by Value Type
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "Fira Code" }} />
            <YAxis tick={{ fontSize: 11 }} unit="%" />
            <Tooltip
              formatter={(val: number, name: string) => [`${val}%`, name]}
              contentStyle={{ fontSize: 12, fontFamily: "Fira Sans" }}
            />
            <Bar dataKey="admin"   name="Admin"   fill="#94A3B8" stackId="a" radius={[0,0,0,0]} />
            <Bar dataKey="review"  name="Review"  fill="#3B82F6" stackId="a" radius={[0,0,0,0]} />
            <Bar dataKey="control" name="Control" fill="#2563EB" stackId="a" radius={[4,4,0,0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.overload ? "#F97316" : "#2563EB"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="mt-2 text-xs text-slate-400">Orange bars indicate overloaded employees (&gt;60% Admin).</p>
      </Card>

      {/* Employee breakdown cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {employees.map((emp) => (
          <Card key={emp.employee_name} hoverable className={emp.overloaded ? "border-orange-200 bg-orange-50/30" : ""}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-heading text-sm font-semibold text-brand-text">{emp.employee_name}</p>
                <p className="text-xs text-slate-500">{emp.job_title} · {emp.function}</p>
              </div>
              {emp.overloaded && <Badge label="Overloaded" variant="warning" />}
            </div>
            <div className="mt-3 space-y-1">
              {Object.entries(emp.by_value_type).map(([type, pctVal]) => (
                <div key={type} className="flex items-center gap-2">
                  <span className="w-20 text-xs text-slate-500">{type}</span>
                  <div className="flex-1 rounded-full bg-slate-100 h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-brand-primary"
                      style={{ width: `${Math.round(pctVal * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-heading text-xs text-slate-600">
                    {pct(pctVal)}
                  </span>
                </div>
              ))}
            </div>
            {emp.rebalancing_recommendation && (
              <p className="mt-3 text-xs text-slate-500 italic">{emp.rebalancing_recommendation}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
