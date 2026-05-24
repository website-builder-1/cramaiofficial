import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HF_URL = 'https://router.huggingface.co/v1/chat/completions';
// Best free models on HF Inference Providers
const MODEL_CHAT = 'meta-llama/Llama-3.3-70B-Instruct';
const MODEL_STRUCTURED = 'Qwen/Qwen2.5-72B-Instruct';

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function asNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

async function callHF(opts: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
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

  const res = await fetch(HF_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`HF error ${res.status}: ${errText}`);
    throw new Error(`Hugging Face API error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? '';
  return content;
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

async function handleEndpoint(
  endpoint: string,
  body: Record<string, unknown>,
  apiKey: string,
) {
  switch (endpoint) {
    case '/api/analyze': {
      const content = truncate(body.content);
      const subject = asNonEmptyString(body.subject) || 'General';
      const out = await callHF({
        apiKey,
        model: MODEL_STRUCTURED,
        system:
          'You are an expert study assistant. Analyze the provided study material and return ONLY valid JSON matching the requested schema. No prose, no markdown.',
        user: `Subject: ${subject}\n\nMaterial:\n${content}\n\nReturn JSON with this exact shape:\n{\n  "keyTopics": string[],\n  "definitions": [{"term": string, "definition": string}],\n  "concepts": string[],\n  "formulas": string[],\n  "estimatedStudyTime": number (minutes),\n  "summary": string\n}`,
        json: true,
      });
      return extractJSON(out);
    }

    case '/api/questions/generate':
    case '/api/questions/diagnostic': {
      const content = truncate(body.content);
      const count = Number(body.count) || 10;
      const difficulty = asNonEmptyString(body.difficulty) || 'mixed';
      const types = Array.isArray(body.types) && body.types.length
        ? body.types
        : ['multiple-choice', 'short-answer', 'true-false'];
      const out = await callHF({
        apiKey,
        model: MODEL_STRUCTURED,
        system:
          'You generate exam questions. Return ONLY valid JSON: an object {"questions": Question[]}. No prose, no markdown.',
        user: `Material:\n${content}\n\nGenerate ${count} ${difficulty} difficulty questions of types: ${types.join(', ')}.\n\nEach Question has:\n{\n  "id": string,\n  "type": "multiple-choice" | "short-answer" | "essay" | "true-false",\n  "question": string,\n  "options"?: string[] (only for multiple-choice/true-false),\n  "correctAnswer": string,\n  "explanation": string,\n  "difficulty": "easy" | "medium" | "hard",\n  "topic": string\n}\n\nReturn: {"questions": [...]}`,
        json: true,
        maxTokens: 3500,
      });
      const parsed = extractJSON(out);
      return Array.isArray(parsed) ? parsed : (parsed.questions || []);
    }

    case '/api/questions/grade': {
      const questions = body.questions;
      const userAnswers = body.userAnswers;
      const out = await callHF({
        apiKey,
        model: MODEL_STRUCTURED,
        system:
          'You are a strict but fair grader. Return ONLY valid JSON matching the schema. No prose.',
        user: `Questions:\n${truncate(questions)}\n\nUser answers (keyed by question id):\n${truncate(userAnswers)}\n\nReturn JSON:\n{\n  "score": number,\n  "totalQuestions": number,\n  "percentage": number,\n  "answers": [{"questionId": string, "isCorrect": boolean, "userAnswer": string, "correctAnswer": string, "explanation": string}],\n  "weakTopics": string[],\n  "recommendations": string[]\n}`,
        json: true,
        maxTokens: 3000,
      });
      return extractJSON(out);
    }

    case '/api/study-plan/create': {
      const content = truncate(body.content);
      const hours = Number(body.hoursUntilExam) || 24;
      const weak = Array.isArray(body.weakTopics) ? body.weakTopics : [];
      const out = await callHF({
        apiKey,
        model: MODEL_STRUCTURED,
        system: 'You are an expert study planner. Return ONLY valid JSON.',
        user: `Create an hour-by-hour study plan for ${hours} hours until the exam.\nWeak topics: ${weak.join(', ') || 'none specified'}\n\nMaterial:\n${content}\n\nReturn JSON:\n{\n  "id": string,\n  "hoursUntilExam": number,\n  "schedule": [{"hour": number, "topic": string, "activity": string, "isBreak": boolean, "completed": false}],\n  "tips": string[]\n}`,
        json: true,
        maxTokens: 3000,
      });
      return extractJSON(out);
    }

    case '/api/study-plan/last-minute-review': {
      const content = truncate(body.content);
      const out = await callHF({
        apiKey,
        model: MODEL_STRUCTURED,
        system: 'You create concise last-minute exam review sheets. Return ONLY valid JSON.',
        user: `Material:\n${content}\n\nReturn JSON:\n{\n  "keyPoints": string[],\n  "mustKnow": string[],\n  "quickFormulas": string[],\n  "commonMistakes": string[],\n  "confidenceBooster": string\n}`,
        json: true,
      });
      return extractJSON(out);
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

      const out = await callHF({
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
    const HF_API_KEY = Deno.env.get('HUGGINGFACE_API_KEY');
    if (!HF_API_KEY) {
      return jsonResponse({ error: 'Hugging Face API key not configured' });
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

    console.log(`HF proxy handling: ${endpointStr}`);
    const data = await handleEndpoint(endpointStr, body as Record<string, unknown>, HF_API_KEY);
    return jsonResponse(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});
