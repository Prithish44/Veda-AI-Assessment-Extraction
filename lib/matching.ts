import { ExtractedAnswer, ExtractedQuestion, MappedQuestion } from "./types";

/**
 * Normalizes a printed or handwritten question label so that variants like
 * "11 (a)", "11(a)", "Q11a", "question 11 a" all collapse to the same key: "11a".
 */
export function normalizeLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.toLowerCase();
  s = s.replace(/question/g, "");
  s = s.replace(/^\s*q\.?\s*/g, "");
  s = s.replace(/^\s*ans\.?\s*/g, "");
  s = s.replace(/[().\-:]/g, "");
  s = s.replace(/\s+/g, "");
  s = s.trim();
  return s.length ? s : null;
}

export interface MappingResult {
  mapped: MappedQuestion[];
  unmatchedAnswers: ExtractedAnswer[];
}

/**
 * Maps extracted answers onto extracted questions by normalized label.
 * - Questions with no matching answer become "unanswered".
 * - Answers whose label doesn't match any known question (or has no label)
 *   are returned separately as "unmatched" so the UI can surface them.
 * - If more than one answer segment maps to the same question (e.g. the
 *   student wrote the answer in two separate blocks), they are merged.
 */
export function mapAnswersToQuestions(
  questions: ExtractedQuestion[],
  answers: ExtractedAnswer[]
): MappingResult {
  const questionNormSet = new Set(questions.map((q) => q.normalized));
  const byNorm = new Map<string, ExtractedAnswer[]>();
  const unmatchedAnswers: ExtractedAnswer[] = [];

  for (const a of answers) {
    const norm = normalizeLabel(a.questionNumber);
    if (norm && questionNormSet.has(norm)) {
      if (!byNorm.has(norm)) byNorm.set(norm, []);
      byNorm.get(norm)!.push(a);
    } else {
      unmatchedAnswers.push(a);
    }
  }

  const mapped: MappedQuestion[] = questions.map((q) => {
    const group = byNorm.get(q.normalized);
    if (!group || group.length === 0) {
      return { ...q, answer: null, status: "unanswered" };
    }
    const merged: ExtractedAnswer =
      group.length === 1
        ? group[0]
        : {
            id: group.map((g) => g.id).join("+"),
            questionNumber: group[0].questionNumber,
            text: group.map((g) => g.text).join("\n\n"),
            regions: group.flatMap((g) => g.regions),
          };
    return { ...q, answer: merged, status: "answered" };
  });

  return { mapped, unmatchedAnswers };
}

/**
 * When questions are extracted one page at a time, a question that visually
 * continues from one page onto the next will show up twice with the same
 * label. This merges those into a single entry (keeping the first
 * occurrence's page/box, concatenating the text) while preserving the
 * original print order.
 */
export function mergeDuplicateQuestions(questions: ExtractedQuestion[]): ExtractedQuestion[] {
  const byKey = new Map<string, ExtractedQuestion>();
  const order: string[] = [];
  for (const q of questions) {
    const key = q.normalized;
    const existing = byKey.get(key);
    if (existing) {
      existing.text = [existing.text, q.text].filter(Boolean).join(" ").trim();
      if (existing.maxMarks == null && q.maxMarks != null) {
        existing.maxMarks = q.maxMarks;
      }
    } else {
      byKey.set(key, { ...q });
      order.push(key);
    }
  }
  return order.map((k) => byKey.get(k)!);
}

let counter = 0;
export function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
