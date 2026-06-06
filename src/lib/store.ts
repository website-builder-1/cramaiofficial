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
        }),
    }),
    {
      name: 'cramai-study-store',
    }
  )
);
