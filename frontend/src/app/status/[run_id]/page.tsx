"use client";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";
import AgentStatusCards from "@/components/progress/AgentStatusCards";
import Spinner from "@/components/ui/Spinner";
import { useRunStatus } from "@/hooks/useRunStatus";
import { ArrowRight } from "lucide-react";

function StatusContent() {
  const { run_id } = useParams<{ run_id: string }>();
  const params     = useSearchParams();
  const router     = useRouter();

  const rawEmployees = params.get("employees");
  const employees    = rawEmployees && rawEmployees !== "undefined" ? rawEmployees : null;

  const { status, error } = useRunStatus(run_id);

  useEffect(() => {
    if (status?.status === "complete") {
      router.push(`/results/${run_id}`);
    }
  }, [status, run_id, router]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-brand-text">Analysis in Progress</h1>
        <p className="mt-2 text-sm text-slate-500">
          {employees
            ? <>Running across <strong>{employees}</strong> employee submission{Number(employees) !== 1 ? "s" : ""}.</>
            : <>Running analysis across uploaded submissions.</>
          }{" "}
          This typically takes 30–90 seconds.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {!status ? (
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Spinner className="size-5" /> Connecting…
        </div>
      ) : (
        <>
          <AgentStatusCards runStatus={status} />

          <div className="mt-6 rounded-lg border border-slate-200 bg-white px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Overall</span>
              <span className={`font-heading text-sm font-semibold capitalize ${
                status.status === "failed"   ? "text-red-500" :
                status.status === "complete" ? "text-green-600" :
                "text-brand-primary"
              }`}>
                {status.status === "complete" ? "Done — redirecting…" : status.status}
              </span>
            </div>
          </div>

          {status.status === "complete" && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => router.push(`/results/${run_id}`)}
                className="flex min-h-[44px] items-center gap-2 rounded-lg bg-brand-cta px-5 py-2.5 font-heading text-sm font-semibold text-white hover:opacity-90"
              >
                View Results <ArrowRight className="size-4" />
              </button>
            </div>
          )}

          {status.status === "failed" && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Analysis failed. Check that your API keys are set in{" "}
              <code className="font-heading text-xs">backend/.env</code> and try again.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <Spinner className="size-5" /> Loading…
      </div>
    }>
      <StatusContent />
    </Suspense>
  );
}
