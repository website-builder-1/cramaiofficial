# Fix Practice Questions + Add New Study Features

## Root cause of Practice Questions failing

The `cramai-proxy` edge function currently routes everything to Hugging Face's router (`router.huggingface.co/v1/chat/completions`) using `Qwen/Qwen2.5-72B-Instruct` and `Llama-3.3-70B-Instruct`. On HF's router these large models are **not reliably free** — requests frequently fail with 402/404/503 (provider unavailable or out of credits) and the user sees a generic "unexpected error". Chat sometimes works because Llama is occasionally served free; structured tasks like `/api/questions/generate` almost always fail.

Secondary issues:
- `response_format: json_object` is silently ignored by some HF providers, so responses come back as prose and `extractJSON` throws.
- Errors are returned with HTTP 200 + `{error: "..."}`, which the UI shows as a toast but doesn't help us diagnose.

## Fix: switch to Lovable AI Gateway

Lovable AI Gateway is built in, free during the current promo window, and supports the models we need with proper JSON mode. We already have `LOVABLE_API_KEY` set as a project secret.

Changes to `supabase/functions/cramai-proxy/index.ts`:
1. Replace `HF_URL` with `https://ai.gateway.lovable.dev/v1/chat/completions`, auth via `LOVABLE_API_KEY`.
2. Use:
   - `google/gemini-2.5-flash` for structured tasks (analyze, questions, grade, study-plan, last-minute-review, summary, flashcards, concept-map) — fast, free, strong JSON.
   - `google/gemini-2.5-flash` for chat too (kept consistent; switch to `gemini-2.5-pro` only if reasoning struggles).
3. Keep `response_format: { type: "json_object" }` for structured calls (Gemini honors it).
4. Harden response handling: robust `extractJSON` (already mostly fine) + truncation detection + retry once on parse failure with a stricter "JSON only, no prose" reminder.
5. Map upstream errors to proper HTTP status (429 → "Rate limited, try again", 402 → "AI credits exhausted") so the UI can show a helpful message.
6. Keep all existing endpoints + their exact response shapes so no frontend changes are needed for current features.

## New AI study features

Three high-value features added without changing the existing pages:

### 1. Smart Flashcards (`/flashcards`)
- New page that generates flippable Q→A flashcards from the loaded document.
- New endpoint `/api/flashcards/generate` → returns `{cards: [{front, back, topic, difficulty}]}`.
- Spaced-repetition lite: user marks "Got it / Review again", stored in Zustand store; "Review again" cards reappear at the end.

### 2. Smart Summary & Cheat Sheet (`/summary`)
- One-click condensed summary + bullet cheat sheet for the loaded material.
- New endpoint `/api/summary/generate` → returns `{tldr, bulletSummary[], cheatSheet[], keyTerms[]}`.
- Useful for a true "cram in 24h" workflow.

### 3. Concept Map (`/concept-map`)
- Visual graph of how the material's concepts connect.
- New endpoint `/api/concept-map/generate` → returns `{nodes: [{id, label, group}], edges: [{from, to, label}]}`.
- Rendered with a lightweight force-directed view (CSS+SVG, no extra deps) — node click opens an "Explain this" prompt routed through the existing `/api/chat/explain`.

All three features:
- Pull `documentContent` from the existing `useStudyStore` (so they work right after Analyzer).
- Show the existing `LoadingCard` / toast pattern for consistency.
- Get a nav link in `Navbar.tsx` and a card on the Home page.

## Frontend client additions (`src/lib/api.ts`)
- `generateFlashcards(content)` → `Flashcard[]`
- `generateSummary(content)` → `SummaryResult`
- `generateConceptMap(content)` → `ConceptMap`

Types added alongside existing exports; no breaking changes.

## Validation
- After deploying, hit `/api/questions/generate` via the edge function curl tool with sample content; confirm 200 + parsed questions.
- Verify Practice Questions UI generates and grades cleanly.
- Verify the three new pages render output from real material.

## Files touched

```text
edit    supabase/functions/cramai-proxy/index.ts   (switch to Lovable AI, add 3 endpoints, harden JSON)
edit    src/lib/api.ts                             (new client fns + types)
edit    src/lib/store.ts                           (flashcard state, summary cache)
edit    src/components/Navbar.tsx                  (3 new nav links)
edit    src/pages/Home.tsx                         (3 new feature cards)
new     src/pages/Flashcards.tsx
new     src/pages/Summary.tsx
new     src/pages/ConceptMap.tsx
edit    src/App.tsx                                (3 new routes)
```

No DB migrations, no new secrets — `LOVABLE_API_KEY` is already configured.
