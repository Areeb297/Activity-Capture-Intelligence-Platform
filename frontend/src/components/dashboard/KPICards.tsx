"use client";
import { useEffect, useRef, useState } from "react";
import { Copy, Zap, Users, FileText } from "lucide-react";
import type { Results } from "@/lib/types";

interface Props {
  results: Results;
  filteredDept: string;
}

// Animated number counter
function CountUp({ target }: { target: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (target === 0) { setDisplay(0); return; }
    let start = 0;
    const steps = 30;
    const inc = target / steps;
    const timer = setInterval(() => {
      start += inc;
      if (start >= target) { setDisplay(target); clearInterval(timer); }
      else setDisplay(Math.round(start));
    }, 20);
    return () => clearInterval(timer);
  }, [target]);
  return <>{display}</>;
}

// Mouse-reactive glow card
function GlowKPICard({
  label, value, icon: Icon, gradient, shadow,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  gradient: string;
  shadow: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    ref.current!.style.setProperty("--mouse-x", `${x}%`);
    ref.current!.style.setProperty("--mouse-y", `${y}%`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className="glow-card group relative rounded-2xl border border-slate-200 bg-white p-6 cursor-default"
    >
      {/* Gradient accent top-left */}
      <div className={`absolute -top-px left-6 h-0.5 w-12 rounded-full ${gradient} opacity-80`} />

      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400">{label}</p>
          <p className={`mt-2 font-heading text-4xl font-bold tabular-nums count-up ${gradient.includes("red") ? "text-red-600" : gradient.includes("amber") ? "text-amber-600" : gradient.includes("orange") ? "text-orange-500" : "text-brand-primary"}`}>
            <CountUp target={value} />
          </p>
        </div>
        <div className={`rounded-xl p-2.5 ${shadow}`}>
          <Icon className="size-5" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}

export default function KPICards({ results, filteredDept }: Props) {
  const dupCount = results.duplication.filter(
    (d) => d.duplicate_type === "True Duplicate" &&
      (filteredDept === "All" || d.function_a === filteredDept || d.function_b === filteredDept),
  ).length;

  const highAutoCount = results.automation.filter(
    (a) => a.automation_score >= 70 &&
      (filteredDept === "All" || (a.function ?? "") === filteredDept),
  ).length;

  const overloadCount = results.resource.filter(
    (r) => r.overloaded &&
      (filteredDept === "All" || r.function === filteredDept),
  ).length;

  const actionCount = results.narrative.action_items.length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <GlowKPICard
        label="True Duplicates"
        value={dupCount}
        icon={Copy}
        gradient="bg-gradient-to-r from-red-500 to-rose-500"
        shadow="bg-red-50 text-red-500"
      />
      <GlowKPICard
        label="High Automation Cases"
        value={highAutoCount}
        icon={Zap}
        gradient="bg-gradient-to-r from-amber-500 to-yellow-400"
        shadow="bg-amber-50 text-amber-500"
      />
      <GlowKPICard
        label="Overloaded Employees"
        value={overloadCount}
        icon={Users}
        gradient="bg-gradient-to-r from-orange-500 to-red-400"
        shadow="bg-orange-50 text-orange-500"
      />
      <GlowKPICard
        label="Action Items"
        value={actionCount}
        icon={FileText}
        gradient="bg-gradient-to-r from-blue-500 to-indigo-500"
        shadow="bg-blue-50 text-blue-600"
      />
    </div>
  );
}
