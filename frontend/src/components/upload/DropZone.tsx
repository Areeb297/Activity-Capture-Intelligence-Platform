"use client";
import { useCallback, useState } from "react";
import { UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export default function DropZone({ onFiles, disabled }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);

  const handle = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const xlsx = Array.from(files).filter((f) =>
        f.name.endsWith(".xlsx") || f.name.endsWith(".xls"),
      );
      if (xlsx.length) onFiles(xlsx);
    },
    [onFiles],
  );

  return (
    <label
      className={cn(
        "flex min-h-52 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-slate-300 bg-white px-8 py-10 text-center",
        "hover:border-brand-primary hover:bg-blue-50/40",
        dragging && "border-brand-primary bg-blue-50",
        disabled && "pointer-events-none opacity-50",
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files); }}
      aria-label="Upload Excel files"
    >
      <UploadCloud
        className={cn("size-10 text-slate-400", dragging && "text-brand-primary")}
        strokeWidth={1.5}
      />
      <div>
        <p className="font-heading text-sm font-semibold text-brand-text">
          Drop Excel files here or <span className="text-brand-primary underline">browse</span>
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Upload all returned Activity Capture Templates (.xlsx) at once
        </p>
      </div>
      <input
        type="file"
        accept=".xlsx,.xls"
        multiple
        className="sr-only"
        onChange={(e) => handle(e.target.files)}
        disabled={disabled}
      />
    </label>
  );
}
