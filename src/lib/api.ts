import { supabase } from "@/integrations/supabase/client";

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function apiRequest<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<ApiResponse<T>> {
  try {
    const { data, error } = await supabase.functions.invoke('cramai-proxy', {
      body: { endpoint, ...body },
    });

    if (error) {
      console.error('Edge function error:', error);
      return { error: error.message || 'API request failed' };
    }

    if (data?.error) {
      return { error: data.error };
    }

    return { data };
  } catch (error) {
    console.error('API Error:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

// Types
export interface AnalysisResult {
  keyTopics: string[];
  definitions: { term: string; definition: string }[];
  concepts: string[];
  formulas: string[];
  estimatedStudyTime: number;
  summary: string;
}

export interface Question {
  id: string;
  type: 'multiple-choice' | 'short-answer' | 'essay' | 'true-false';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

export interface GradeResult {
  score: number;
  totalQuestions: number;
  percentage: number;
  answers: {
    questionId: string;
    isCorrect: boolean;
    userAnswer: string;
    correctAnswer: string;
    explanation?: string;
  }[];
  weakTopics: string[];
  recommendations: string[];
}

export interface StudyPlan {
  id: string;
  hoursUntilExam: number;
  schedule: {
    hour: number;
    topic: string;
    activity: string;
    isBreak: boolean;
    completed: boolean;
  }[];
  tips: string[];
}

export interface LastMinuteReview {
  keyPoints: string[];
  mustKnow: string[];
  quickFormulas: string[];
  commonMistakes: string[];
  confidenceBooster: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  message: string;
  relatedTopics?: string[];
}

// API Functions
export async function analyzeDocument(
  content: string,
  subject: string,
  examLevel?: string,
  examBoard?: string,
  images?: string[],
): Promise<ApiResponse<AnalysisResult>> {
  return apiRequest<AnalysisResult>('/api/analyze', { content, subject, examLevel, examBoard, images });
}

export async function generateQuestions(params: {
  content: string;
  count: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  types: string[];
  subject?: string;
  examLevel?: string;
  examBoard?: string;
}): Promise<ApiResponse<Question[]>> {
  return apiRequest<Question[]>('/api/questions/generate', params);
}

export async function runDiagnosticTest(
  content: string,
  subject: string
): Promise<ApiResponse<Question[]>> {
  return apiRequest<Question[]>('/api/questions/diagnostic', { content, subject });
}

export async function gradeAnswers(
  questions: Question[],
  userAnswers: Record<string, string>
): Promise<ApiResponse<GradeResult>> {
  return apiRequest<GradeResult>('/api/questions/grade', { questions, userAnswers });
}

export async function createStudyPlan(params: {
  content: string;
  hoursUntilExam: number;
  weakTopics?: string[];
}): Promise<ApiResponse<StudyPlan>> {
  return apiRequest<StudyPlan>('/api/study-plan/create', params);
}

export async function getLastMinuteReview(
  content: string
): Promise<ApiResponse<LastMinuteReview>> {
  return apiRequest<LastMinuteReview>('/api/study-plan/last-minute-review', { content });
}

export async function sendChatMessage(
  message: string,
  context: string,
  history: ChatMessage[]
): Promise<ApiResponse<ChatResponse>> {
  return apiRequest<ChatResponse>('/api/chat', { message, context, history });
}

export async function explainConcept(
  concept: string,
  context: string
): Promise<ApiResponse<ChatResponse>> {
  return apiRequest<ChatResponse>('/api/chat/explain', { concept, context });
}

export async function getHint(
  problem: string,
  context: string
): Promise<ApiResponse<ChatResponse>> {
  return apiRequest<ChatResponse>('/api/chat/hint', { problem, context });
}

export async function solveStepByStep(
  problem: string,
  context: string
): Promise<ApiResponse<ChatResponse>> {
  return apiRequest<ChatResponse>('/api/chat/solve-step', { problem, context });
}

// New features
export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface SummaryResult {
  tldr: string;
  bulletSummary: string[];
  cheatSheet: string[];
  keyTerms: { term: string; definition: string }[];
}

export async function generateFlashcards(
  content: string,
  count = 15,
  context?: { subject?: string; examLevel?: string; examBoard?: string },
): Promise<ApiResponse<{ cards: Flashcard[] }>> {
  return apiRequest<{ cards: Flashcard[] }>('/api/flashcards/generate', { content, count, ...(context || {}) });
}

export async function generateSummary(
  content: string,
  context?: { subject?: string; examLevel?: string; examBoard?: string },
): Promise<ApiResponse<SummaryResult>> {
  return apiRequest<SummaryResult>('/api/summary/generate', { content, ...(context || {}) });
}
