import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MODEL_CHAT = 'google/gemini-2.5-flash';
const MODEL_STRUCTURED = 'google/gemini-2.5-flash';

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function asNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

async function callAI(opts: {
  apiKey: string;
  model: string;
  system: string;
  user: string | Array<Record<string, unknown>>;
  json?: boolean;
  maxTokens?: number;
}) {
  const body: Record<string, unknown> = {
    model: opts.model,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
    max_tokens: opts.maxTokens ?? 2048,
    temperature: 0.4,
  };
  if (opts.json) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(AI_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`AI error ${res.status}: ${errText}`);
    if (res.status === 429) {
      throw new Error('AI is rate limited right now. Please wait a moment and try again.');
    }
    if (res.status === 402) {
      throw new Error('AI credits exhausted. Please add credits in Workspace > Usage.');
    }
    throw new Error(`AI gateway error (${res.status})`);
  }

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? '';
  return content;
}

async function callAIJSON(opts: Parameters<typeof callAI>[0]) {
  // First attempt
  let out = await callAI({ ...opts, json: true });
  try { return extractJSON(out); } catch (_) {}
  // Retry once with stricter instruction
  out = await callAI({
    ...opts,
    json: true,
    system: opts.system + '\n\nCRITICAL: Output ONLY a single valid JSON object. No prose, no markdown, no code fences.',
  });
  return extractJSON(out);
}

function extractJSON(text: string): any {
  // Try direct parse
  try { return JSON.parse(text); } catch {}
  // Strip code fences
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    try { return JSON.parse(fence[1]); } catch {}
  }
  // Find first { ... } or [ ... ] block
  const objMatch = text.match(/[\{\[][\s\S]*[\}\]]/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch {}
  }
  throw new Error('Failed to parse JSON from model response');
}

function truncate(s: unknown, n = 8000): string {
  const str = typeof s === 'string' ? s : JSON.stringify(s ?? '');
  return str.length > n ? str.slice(0, n) + '\n...[truncated]' : str;
}

function contextBlock(body: Record<string, unknown>): string {
  const subject = asNonEmptyString(body.subject);
  const examLevel = asNonEmptyString(body.examLevel);
  const examBoard = asNonEmptyString(body.examBoard);
  const lines = [
    subject ? `Subject: ${subject}` : null,
    examLevel ? `Exam level: ${examLevel}` : null,
    examBoard ? `Exam board / syllabus: ${examBoard}` : null,
  ].filter(Boolean);
  return lines.length ? lines.join('\n') + '\n\n' : '';
}

