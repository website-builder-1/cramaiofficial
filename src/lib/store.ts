import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AnalysisResult, StudyPlan, Question, ChatMessage } from './api';

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
        }),
    }),
    {
      name: 'cramai-study-store',
    }
  )
);
