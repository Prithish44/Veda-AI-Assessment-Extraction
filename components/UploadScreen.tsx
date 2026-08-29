"use client";

import { GraduationCap } from "lucide-react";
import UploadDropzone from "./UploadDropzone";

interface Props {
  questionFile: File | null;
  answerFile: File | null;
  onQuestionFile: (f: File | null) => void;
  onAnswerFile: (f: File | null) => void;
  enableGrading: boolean;
  onEnableGrading: (v: boolean) => void;
  defaultMaxMarks: number;
  onDefaultMaxMarks: (v: number) => void;
  onSubmit: () => void;
}

export default function UploadScreen({
  questionFile,
  answerFile,
  onQuestionFile,
  onAnswerFile,
  enableGrading,
  onEnableGrading,
  defaultMaxMarks,
  onDefaultMaxMarks,
  onSubmit,
}: Props) {
  const canSubmit = Boolean(questionFile && answerFile);

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-card px-8 py-10 text-center">
        <div className="w-16 h-16 rounded-full bg-brand-light border border-brand/20 flex items-center justify-center mx-auto mb-5">
          <GraduationCap size={26} className="text-brand" />
        </div>

        <h1 className="text-xl font-semibold text-ink">
          Upload <span className="text-brand">Question Paper &amp; Answer Sheets</span>
        </h1>
        <p className="text-sm text-muted mt-1.5 mb-7">Upload both files to get started</p>

        <div className="flex gap-3">
          <UploadDropzone
            label="Question Paper"
            accept="application/pdf,image/*"
            file={questionFile}
            onChange={onQuestionFile}
          />
          <UploadDropzone
            label="Answer Sheet"
            accept="application/pdf,image/*"
            file={answerFile}
            onChange={onAnswerFile}
          />
        </div>

        <label className="flex items-center justify-center gap-2 mt-6 text-sm text-ink">
          <input
            type="checkbox"
            checked={enableGrading}
            onChange={(e) => onEnableGrading(e.target.checked)}
            className="accent-brand"
          />
          Also grade answers with AI feedback
        </label>

        {enableGrading && (
          <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted">
            <span>Fallback marks per question</span>
            <input
              type="number"
              min={1}
              max={100}
              value={defaultMaxMarks}
              onChange={(e) => onDefaultMaxMarks(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-14 text-center rounded-md border border-border bg-canvas py-1 text-ink outline-none focus:border-brand"
            />
            <span
              className="text-[11px] text-muted cursor-help"
              title="Used only when a question's marks aren't printed on the paper. Questions with marks printed on the paper always use that value instead."
            >
              (used only if not printed on the paper)
            </span>
          </div>
        )}

        <button
          disabled={!canSubmit}
          onClick={onSubmit}
          className="w-full mt-7 py-2.5 rounded-xl bg-brand text-white text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand-dark transition-colors"
        >
          Extract &amp; map answers
        </button>
      </div>
    </div>
  );
}
