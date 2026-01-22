import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AnalysisResult, StudyPlan, Question, ChatMessage } from './api';

interface StudyState {
  // Document content
  documentContent: string;
  setDocumentContent: (content: string) => void;
  
  // Subject
  subject: string;
  setSubject: (subject: string) => void;
  
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
    (set) => ({
      documentContent: '',
      setDocumentContent: (content) => set({ documentContent: content }),
      
      subject: '',
      setSubject: (subject) => set({ subject }),
      
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
