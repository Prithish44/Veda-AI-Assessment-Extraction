"use client";

import clsx from "clsx";
import { ExtractedAnswer } from "@/lib/types";

interface Props {
  answers: ExtractedAnswer[];
  selectedId: string | null;
  onSelect: (a: ExtractedAnswer) => void;
}

export default function UnmatchedAnswers({ answers, selectedId, onSelect }: Props) {
  if (answers.length === 0) return null;

  return (
    <div className="border-t border-border shrink-0">
      <div className="px-5 py-2.5 bg-warn-light border-b border-border">
        <p className="text-xs font-medium text-warn">
          Written on the sheet but not matched to a question ({answers.length})
        </p>
      </div>
      <ul className="divide-y divide-border max-h-48 overflow-y-auto scrollbar-thin">
        {answers.map((a) => (
          <li key={a.id}>
            <button
              onClick={() => onSelect(a)}
              className={clsx(
                "w-full text-left px-5 py-3 hover:bg-canvas transition-colors",
                selectedId === a.id && "bg-canvas"
              )}
            >
              <p className="text-[11px] font-medium text-muted mb-1">
                {a.questionNumber ? `labelled "${a.questionNumber}" — no matching question` : "no label found"}
              </p>
              <p className="text-sm text-ink line-clamp-2">{a.text || <em className="text-muted">(illegible)</em>}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
