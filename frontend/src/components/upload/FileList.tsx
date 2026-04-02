import { FileSpreadsheet, X } from "lucide-react";

interface FileListProps {
  files: File[];
  onRemove: (index: number) => void;
}

export default function FileList({ files, onRemove }: FileListProps) {
  if (!files.length) return null;

  return (
    <ul className="mt-4 space-y-2" aria-label="Selected files">
      {files.map((f, i) => (
        <li
          key={`${f.name}-${i}`}
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm"
        >
          <FileSpreadsheet className="size-4 shrink-0 text-brand-primary" />
          <span className="flex-1 truncate font-medium text-brand-text">{f.name}</span>
          <span className="shrink-0 text-xs text-slate-400">
            {(f.size / 1024).toFixed(0)} KB
          </span>
          <button
            onClick={() => onRemove(i)}
            className="shrink-0 rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
            aria-label={`Remove ${f.name}`}
          >
            <X className="size-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}
