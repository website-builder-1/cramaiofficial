import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AnalysisResult,
  StudyPlan,
  Question,
  ChatMessage,
  Flashcard,
  SummaryResult,
  NotesResult,
  GradeResult,
  SyllabusContext,
  PastPaperContext,
  OcrSubtopic,
} from './api';

export interface FlashcardsState {
  cards: Flashcard[];
  index: number;
  flipped: boolean;
  reviewIds: string[];
}

export interface QuestionsState {
  questions: Question[];
  userAnswers: Record<string, string>;
  isGraded: boolean;
  gradeResult: GradeResult | null;
}

export interface GamificationState {
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string; // YYYY-MM-DD
  todayXp: number;
  todayDate: string;
}

export interface FocusSessionState {
  active: boolean;
  mode: 'work' | 'break';
  startedAt: number; // ms epoch
  durationSec: number;
  workSec: number;
  breakSec: number;
  focusModeUI: boolean; // dim UI
  sound: boolean;
  volume: number; // 0..1
  soundType: 'brown' | 'pink' | 'white' | 'rain';
}

export type ChunkStyle = 'tiny' | 'standard' | 'deep';
export type CoachTone = 'gentle' | 'direct' | 'playful' | 'coach' | 'dry';
export type AttentionSpan = 'short' | 'medium' | 'long';

export interface AdhdProfile {
  onboarded: boolean;
  hasAdhd: boolean | null; // null = unspecified
  attentionSpan: AttentionSpan; // drives focus default
  chunkStyle: ChunkStyle;
  coachTone: CoachTone;
  struggles: string[]; // e.g. ['task_initiation','distraction','working_memory','overwhelm','hyperfocus','time_blindness']
  rewardsOn: boolean;
  brownNoise: boolean;
  preferVisuals: boolean;
  // Newly added
  voiceFirst: boolean;
  scratchpadOn: boolean;
  driftOn: boolean;
  hyperfocusMinutes: 0 | 30 | 45 | 60; // 0 = off
  hallucinationCheck: boolean;
}

export const DEFAULT_ADHD_PROFILE: AdhdProfile = {
  onboarded: false,
  hasAdhd: null,
  attentionSpan: 'medium',
  chunkStyle: 'standard',
  coachTone: 'gentle',
  struggles: [],
  rewardsOn: true,
  brownNoise: false,
  preferVisuals: true,
  voiceFirst: false,
  scratchpadOn: false,
  driftOn: true,
  hyperfocusMinutes: 45,
  hallucinationCheck: true,
};

export interface LastContext {
  route: string;
  label: string; // human-readable
  scrollY?: number;
  ts: number;
}

interface StudyState {
  // Document content
  documentContent: string;
  setDocumentContent: (content: string) => void;

  // Combined study material (text + serialized analysis for image-only flows)
  getStudyMaterial: () => string;
  
  // Subject
  subject: string;
  setSubject: (subject: string) => void;

  examLevel: string;
  setExamLevel: (level: string) => void;

  examBoard: string;
  setExamBoard: (board: string) => void;

  syllabusCode: string;
  setSyllabusCode: (code: string) => void;

  syllabusContext: SyllabusContext | null;
  setSyllabusContext: (ctx: SyllabusContext | null) => void;

  pastPaperContext: PastPaperContext | null;
  setPastPaperContext: (ctx: PastPaperContext | null) => void;

  // OCR-detected subtopics from uploaded images (syllabus pages, checklists).
  ocrSubtopics: OcrSubtopic[];
  setOcrSubtopics: (subtopics: OcrSubtopic[]) => void;
  
  // Analysis results
  analysisResult: AnalysisResult | null;
  setAnalysisResult: (result: AnalysisResult | null) => void;
  
  // Generated questions
  questions: Question[];
  setQuestions: (questions: Question[]) => void;

  // Persisted generated content (per-page)
  notesData: NotesResult | null;
  setNotesData: (data: NotesResult | null) => void;

