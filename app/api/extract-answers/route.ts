import { NextRequest, NextResponse } from "next/server";
import { callGeminiJson } from "@/lib/gemini";
import { nextId } from "@/lib/matching";
import { BBox, ExtractedAnswer } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface InputImage {
  page: number;
  mimeType: string;
  base64: string;
}

interface PageContext {
  lastLabel: string | null;
  lastSnippet: string;
}

// One Gemini call per page, with the page number supplied by us (not
// guessed by the model) — this avoids the earlier bug where all pages were
// sent in one request and later pages were missed or mislabeled.
//
// Pages are processed IN ORDER (not in parallel) so that each page's prompt
// can carry forward a short "context" from the previous page: the last
// question label seen and a snippet of the last transcribed text. This is
// needed because students often don't repeat the full label on a
// continuation page — e.g. they write just "(b)" instead of "2(b)", or
// continue a diagram/answer with no label at all. Without that context the
// model has no way to know "(b)" belongs to question "2", or that an
// unlabeled diagram continues the previous answer.
function buildPrompt(pageNumber: number, context: PageContext): string {
  const contextBlock = context.lastLabel
    ? `\nCONTEXT FROM THE PREVIOUS PAGE: the last labeled answer before this page was for question "${context.lastLabel}", and its visible text ended with: "...${context.lastSnippet}".
- If content at the TOP of this page is clearly a direct continuation of that same answer (e.g. a diagram, more explanation, or working with no new label), set "questionNumber" to "${context.lastLabel}" for it.
- If a new sub-part label appears on this page WITHOUT its parent number restated (for example it shows only "(b)" or "b)" instead of the full "2(b)"), and "${context.lastLabel}" was itself a sub-part of a numbered question (e.g. "2(a)"), infer the full label by reusing that same leading number — e.g. bare "(b)" becomes "2(b)". Only do this if the lettering logically follows on (a → b → c ...).\n`
    : "";

  return `You are analyzing PAGE ${pageNumber} of a scanned, HANDWRITTEN student ANSWER SHEET (this image is exactly that one page).

The student may have answered questions out of order, skipped some, continued an answer or a diagram from a previous page onto this one, or written extra content that doesn't correspond to any question.
${contextBlock}
For every distinct answer segment visible on THIS page (in top-to-bottom reading order), extract:
- "questionNumber": the question label the student wrote or that the answer is clearly responding to (e.g. "11(a)", "Q3", "2"), completed using the context rules above when the page itself only shows a partial label. If you truly cannot determine which question a segment answers, set this to null.
- "text": your best-effort transcription of the handwritten content for that segment. This includes prose, formulas, AND drawn diagrams/tables/sketches — for a diagram or drawing, still create a segment for it and briefly describe what it depicts in "text" (e.g. "[diagram: layered neural network with input, hidden, and output layers]") rather than skipping it just because it isn't prose.
- "box": a tight bounding box around the handwritten block (including diagrams) on this page, as [ymin, xmin, ymax, xmax] normalized to a 0-1000 scale relative to this image's full width/height.

Include segments even when questionNumber is null (e.g. stray notes or illegible writing) so nothing on the page is silently dropped. If this page is entirely blank or has no content, return an empty array.

Return ONLY valid JSON with this exact shape, nothing else:
{"answers": [{"questionNumber": string|null, "text": string, "box": [number, number, number, number]}]}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const images: InputImage[] = body.images;
    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    // Sorted defensively in case the client ever sends pages out of order —
    // sequential context only makes sense in reading order.
    const orderedImages = [...images].sort((a, b) => a.page - b.page);

    const allAnswers: ExtractedAnswer[] = [];
    let context: PageContext = { lastLabel: null, lastSnippet: "" };

    for (const img of orderedImages) {
      const raw = await callGeminiJson<{
        answers: { questionNumber: string | null; text: string; box: BBox }[];
      }>(buildPrompt(img.page, context), [{ mimeType: img.mimeType, base64: img.base64 }]);

      const pageAnswers = (raw.answers || [])
        .filter((a) => a && (a.text || a.box))
        .map(
          (a): ExtractedAnswer => ({
            id: nextId("a"),
            questionNumber: a.questionNumber ? String(a.questionNumber).trim() : null,
            text: (a.text || "").trim(),
            regions: [{ page: img.page, box: normalizeBox(a.box) }],
          })
        );

      allAnswers.push(...pageAnswers);

      const lastOnPage = pageAnswers[pageAnswers.length - 1];
      if (lastOnPage) {
        context = {
          lastLabel: lastOnPage.questionNumber || context.lastLabel,
          lastSnippet: lastOnPage.text.slice(-200),
        };
      }
    }

    return NextResponse.json({ answers: allAnswers });
  } catch (err: any) {
    console.error("extract-answers error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to extract answers" },
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
