"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import Card from "@/components/ui/Card";
import type { Results } from "@/lib/types";

interface Props {
  results: Results;
}

const SCORE_COLORS = ["#22C55E", "#86EFAC", "#FCD34D", "#F97316", "#EF4444"];
const PIE_COLORS   = ["#EF4444", "#F97316", "#94A3B8"];
const BAR_BLUE     = "#2563EB";
const BAR_ORANGE   = "#F97316";

// Distinct palette for per-employee colouring
const EMP_PALETTE = [
  "#2563EB", "#7C3AED", "#059669", "#DC2626", "#D97706",
  "#0891B2", "#DB2777", "#65A30D",
];

// ── 1. Automation Score Distribution ─────────────────────────────────────────
function AutomationDistribution({ activities }: { activities: Results["automation"] }) {
  const buckets = [
    { label: "0–19",   min: 0,  max: 19  },
    { label: "20–39",  min: 20, max: 39  },
    { label: "40–59",  min: 40, max: 59  },
    { label: "60–79",  min: 60, max: 79  },
    { label: "80–100", min: 80, max: 100 },
  ];
  const data = buckets.map((b, i) => ({
    range: b.label,
    count: activities.filter((a) => a.automation_score >= b.min && a.automation_score <= b.max).length,
    fill:  SCORE_COLORS[i],
  }));

  return (
    <Card>
      <p className="mb-4 font-heading text-xs font-semibold uppercase tracking-wide text-slate-500">
        Automation Score Distribution
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="range" tick={{ fontSize: 11, fontFamily: "Fira Code" }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            formatter={(v: number) => [v, "Activities"]}
            contentStyle={{ fontSize: 12, fontFamily: "Fira Sans" }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-slate-400">Activities scored ≥ 60 are flagged as high-automation candidates.</p>
    </Card>
  );
}

// ── 2. Duplicate Type Breakdown (Donut) ──────────────────────────────────────
function DuplicateDonut({ pairs }: { pairs: Results["duplication"] }) {
  const counts: Record<string, number> = {
    "True Duplicate": 0,
    "Partial Overlap": 0,
    "Not a Duplicate": 0,
  };
  pairs.forEach((p) => { counts[p.duplicate_type] = (counts[p.duplicate_type] ?? 0) + 1; });
  const data = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  if (!data.length) {
    return (
      <Card>
        <p className="mb-4 font-heading text-xs font-semibold uppercase tracking-wide text-slate-500">
          Duplicate Type Breakdown
        </p>
        <p className="text-sm text-slate-400">No duplicate pairs detected.</p>
      </Card>
    );
  }

  return (
    <Card>
      <p className="mb-4 font-heading text-xs font-semibold uppercase tracking-wide text-slate-500">
        Duplicate Type Breakdown
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 12, fontFamily: "Fira Sans" }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontFamily: "Fira Sans" }} />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ── 3. Avg Automation Score by Department ────────────────────────────────────
function AutomationByDept({ activities }: { activities: Results["automation"] }) {
  const map: Record<string, { total: number; count: number }> = {};
  activities.forEach((a) => {
    const fn = a.function ?? "Unknown";
    if (!map[fn]) map[fn] = { total: 0, count: 0 };
    map[fn].total += a.automation_score;
    map[fn].count += 1;
  });
  const data = Object.entries(map)
    .map(([dept, { total, count }]) => ({ dept, avg: Math.round(total / count) }))
    .sort((a, b) => b.avg - a.avg);

  return (
    <Card>
      <p className="mb-4 font-heading text-xs font-semibold uppercase tracking-wide text-slate-500">
        Avg Automation Score by Department
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart layout="vertical" data={data} margin={{ top: 4, right: 24, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="dept" tick={{ fontSize: 11, fontFamily: "Fira Code" }} width={90} />
          <Tooltip
            formatter={(v: number) => [v, "Avg Score"]}
            contentStyle={{ fontSize: 12, fontFamily: "Fira Sans" }}
          />
          <Bar dataKey="avg" fill={BAR_BLUE} radius={[0, 4, 4, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.avg >= 60 ? BAR_ORANGE : BAR_BLUE} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-slate-400">
        Orange bars: dept avg ≥ 60 — automation investment may have high ROI.
      </p>
    </Card>
  );
}

// ── 4. Team-wide Value Type Split (Pie) ──────────────────────────────────────
const VALUE_COLORS: Record<string, string> = {
  Administer: "#94A3B8",
  Review:     "#3B82F6",
  Control:    "#2563EB",
  Contribute: "#22C55E",
  Coordinate: "#A78BFA",
  Support:    "#F97316",
};

function ValueTypePie({ employees }: { employees: Results["resource"] }) {
  const map: Record<string, number> = {};
  employees.forEach((e) => {
    Object.entries(e.by_value_type).forEach(([type, pctVal]) => {
      map[type] = (map[type] ?? 0) + pctVal;
    });
  });
  const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
  const data = Object.entries(map)
    .map(([name, val]) => ({ name, value: Math.round((val / total) * 100) }))
    .sort((a, b) => b.value - a.value);

  return (
    <Card>
      <p className="mb-4 font-heading text-xs font-semibold uppercase tracking-wide text-slate-500">
        Team-wide Value Type Split
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            label={({ name, value }) => `${name} ${value}%`}
            labelLine={false}
          >
            {data.map((d, i) => <Cell key={i} fill={VALUE_COLORS[d.name] ?? "#CBD5E1"} />)}
          </Pie>
          <Tooltip
            formatter={(v: number) => [`${v}%`, "Share"]}
            contentStyle={{ fontSize: 12, fontFamily: "Fira Sans" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ── 5. Employee Time Accountability ──────────────────────────────────────────
function EmployeeAccountability({ employees }: { employees: Results["resource"] }) {
  const data = employees.map((e) => ({
    name: e.employee_name.split(" ")[0],
    pct:  Math.round(e.total_pct_accounted * 100),
    overloaded: e.overloaded,
  }));

  return (
    <Card>
      <p className="mb-4 font-heading text-xs font-semibold uppercase tracking-wide text-slate-500">
        Total Time Accounted (% of capacity)
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "Fira Code" }} />
          <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 120]} />
          <Tooltip
            formatter={(v: number) => [`${v}%`, "Time accounted"]}
            contentStyle={{ fontSize: 12, fontFamily: "Fira Sans" }}
          />
          <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.overloaded ? "#F97316" : "#2563EB"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-slate-400">
        Orange = overloaded (Admin &gt; 60%). Values above 100% indicate over-reporting.
      </p>
    </Card>
  );
}

// ── 6. Action Items by Priority ───────────────────────────────────────────────
function ActionPriorityChart({ narrative }: { narrative: Results["narrative"] }) {
  const counts = { High: 0, Medium: 0, Low: 0 };
  narrative.action_items.forEach((a) => { counts[a.priority] = (counts[a.priority] ?? 0) + 1; });
  const data = [
    { priority: "High",   count: counts.High,   fill: "#EF4444" },
    { priority: "Medium", count: counts.Medium, fill: "#F97316" },
    { priority: "Low",    count: counts.Low,    fill: "#94A3B8" },
  ];

  return (
    <Card>
      <p className="mb-4 font-heading text-xs font-semibold uppercase tracking-wide text-slate-500">
        Action Items by Priority
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="priority" tick={{ fontSize: 11, fontFamily: "Fira Code" }} />
          <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
          <Tooltip
            formatter={(v: number) => [v, "Action items"]}
            contentStyle={{ fontSize: 12, fontFamily: "Fira Sans" }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

// ── 7. Top 10 Activities by Automation Score ─────────────────────────────────
function TopActivitiesChart({ activities }: { activities: Results["automation"] }) {
  // Build a stable colour index per employee name
  const empNames = Array.from(new Set(activities.map((a) => a.employee_name)));
  const empColor = Object.fromEntries(
    empNames.map((name, i) => [name, EMP_PALETTE[i % EMP_PALETTE.length]]),
  );

  const top = [...activities]
    .sort((a, b) => b.automation_score - a.automation_score)
    .slice(0, 10)
    .map((a) => ({
      label:  a.description.length > 38 ? a.description.slice(0, 35) + "…" : a.description,
      full:   a.description,
      score:  a.automation_score,
      emp:    a.employee_name.split(" ")[0],
      fill:   empColor[a.employee_name],
    }));

  return (
    <Card className="sm:col-span-2">
      <div className="mb-4 flex items-start justify-between">
        <p className="font-heading text-xs font-semibold uppercase tracking-wide text-slate-500">
          Top 10 Activities by Automation Score
        </p>
        {/* Legend */}
        <div className="flex flex-wrap justify-end gap-x-3 gap-y-1">
          {empNames.map((name) => (
            <span key={name} className="flex items-center gap-1 text-[10px] text-slate-500">
              <span className="size-2 rounded-full inline-block" style={{ background: empColor[name] }} />
              {name.split(" ")[0]}
            </span>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          layout="vertical"
          data={top}
          margin={{ top: 4, right: 36, bottom: 0, left: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 10, fontFamily: "Fira Code" }}
            width={180}
          />
          <Tooltip
            formatter={(v: number) => [`${v} / 100`, "Score"]}
            contentStyle={{ fontSize: 11, fontFamily: "Fira Sans", maxWidth: 320 }}
          />
          <Bar dataKey="score" radius={[0, 4, 4, 0]}>
            {top.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-slate-400">
        Coloured by employee. Scores ≥ 60 are automation candidates; ≥ 80 are immediate priorities.
      </p>
    </Card>
  );
}

// ── 8. Automatable Time at Risk per Employee ─────────────────────────────────
function AutomatableTimeRisk({ activities }: { activities: Results["automation"] }) {
  const empNames = Array.from(new Set(activities.map((a) => a.employee_name)));
  const empColor = Object.fromEntries(
    empNames.map((name, i) => [name, EMP_PALETTE[i % EMP_PALETTE.length]]),
  );

  const data = empNames.map((name) => {
    const empActs = activities.filter((a) => a.employee_name === name);
    const atRisk  = empActs
      .filter((a) => a.automation_score >= 60 && a.pct_time != null)
      .reduce((s, a) => s + (a.pct_time ?? 0), 0);
    return {
      name: name.split(" ")[0],
      fullName: name,
      atRisk: Math.round(atRisk * 100),
      fill: empColor[name],
    };
  }).sort((a, b) => b.atRisk - a.atRisk);

  return (
    <Card>
      <p className="mb-1 font-heading text-xs font-semibold uppercase tracking-wide text-slate-500">
        Automatable Time at Risk per Employee
      </p>
      <p className="mb-4 text-xs text-slate-400">
        % of weekly capacity spent on activities scoring ≥ 60 automation potential
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "Fira Code" }} />
          <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
          <Tooltip
            formatter={(v: number) => [`${v}% of capacity`, "Automatable time"]}
            contentStyle={{ fontSize: 12, fontFamily: "Fira Sans" }}
          />
          <Bar dataKey="atRisk" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-slate-400">
        Higher = more FTE recoverable through automation. This is avoidable manual work.
      </p>
    </Card>
  );
}

// ── 9. Activity Frequency Distribution ───────────────────────────────────────
const FREQ_COLORS: Record<string, string> = {
  Daily:     "#2563EB",
  Weekly:    "#7C3AED",
  Monthly:   "#059669",
  Quarterly: "#D97706",
  "Ad-hoc":  "#94A3B8",
};

function FrequencyDistribution({ activities }: { activities: Results["automation"] }) {
  const map: Record<string, number> = {};
  activities.forEach((a) => {
    const raw = a.frequency ?? "Unknown";
    const key = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    map[key] = (map[key] ?? 0) + 1;
  });

  const data = Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <Card>
      <p className="mb-4 font-heading text-xs font-semibold uppercase tracking-wide text-slate-500">
        Activity Frequency Distribution
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={78}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={FREQ_COLORS[d.name] ?? "#CBD5E1"} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number, name: string) => [v, name]}
            contentStyle={{ fontSize: 12, fontFamily: "Fira Sans" }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontFamily: "Fira Sans" }} />
        </PieChart>
      </ResponsiveContainer>
      <p className="mt-2 text-xs text-slate-400">
        Daily/weekly activities have highest automation ROI — frequency multiplies the time savings.
      </p>
    </Card>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function ChartsPanel({ results }: Props) {
  return (
    <div className="space-y-4">
      {/* Full-width top chart */}
      <div className="grid gap-4 sm:grid-cols-2">
        <TopActivitiesChart activities={results.automation} />
      </div>

      {/* 3-column row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AutomatableTimeRisk   activities={results.automation} />
        <FrequencyDistribution activities={results.automation} />
        <ActionPriorityChart   narrative={results.narrative}  />
      </div>

      {/* 2-column row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <AutomationDistribution activities={results.automation} />
        <DuplicateDonut         pairs={results.duplication}     />
        <AutomationByDept       activities={results.automation} />
        <ValueTypePie           employees={results.resource}    />
        <EmployeeAccountability employees={results.resource}    />
      </div>
    </div>
  );
}