  summaryData: SummaryResult | null;
  setSummaryData: (data: SummaryResult | null) => void;

  flashcardsState: FlashcardsState | null;
  setFlashcardsState: (state: FlashcardsState | null) => void;

  questionsState: QuestionsState | null;
  setQuestionsState: (state: QuestionsState | null) => void;

  // Reset only the generated content (used when new material is analyzed)
  resetGeneratedContent: () => void;

  // Cache: prompt -> data URL image
  imageCache: Record<string, string>;
  setCachedImage: (key: string, dataUrl: string) => void;

  // Gamification
  gamification: GamificationState;
  awardXp: (amount: number) => { leveledUp: boolean; newLevel: number };

  // Focus session
  focus: FocusSessionState;
  setFocus: (patch: Partial<FocusSessionState>) => void;

  // ADHD personalization
  adhdProfile: AdhdProfile;
  setAdhdProfile: (patch: Partial<AdhdProfile>) => void;
  completeOnboarding: (profile: Partial<AdhdProfile>) => void;
  
  // Study plan
  studyPlan: StudyPlan | null;
  setStudyPlan: (plan: StudyPlan | null) => void;
  toggleHourComplete: (hour: number) => void;
  
  // Chat history
  chatHistory: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
  clearChatHistory: () => void;
  
  // Weak topics
  weakTopics: string[];
  setWeakTopics: (topics: string[]) => void;
  
  // Reset all
  resetAll: () => void;

  // Re-entry: last context per route
  lastContexts: Record<string, LastContext>;
  setLastContext: (route: string, ctx: Omit<LastContext, 'route' | 'ts'>) => void;
  lastVisitedRoute: string;
  setLastVisitedRoute: (route: string) => void;

  // Active study timer (for time pill + hyperfocus brake)
  activeStudySeconds: number;
  addActiveStudySeconds: (sec: number) => void;
  resetActiveStudySeconds: () => void;

  // Scratchpad notes per route
  scratchpads: Record<string, string>;
  setScratchpad: (route: string, text: string) => void;

