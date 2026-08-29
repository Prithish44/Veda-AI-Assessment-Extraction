# Markbook — AI Assessment Extraction & Answer Mapping

Upload a printed question paper and one student's handwritten answer sheet.
Markbook extracts every question, transcribes and localizes the student's
answers, maps each answer to its question, and lets a teacher click any
question to see the exact region highlighted on the answer sheet — plus
optional AI grading and feedback.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Google Gemini 2.0 Flash** (free tier) for vision extraction and grading
- **pdfjs-dist** in the browser to turn PDF pages into images (no server-side
  file storage needed — everything is in-memory / client-held)
- No database, no auth — matches the assignment's constraints

## How it works

1. **Upload** — the teacher drops in a question paper and an answer sheet
   (PDF or images). Files never touch a database; they're converted to page
   images entirely in the browser using `pdfjs-dist`.
2. **Question extraction** (`/api/extract-questions`) — each page image of
   the question paper is sent to Gemini **one page at a time**, with the
   correct page number supplied by the server (not guessed by the model).
   Each call returns that page's questions with labels, text, and a
   bounding box; if a question's text visibly continues onto the next page,
   both fragments share the same label and are stitched back together
   (`mergeDuplicateQuestions` in `lib/matching.ts`).
3. **Answer extraction** (`/api/extract-answers`) — same one-page-at-a-time
   approach for the answer sheet, but processed **sequentially** (not in
   parallel) so each page's prompt can carry forward a short context from
   the page before it: the last question label seen, and a snippet of its
   last transcribed text. This matters because students often don't repeat
   a full label on a continuation page — writing just `"(b)"` instead of
   `"2(b)"`, or continuing a diagram with no label at all — and without
   that carried-forward context the model has no way to complete the label
   or attribute an unlabeled diagram to the right question. The prompt also
   explicitly asks the model to capture diagrams/sketches as answer
   segments, not just prose text.
4. **Mapping** (`lib/matching.ts`, pure client-side logic) — answer labels
   are normalized (`"11 (a)"`, `"Q11a"`, `"11-a"` → `"11a"`) and matched
   against question labels. All answer segments sharing the same normalized
   label — whether from one page or several — are merged into a single
   answer with every region it appeared in, so the highlight can jump
   between pages for one continuous answer. Questions with no match become
   "unanswered"; answers with no matching question are shown separately as
   "unrecognized answers" rather than silently dropped.
5. **Grading (optional)** (`/api/grade`) — for every answered question,
   Gemini scores the answer against **that specific question's actual
   marks** (not a fixed /10 scale). If the question paper prints a marks
   value next to a question (e.g. `"[5 marks]"`, `"(10)"`, `"5M"`), that
   value is extracted during question extraction and used as the scoring
   ceiling. If no marks are printed for a question, a fallback value is
   used instead — configurable on the upload screen (default 10) — so
   scores are never silently capped at 10 for a question actually worth,
   say, 15. Verdict (correct/partial/incorrect) and short feedback are
   generated in the same batched call, and the header bar shows a running
   total (marks obtained / marks possible) once grading finishes.
6. **Review UI** — clicking a question in the left panel expands it in
   place (showing the transcribed answer and AI feedback) and jumps the
   answer sheet viewer to the right page, drawing a green highlight box
   over the exact answer region(s). Unanswered questions and unrecognized
   answer segments are called out explicitly.

## Design

The UI follows the provided Figma design: a fixed left sidebar (branding,
search, nav — decorative, since this is a single-flow tool with no other
pages to route to), a centered upload card with two side-by-side dropzones
that turn into file chips, a centered sparkle "Extracting…" loading state,
and a two-column mapping screen — a searchable question list with score
pills and expandable answer/feedback rows on the left, and a paginated
answer sheet with green highlight boxes on the right. On small screens the
two columns collapse into a Questions / Answer Sheet tab switch, matching
the design's mobile variant.

