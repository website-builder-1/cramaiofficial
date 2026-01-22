const API_URL = import.meta.env.VITE_CRAMAI_API_URL || 'https://api.cramai.example.com';
const API_KEY = import.meta.env.VITE_CRAMAI_API_KEY || '';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
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
  subject: string
): Promise<ApiResponse<AnalysisResult>> {
  return apiRequest<AnalysisResult>('/api/analyze', {
    method: 'POST',
    body: JSON.stringify({ content, subject }),
  });
}

export async function generateQuestions(params: {
  content: string;
  count: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  types: string[];
}): Promise<ApiResponse<Question[]>> {
  return apiRequest<Question[]>('/api/questions/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function runDiagnosticTest(
  content: string,
  subject: string
): Promise<ApiResponse<Question[]>> {
  return apiRequest<Question[]>('/api/questions/diagnostic', {
    method: 'POST',
    body: JSON.stringify({ content, subject }),
  });
}

export async function gradeAnswers(
  questions: Question[],
  userAnswers: Record<string, string>
): Promise<ApiResponse<GradeResult>> {
  return apiRequest<GradeResult>('/api/questions/grade', {
    method: 'POST',
    body: JSON.stringify({ questions, userAnswers }),
  });
}

export async function createStudyPlan(params: {
  content: string;
  hoursUntilExam: number;
  weakTopics?: string[];
}): Promise<ApiResponse<StudyPlan>> {
  return apiRequest<StudyPlan>('/api/study-plan/create', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getLastMinuteReview(
  content: string
): Promise<ApiResponse<LastMinuteReview>> {
  return apiRequest<LastMinuteReview>('/api/study-plan/last-minute-review', {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function sendChatMessage(
  message: string,
  context: string,
  history: ChatMessage[]
): Promise<ApiResponse<ChatResponse>> {
  return apiRequest<ChatResponse>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ message, context, history }),
  });
}

export async function explainConcept(
  concept: string,
  context: string
): Promise<ApiResponse<ChatResponse>> {
  return apiRequest<ChatResponse>('/api/chat/explain', {
    method: 'POST',
    body: JSON.stringify({ concept, context }),
  });
}

export async function getHint(
  problem: string,
  context: string
): Promise<ApiResponse<ChatResponse>> {
  return apiRequest<ChatResponse>('/api/chat/hint', {
    method: 'POST',
    body: JSON.stringify({ problem, context }),
  });
}

export async function solveStepByStep(
  problem: string,
  context: string
): Promise<ApiResponse<ChatResponse>> {
  return apiRequest<ChatResponse>('/api/chat/solve-step', {
    method: 'POST',
    body: JSON.stringify({ problem, context }),
  });
}
