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
  markScheme?: MarkScheme;
}

export interface MarkScheme {
  points: { point: string; marks: number }[];
  totalMarks: number;
  examinerNotes?: string;
  commonMistakes?: string[];
}

export interface GradeResult {
  score: number;
  totalQuestions: number;
  percentage: number;
  totalMarksAwarded?: number;
  totalMarksAvailable?: number;
  answers: {
    questionId: string;
    isCorrect: boolean;
    userAnswer: string;
    correctAnswer: string;
    explanation?: string;
    marksAwarded?: number;
    marksAvailable?: number;
    markBreakdown?: { point: string; marksAwarded: number; marksAvailable: number; note?: string }[];
    examinerFeedback?: string;
    improvementTips?: string[];
    missingPoints?: string[];
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
  return apiRequest<AnalysisResult>('/api/analyze', withGrounding({ content, subject, examLevel, examBoard, images }));
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
  return apiRequest<Question[]>('/api/questions/generate', withGrounding({ ...params }));
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

// ADHD profile hint passed to coaching endpoints
export interface AdhdHint {
  hasAdhd?: boolean | null;
  attentionSpan?: 'short' | 'medium' | 'long';
  chunkStyle?: 'tiny' | 'standard' | 'deep';
  coachTone?: 'gentle' | 'direct' | 'playful' | 'coach' | 'dry';
  struggles?: string[];
  rewardsOn?: boolean;
}

let currentAdhdHint: AdhdHint | null = null;
export function setAdhdHint(hint: AdhdHint | null) {
  currentAdhdHint = hint;
}

// Syllabus / past-paper context shared across calls
export interface SyllabusContext {
  label: string;
  topics: { name: string; weight?: string; notes?: string }[];
  commandWords?: string[];
  assessmentObjectives?: string[];
  summary?: string;
}

export interface PastPaperContext {
  label: string;
  patterns: string[];
  commonCommandWords?: string[];
  markAllocationStyle?: string;
  pitfalls?: string[];
}

let currentSyllabus: SyllabusContext | null = null;
let currentPastPapers: PastPaperContext | null = null;
export function setSyllabusContextHint(ctx: SyllabusContext | null) {
  currentSyllabus = ctx;
}
export function setPastPaperContextHint(ctx: PastPaperContext | null) {
  currentPastPapers = ctx;
}

function withHint<T extends Record<string, unknown>>(body: T): T {
  if (currentAdhdHint) (body as Record<string, unknown>).adhdProfile = currentAdhdHint;
  if (currentSyllabus) (body as Record<string, unknown>).syllabusContext = currentSyllabus;
  if (currentPastPapers) (body as Record<string, unknown>).pastPaperContext = currentPastPapers;
  return body;
}

/** Same as withHint but always usable for non-ADHD endpoints. */
function withGrounding<T extends Record<string, unknown>>(body: T): T {
  return withHint(body);
}

export async function sendChatMessage(
  message: string,
  context: string,
  history: ChatMessage[],
  images?: string[],
): Promise<ApiResponse<ChatResponse>> {
  return apiRequest<ChatResponse>('/api/chat', withHint({ message, context, history, images }));
}

export async function explainConcept(
  concept: string,
  context: string,
  images?: string[],
): Promise<ApiResponse<ChatResponse>> {
  return apiRequest<ChatResponse>('/api/chat/explain', withHint({ concept, context, images }));
}

export async function getHint(
  problem: string,
  context: string,
  images?: string[],
): Promise<ApiResponse<ChatResponse>> {
  return apiRequest<ChatResponse>('/api/chat/hint', withHint({ problem, context, images }));
}

export async function solveStepByStep(
  problem: string,
  context: string,
  images?: string[],
): Promise<ApiResponse<ChatResponse>> {
  return apiRequest<ChatResponse>('/api/chat/solve-step', withHint({ problem, context, images }));
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
  return apiRequest<{ cards: Flashcard[] }>('/api/flashcards/generate', withGrounding({ content, count, ...(context || {}) }));
}

export async function generateSummary(
  content: string,
  context?: { subject?: string; examLevel?: string; examBoard?: string },
): Promise<ApiResponse<SummaryResult>> {
  return apiRequest<SummaryResult>('/api/summary/generate', withGrounding({ content, ...(context || {}) }));
}

export interface NotesSection {
  heading: string;
  body?: string;
  bullets?: string[];
  examples?: string[];
}

export interface NotesResult {
  title: string;
  overview?: string;
  sections: NotesSection[];
  keyTakeaways?: string[];
}

export async function generateNotes(
  content: string,
  context?: { subject?: string; examLevel?: string; examBoard?: string },
): Promise<ApiResponse<NotesResult>> {
  return apiRequest<NotesResult>('/api/notes/generate', withGrounding({ content, ...(context || {}) }));
}

// Image generation via HuggingFace (proxied)
export async function generateConceptImage(prompt: string): Promise<ApiResponse<{ image: string; model?: string }>> {
  return apiRequest<{ image: string; model?: string }>('/api/image/generate', { prompt });
}

// ADHD helpers
export interface ChunkStep {
  id: string;
  title: string;
  detail: string;
  minutes: number;
  reward: string;
}

export async function chunkContent(content: string, topic?: string): Promise<ApiResponse<{ steps: ChunkStep[] }>> {
  return apiRequest<{ steps: ChunkStep[] }>('/api/chunk', withHint({ content, topic }));
}

export async function justStartTask(content: string): Promise<ApiResponse<{ task: string; why: string; minutes: number }>> {
  return apiRequest<{ task: string; why: string; minutes: number }>('/api/just-start', withHint({ content }));
}

export async function quickRecap(content: string, focus?: string): Promise<ApiResponse<{ bullets: string[] }>> {
  return apiRequest<{ bullets: string[] }>('/api/recap', { content, focus });
}

export async function suggestQuestions(content: string, count = 4): Promise<ApiResponse<{ questions: string[] }>> {
  return apiRequest<{ questions: string[] }>('/api/suggest-questions', withGrounding({ content, count }));
}

// ---- New endpoints ----

export async function explainBack(params: {
  concept: string;
  userExplanation: string;
  context: string;
}): Promise<ApiResponse<{ score: number; missing: string[]; goodPoints: string[]; oneLineFix: string }>> {
  return apiRequest('/api/explain-back', withGrounding({ ...params }));
}

export async function fetchSyllabusContext(params: {
  subject: string;
  examLevel?: string;
  examBoard?: string;
  syllabusCode?: string;
}): Promise<ApiResponse<SyllabusContext>> {
  return apiRequest('/api/syllabus/fetch', params);
}

export async function fetchPastPaperContext(params: {
  subject: string;
  examLevel?: string;
  examBoard?: string;
}): Promise<ApiResponse<PastPaperContext>> {
  return apiRequest('/api/past-papers/context', params);
}

export interface DiagramAccuracy {
  accuracyScore: number;
  issues: string[];
  suggestedPromptFix?: string;
}

export async function verifyDiagram(params: { prompt: string }): Promise<ApiResponse<DiagramAccuracy>> {
  return apiRequest('/api/verify-diagram', params);
}

export interface HallucinationFlag {
  text: string;
  reason: string;
  suggestedFix?: string;
}

export async function hallucinationCheck(params: {
  source: string;
  draft: string;
}): Promise<ApiResponse<{ flaggedClaims: HallucinationFlag[] }>> {
  return apiRequest('/api/hallucination-check', params);
}

// AI voice synthesis (HuggingFace MMS-TTS via proxy)
export async function ttsAudio(text: string): Promise<ApiResponse<{ audio: string; mime: string }>> {
  return apiRequest('/api/tts', { text });
}

export async function transcribeAudio(audio: string, mime: string): Promise<ApiResponse<{ text: string }>> {
  return apiRequest('/api/stt', { audio, mime });
}

function stripHtmlText(value: unknown): string {
  return String(value ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function localNotesScript(notes: unknown, subject?: string): string {
  const n = notes as NotesResult | null;
  if (!n || typeof n !== 'object') return stripHtmlText(notes);
  const parts: string[] = [];
  parts.push(`Let's go through these ${subject ? `${subject} ` : ''}notes together.`);
  if (n.title) parts.push(`The topic is ${stripHtmlText(n.title)}.`);
  if (n.overview) parts.push(`First, the context: ${stripHtmlText(n.overview)}`);
  n.sections?.forEach((section) => {
    parts.push(`Now, ${stripHtmlText(section.heading)}.`);
    if (section.body) parts.push(stripHtmlText(section.body));
    section.bullets?.forEach((bullet) => parts.push(`This means: ${stripHtmlText(bullet)}`));
    section.examples?.forEach((example) => parts.push(`For example, ${stripHtmlText(example)}`));
  });
  if (n.keyTakeaways?.length) {
    parts.push('The key things to remember are:');
    n.keyTakeaways.forEach((takeaway) => parts.push(stripHtmlText(takeaway)));
  }
  return parts.filter(Boolean).join(' ');
}

export async function notesSpokenScript(
  notes: unknown,
  subject?: string,
): Promise<ApiResponse<{ script: string }>> {
  const res = await apiRequest<{ script: string }>('/api/notes/spoken-script', { notes, subject });
  if (res.error?.includes('Unknown endpoint')) {
    return { data: { script: localNotesScript(notes, subject) } };
  }
  return res;
}
