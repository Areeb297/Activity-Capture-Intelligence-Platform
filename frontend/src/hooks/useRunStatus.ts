"use client";
import { useEffect, useState, useCallback } from "react";
import { getRunStatus } from "@/lib/api";
import type { RunStatus } from "@/lib/types";

export function useRunStatus(runId: string | null, intervalMs = 2500) {
  const [status, setStatus] = useState<RunStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    if (!runId) return;
    try {
      const data = await getRunStatus(runId);
      setStatus(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Polling failed");
    }
  }, [runId]);

  useEffect(() => {
    poll();
    if (!runId) return;
    const id = setInterval(() => {
      poll();
    }, intervalMs);
    return () => clearInterval(id);
  }, [poll, runId, intervalMs]);

  // Stop polling once complete or failed
  useEffect(() => {
    if (status?.status === "complete" || status?.status === "failed") {
      // hook consumers can react to terminal state
    }
  }, [status]);

  return { status, error };
}