All bounding boxes are normalized to a 0–1000 scale (Gemini's native
convention), so highlights stay accurate regardless of the image's actual
pixel resolution or on-screen zoom level.

## Running locally

```bash
npm install
cp .env.example .env.local   # then paste your Gemini API key
npm run dev
```

Get a free Gemini API key at https://aistudio.google.com/apikey (no credit
card required for the free tier).

## Deploying (Vercel — recommended, ~2 minutes)

1. Push this folder to a new GitHub repository.
2. Go to https://vercel.com/new and import that repository.
3. Framework preset: Vercel auto-detects **Next.js** — leave defaults.
4. Under **Environment Variables**, add:
   - `GEMINI_API_KEY` = your key from Google AI Studio
5. Click **Deploy**. You'll get a live URL like `https://your-app.vercel.app`.

That's it — no database or auth setup needed. If you redeploy after
changing the env var, trigger a new deployment for it to take effect.

### Alternative: Netlify / Render / Railway

Any host that supports Next.js API routes works the same way — set the
`GEMINI_API_KEY` environment variable and deploy with the standard
`npm run build` / `npm run start` commands.

## Assumptions & limitations

- **No answer key is uploaded**, so AI grading is based on Gemini's own
  subject-matter judgment rather than a teacher-provided rubric. This is
  clearly the weakest part of "correctness" grading for niche/subjective
  questions — treat scores as a draft a teacher can override, not ground
  truth. Grading can also be turned off entirely via the checkbox on the
  upload screen if only extraction/mapping is wanted.
- **Handwriting transcription quality** depends entirely on Gemini's OCR
  ability on the given scan; very messy handwriting or low-resolution
  photos will reduce extraction and mapping accuracy.
- **Question numbering matching** is done by normalizing labels (case,
  spacing, punctuation). If a student never writes any label at all for an
  answer, it cannot be matched and is surfaced under "unrecognized answers"
  instead of being guessed into a question.
- **Multi-page PDFs**: each page is rendered client-side at up to ~1600px
  wide. Question extraction calls Gemini once per page in parallel; answer
  extraction calls Gemini once per page **sequentially**, carrying a small
  context forward between pages so continuation labels and diagrams
  resolve correctly. This means answer extraction time scales with page
  count (roughly N × a few seconds). Gemini's free tier also has a
  requests-per-minute limit, and Vercel's free (Hobby) tier caps serverless
  function duration at 10s, so very long answer sheets (many pages) may
  need a paid Vercel plan. For the assignment's expected scope (a few pages
  each) this comfortably fits within free-tier limits.
- **Continuation labeling is a best-effort heuristic**: if a student writes
  a bare sub-part letter (e.g. `"(b)"`) with no parent number and the
  lettering doesn't obviously follow the previous labeled answer, the model
  may still fail to complete the label correctly, in which case that
  segment is surfaced under "unrecognized answers" rather than guessed
  incorrectly.
- **Marks parsing handles several common exam-paper conventions**, not just
  "a number next to the question": a standalone number in the margin; a
  "2+3"-style summed total for one question with no labelled sub-parts
  (summed into one value); a shared "3+3+5+4" chain matching labelled
  sub-parts a)-d) (split one-to-one, in order); and "answer any N of the
  following, N × value = Total" style headers for MCQ blocks or "write
  short notes on any N of the following" blocks (each listed alternative
  gets `value` marks, since any one of them counts if chosen). This is
  still a **best-effort heuristic reading a scanned page image**, not a
  guaranteed parser — genuinely unusual or ambiguous layouts (e.g. marks
  given only as a separate table disconnected from the question list, or
  nested "choose any N" structures more than one level deep) may still be
  misread, in which case the question falls back to the configurable
  default marks value and should be spot-checked by the teacher.
- **In-memory only**: nothing is persisted. Refreshing the page clears the
  session, per the "no database required" constraint.
- **Single Gemini call per stage**: extraction is done as one call per
  document (all pages at once) rather than per-page, which keeps question
  order intact but means very large documents share one context window.
