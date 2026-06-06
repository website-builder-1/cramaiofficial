## 1. Visuals via Hugging Face

Model: `black-forest-labs/FLUX.1-schnell` via HF Inference API.

- Best free text-to-image model right now: 4-step generation (fast), Apache 2.0 license, free tier on HF Inference API.
- Fallback if rate-limited: `stabilityai/stable-diffusion-xl-base-1.0`.
- Requires a free HF token - I will use the current one in the database, secrets under the name of HUGGINGFACE_API_KEY.

Where visuals appear:

- Notes: There will be a button on the left of Copy in the notes section called "Generate Visualizations" this then generates one concept diagram per section (generated lazily as sections render; cached in store).
- Flashcards: optional image on card front, generated on demand via "Add visual" button (saves cost/rate limits).
- AI Tutor Chat:  a "Generate diagram" button on assistant replies.

Prompt strategy: a small server-side prompt template turns the topic/concept into a clean educational-diagram prompt ("minimalist educational diagram of X, labeled, flat vector, white background"). Images returned as base64 → rendered inline; stored alongside their parent content in Zustand so they persist across navigation (matches existing persistence rules).

Backend: new endpoint `/api/image/generate` in `cramai-proxy` that calls HF Inference API with HUGGINGFACE_API_KEY, handles 503 (model loading) with one retry, returns `{ image: "data:image/png;base64,..." }`.

## 2. Light Gamification

Stored locally in Zustand (persisted), no backend changes:

- XP + Level: actions award XP (analyze material 50, generate notes 20, complete flashcard review 5, answer question correctly 10, finish focus session 30).
- Daily streak: increments when any study action happens today; resets after a missed day.
- Daily goal ring: target = 100 XP/day, animated ring in navbar.
- Toast on level-up / streak milestone.

UI: compact stats cluster in `Navbar` (level badge, streak flame, XP ring). New `src/lib/gamification.ts` with `awardXp(amount, reason)` helper called from existing pages.

## 3. ADHD-focused features

Researched-backed pain points → features:

### A. Focus Mode + Pomodoro timer

- Floating focus widget (bottom-right), accessible from any page.
- 25/5 default, configurable (15/3, 50/10).
- "Focus Mode" toggle: hides navbar visuals, dims non-essential UI, soft brown-noise toggle (optional, off by default — uses Web Audio API, no asset).
- Hyperfocus nudge: after 20 min continuous activity, gentle banner "You've been at it 20 min — stand up, water, stretch."
- Awards XP on completed sessions.

### B. Micro-chunking

- New backend endpoint `/api/chunk` that takes the current analyzer content (or a notes section) and returns an array of 2–5 min bite-size steps with estimated minutes and a one-line dopamine reward ("✓ You'll be able to explain X").
- New "Break it down" button on Notes sections and on Study Plan items → renders a vertical checklist; checking a step awards XP.

### C. Task initiation helper ("Just Start")

- Big button on Home + Study Plan: "Just Start (2 min)".
- Calls `/api/just-start` which picks the single easiest next 2-min task from current material (e.g., "Read this one definition: …" or "Try this 1 flashcard"). Bypasses choice paralysis.
- Starts a 2-min mini-timer; on complete, asks "Keep going?" with a one-tap continue.

### D. Working-memory aids

- Sticky "Context bar" at top of Notes/Questions/Flashcards/Chat showing current material title + "Where was I?" button that scrolls/jumps to last interacted item (tracked per page in store).
- "Quick Recap" button on every page → calls `/api/recap` returning a 3-bullet refresher of what the user just covered (uses last viewed section + recent actions).
- Voice capture in AI Tutor Chat: mic button uses Web Speech API (browser-native, free) to dictate questions — helps when typing breaks the thought.

## Technical Section

### New/modified files

- `supabase/functions/cramai-proxy/index.ts` — add `/api/image/generate` (HF), `/api/chunk`, `/api/just-start`, `/api/recap`.
- `src/lib/hfImage.ts` — small client helper that calls the proxy and returns a data URL.
- `src/lib/gamification.ts` — XP/level/streak logic + zustand slice in `src/lib/store.ts`.
- `src/lib/store.ts` — add `gamification`, `focusSession`, `lastViewed` per-page, cache for generated images keyed by content hash.
- `src/components/FocusWidget.tsx` — floating pomodoro + focus mode.
- `src/components/StatsCluster.tsx` — navbar XP/streak display.
- `src/components/ContextBar.tsx` — sticky working-memory bar.
- `src/components/JustStartButton.tsx` — task initiation CTA.
- `src/components/ChunkList.tsx` — micro-chunked checklist UI.
- `src/components/VoiceInput.tsx` — Web Speech API wrapper for Chat.
- `src/components/ConceptImage.tsx` — handles HF image load/skeleton/error/retry.
- Pages updated: `Notes.tsx`, `Summary.tsx`, `Flashcards.tsx`, `Chat.tsx`, `Home.tsx`, `StudyPlan.tsx`, `Navbar.tsx`, `App.tsx` (mount FocusWidget globally).

### Persistence rules (unchanged)

- Generated images cached in store under content hash so navigation doesn't re-trigger HF calls.
- Cleared only when new material is analyzed (reuse existing `resetGeneratedContent`) or the user hits a "Regenerate" button.

### Out of scope (call out)

- No backend leaderboard / per-user XP sync (you picked Light gamification — kept local).
- No avatar/pet system.
- No mobile app changes beyond responsive web.

### Risks

- HF cold start / rate limits: mitigated by lazy generation, caching, single retry, skeleton UI, "Generate visual" button rather than auto-generating dozens at once.
- Web Speech API not supported in all browsers (Safari iOS quirky): feature-detect and hide the mic button when unsupported.  
  
**USE AN AI FROM HUGGINGFACE USING THE ACCESS TOKEN ALREADY STORED IN SECRETS TO GENERATE IMAGES WITH UNLIMITED USE AND WOULD WORK WELL FOR GENERATING VISUALS FOR NOTES AND STUDYING!**