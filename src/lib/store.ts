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
          else streak = 1;
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
      },
      setFocus: (patch) => set((s) => ({ focus: { ...s.focus, ...patch } })),
      
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
        }),
    }),
    {
      name: 'cramai-study-store',
    }
  )
);
