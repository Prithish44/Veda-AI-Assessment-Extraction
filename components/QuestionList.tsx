"use client";

import { useState } from "react";
import { Search, ArrowUpDown, SlidersHorizontal, ChevronDown } from "lucide-react";
import clsx from "clsx";
import { Grading, MappedQuestion } from "@/lib/types";

interface Props {
  questions: MappedQuestion[];
  selectedId: string | null;
  onSelect: (q: MappedQuestion) => void;
  gradings: Record<string, Grading>;
}

const verdictTone: Record<string, { pill: string; box: string }> = {
  correct: { pill: "bg-good-light text-good border-good/20", box: "bg-good-light border-good/20 text-ink" },
  partial: { pill: "bg-warn-light text-warn border-warn/30", box: "bg-warn-light border-warn/30 text-ink" },
  incorrect: { pill: "bg-bad-light text-bad border-bad/20", box: "bg-bad-light border-bad/20 text-ink" },
  ungraded: { pill: "bg-canvas text-muted border-border", box: "bg-canvas border-border text-ink" },
};

export default function QuestionList({ questions, selectedId, onSelect, gradings }: Props) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? questions.filter(
        (q) =>
          q.text.toLowerCase().includes(query.toLowerCase()) ||
          q.number.toLowerCase().includes(query.toLowerCase())
      )
    : questions;

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-ink">Extracted Questions from question paper</h2>
          <div className="flex items-center gap-1 text-muted shrink-0">
            <button className="w-7 h-7 rounded-md hover:bg-canvas flex items-center justify-center" title="Sort">
              <ArrowUpDown size={14} />
            </button>
            <button className="w-7 h-7 rounded-md hover:bg-canvas flex items-center justify-center" title="Filter">
              <SlidersHorizontal size={14} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-canvas border border-border">
          <Search size={14} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions"
            className="bg-transparent text-sm text-ink placeholder:text-muted outline-none flex-1"
          />
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-border">
        {filtered.map((q) => {
          const grading = gradings[q.id];
          const selected = q.id === selectedId;
          const tone = verdictTone[grading?.verdict || "ungraded"];
          return (
            <li key={q.id}>
              <button onClick={() => onSelect(q)} className="w-full text-left px-5 py-4 hover:bg-canvas/70 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-canvas border border-border flex items-center justify-center text-[11px] font-medium text-ink shrink-0 mt-0.5">
                    {shortNumber(q.number)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={clsx("block text-sm text-ink leading-snug", selected ? "" : "line-clamp-2")}>
                      {q.text || <span className="italic text-muted">(no text extracted)</span>}
                    </span>
                    <span className="flex items-center gap-1.5 mt-1.5">
                      {!grading && (
                        <span
                          className={clsx(
                            "text-[11px] px-2 py-0.5 rounded-full border",
                            q.status === "answered"
                              ? "bg-good-light text-good border-good/20"
                              : "bg-warn-light text-warn border-warn/30"
                          )}
                        >
                          {q.status === "answered" ? "Answered" : "Not answered"}
                        </span>
                      )}
                      {q.maxMarks != null && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-canvas text-muted">
                          {q.maxMarks} {q.maxMarks === 1 ? "mark" : "marks"}
                        </span>
                      )}
                    </span>
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {grading && (
                      <span className={clsx("text-xs font-semibold px-2 py-0.5 rounded-full border", tone.pill)}>
                        {grading.score}/{grading.maxScore}
                      </span>
                    )}
                    <ChevronDown
                      size={15}
                      className={clsx("text-muted transition-transform", selected && "rotate-180")}
                    />
                  </div>
                </div>

                {selected && (
                  <div className="mt-3 ml-9 space-y-2 expand-in">
                    <div>
                      <p className="text-[11px] font-medium text-muted mb-1">Student&rsquo;s answer</p>
                      {q.answer ? (
                        <p className="text-sm text-ink whitespace-pre-line bg-canvas border border-border rounded-lg px-3 py-2">
                          {q.answer.text || "(illegible)"}
                        </p>
                      ) : (
                        <p className="text-sm italic text-warn">No answer found for this question.</p>
                      )}
                    </div>
                    {grading && (
                      <div className={clsx("rounded-lg border px-3 py-2", tone.box)}>
                        <p className="text-[11px] font-medium mb-1 capitalize">{grading.verdict} feedback</p>
                        <p className="text-sm">{grading.feedback}</p>
                      </div>
                    )}
                  </div>
                )}
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-5 py-8 text-center text-sm text-muted">No questions match &ldquo;{query}&rdquo;</li>
        )}
      </ul>
    </div>
  );
}

function shortNumber(n: string): string {
  return n.length > 4 ? n.slice(0, 4) : n;
}
