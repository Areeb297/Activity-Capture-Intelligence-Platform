import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function pct(val: number) {
  return `${Math.round(val * 100)}%`;
}

export function scoreColor(score: number): string {
  if (score >= 75) return "text-red-600 bg-red-50";
  if (score >= 50) return "text-amber-600 bg-amber-50";
  return "text-green-600 bg-green-50";
}

export function verdictColor(verdict: string): string {
  if (verdict === "True Duplicate") return "bg-red-100 text-red-700";
  if (verdict === "Partial Overlap") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}
