# CramAI: ADHD + Accuracy Upgrade Plan

A large but cohesive set of features. Grouped by surface so you can see what changes where. All AI goes through the existing `cramai-proxy` edge function (Lovable AI for text, HuggingFace for images, browser SpeechSynthesis/Recognition for voice/TTS — all free).

> Quota fix (bundled): the store currently overflows `localStorage` (`cramai-study-store` quota error). I'll move heavy fields (notes, flashcards, questions, analysis, chat history, images cache) out of the persisted slice and keep only lightweight prefs/ADHD profile/XP/streak there. This unblocks everything below.

---

## 1. ADHD Features

### Re-entry assistant

- New `ReentryCard` shown on Analyzer / Notes / Questions / Chat when the user returns after >2 min away (tracked via `visibilitychange` + last-active timestamp per page).
- Card shows: "Where you left off" — last section/question/chat turn + a 2-line AI recap ("`/api/recap`" already exists) + a "Resume" button that scrolls to last position.
- Stores `lastContext` per route in the (non-persisted) store, plus a small persisted `lastVisitedRoute` for cross-session resume on Home.

### Drift detection

- Hook `useDriftDetection()` runs on Questions, Flashcards, Chat, StudyPlan (NOT Notes, NOT Analyzer).
- Detects: no scroll/keypress/click for 90s, or tab hidden >60s then returned.
- On drift → small toast-style micro-quiz: 1 AI-generated MCQ from current material (`/api/questions/generate` with count=1) to re-engage. Dismissable.
- Respects ADHD profile (off if user opts out in onboarding).

### Hyperfocus brake

- Global timer (in store) increments while any study page is active. At 45 min of continuous active time → trigger brake.
- Full-screen overlay: fades in to pure white over 1.5s, holds white, 60s countdown in soft gray text, "Skip" button, then fades out over 1.5s back to the previous view (route unchanged, scroll preserved).
- New component `HyperfocusBrake.tsx` mounted in `App.tsx`. Configurable interval in ADHD onboarding (30/45/60 min/off).

### Externalised working memory (opt-in)

- Floating side panel `ScratchpadPanel.tsx` toggled by a small "Brain" button in the navbar; off by default.
- Persists per-route notes in localStorage (small) — quick jot, checklist, "park-it" thoughts.
- Voice-to-text input button (uses Web Speech Recognition, no API cost).

### Voice-first mode (toggle)

- Global toggle in Navbar + ADHD onboarding.
- When on:
  - All long text blocks (Notes sections, Chat AI replies, Summary, flashcard fronts/backs) get a small "Play" button using `speechSynthesis`.
  - Composer/inputs on Chat + Analyzer get a mic button (already partially via `VoiceInput.tsx`) auto-enabled.
  - Keyboard shortcut `V` to read currently focused/visible block.

### "Explain it back" mode

- New button on each Notes section and on Chat: "Explain it back".
- Opens a small modal: user records voice (Web Speech Recognition) or types their explanation. AI grades it via a new proxy endpoint `/api/explain-back` returning `{score, missing[], goodPoints[], oneLineFix}`.

### AI cheerleader tone setting

- Extend ADHD onboarding + a Settings dropdown: `gentle | direct | playful | coach | dry`.
- Pass into the existing `adhdProfile.coachTone` (already wired through `withHint`); update system prompts in proxy for chat, chunk, just-start, explain-back endpoints to honor tone.

### Shame-free streaks

- Replace daily-streak counter logic with "weekly momentum": shows sessions/week, never resets to 0 visibly; missed days display as soft dots not red X's. Copy reframed ("welcome back" instead of "you broke your streak").
- Update `StatsCluster.tsx` + store streak logic.

### Time-blindness helper

- Persistent header pill (only on study pages) showing: elapsed in current session + estimated time left on current task/section (from chunk minutes).

---

## 2. Output / Content Features

### Audio export of notes (TTS commute mode)

- On Notes page header: "Download audio" button.
- Builds a single script from all sections, uses `speechSynthesis` to render to an audio file via `MediaRecorder` capturing an `AudioContext` MediaStreamDestination → `.webm` download. (Fully free, in-browser.)
- Also a "Play all" inline player that auto-advances section by section.

### "Just Start" → moved to Analyzer

- Remove `JustStartButton` from Home.
- After analysis completes on Analyzer, show a `JustStartCard` directly under the analysis result: AI picks the single smallest first task (existing `/api/just-start` endpoint), with a "Start 2-min timer" button.

---

## 3. Accuracy Features

### Exam-board grounding

