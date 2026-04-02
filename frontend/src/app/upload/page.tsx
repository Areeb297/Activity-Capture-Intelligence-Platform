"use client";
import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Info, ArrowLeft } from "lucide-react";
import Link from "next/link";
import DropZone from "@/components/upload/DropZone";
import FileList from "@/components/upload/FileList";
import Spinner from "@/components/ui/Spinner";
import { uploadFiles, startAnalysis } from "@/lib/api";

type Stage = "idle" | "uploading" | "starting" | "error";

export default function UploadPage() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [files, setFiles]   = useState<File[]>([]);
  const [stage, setStage]   = useState<Stage>("idle");
  const [error, setError]   = useState<string | null>(null);

  const addFiles = useCallback((incoming: File[]) => {
    startTransition(() => {
      setFiles((prev) => {
        const existing = new Set(prev.map((f) => f.name));
        return [...prev, ...incoming.filter((f) => !existing.has(f.name))];
      });
    });
  }, []);

  const removeFile = useCallback((i: number) => {
    startTransition(() => {
      setFiles((prev) => prev.filter((_, idx) => idx !== i));
    });
  }, []);

  const handleSubmit = async () => {
    if (!files.length) return;
    setError(null);
    try {
      setStage("uploading");
      const upload = await uploadFiles(files);

      setStage("starting");
      const { run_id } = await startAnalysis(upload.submission_id);

      router.push(
        `/status/${run_id}?submission=${upload.submission_id}&employees=${upload.employee_count ?? files.length}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setStage("error");
    }
  };

  const busy = stage === "uploading" || stage === "starting";

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back link */}
      <Link
        href="/"
        className="mb-6 flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-primary"
      >
        <ArrowLeft className="size-3.5" /> Back to home
      </Link>

      {/* Heading */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold text-brand-text">
          Upload Activity Files
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Upload all completed Activity Capture Templates — one file per employee.
          The system reads only the{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 font-heading text-xs">Survey</code>{" "}
          sheet from each file. All{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 font-heading text-xs">Smpl-*</code>{" "}
          sample sheets are ignored.
        </p>
      </div>

      {/* Info banner */}
      <div className="mb-5 flex gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          Collect all returned Excel files from employees and upload them together.
          The analysis compares activities <strong>across all employees</strong> in the batch.
        </p>
      </div>

      <DropZone onFiles={addFiles} disabled={busy} />
      <FileList files={files} onRemove={removeFile} />

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {files.length > 0
            ? `${files.length} file${files.length > 1 ? "s" : ""} ready`
            : "No files selected"}
        </p>
        <button
          onClick={handleSubmit}
          disabled={!files.length || busy}
          className="flex min-h-[44px] items-center gap-2 rounded-lg bg-brand-primary px-5 py-2.5 font-heading text-sm font-semibold text-white hover:bg-brand-secondary disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Upload and analyse"
        >
          {busy ? (
            <>
              <Spinner className="size-4" />
              {stage === "uploading" ? "Uploading…" : "Starting analysis…"}
            </>
          ) : (
            <>
              Upload &amp; Analyse
              <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
