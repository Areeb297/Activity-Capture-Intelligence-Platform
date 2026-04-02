"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getResults } from "@/lib/api";
import type { Results } from "@/lib/types";
import Spinner from "@/components/ui/Spinner";
import KPICards from "@/components/dashboard/KPICards";
import DepartmentFilter from "@/components/dashboard/DepartmentFilter";
import DuplicationPanel from "@/components/dashboard/DuplicationPanel";
import AutomationPanel from "@/components/dashboard/AutomationPanel";
import ResourcePanel from "@/components/dashboard/ResourcePanel";
import NarrativeSummary from "@/components/dashboard/NarrativeSummary";
import ChartsPanel from "@/components/dashboard/ChartsPanel";
import { ArrowLeft, Copy, Zap, Users, FileText, BarChart2 } from "lucide-react";

type Tab = "summary" | "duplication" | "automation" | "resource" | "charts";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "summary",     label: "Executive Summary", icon: FileText  },
  { key: "duplication", label: "Duplication",        icon: Copy     },
  { key: "automation",  label: "Automation",         icon: Zap      },
  { key: "resource",    label: "Resource Load",      icon: Users    },
  { key: "charts",      label: "Charts",             icon: BarChart2},
];

export default function ResultsPage() {
  const { run_id } = useParams<{ run_id: string }>();
  const router     = useRouter();
  const [results, setResults] = useState<Results | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [tab,     setTab]     = useState<Tab>("summary");
  const [dept,    setDept]    = useState<string>("All");

  useEffect(() => {
    getResults(run_id)
      .then(setResults)
      .catch((e) => setError(e.message));
  }, [run_id]);

  const departments = useMemo(() => {
    if (!results) return [];
    const depts = new Set<string>();
    results.duplication.forEach((d) => { depts.add(d.function_a); depts.add(d.function_b); });
    results.automation.forEach((a) => { if (a.function) depts.add(a.function); });
    results.resource.forEach((r) => depts.add(r.function));
    depts.delete("");
    return Array.from(depts).sort();
  }, [results]);

  const filteredResults = useMemo<Results | null>(() => {
    if (!results || dept === "All") return results;
    return {
      ...results,
      duplication: results.duplication.filter(
        (d) => d.function_a === dept || d.function_b === dept,
      ),
      automation: results.automation.filter((a) => (a.function ?? "") === dept),
      resource:   results.resource.filter((r) => r.function === dept),
    };
  }, [results, dept]);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-600">
        Failed to load results: {error}
      </div>
    );
  }

  if (!filteredResults) {
    return (
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <Spinner className="size-5" /> Loading results…
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Gradient hero header */}
      <div className="animated-gradient -mx-6 -mt-8 mb-8 px-6 py-10">
        <button
          onClick={() => router.push("/")}
          className="mb-4 flex items-center gap-1.5 text-xs text-blue-300 hover:text-white transition-colors"
          aria-label="New analysis"
        >
          <ArrowLeft className="size-3.5" /> New analysis
        </button>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-heading text-xs font-semibold uppercase tracking-widest text-blue-300/70">
              Analysis Complete
            </p>
            <h1 className="mt-1 font-heading text-3xl font-bold text-white sm:text-4xl">
              Activity Analysis
              <span className="ml-3 gradient-text" style={{
                background: "linear-gradient(135deg, #60A5FA, #A78BFA)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                Results
              </span>
            </h1>
            <p className="mt-1 font-heading text-[10px] text-slate-500 tracking-widest">
              RUN · {run_id.split("-")[0].toUpperCase()}
            </p>
          </div>
          <DepartmentFilter departments={departments} selected={dept} onChange={setDept} />
        </div>
      </div>

      {/* KPI row */}
      <KPICards results={filteredResults} filteredDept={dept} />

      {/* Tabs */}
      <div className="mt-8 border-b border-slate-200">
        <nav className="flex gap-0.5" role="tablist" aria-label="Result sections">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`group flex items-center gap-2 rounded-t-xl px-5 py-3 text-sm font-medium transition-all ${
                tab === key
                  ? "border-b-2 border-brand-primary bg-white text-brand-primary shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              <Icon className={`size-3.5 ${tab === key ? "text-brand-primary" : "text-slate-400 group-hover:text-slate-500"}`} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div role="tabpanel" className="mt-6">
        {tab === "summary"     && <NarrativeSummary narrative={filteredResults.narrative} />}
        {tab === "duplication" && <DuplicationPanel pairs={filteredResults.duplication} />}
        {tab === "automation"  && <AutomationPanel activities={filteredResults.automation} />}
        {tab === "resource"    && <ResourcePanel employees={filteredResults.resource} />}
        {tab === "charts"      && <ChartsPanel results={filteredResults} />}
      </div>
    </div>
  );
}
