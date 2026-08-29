"use client";

import { Sparkles } from "lucide-react";
import { ProcessingStage } from "@/lib/types";

const STAGE_LABEL: Record<string, string> = {
  "reading-question-paper": "Reading question paper...",
  "reading-answer-sheet": "Reading answer sheet...",
  "extracting-questions": "Extracting questions...",
  "extracting-answers": "Extracting answers...",
  mapping: "Mapping answers...",
  grading: "Grading with AI...",
};

export default function LoadingScreen({ stage }: { stage: ProcessingStage }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-surface">
      <Sparkles size={40} className="text-brand sparkle-spin mb-5" strokeWidth={1.75} />
      <p className="text-base font-medium text-ink">{STAGE_LABEL[stage] || "Extracting..."}</p>
      <p className="text-sm text-muted mt-1">This may take a while</p>
    </div>
  );
}
