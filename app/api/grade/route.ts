import { NextRequest, NextResponse } from "next/server";
import { callGeminiJson } from "@/lib/gemini";
import { DEFAULT_MAX_MARKS, Grading, Verdict } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface GradeItem {
  questionId: string;
  questionNumber: string;
  questionText: string;
  answerText: string;
  maxMarks: number;
}

const PROMPT_HEADER = `You are an experienced teacher grading short-answer exam responses. No official answer key or marking rubric was provided, so use your own subject-matter knowledge to judge correctness, completeness, and clarity.

Each item below states the TOTAL MARKS that specific question is worth — this varies per item, so read it carefully for each one. Score every item out of ITS OWN total marks (not a fixed scale), proportionally to how correct/complete the answer is. Also return a verdict and brief feedback (max 30 words, written to the student, second person, constructive).
Verdict must be one of: "correct" (fully/mostly correct), "partial" (partially correct or incomplete), "incorrect" (wrong or off-topic).

Items:
`;

const PROMPT_FOOTER = `

Return ONLY valid JSON with this exact shape, nothing else. "score" must be a number between 0 and that item's total marks (inclusive), and may include one decimal place:
{"results": [{"questionId": string, "score": number, "verdict": "correct"|"partial"|"incorrect", "feedback": string}]}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: GradeItem[] = body.items;
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ gradings: [] });
    }

    const itemsBlock = items
      .map(
        (it, i) =>
          `${i + 1}. questionId: ${it.questionId}\n   Total marks for this question: ${it.maxMarks}\n   Question ${it.questionNumber}: ${it.questionText}\n   Student's answer: ${it.answerText || "(empty)"}`
      )
      .join("\n\n");

    const prompt = PROMPT_HEADER + itemsBlock + PROMPT_FOOTER;

    const raw = await callGeminiJson<{
      results: { questionId: string; score: number; verdict: Verdict; feedback: string }[];
    }>(prompt);

    const byId = new Map(items.map((it) => [it.questionId, it]));
    const gradings: Grading[] = (raw.results || [])
      .filter((r) => r && byId.has(r.questionId))
      .map((r) => {
        const item = byId.get(r.questionId)!;
        return {
          questionId: r.questionId,
          score: clampScore(r.score, item.maxMarks),
          maxScore: item.maxMarks,
          verdict: r.verdict || "ungraded",
          feedback: (r.feedback || "").trim(),
        };
      });

    return NextResponse.json({ gradings });
  } catch (err: any) {
    console.error("grade error:", err);
    return NextResponse.json({ error: err?.message || "Failed to grade answers" }, { status: 500 });
  }
}

function clampScore(n: any, maxMarks: number): number {
  const num = typeof n === "number" ? n : parseFloat(n);
  const max = maxMarks > 0 ? maxMarks : DEFAULT_MAX_MARKS;
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.min(max, Math.round(num * 10) / 10));
}
