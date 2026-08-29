"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import Sidebar from "@/components/Sidebar";
import UploadScreen from "@/components/UploadScreen";
import LoadingScreen from "@/components/LoadingScreen";
import QuestionList from "@/components/QuestionList";
import UnmatchedAnswers from "@/components/UnmatchedAnswers";
import AnswerSheetViewer from "@/components/AnswerSheetViewer";
import { convertFileToPageImages } from "@/lib/pdfToImages";
import { mapAnswersToQuestions } from "@/lib/matching";
import {
  DEFAULT_MAX_MARKS,
  ExtractedAnswer,
  ExtractedQuestion,
  Grading,
  MappedQuestion,
  PageImage,
  ProcessingStage,
} from "@/lib/types";

export default function Home() {
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [enableGrading, setEnableGrading] = useState(true);
  const [defaultMaxMarks, setDefaultMaxMarks] = useState(DEFAULT_MAX_MARKS);

  const [stage, setStage] = useState<ProcessingStage>("idle");
  const [error, setError] = useState<string | null>(null);

  const [answerPages, setAnswerPages] = useState<PageImage[]>([]);
  const [mappedQuestions, setMappedQuestions] = useState<MappedQuestion[]>([]);
  const [unmatchedAnswers, setUnmatchedAnswers] = useState<ExtractedAnswer[]>([]);
  const [gradings, setGradings] = useState<Record<string, Grading>>({});
  const [isGrading, setIsGrading] = useState(false);

  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [selectedUnmatchedId, setSelectedUnmatchedId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"questions" | "sheet">("questions");

  const isProcessing = !["idle", "done", "error"].includes(stage);

  async function handleProcess() {
    if (!questionFile || !answerFile) return;
    setError(null);
    try {
      setStage("reading-question-paper");
      const qPages = await convertFileToPageImages(questionFile);

      setStage("reading-answer-sheet");
      const aPages = await convertFileToPageImages(answerFile);
      setAnswerPages(aPages);

      setStage("extracting-questions");
      const qRes = await fetch("/api/extract-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: qPages.map((p) => ({ page: p.page, mimeType: p.mimeType, base64: p.base64 })),
          defaultMaxMarks,
        }),
      });
      const qJson = await qRes.json();
      if (!qRes.ok) throw new Error(qJson.error || "Failed to extract questions");
      const questions: ExtractedQuestion[] = qJson.questions;
      if (!questions.length) {
        throw new Error(
          "No questions could be extracted from the question paper. Try a clearer scan or a different file."
        );
      }

      setStage("extracting-answers");
      const aRes = await fetch("/api/extract-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: aPages.map((p) => ({ page: p.page, mimeType: p.mimeType, base64: p.base64 })),
        }),
      });
      const aJson = await aRes.json();
      if (!aRes.ok) throw new Error(aJson.error || "Failed to extract answers");
      const answers: ExtractedAnswer[] = aJson.answers;

      setStage("mapping");
      const { mapped, unmatchedAnswers: unmatched } = mapAnswersToQuestions(questions, answers);
      setMappedQuestions(mapped);
      setUnmatchedAnswers(unmatched);

      if (enableGrading) {
        setStage("grading");
        setIsGrading(true);
        const items = mapped
          .filter((m) => m.answer)
          .map((m) => ({
            questionId: m.id,
            questionNumber: m.number,
            questionText: m.text,
            answerText: m.answer!.text,
            maxMarks: m.maxMarks ?? defaultMaxMarks,
          }));
        if (items.length > 0) {
          const gRes = await fetch("/api/grade", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items }),
          });
          const gJson = await gRes.json();
          if (gRes.ok) {
            const map: Record<string, Grading> = {};
            for (const g of gJson.gradings as Grading[]) map[g.questionId] = g;
            setGradings(map);
          }
        }
        setIsGrading(false);
      }

      setStage("done");
      setSelectedQuestionId(mapped[0]?.id ?? null);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Something went wrong. Please try again.");
      setStage("error");
      setIsGrading(false);
    }
  }

  function reset() {
    setQuestionFile(null);
    setAnswerFile(null);
    setStage("idle");
    setError(null);
    setAnswerPages([]);
    setMappedQuestions([]);
    setUnmatchedAnswers([]);
    setGradings({});
    setSelectedQuestionId(null);
    setSelectedUnmatchedId(null);
  }

  const selectedQuestion = useMemo(
    () => mappedQuestions.find((q) => q.id === selectedQuestionId) || null,
    [mappedQuestions, selectedQuestionId]
  );
  const selectedUnmatched = useMemo(
    () => unmatchedAnswers.find((a) => a.id === selectedUnmatchedId) || null,
    [unmatchedAnswers, selectedUnmatchedId]
  );
  const regions = selectedQuestion?.answer?.regions || selectedUnmatched?.regions || [];
  const viewerLabel = regions.length > 0 && selectedQuestion ? `Q${selectedQuestion.number}` : null;

  const total = mappedQuestions.length;
  const answered = mappedQuestions.filter((q) => q.status === "answered").length;
  const gradedList = Object.values(gradings);
  const totalObtained = gradedList.reduce((s, g) => s + g.score, 0);
  const totalPossible = gradedList.reduce((s, g) => s + g.maxScore, 0);
  const hasGrades = gradedList.length > 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-6 shrink-0">
          <div>
            <p className="text-[11px] text-muted">Assessments</p>
            <h1 className="text-sm font-semibold text-ink">Question &ndash; Answer Mapping</h1>
          </div>
          <div className="flex items-center gap-4">
            {stage === "done" && (
              <div className="hidden sm:flex items-center gap-4 text-xs">
                <Stat value={total} label="questions" />
                <Stat value={answered} label="answered" tone="good" />
                <Stat value={total - answered} label="unanswered" tone="warn" />
                {hasGrades && (
                  <Stat
                    value={`${trimTrailingZero(totalObtained)}/${trimTrailingZero(totalPossible)}`}
                    label="total marks"
                    tone="brand"
                  />
                )}
              </div>
            )}
            {stage === "done" && (
              <button onClick={reset} className="text-xs font-medium text-muted hover:text-brand underline underline-offset-2">
                Start over
              </button>
            )}
          </div>
        </header>

        {stage === "idle" && (
          <UploadScreen
            questionFile={questionFile}
            answerFile={answerFile}
            onQuestionFile={setQuestionFile}
            onAnswerFile={setAnswerFile}
            enableGrading={enableGrading}
            onEnableGrading={setEnableGrading}
            defaultMaxMarks={defaultMaxMarks}
            onDefaultMaxMarks={setDefaultMaxMarks}
            onSubmit={handleProcess}
          />
        )}

        {isProcessing && <LoadingScreen stage={stage} />}

        {stage === "error" && (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="max-w-md text-center">
              <p className="text-bad font-medium mb-2">Something went wrong</p>
              <p className="text-sm text-muted mb-6">{error}</p>
              <div className="flex justify-center gap-3">
                <button onClick={handleProcess} className="px-4 py-2 rounded-lg bg-ink text-white text-sm">
                  Try again
                </button>
                <button onClick={reset} className="px-4 py-2 rounded-lg border border-border text-sm">
                  Start over
                </button>
              </div>
            </div>
          </div>
        )}

        {stage === "done" && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex md:hidden border-b border-border shrink-0">
              <TabButton active={mobileTab === "questions"} onClick={() => setMobileTab("questions")}>
                Questions
              </TabButton>
              <TabButton active={mobileTab === "sheet"} onClick={() => setMobileTab("sheet")}>
                Answer Sheet
              </TabButton>
            </div>

            <div className="flex-1 grid md:grid-cols-[400px_1fr] min-h-0">
              <div
                className={clsx(
                  "md:flex flex-col min-h-0 border-r border-border bg-surface",
                  mobileTab === "questions" ? "flex" : "hidden"
                )}
              >
                <div className="flex-1 min-h-0 flex flex-col">
                  <QuestionList
                    questions={mappedQuestions}
                    selectedId={selectedQuestionId}
                    onSelect={(q) => {
                      setSelectedQuestionId(q.id);
                      setSelectedUnmatchedId(null);
                      setMobileTab("sheet");
                    }}
                    gradings={gradings}
                  />
                </div>
                <UnmatchedAnswers
                  answers={unmatchedAnswers}
                  selectedId={selectedUnmatchedId}
                  onSelect={(a) => {
                    setSelectedUnmatchedId(a.id);
                    setSelectedQuestionId(null);
                    setMobileTab("sheet");
                  }}
                />
              </div>

              <div className={clsx("md:flex flex-col min-h-0", mobileTab === "sheet" ? "flex" : "hidden")}>
                <AnswerSheetViewer pages={answerPages} regions={regions} label={viewerLabel} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function trimTrailingZero(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function Stat({ value, label, tone }: { value: number | string; label: string; tone?: "good" | "warn" | "brand" }) {
  const color = tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : tone === "brand" ? "text-brand" : "text-ink";
  return (
    <span>
      <span className={clsx("font-semibold", color)}>{value}</span> <span className="text-muted">{label}</span>
    </span>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex-1 text-sm font-medium py-3 border-b-2 transition-colors",
        active ? "border-brand text-brand" : "border-transparent text-muted"
      )}
    >
      {children}
    </button>
  );
}