async function handleEndpoint(
  endpoint: string,
  body: Record<string, unknown>,
  apiKey: string,
) {
  switch (endpoint) {
    case '/api/analyze': {
      const content = truncate(body.content);
      const subject = asNonEmptyString(body.subject) || 'General';
      const examLevel = asNonEmptyString(body.examLevel);
      const examBoard = asNonEmptyString(body.examBoard);
      const images = Array.isArray(body.images)
        ? (body.images as unknown[]).filter((x): x is string => typeof x === 'string' && x.startsWith('data:image/')).slice(0, 6)
        : [];
      const contextLine = [
        `Subject: ${subject}`,
        examLevel ? `Exam level: ${examLevel}` : null,
        examBoard ? `Exam board / syllabus: ${examBoard}` : null,
      ].filter(Boolean).join('\n');
      const textPrompt = `${contextLine}\n\nMaterial:\n${content || '(no pasted text — extract everything from the attached image(s))'}\n\nReturn JSON with this exact shape:\n{\n  "keyTopics": string[],\n  "definitions": [{"term": string, "definition": string}],\n  "concepts": string[],\n  "formulas": string[],\n  "estimatedStudyTime": number (minutes),\n  "summary": string\n}`;
      const userPayload: string | Array<Record<string, unknown>> = images.length
        ? [
            { type: 'text', text: textPrompt },
            ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
          ]
        : textPrompt;
      return await callAIJSON({
        apiKey,
        model: MODEL_STRUCTURED,
        system:
          'You are an expert exam-prep tutor. When images are provided, perform OCR and visually interpret diagrams, handwriting, charts, and equations as study material. When an exam level and board (e.g. GCSE AQA, A-level OCR, IB) are provided, tailor topics, depth, definitions, and required formulas to that specification. Return ONLY valid JSON matching the schema. No prose, no markdown.',
        user: userPayload,
      });
    }

    case '/api/questions/generate':
    case '/api/questions/diagnostic': {
      const content = truncate(body.content);
      const count = Number(body.count) || 10;
      const difficulty = asNonEmptyString(body.difficulty) || 'mixed';
      const types = Array.isArray(body.types) && body.types.length
        ? body.types
        : ['multiple-choice', 'short-answer', 'true-false'];
      const ctx = contextBlock(body);
      const parsed = await callAIJSON({
        apiKey,
        model: MODEL_STRUCTURED,
        system:
          'You generate exam questions STRICTLY from the provided study material. Never invent off-topic questions. Each question\'s "topic" must come from the material. Return ONLY valid JSON: an object {"questions": Question[]}. No prose, no markdown.',
        user: `${ctx}Material:\n${content}\n\nGenerate ${count} ${difficulty} difficulty questions of types: ${types.join(', ')}.\nALL questions must be grounded in the material above and (if specified) appropriate for the given exam level/board.\n\nEach Question has:\n{\n  "id": string,\n  "type": "multiple-choice" | "short-answer" | "essay" | "true-false",\n  "question": string,\n  "options"?: string[] (only for multiple-choice/true-false),\n  "correctAnswer": string,\n  "explanation": string,\n  "difficulty": "easy" | "medium" | "hard",\n  "topic": string\n}\n\nReturn: {"questions": [...]}`,
        maxTokens: 3500,
      });
      return Array.isArray(parsed) ? parsed : (parsed.questions || []);
    }

    case '/api/questions/grade': {
      const questions = body.questions;
      const userAnswers = body.userAnswers;
      return await callAIJSON({
        apiKey,
        model: MODEL_STRUCTURED,
        system:
          'You are a strict but fair grader. Return ONLY valid JSON matching the schema. No prose.',
        user: `Questions:\n${truncate(questions)}\n\nUser answers (keyed by question id):\n${truncate(userAnswers)}\n\nReturn JSON:\n{\n  "score": number,\n  "totalQuestions": number,\n  "percentage": number,\n  "answers": [{"questionId": string, "isCorrect": boolean, "userAnswer": string, "correctAnswer": string, "explanation": string}],\n  "weakTopics": string[],\n  "recommendations": string[]\n}`,
        maxTokens: 3000,
      });
    }

    case '/api/study-plan/create': {
      const content = truncate(body.content);
      const hours = Number(body.hoursUntilExam) || 24;
      const weak = Array.isArray(body.weakTopics) ? body.weakTopics : [];
      return await callAIJSON({
        apiKey,
        model: MODEL_STRUCTURED,
        system: 'You are an expert study planner. Return ONLY valid JSON.',
        user: `Create an hour-by-hour study plan for ${hours} hours until the exam.\nWeak topics: ${weak.join(', ') || 'none specified'}\n\nMaterial:\n${content}\n\nReturn JSON:\n{\n  "id": string,\n  "hoursUntilExam": number,\n  "schedule": [{"hour": number, "topic": string, "activity": string, "isBreak": boolean, "completed": false}],\n  "tips": string[]\n}`,
        maxTokens: 3000,
      });
    }

    case '/api/study-plan/last-minute-review': {
      const content = truncate(body.content);
      return await callAIJSON({
        apiKey,
        model: MODEL_STRUCTURED,
        system: 'You create concise last-minute exam review sheets. Return ONLY valid JSON.',
        user: `Material:\n${content}\n\nReturn JSON:\n{\n  "keyPoints": string[],\n  "mustKnow": string[],\n  "quickFormulas": string[],\n  "commonMistakes": string[],\n  "confidenceBooster": string\n}`,
      });
    }

    case '/api/flashcards/generate': {
      const content = truncate(body.content);
      const count = Number(body.count) || 15;
      const ctx = contextBlock(body);
      const parsed = await callAIJSON({
        apiKey,
        model: MODEL_STRUCTURED,
        system: 'You create high-quality study flashcards STRICTLY from the provided material. Never invent off-topic cards. Return ONLY valid JSON.',
        user: `${ctx}Material:\n${content}\n\nGenerate ${count} flashcards covering the most important concepts in the material above. Match the depth to the exam level/board if provided.\n\nReturn JSON: {"cards": [{"id": string, "front": string, "back": string, "topic": string, "difficulty": "easy"|"medium"|"hard"}]}`,
        maxTokens: 3000,
      });
      return Array.isArray(parsed) ? { cards: parsed } : parsed;
    }

    case '/api/summary/generate': {
      const content = truncate(body.content);
      const ctx = contextBlock(body);
      return await callAIJSON({
        apiKey,
        model: MODEL_STRUCTURED,
        system: 'You create concise, exam-ready summaries STRICTLY from the provided material. Return ONLY valid JSON.',
        user: `${ctx}Material:\n${content}\n\nReturn JSON:\n{\n  "tldr": string,\n  "bulletSummary": string[],\n  "cheatSheet": string[],\n  "keyTerms": [{"term": string, "definition": string}]\n}`,
        maxTokens: 2500,
      });
    }

    case '/api/chat':
    case '/api/chat/explain':
    case '/api/chat/hint':
    case '/api/chat/solve-step': {
      const message =
        asNonEmptyString(body.message) ||
        asNonEmptyString(body.question) ||
        asNonEmptyString(body.concept) ||
        asNonEmptyString(body.problem) ||
        '';
      if (!message) throw new Error('Missing message/question');

      const context = truncate(body.context, 4000);
      const history = Array.isArray(body.history) ? body.history : [];
      const historyStr = history
        .slice(-6)
        .map((m: any) => `${m.role}: ${m.content}`)
        .join('\n');

      let system = 'You are CramAI, a friendly and expert AI tutor. Be clear, encouraging, and concise.';
      let userMsg = message;

      if (endpoint === '/api/chat/explain') {
        system += ' The user wants a clear, beginner-friendly explanation of a concept.';
        userMsg = `Explain this concept clearly: ${message}`;
      } else if (endpoint === '/api/chat/hint') {
        system += ' Give a helpful hint WITHOUT revealing the full answer.';
        userMsg = `I am stuck on this problem. Give me a hint:\n${message}`;
      } else if (endpoint === '/api/chat/solve-step') {
        system += ' Solve the problem step-by-step, showing every step clearly.';
        userMsg = `Solve this step-by-step:\n${message}`;
      }

      const userPayload =
        (context ? `Study material context:\n${context}\n\n` : '') +
        (historyStr ? `Recent conversation:\n${historyStr}\n\n` : '') +
        userMsg;

      const out = await callAI({
        apiKey,
        model: MODEL_CHAT,
        system,
        user: userPayload,
        maxTokens: 1200,
      });
      return { message: out.trim() };
    }

    default:
      throw new Error(`Unknown endpoint: ${endpoint}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const AI_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!AI_API_KEY) {
      return jsonResponse({ error: 'AI is not configured (missing LOVABLE_API_KEY).' });
    }

    const parsedBody = await req.json().catch(() => null);
    if (!parsedBody || typeof parsedBody !== 'object') {
      return jsonResponse({ error: 'Invalid JSON body' });
    }

    const { endpoint, ...body } = parsedBody as Record<string, unknown>;
    const endpointStr = asNonEmptyString(endpoint);
    if (!endpointStr) {
      return jsonResponse({ error: 'Missing endpoint parameter' });
    }

    console.log(`AI proxy handling: ${endpointStr}`);
    const data = await handleEndpoint(endpointStr, body as Record<string, unknown>, AI_API_KEY);
    return jsonResponse(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});
