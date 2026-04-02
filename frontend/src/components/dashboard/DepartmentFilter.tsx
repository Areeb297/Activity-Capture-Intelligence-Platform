"use client";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  departments: string[];
  selected: string;
  onChange: (dept: string) => void;
}

export default function DepartmentFilter({ departments, selected, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Building2 className="size-3.5" /> Department
      </span>
      <button
        onClick={() => onChange("All")}
        className={cn(
          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
          selected === "All"
            ? "border-brand-primary bg-brand-primary text-white"
            : "border-slate-200 bg-white text-slate-600 hover:border-brand-secondary hover:text-brand-primary",
        )}
        aria-pressed={selected === "All"}
      >
        All
      </button>
      {departments.map((dept) => (
        <button
          key={dept}
          onClick={() => onChange(dept)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            selected === dept
              ? "border-brand-primary bg-brand-primary text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-brand-secondary hover:text-brand-primary",
          )}
          aria-pressed={selected === dept}
        >
          {dept}
        </button>
      ))}
    </div>
  );
}
