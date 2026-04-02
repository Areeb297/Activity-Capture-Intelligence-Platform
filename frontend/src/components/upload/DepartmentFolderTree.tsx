"use client";
import { useState } from "react";
import { Folder, FolderOpen, User, ChevronRight } from "lucide-react";

interface Props {
  departments: Record<string, string[]>;
}

export default function DepartmentFolderTree({ departments }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(Object.keys(departments).map((k) => [k, true]))
  );

  const depts = Object.entries(departments);

  return (
    <div className="mt-5 rounded-xl border border-green-200 bg-green-50 px-4 py-4">
      <p className="mb-3 font-heading text-xs font-semibold uppercase tracking-widest text-green-700">
        Uploaded — {depts.reduce((n, [, emps]) => n + emps.length, 0)} employees across {depts.length} department{depts.length !== 1 ? "s" : ""}
      </p>
      <ul className="space-y-1">
        {depts.map(([dept, employees]) => (
          <li key={dept}>
            <button
              onClick={() => setOpen((prev) => ({ ...prev, [dept]: !prev[dept] }))}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-slate-700 hover:bg-green-100 transition-colors"
            >
              <ChevronRight
                className={`size-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${open[dept] ? "rotate-90" : ""}`}
              />
              {open[dept]
                ? <FolderOpen className="size-4 shrink-0 text-amber-500" />
                : <Folder className="size-4 shrink-0 text-amber-500" />
              }
              <span className="flex-1 truncate">{dept}</span>
              <span className="ml-auto shrink-0 rounded-full bg-green-200 px-1.5 py-0.5 font-heading text-[10px] font-bold text-green-700">
                {employees.length}
              </span>
            </button>

            {open[dept] && (
              <ul className="ml-7 mt-0.5 space-y-0.5">
                {employees.map((name, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-slate-600"
                  >
                    <User className="size-3.5 shrink-0 text-slate-400" />
                    {name}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