  // Weekly momentum (shame-free streak)
  recentStudyDays: string[]; // YYYY-MM-DD dates of recent activity (last 30)
  markStudyToday: () => void;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const xpForLevel = (level: number) => 100 * level; // simple curve

export const useStudyStore = create<StudyState>()(
  persist(
    (set, get) => ({
      documentContent: '',
      setDocumentContent: (content) => set({ documentContent: content }),

      getStudyMaterial: () => {
        const s = get();
        const parts: string[] = [];
        if (s.documentContent && s.documentContent.trim()) {
          parts.push(s.documentContent.trim());
        }
        if (s.analysisResult) {
          const a = s.analysisResult;
          const block = [
            a.summary ? `Summary: ${a.summary}` : '',
            a.keyTopics?.length ? `Key topics: ${a.keyTopics.join(', ')}` : '',
            a.concepts?.length ? `Concepts:\n- ${a.concepts.join('\n- ')}` : '',
            a.definitions?.length
              ? `Definitions:\n${a.definitions.map((d) => `- ${d.term}: ${d.definition}`).join('\n')}`
              : '',
            a.formulas?.length ? `Formulas:\n- ${a.formulas.join('\n- ')}` : '',
          ].filter(Boolean).join('\n\n');
          if (block) parts.push(block);
        }
        return parts.join('\n\n');
      },
      
      subject: '',
      setSubject: (subject) => set({ subject }),

      examLevel: '',
      setExamLevel: (examLevel) => set({ examLevel }),

      examBoard: '',
      setExamBoard: (examBoard) => set({ examBoard }),

      syllabusCode: '',
      setSyllabusCode: (syllabusCode) => set({ syllabusCode }),

      syllabusContext: null,
      setSyllabusContext: (syllabusContext) => set({ syllabusContext }),

      pastPaperContext: null,
      setPastPaperContext: (pastPaperContext) => set({ pastPaperContext }),

      ocrSubtopics: [],
      setOcrSubtopics: (ocrSubtopics) => set({ ocrSubtopics }),

      analysisResult: null,
      setAnalysisResult: (result) => set({ analysisResult: result }),
      
      questions: [],
      setQuestions: (questions) => set({ questions }),

      notesData: null,
      setNotesData: (notesData) => set({ notesData }),

      summaryData: null,
      setSummaryData: (summaryData) => set({ summaryData }),

      flashcardsState: null,
      setFlashcardsState: (flashcardsState) => set({ flashcardsState }),

      questionsState: null,
      setQuestionsState: (questionsState) => set({ questionsState }),

      resetGeneratedContent: () =>
        set({
          notesData: null,
          summaryData: null,
          flashcardsState: null,
          questionsState: null,
          questions: [],
          studyPlan: null,
          weakTopics: [],
          imageCache: {},
          ocrSubtopics: [],
        }),

      imageCache: {},
      setCachedImage: (key, dataUrl) =>
        set((s) => ({ imageCache: { ...s.imageCache, [key]: dataUrl } })),

      gamification: {
        xp: 0,
        level: 1,
        streak: 0,
        lastActiveDate: '',
        todayXp: 0,
        todayDate: todayStr(),
      },
      awardXp: (amount) => {
        const today = todayStr();
        const g = get().gamification;
        // Streak handling
        let streak = g.streak;
        if (g.lastActiveDate !== today) {
          const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          if (g.lastActiveDate === yesterday) streak = g.streak + 1;
          else if (!g.lastActiveDate) streak = 1;
          // Shame-free: never reset to 0 visibly. Keep momentum: cap dip at max(1, streak-1).
          else streak = Math.max(1, g.streak);
        }
        const todayXp = g.todayDate === today ? g.todayXp + amount : amount;
        const xp = g.xp + amount;
        let level = g.level;
        let needed = xpForLevel(level);
        let leveledUp = false;
        let remaining = xp;
        // compute level from total xp
        let l = 1;
        let acc = 0;
        while (acc + xpForLevel(l) <= xp) {
          acc += xpForLevel(l);
          l += 1;
        }
        if (l > g.level) leveledUp = true;
        level = l;
        set({
          gamification: {
            xp,
            level,
            streak,
            lastActiveDate: today,
            todayXp,
            todayDate: today,
          },
        });
        // Track recent study days (last 30)
        const cur = get().recentStudyDays || [];
        if (!cur.includes(today)) {
          const next = [...cur, today].slice(-30);
          set({ recentStudyDays: next });
        }
        return { leveledUp, newLevel: level };
      },

      focus: {
        active: false,
        mode: 'work',
        startedAt: 0,
        durationSec: 25 * 60,
        workSec: 25 * 60,
        breakSec: 5 * 60,
        focusModeUI: false,
        sound: false,
        volume: 0.35,
        soundType: 'brown',
      },
      setFocus: (patch) => set((s) => ({ focus: { ...s.focus, ...patch } })),

      adhdProfile: DEFAULT_ADHD_PROFILE,
      setAdhdProfile: (patch) =>
        set((s) => ({ adhdProfile: { ...s.adhdProfile, ...patch } })),
      completeOnboarding: (profile) =>
        set((s) => {
          const next = { ...s.adhdProfile, ...profile, onboarded: true };
          // Apply attention span to focus defaults
          const presets: Record<AttentionSpan, { w: number; b: number }> = {
            short: { w: 15, b: 3 },
            medium: { w: 25, b: 5 },
            long: { w: 50, b: 10 },
          };
          const p = presets[next.attentionSpan];
          return {
            adhdProfile: next,
            focus: {
              ...s.focus,
              workSec: p.w * 60,
              breakSec: p.b * 60,
              durationSec: p.w * 60,
              sound: next.brownNoise,
            },
          };
        }),
      
      studyPlan: null,
      setStudyPlan: (plan) => set({ studyPlan: plan }),
      toggleHourComplete: (hour) =>
        set((state) => {
          if (!state.studyPlan) return state;
          return {
            studyPlan: {
              ...state.studyPlan,
              schedule: state.studyPlan.schedule.map((item) =>
                item.hour === hour ? { ...item, completed: !item.completed } : item
              ),
            },
          };
        }),
      
      chatHistory: [],
      addChatMessage: (message) =>
        set((state) => ({ chatHistory: [...state.chatHistory, message] })),
      clearChatHistory: () => set({ chatHistory: [] }),
      
      weakTopics: [],
      setWeakTopics: (topics) => set({ weakTopics: topics }),
      
      resetAll: () =>
        set({
          documentContent: '',
          subject: '',
          examLevel: '',
          examBoard: '',
          analysisResult: null,
          questions: [],
          studyPlan: null,
          chatHistory: [],
          weakTopics: [],
          notesData: null,
          summaryData: null,
          flashcardsState: null,
          questionsState: null,
          syllabusCode: '',
          syllabusContext: null,
          pastPaperContext: null,
          ocrSubtopics: [],
        }),

      lastContexts: {},
      setLastContext: (route, ctx) =>
        set((s) => ({
          lastContexts: {
            ...s.lastContexts,
            [route]: { route, ts: Date.now(), ...ctx },
          },
        })),
      lastVisitedRoute: '',
      setLastVisitedRoute: (route) => set({ lastVisitedRoute: route }),

      activeStudySeconds: 0,
      addActiveStudySeconds: (sec) =>
        set((s) => ({ activeStudySeconds: s.activeStudySeconds + sec })),
      resetActiveStudySeconds: () => set({ activeStudySeconds: 0 }),

      scratchpads: {},
      setScratchpad: (route, text) =>
        set((s) => ({ scratchpads: { ...s.scratchpads, [route]: text } })),

      recentStudyDays: [],
      markStudyToday: () =>
        set((s) => {
          const today = todayStr();
          if (s.recentStudyDays.includes(today)) return s;
          return { recentStudyDays: [...s.recentStudyDays, today].slice(-30) };
        }),
    }),
    {
      name: 'cramai-study-store',
      // Persist only lightweight slices. Heavy/transient content lives in memory
      // so we never overflow localStorage (5MB).
      partialize: (s) => ({
        subject: s.subject,
        examLevel: s.examLevel,
        examBoard: s.examBoard,
        syllabusCode: s.syllabusCode,
        gamification: s.gamification,
        adhdProfile: s.adhdProfile,
        focus: {
          workSec: s.focus.workSec,
          breakSec: s.focus.breakSec,
          durationSec: s.focus.durationSec,
          sound: s.focus.sound,
          focusModeUI: s.focus.focusModeUI,
          active: false,
          mode: 'work' as const,
          startedAt: 0,
        },
        scratchpads: s.scratchpads,
        recentStudyDays: s.recentStudyDays,
        lastVisitedRoute: s.lastVisitedRoute,
        // Persist current study material + generated content so it survives
        // navigation, refresh, and tab reopens. Cleared only when the user
        // analyzes new material (resetGeneratedContent / resetAll).
        documentContent: s.documentContent,
        analysisResult: s.analysisResult,
        syllabusContext: s.syllabusContext,
        pastPaperContext: s.pastPaperContext,
        ocrSubtopics: s.ocrSubtopics,
        notesData: s.notesData,
        summaryData: s.summaryData,
        flashcardsState: s.flashcardsState,
        questionsState: s.questionsState,
        questions: s.questions,
        studyPlan: s.studyPlan,
        weakTopics: s.weakTopics,
        chatHistory: s.chatHistory,
        lastContexts: s.lastContexts,
      }),
    }
  )
);