- Analyzer already has subject/examLevel/examBoard inputs
- New proxy endpoint `/api/syllabus/fetch`: server-side fetches the spec (when URL given) or queries the model with strong "use known {board} {level} {subject} specification" prompt, returns a normalized `syllabusContext` (topics list, weightings, command words, assessment objectives).
- Store `syllabusContext` in the (in-memory) study store and append it to the system prompt of every downstream endpoint (analyze, notes, questions, flashcards, summary, chunk, chat). All pages then produce board-aligned content.
- UI: small "Grounded to AQA A-level Biology 7402" chip visible on Notes/Questions/Flashcards/Chat headers.

### Past-paper alignment

- New proxy endpoint `/api/past-papers/context` — given subject/level/board, asks the model to summarize common past-paper question patterns, command words, and mark allocation style for that spec.
- Cached per (subject, level, board) in the in-memory store.
- Questions generation prompt extended to: mimic past-paper style, weight by syllabus topic frequency, use board-specific command words.

### Marking scheme for practice questions

- Extend `/api/questions/generate` response to include `markScheme: {points: [{point, marks}], totalMarks, examinerNotes, commonMistakes}` per question.
- On Questions results page: show mark-scheme accordion under each question; on grading, show point-by-point match.

---

## Technical details

**Files to add**

- `src/components/ReentryCard.tsx`
- `src/components/HyperfocusBrake.tsx`
- `src/components/ScratchpadPanel.tsx`
- `src/components/ExplainBackModal.tsx`
- `src/components/TimePill.tsx`
- `src/components/JustStartCard.tsx` (Analyzer variant)
- `src/components/MarkScheme.tsx`
- `src/components/SyllabusChip.tsx`
- `src/components/HallucinationFlag.tsx`
- `src/hooks/useDriftDetection.ts`
- `src/hooks/useActiveTimer.ts`
- `src/hooks/useReentry.ts`
- `src/lib/tts.ts` (speechSynthesis + MediaRecorder export)
- `src/lib/voice.ts` (SpeechRecognition wrapper)

**Files to edit**

- `src/lib/store.ts` — split persisted vs in-memory slices (fixes quota); add syllabusContext, scratchpad, voice toggle, cheerleader tone, drift settings, lastContext per route, active timer state.
- `src/lib/api.ts` — new endpoints: `explainBack`, `fetchSyllabus`, `fetchPastPaperContext`, `verifyDiagram`, `hallucinationCheck`; extend `Question` with `markScheme`.
- `src/components/AdhdOnboarding.tsx` — add cheerleader tone, voice-first toggle, hyperfocus interval, drift on/off, scratchpad default.
- `src/components/Navbar.tsx` — voice-first toggle, scratchpad toggle, time pill.
- `src/components/ConceptImage.tsx` — diagram accuracy filter + auto-retry.
- `src/pages/Home.tsx` — remove JustStart, add re-entry card.
- `src/pages/Analyzer.tsx` — add syllabus code input, JustStartCard, re-entry, syllabus chip.
- `src/pages/Notes.tsx` — TTS play buttons, audio export, explain-back per section, hallucination flags, syllabus chip. (No drift detection here.)
- `src/pages/Questions.tsx` — mark scheme display, drift detection, hallucination flags, past-paper styling, syllabus chip.
- `src/pages/Flashcards.tsx` — TTS, drift detection, syllabus chip.
- `src/pages/Chat.tsx` — explain-back, voice-first auto mic, re-entry, drift detection.
- `src/pages/StudyPlan.tsx` — reverse planner, T-minus countdowns, drift detection.
- `src/App.tsx` — mount HyperfocusBrake, ScratchpadPanel.
- `supabase/functions/cramai-proxy/index.ts` — new endpoints (`/api/explain-back`, `/api/syllabus/fetch`, `/api/past-papers/context`, `/api/verify-diagram`, `/api/hallucination-check`); inject syllabus + past-paper context + cheerleader tone into existing endpoint prompts; extend questions generator to return `markScheme`.

**Free-tier discipline**

- Images: HuggingFace only (unchanged).
- Voice in/out: native browser APIs — zero cost.

---

## Build order

1. Store refactor (fix quota) + ADHD onboarding extensions.
2. Exam-board grounding + past-paper context (foundation for accuracy everywhere).
3. Hallucination pass + mark scheme + diagram filter.
4. Re-entry + drift + hyperfocus + time pill.
5. Voice-first + TTS export + explain-back + scratchpad.
6. Move Just Start to Analyzer; shame-free streaks copy pass.

Approve and I'll build it in that order.