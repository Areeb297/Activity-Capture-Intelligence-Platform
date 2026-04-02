"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Trash2, Users, FileText,
  CheckCircle, XCircle, Clock, Loader2, RefreshCw,
} from "lucide-react";
import { getHistory, deleteSubmission } from "@/lib/api";
import type { HistoryRun } from "@/lib/types";

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400">
      No run
    </span>
  );
  const styles: Record<string, string> = {
    complete: "bg-green-100 text-green-700",
    running:  "bg-blue-100 text-blue-700",
    failed:   "bg-red-100 text-red-700",
    pending:  "bg-amber-100 text-amber-700",
  };
  const Icon = status === "complete" ? CheckCircle
    : status === "running"  ? Loader2
    : status === "failed"   ? XCircle
    : Clock;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${styles[status] ?? styles.pending}`}>
      <Icon className={`size-3 ${status === "running" ? "animate-spin" : ""}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function HistoryPage() {
  const router = useRouter();
  const [runs, setRuns]             = useState<HistoryRun[]>([]);
  const [loading, setLoading]       = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setRuns(await getHistory());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this submission and all its results? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await deleteSubmission(id);
      setRuns((prev) => prev.filter((r) => r.submission_id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="animated-gradient -mx-6 -mt-8 mb-8 px-6 py-10">
        <Link href="/" className="mb-4 flex items-center gap-1.5 text-xs text-blue-300 hover:text-white transition-colors">
          <ArrowLeft className="size-3.5" /> Home
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-heading text-xs font-semibold uppercase tracking-widest text-blue-300/70">All Runs</p>
            <h1 className="mt-1 font-heading text-3xl font-bold text-white">
              Analysis{" "}
              <span style={{ background: "linear-gradient(135deg,#60A5FA,#A78BFA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                History
              </span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">All past uploads and their analysis results.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold text-slate-300 backdrop-blur-sm hover:bg-white/12 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <Link href="/upload" className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-all">
              New Analysis <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {loading && !runs.length ? (
        <div className="flex items-center justify-center py-20 text-sm text-slate-400">
          <Loader2 className="mr-2 size-5 animate-spin" /> Loading history…
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <FileText className="mx-auto mb-3 size-10 text-slate-300" />
          <p className="font-heading text-sm font-semibold text-slate-500">No analyses yet</p>
          <p className="mt-1 text-xs text-slate-400">Upload your first batch of activity files to get started.</p>
          <Link href="/upload" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-all">
            Upload Files <ArrowRight className="size-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((r) => (
            <div
              key={r.submission_id}
              className={`glow-card rounded-2xl border bg-white p-5 transition-all ${
                r.status === "complete"
                  ? "border-green-200 hover:border-green-300 hover:shadow-md hover:shadow-green-500/10"
                  : r.status === "failed" ? "border-red-200"
                  : "border-slate-200"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-heading text-sm font-semibold text-slate-800">{r.batch_label}</p>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Uploaded {formatDate(r.uploaded_at)}
                    {r.completed_at && <> · Completed {formatDate(r.completed_at)}</>}
                  </p>

                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Users className="size-3.5 text-blue-400" />
                      <strong>{r.employee_count}</strong>&nbsp;employee{r.employee_count !== 1 ? "s" : ""}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <FileText className="size-3.5 text-violet-400" />
                      <strong>{r.activity_count}</strong>&nbsp;activities
                    </div>
                    {r.run_id && (
                      <span className="font-mono text-xs text-slate-400">
                        RUN · {r.run_id.split("-")[0].toUpperCase()}
                      </span>
                    )}
                  </div>

                  {r.run_id && r.status !== "complete" && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {([
                        ["Duplication", r.duplication_status],
                        ["Automation",  r.automation_status ],
                        ["Resource",    r.resource_status   ],
                        ["Narrative",   r.narrative_status  ],
                      ] as [string, string | null][]).map(([label, st]) => (
                        <span key={label} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${
                          st === "complete" ? "bg-green-50 text-green-600 border-green-200"
                          : st === "running"  ? "bg-blue-50 text-blue-600 border-blue-200"
                          : st === "failed"   ? "bg-red-50 text-red-600 border-red-200"
                          : "bg-slate-50 text-slate-400 border-slate-200"
                        }`}>
                          {st === "running" && <span className="size-1.5 rounded-full bg-blue-500 animate-ping inline-block" />}
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {r.status === "complete" && r.run_id ? (
                    <button
                      onClick={() => router.push(`/results/${r.run_id}`)}
                      className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-all"
                    >
                      View Results <ArrowRight className="size-3.5" />
                    </button>
                  ) : r.status === "running" && r.run_id ? (
                    <button
                      onClick={() => router.push(`/status/${r.run_id}`)}
                      className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-all"
                    >
                      <Loader2 className="size-3.5 animate-spin" /> In Progress
                    </button>
                  ) : null}

                  <button
                    onClick={() => handleDelete(r.submission_id)}
                    disabled={deletingId === r.submission_id}
                    className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-2 text-red-500 hover:bg-red-100 transition-all disabled:opacity-50"
                    aria-label="Delete"
                  >
                    {deletingId === r.submission_id
                      ? <Loader2 className="size-4 animate-spin" />
                      : <Trash2 className="size-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
