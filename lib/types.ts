// Bounding box normalized 0-1000 in [ymin, xmin, ymax, xmax] order (Gemini convention)
export type BBox = [number, number, number, number];

export interface PageImage {
  page: number; // 1-indexed
  dataUrl: string; // data:image/...;base64,.... for <img> rendering
  base64: string; // raw base64 payload (no prefix), sent to the AI
  mimeType: string;
  width: number;
  height: number;
}

export interface ExtractedQuestion {
  id: string;
  number: string; // exact printed label, e.g. "11(a)"
  normalized: string;
  text: string;
  page: number;
  box: BBox;
  maxMarks: number | null; // marks this question is worth, if printed on the paper; null if not detected
}

export interface AnswerRegion {
  page: number;
  box: BBox;
}

export interface ExtractedAnswer {
  id: string;
  questionNumber: string | null; // label the student appears to have written, if any
  text: string;
  regions: AnswerRegion[];
}

export interface MappedQuestion extends ExtractedQuestion {
  answer: ExtractedAnswer | null;
  status: "answered" | "unanswered";
}

export type Verdict = "correct" | "partial" | "incorrect" | "ungraded";

export interface Grading {
  questionId: string;
  score: number;
  maxScore: number;
  verdict: Verdict;
  feedback: string;
}

// Used when a question's marks weren't printed on the paper (or couldn't be
// detected) and the teacher hasn't overridden the default on the upload screen.
export const DEFAULT_MAX_MARKS = 10;

export type ProcessingStage =
  | "idle"
  | "reading-question-paper"
  | "reading-answer-sheet"
  | "extracting-questions"
  | "extracting-answers"
  | "mapping"
  | "grading"
  | "done"
  | "error";
