"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import clsx from "clsx";

interface Props {
  label: string;
  accept?: string;
  file: File | null;
  onChange: (file: File | null) => void;
}

export default function UploadDropzone({ label, accept, file, onChange }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f) onChange(f);
    },
    [onChange]
  );

  if (file) {
    return (
      <div className="flex-1 flex items-center gap-3 rounded-xl border border-border bg-canvas px-4 py-3.5">
        <div className="w-9 h-9 rounded-lg bg-brand-light flex items-center justify-center shrink-0">
          <FileText size={16} className="text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink truncate">{file.name}</p>
          <p className="text-xs text-muted">{(file.size / 1024).toFixed(0)} KB</p>
        </div>
        <button
          onClick={() => onChange(null)}
          className="w-6 h-6 rounded-full flex items-center justify-center text-muted hover:bg-border shrink-0"
          aria-label={`Remove ${label}`}
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={clsx(
        "flex-1 cursor-pointer rounded-xl border-2 border-dashed px-4 py-5 flex flex-col items-center text-center gap-2 transition-colors",
        dragging ? "border-brand bg-brand-light" : "border-border bg-canvas hover:border-brand/50"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />
      <div className="w-9 h-9 rounded-full bg-surface border border-border flex items-center justify-center">
        <Upload size={16} className="text-muted" />
      </div>
      <p className="text-sm text-ink">
        Upload <span className="font-medium">{label}</span>
      </p>
      <p className="text-[11px] text-muted">PDF or image</p>
    </div>
  );
}
