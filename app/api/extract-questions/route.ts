import { NextRequest, NextResponse } from "next/server";
import { callGeminiJson } from "@/lib/gemini";
import { mergeDuplicateQuestions, normalizeLabel, nextId } from "@/lib/matching";
import { BBox, DEFAULT_MAX_MARKS, ExtractedQuestion } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface InputImage {
  page: number;
  mimeType: string;
  base64: string;
}

// One Gemini call per page, with the page number supplied by us (not inferred
// by the model). This is far more reliable than sending every page in one
// request and asking the model to guess which image is which page.
function buildPrompt(pageNumber: number): string {
  return `You are analyzing PAGE ${pageNumber} of a scanned exam QUESTION PAPER (this image is exactly that one page).

Extract every question whose text appears on THIS page, in the order they appear top to bottom.

NUMBERING RULES:
- Treat labelled sub-parts as SEPARATE entries, combining the parent question number with the sub-part label — e.g. "11 (a)" and "11 (b)" become two entries numbered "11(a)" and "11(b)".
- This also applies to lettered/roman-numeral items inside a "choose any N of the following" alternative list nested under one question number. For example, if question "1" lists alternative items i) through xii) where the student picks some subset, each becomes its own entry: "1(i)", "1(ii)", ... "1(xii)". Likewise a question "11" listing short-note options i)-v) becomes "11(i)".."11(v)".
- Preserve the original parent numbering exactly as printed (e.g. "1", "2.", "Q3", "IV"), combined with the sub-part/item label as above.
- "text" is the full question text visible on this page (not the answer, not general instructions/headers). If a question clearly continues onto another page, just transcribe the portion visible on THIS page — it will be stitched together automatically.

MARKS EXTRACTION RULES — figure out "maxMarks" for each entry by applying these in order, and stop at the first one that applies:
1. If this exact question or sub-part has its own single, standalone number printed directly next to or aligned with it (commonly in the right margin, on the same row) — use that number directly.
2. If a "choose any N of the following M items" structure applies (M alternatives listed but only N need to be answered), and you see either (a) a "N × value = Total" style expression, or (b) a "+" chain of exactly N EQUAL numbers (e.g. "5+5+5" for "any three") printed once for that alternative set — treat "value" as the per-item marks and assign maxMarks = value to EVERY one of the M listed alternative items, not just the ones a student might pick, since any one of them is worth that much if chosen. This applies whether the alternatives are full top-level questions (e.g. "answer any 3 of these 5 questions") or lettered/roman-numeral items nested inside one question number.
3. If this question has NO labelled sub-parts of its own, but a "+" chain of (non-equal, or single-item-context) numbers is printed for it (e.g. "2+3", "5+10") — SUM all the numbers into one maxMarks value for this single question. Do not split it into extra entries.
4. If this question DOES have labelled sub-parts (a), (b), (c)... and a "+" chain with exactly the SAME COUNT of numbers as sub-parts is printed once for the whole question (e.g. 4 sub-parts and "3+3+5+4" printed together) — distribute the numbers in printed left-to-right order, one per sub-part in the same order the sub-parts appear (first number → first sub-part, second → second, etc.).
5. If you genuinely cannot determine a marks value after considering the above, set maxMarks to null — do NOT guess or invent a number.

- "box" is a tight bounding box around the question's text block on this page, as [ymin, xmin, ymax, xmax] normalized to a 0-1000 scale relative to this image's full width/height.
- Ignore page headers, footers, general instructions, logos, and blank space.
- If this page has no questions on it, return an empty array.

Return ONLY valid JSON with this exact shape, nothing else:
{"questions": [{"number": string, "text": string, "maxMarks": number|null, "box": [number, number, number, number]}]}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const images: InputImage[] = body.images;
    // Fallback marks applied to any question where the paper doesn't
    // explicitly print a marks value. Client can override via the upload
    // screen; defaults to DEFAULT_MAX_MARKS otherwise.
    const defaultMaxMarks: number =
      typeof body.defaultMaxMarks === "number" && body.defaultMaxMarks > 0
        ? body.defaultMaxMarks
        : DEFAULT_MAX_MARKS;

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    const perPageResults = await Promise.all(
      images.map(async (img) => {
        const raw = await callGeminiJson<{
          questions: { number: string; text: string; maxMarks: number | null; box: BBox }[];
        }>(buildPrompt(img.page), [{ mimeType: img.mimeType, base64: img.base64 }]);

        return (raw.questions || [])
          .filter((q) => q && q.number)
          .map(
            (q): ExtractedQuestion => ({
              id: nextId("q"),
              number: String(q.number).trim(),
              normalized: normalizeLabel(q.number) || String(q.number),
              text: (q.text || "").trim(),
              page: img.page,
              box: normalizeBox(q.box),
              maxMarks: normalizeMarks(q.maxMarks),
            })
          );
      })
    );

    const flat = perPageResults.flat();
    const merged = mergeDuplicateQuestions(flat);

    // Resolve any still-undetected marks to the fallback default.
    const questions = merged.map((q) => ({
      ...q,
      maxMarks: q.maxMarks ?? defaultMaxMarks,
    }));

    return NextResponse.json({ questions });
  } catch (err: any) {
    console.error("extract-questions error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to extract questions" },
      { status: 500 }
    );
  }
}

function normalizeBox(box: any): BBox {
  if (Array.isArray(box) && box.length === 4 && box.every((n) => typeof n === "number")) {
    return box as BBox;
  }
  return [0, 0, 1000, 1000];
}

function normalizeMarks(marks: any): number | null {
  const n = typeof marks === "number" ? marks : parseFloat(marks);
  return Number.isFinite(n) && n > 0 ? n : null;
}
