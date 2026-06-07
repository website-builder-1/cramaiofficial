import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MODEL_CHAT = 'google/gemini-2.5-flash';
const MODEL_STRUCTURED = 'google/gemini-2.5-flash';

const HF_IMAGE_MODELS = [
  // Ordered best-first for free Hugging Face Inference Providers.
  // Qwen-Image is currently the best free open model for legible in-image
  // typography (labels, equations). FLUX.1-schnell is a fast, high-quality
  // Apache-2.0 fallback. SDXL is a last-resort stable baseline.
  'Qwen/Qwen-Image',
  'black-forest-labs/FLUX.1-schnell',
  'stabilityai/stable-diffusion-xl-base-1.0',
];

// HuggingFace migrated to the Inference Providers router. We try the router
// first and fall back to the legacy host if the router has DNS/network issues.
const HF_HOSTS = [
  'https://router.huggingface.co/hf-inference/models',
  'https://api-inference.huggingface.co/models',
];

const HTML_FORMAT_RULES =
  '\n\nFORMATTING RULES FOR ALL TEXT FIELDS:\n' +
  '- Do NOT use Markdown. No **bold**, *italics*, # headings, bullet markers (- or *), backticks, or underscores.\n' +
  '- Write clean, semantic HTML inside string fields. Allowed tags: <p>, <br>, <strong>, <em>, <ul>, <ol>, <li>, <h3>, <h4>, <code>, <pre>, <blockquote>, <dl>, <dt>, <dd>, <sup>, <sub>.\n' +
  '- For definitions, wrap the term in <strong> followed by the explanation in the same paragraph or in <dt>/<dd>.\n' +
  '- For array-of-string fields (bullets, takeaways, options, etc.), each entry is plain inline HTML (no <ul>/<li> wrapper).\n' +
  '- Never output raw symbols like **, *, #, _ or backticks as formatting.\n' +
  '- Output valid HTML only in text content.';

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function asNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function adhdSystem(body: Record<string, unknown>): string {
  const p = body.adhdProfile as
    | {
        hasAdhd?: boolean | null;
        attentionSpan?: 'short' | 'medium' | 'long';
        chunkStyle?: 'tiny' | 'standard' | 'deep';
        coachTone?: 'gentle' | 'direct' | 'playful';
        struggles?: string[];
        rewardsOn?: boolean;
      }
    | undefined;
  if (!p) return '';
  const lines: string[] = ['\n\nLEARNER PROFILE (personalize to this user):'];
  if (p.hasAdhd) lines.push('- User has self-identified ADHD. Adapt accordingly.');
  if (p.attentionSpan) lines.push(`- Attention span: ${p.attentionSpan}.`);
  if (p.chunkStyle) {
    const map = {
      tiny: 'Use very small 1-2 minute micro-steps; never overwhelm.',
      standard: 'Use 2-5 minute chunks.',
      deep: 'Allow longer 5-10 minute chunks when concept depth is needed.',
    } as const;
    lines.push(`- Chunking style: ${p.chunkStyle} (${map[p.chunkStyle]})`);
  }
  if (p.coachTone) {
    const tone = {
      gentle: 'warm, kind, low-pressure, validating',
      direct: 'crisp, no fluff, action-first, body-double style',
      playful: 'fun, light, dopamine-hitting, emoji okay but minimal',
      coach: 'firm, motivating, sports-coach style, brief and energizing',
      dry: 'extremely concise, deadpan, no emoji, no encouragement, just facts',
    } as const;
    const k = p.coachTone as keyof typeof tone;
    lines.push(`- Tone: ${k} (${tone[k] ?? ''}).`);
  }
  if (p.struggles?.length) {
    lines.push(`- Known struggles: ${p.struggles.join(', ')}. Proactively scaffold around these.`);
  }
  if (p.rewardsOn) lines.push('- End each response with a tiny, concrete dopamine reward / win.');
  lines.push('- Avoid long walls of text. Prefer short paragraphs, bullets, and clear next actions.');
  return lines.join('\n');
}

function syllabusSystem(body: Record<string, unknown>): string {
  const s = body.syllabusContext as
    | {
        label?: string;
        topics?: { name: string; weight?: string; notes?: string }[];
        commandWords?: string[];
        assessmentObjectives?: string[];
        summary?: string;
      }
    | undefined;
  const pp = body.pastPaperContext as
    | {
        label?: string;
        patterns?: string[];
        commonCommandWords?: string[];
        markAllocationStyle?: string;
        pitfalls?: string[];
      }
    | undefined;
  const out: string[] = [];
  if (s) {
    out.push('\n\nEXAM-BOARD GROUNDING — produce only content that aligns with this specification:');
    if (s.label) out.push(`- Specification: ${s.label}`);
    if (s.summary) out.push(`- Overview: ${s.summary}`);
    if (s.topics?.length) {
      out.push('- Required topics: ' + s.topics.map((t) => `${t.name}${t.weight ? ` (${t.weight})` : ''}`).join('; '));
    }
    if (s.commandWords?.length) out.push('- Command words to use: ' + s.commandWords.join(', '));
    if (s.assessmentObjectives?.length) out.push('- Assessment objectives: ' + s.assessmentObjectives.join(' | '));
    out.push('- DO NOT include content that is outside this specification. If the source material drifts off-spec, narrow to what the spec covers.');
  }
  if (pp) {
    out.push('\nPAST-PAPER ALIGNMENT — mimic the style and weighting of real exam papers:');
    if (pp.label) out.push(`- Source: ${pp.label}`);
    if (pp.patterns?.length) out.push('- Common question patterns: ' + pp.patterns.join(' | '));
    if (pp.commonCommandWords?.length) out.push('- Use these command words verbatim: ' + pp.commonCommandWords.join(', '));
    if (pp.markAllocationStyle) out.push('- Mark allocation: ' + pp.markAllocationStyle);
    if (pp.pitfalls?.length) out.push('- Common student pitfalls to surface in mark schemes: ' + pp.pitfalls.join('; '));
  }
  return out.join('\n');
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
          'You are an expert exam-prep tutor. When images are provided, perform OCR and visually interpret diagrams, handwriting, charts, and equations as study material. When an exam level and board (e.g. GCSE AQA, A-level OCR, IB) are provided, tailor topics, depth, definitions, and required formulas to that specification. Tune phrasing depth and the summary length to the LEARNER PROFILE below. Return ONLY valid JSON matching the schema. No prose, no markdown.' + HTML_FORMAT_RULES + syllabusSystem(body) + adhdSystem(body),
        user: userPayload,
      });
    }

    case '/api/questions/generate': {
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
          'You generate high-quality exam questions STRICTLY from the provided study material. Never invent off-topic questions. Each question\'s "topic" must come from the material.\n\nRULES PER TYPE:\n- multiple-choice: provide 4 plausible options in "options"; "correctAnswer" must equal one option verbatim.\n- true-false: "options" = ["True","False"]; "correctAnswer" = "True" or "False".\n- short-answer: NO options. "correctAnswer" is a 1-3 sentence model answer covering the required points.\n- essay: NO options. "question" is a real essay prompt. "correctAnswer" is a detailed model answer.\n\nEVERY question MUST also include a "markScheme" object: { "points": [{"point": string, "marks": number}], "totalMarks": number, "examinerNotes"?: string, "commonMistakes"?: string[] }. Allocate marks the way a real examiner for this board/level would. For MCQ/TF, totalMarks is 1 and points has a single entry.\n\nAdapt question phrasing, scaffolding hints in the explanation, and difficulty pacing to the LEARNER PROFILE below. Return ONLY valid JSON: an object {"questions": Question[]}. No prose, no markdown.' + HTML_FORMAT_RULES + syllabusSystem(body) + adhdSystem(body),
        user: `${ctx}Material:\n${content}\n\nGenerate ${count} ${difficulty} difficulty questions of types: ${types.join(', ')}.\nALL questions must be grounded in the material above and (if specified) appropriate for the given exam level/board.\n\nEach Question has:\n{\n  "id": string,\n  "type": "multiple-choice" | "short-answer" | "essay" | "true-false",\n  "question": string,\n  "options"?: string[] (ONLY for multiple-choice/true-false),\n  "correctAnswer": string,\n  "explanation": string,\n  "difficulty": "easy" | "medium" | "hard",\n  "topic": string,\n  "markScheme": {"points":[{"point":string,"marks":number}],"totalMarks":number,"examinerNotes"?:string,"commonMistakes"?:string[]}\n}\n\nReturn: {"questions": [...]}`,
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
          'You are a strict but fair exam grader. Grade each answer against its correctAnswer / mark scheme.\n- For multiple-choice/true-false: isCorrect only if the user answer matches the correct option exactly (case-insensitive).\n- For short-answer: isCorrect if the user covers the key points in the correctAnswer, even if worded differently. Allow synonyms.\n- For essay: isCorrect if the user demonstrates the core argument, structure, and key evidence from the mark scheme. Be reasonable — partial but solid attempts count as correct. Give a brief explanation noting what was strong and what was missing.\nReturn ONLY valid JSON matching the schema. No prose.' + HTML_FORMAT_RULES,
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
        system: 'You are an expert study planner. Return ONLY valid JSON.' + HTML_FORMAT_RULES,
        user: `Create an hour-by-hour study plan for ${hours} hours until the exam.\nWeak topics: ${weak.join(', ') || 'none specified'}\n\nMaterial:\n${content}\n\nReturn JSON:\n{\n  "id": string,\n  "hoursUntilExam": number,\n  "schedule": [{"hour": number, "topic": string, "activity": string, "isBreak": boolean, "completed": false}],\n  "tips": string[]\n}`,
        maxTokens: 3000,
      });
    }

    case '/api/flashcards/generate': {
      const content = truncate(body.content);
      const count = Number(body.count) || 15;
      const ctx = contextBlock(body);
      const parsed = await callAIJSON({
        apiKey,
        model: MODEL_STRUCTURED,
        system: 'You create high-quality study flashcards STRICTLY from the provided material. Never invent off-topic cards. Adapt card length, hint style, and difficulty pacing to the LEARNER PROFILE below. Return ONLY valid JSON.' + HTML_FORMAT_RULES + syllabusSystem(body) + adhdSystem(body),
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
        system: 'You create concise, exam-ready summaries STRICTLY from the provided material. Adapt chunk size, tone, and emphasis to the LEARNER PROFILE below. Return ONLY valid JSON.' + HTML_FORMAT_RULES + syllabusSystem(body) + adhdSystem(body),
        user: `${ctx}Material:\n${content}\n\nReturn JSON:\n{\n  "tldr": string,\n  "bulletSummary": string[],\n  "cheatSheet": string[],\n  "keyTerms": [{"term": string, "definition": string}]\n}`,
        maxTokens: 2500,
      });
    }

    case '/api/notes/generate': {
      const content = truncate(body.content, 12000);
      const ctx = contextBlock(body);
      return await callAIJSON({
        apiKey,
        model: MODEL_STRUCTURED,
        system:
          'You write detailed, well-structured study notes STRICTLY from the provided material. Organize logically with clear headings, explain concepts in your own words, define terms, include examples, and call out formulas where relevant. Match depth to the exam level/board if given. CRITICAL: Adapt section length, vocabulary density, tone, use of analogies, and inclusion of micro-recaps to the LEARNER PROFILE below — short attention spans need shorter sections + more bullets + a 1-line "Quick recap"; deep chunkers can handle longer prose; ADHD users benefit from bolded key terms, concrete examples FIRST, and a 1-line "why this matters" per section. Return ONLY valid JSON.' + HTML_FORMAT_RULES + syllabusSystem(body) + adhdSystem(body),
        user: `${ctx}Material:\n${content}\n\nReturn JSON:\n{\n  "title": string,\n  "overview": string,\n  "sections": [{"heading": string, "body": string, "bullets": string[], "examples": string[]}],\n  "keyTakeaways": string[]\n}\n\nProduce 4-8 sections. Each section should have a body paragraph PLUS bullets. Include examples where helpful. Empty arrays are allowed but prefer rich content.`,
        maxTokens: 4000,
      });
    }

    case '/api/chunk': {
      const content = truncate(body.content, 6000);
      const topic = asNonEmptyString(body.topic) || 'this material';
      return await callAIJSON({
        apiKey,
        model: MODEL_STRUCTURED,
        system:
          'You are an ADHD-aware study coach. Break study material into micro-steps of 2-5 minutes each. Each step must be tiny, concrete, and immediately doable. End each step with a one-line "reward" (what the user will be able to do once finished). Return ONLY valid JSON.' + HTML_FORMAT_RULES + adhdSystem(body),
        user: `Topic: ${topic}\n\nMaterial:\n${content}\n\nReturn JSON: {"steps": [{"id": string, "title": string, "detail": string, "minutes": number, "reward": string}]}\n\nProduce 4-8 micro-steps. Keep titles under 10 words. "detail" is 1 short sentence. "minutes" between 2 and 5.`,
        maxTokens: 1500,
      });
    }

    case '/api/just-start': {
      const content = truncate(body.content, 5000);
      return await callAIJSON({
        apiKey,
        model: MODEL_STRUCTURED,
        system:
          'You help ADHD students beat task-paralysis. Pick the SINGLE easiest, smallest, most rewarding 2-minute starter task from the provided material. No choices, no options, no menu. One task only. Return ONLY valid JSON.' + HTML_FORMAT_RULES + adhdSystem(body),
        user: `Material:\n${content}\n\nReturn JSON: {"task": string, "why": string, "minutes": 2}\n\n"task" is the literal action (1 short sentence, e.g. "Read this one definition: ..." or "Try to recall what X means without looking"). "why" is a 1-line encouragement.`,
        maxTokens: 400,
      });
    }

    case '/api/recap': {
      const content = truncate(body.content, 5000);
      const focus = asNonEmptyString(body.focus) || '';
      return await callAIJSON({
        apiKey,
        model: MODEL_STRUCTURED,
        system:
          'You produce a fast, ADHD-friendly recap: 3 short bullets answering "where was I and what matters?". Return ONLY valid JSON.' + HTML_FORMAT_RULES,
        user: `Material:\n${content}\n\n${focus ? `Recently focused on: ${focus}\n\n` : ''}Return JSON: {"bullets": string[]}\nExactly 3 bullets, each under 18 words.`,
        maxTokens: 400,
      });
    }

    case '/api/suggest-questions': {
      const content = truncate(body.content, 6000);
      const count = Math.min(8, Math.max(3, Number(body.count) || 4));
      return await callAIJSON({
        apiKey,
        model: MODEL_STRUCTURED,
        system:
          'You generate short, varied study questions a curious student would ask their tutor about the given material. Return ONLY valid JSON.' + HTML_FORMAT_RULES + adhdSystem(body) + syllabusSystem(body),
        user: `Material:\n${content || '(no material provided — generate generic study-skill prompts)'}\n\nReturn JSON: {"questions": string[]}\nExactly ${count} questions. Each under 14 words. Mix conceptual (\"why\", \"how\"), comparison, and application/example prompts. Avoid repeating the same opener. No numbering, no markdown.`,
        maxTokens: 500,
      });
    }

    case '/api/image/generate': {
      const prompt = asNonEmptyString(body.prompt);
      if (!prompt) throw new Error('Missing prompt');
      const hfKey = Deno.env.get('HUGGINGFACE_API_KEY');
      if (!hfKey) throw new Error('HUGGINGFACE_API_KEY not configured');

      // Strong prompt scaffolding for study diagrams. Free open models still
      // struggle with arbitrary in-image text, so we steer toward
      // iconographic / minimal-label compositions and instruct the model to
      // omit text it cannot render correctly.
      const enhanced =
        `Educational study diagram illustrating: ${prompt}. ` +
        `Clean minimalist flat vector illustration, textbook style, ` +
        `clearly arranged composition with generous whitespace, ` +
        `high contrast, soft pastel palette on a pure white background, ` +
        `crisp clean lines, balanced layout, single cohesive scene. ` +
        `Use short labels of 1–3 real English words only where essential; ` +
        `prefer icons, arrows and shapes over text. ` +
        `Sharp focus, professional educational infographic aesthetic.`;

      const negative =
        'gibberish text, misspelled words, fake letters, scrambled typography, ' +
        'random symbols, watermark, signature, blurry, low quality, distorted, ' +
        'extra limbs, deformed, cluttered background, photo-realistic skin pores';

      let lastErr = '';

      for (const host of HF_HOSTS) {
        for (const model of HF_IMAGE_MODELS) {
          // Schnell is distilled — needs few steps, low guidance. Other
          // models benefit from more steps + real guidance.
          const isSchnell = model.includes('schnell');
          const parameters: Record<string, unknown> = isSchnell
            ? { num_inference_steps: 4, guidance_scale: 0.0, width: 1024, height: 1024 }
            : {
                num_inference_steps: 30,
                guidance_scale: 4.5,
                width: 1024,
                height: 1024,
                negative_prompt: negative,
              };

          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              const res = await fetch(`${host}/${model}`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${hfKey}`,
                  'Content-Type': 'application/json',
                  Accept: 'image/png',
                },
                body: JSON.stringify({
                  inputs: enhanced,
                  parameters,
                  options: { wait_for_model: true },
                }),
              });
              if (res.status === 503) {
                await new Promise((r) => setTimeout(r, 4000));
                continue;
              }
              if (!res.ok) {
                lastErr = `HF ${model} ${res.status}: ${(await res.text()).slice(0, 200)}`;
                console.error(lastErr);
                break; // try next model
              }
              const ct = res.headers.get('content-type') || '';
              if (!ct.startsWith('image/')) {
                lastErr = `HF ${model} returned ${ct}: ${(await res.text()).slice(0, 200)}`;
                console.error(lastErr);
                break;
              }
              const buf = new Uint8Array(await res.arrayBuffer());
              let bin = '';
              for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
              const b64 = btoa(bin);
              return { image: `data:${ct};base64,${b64}`, model: `hf:${model}` };
            } catch (e) {
              lastErr = e instanceof Error ? e.message : String(e);
              console.error('HF fetch error', lastErr);
            }
          }
        }
      }

      throw new Error(lastErr || 'Hugging Face image generation failed');
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
      const images = Array.isArray(body.images)
        ? (body.images as unknown[]).filter((x): x is string => typeof x === 'string' && x.startsWith('data:image/')).slice(0, 6)
        : [];
      if (!message && images.length === 0) throw new Error('Missing message/question');

      const context = truncate(body.context, 4000);
      const history = Array.isArray(body.history) ? body.history : [];
      const historyStr = history
        .slice(-6)
        .map((m: any) => `${m.role}: ${m.content}`)
        .join('\n');

      let system =
        'You are CramAI, a friendly and expert AI tutor. Be clear, encouraging, and concise. You have access to the student\'s loaded study material via the provided context — use it to ground every answer and reference specific topics/definitions from it when relevant. When images are attached, perform OCR and visually interpret diagrams, handwriting, charts, or equations as additional study material.';
      system += HTML_FORMAT_RULES;
      system += adhdSystem(body);
      system += syllabusSystem(body);
      let userMsg = message || '(see attached image(s))';

      if (endpoint === '/api/chat/explain') {
        system += ' The user wants a clear, beginner-friendly explanation of a concept.';
        userMsg = `Explain this concept clearly: ${userMsg}`;
      } else if (endpoint === '/api/chat/hint') {
        system += ' Give a helpful hint WITHOUT revealing the full answer.';
        userMsg = `I am stuck on this problem. Give me a hint:\n${userMsg}`;
      } else if (endpoint === '/api/chat/solve-step') {
        system += ' Solve the problem step-by-step, showing every step clearly.';
        userMsg = `Solve this step-by-step:\n${userMsg}`;
      }

      const userText =
        (context ? `Study material context:\n${context}\n\n` : '') +
        (historyStr ? `Recent conversation:\n${historyStr}\n\n` : '') +
        userMsg;

      const userPayload: string | Array<Record<string, unknown>> = images.length
        ? [
            { type: 'text', text: userText },
            ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
          ]
        : userText;

      const out = await callAI({
        apiKey,
        model: MODEL_CHAT,
        system,
        user: userPayload,
        maxTokens: 1200,
      });
      return { message: out.trim() };
    }

    case '/api/explain-back': {
      const concept = asNonEmptyString(body.concept) || '(concept)';
      const userExpl = asNonEmptyString(body.userExplanation) || '';
      const context = truncate(body.context, 4000);
      if (!userExpl) throw new Error('Missing explanation');
      return await callAIJSON({
        apiKey,
        model: MODEL_STRUCTURED,
        system:
          'You evaluate a student\'s spoken/typed explanation of a concept against the source material. Score 0-100 for completeness + correctness. Be encouraging but honest. Return ONLY valid JSON.' +
          HTML_FORMAT_RULES + adhdSystem(body) + syllabusSystem(body),
        user: `Concept the student is explaining: ${concept}\n\nSource material:\n${context}\n\nStudent's explanation:\n${userExpl}\n\nReturn JSON:\n{\n  "score": number (0-100),\n  "missing": string[] (key points they didn't cover),\n  "goodPoints": string[] (what they got right),\n  "oneLineFix": string (single most important correction)\n}`,
        maxTokens: 800,
      });
    }

    case '/api/syllabus/fetch': {
      const subject = asNonEmptyString(body.subject) || 'General';
      const examLevel = asNonEmptyString(body.examLevel) || '';
      const examBoard = asNonEmptyString(body.examBoard) || '';
      const code = asNonEmptyString(body.syllabusCode) || '';
      return await callAIJSON({
        apiKey,
        model: MODEL_STRUCTURED,
        system:
          'You are an expert UK/international exam syllabus specialist. Given a subject + level + board (+ optional spec code), produce the canonical specification context: required topics with relative weighting, official command words, assessment objectives, and a short overview. Use your knowledge of real specifications (AQA, OCR, Edexcel, WJEC, CIE, IB, AP, SAT, etc.). If you are uncertain about exact details, return your best concise summary without fabricating specific code numbers. Return ONLY valid JSON.' +
          HTML_FORMAT_RULES,
        user: `Subject: ${subject}\nLevel: ${examLevel}\nBoard: ${examBoard}\nSpec code: ${code}\n\nReturn JSON:\n{\n  "label": string (e.g. "AQA A-level Biology 7402"),\n  "topics": [{"name": string, "weight"?: string, "notes"?: string}],\n  "commandWords": string[],\n  "assessmentObjectives": string[],\n  "summary": string (2-3 sentences)\n}`,
        maxTokens: 1500,
      });
    }

    case '/api/past-papers/context': {
      const subject = asNonEmptyString(body.subject) || 'General';
      const examLevel = asNonEmptyString(body.examLevel) || '';
      const examBoard = asNonEmptyString(body.examBoard) || '';
      return await callAIJSON({
        apiKey,
        model: MODEL_STRUCTURED,
        system:
          'You summarize past-paper patterns for the given subject + level + board. Focus on: typical question stems, command words, mark allocation style, recurring topics, common student pitfalls. Return ONLY valid JSON.' +
          HTML_FORMAT_RULES,
        user: `Subject: ${subject}\nLevel: ${examLevel}\nBoard: ${examBoard}\n\nReturn JSON:\n{\n  "label": string,\n  "patterns": string[] (5-8 typical question patterns),\n  "commonCommandWords": string[],\n  "markAllocationStyle": string (1-2 sentences),\n  "pitfalls": string[] (5-7 frequent mistakes students make)\n}`,
        maxTokens: 1200,
      });
    }

    case '/api/verify-diagram': {
      const prompt = asNonEmptyString(body.prompt) || '';
      if (!prompt) throw new Error('Missing prompt');
      return await callAIJSON({
        apiKey,
        model: MODEL_STRUCTURED,
        system:
          'You audit a study-diagram generation prompt for likely accuracy when rendered by a small open-source image model. Predict legibility, factual accuracy, label issues, and propose a tighter prompt. Return ONLY valid JSON.',
        user: `Prompt that will be sent to an open image model:\n${prompt}\n\nReturn JSON:\n{\n  "accuracyScore": number (0-100),\n  "issues": string[],\n  "suggestedPromptFix": string\n}`,
        maxTokens: 400,
      });
    }

    case '/api/hallucination-check': {
      const source = truncate(body.source, 10000);
      const draft = truncate(body.draft, 10000);
      if (!source || !draft) throw new Error('Missing source or draft');
      return await callAIJSON({
        apiKey,
        model: MODEL_STRUCTURED,
        system:
          'You are a strict fact-checker. Compare the DRAFT against the SOURCE. Flag claims that are not directly supported by or contradict the source. Be conservative — only flag claims that a teacher would actually push back on. Return ONLY valid JSON.' +
          HTML_FORMAT_RULES,
        user: `SOURCE:\n${source}\n\nDRAFT:\n${draft}\n\nReturn JSON: {"flaggedClaims": [{"text": string (the exact problematic sentence/phrase from the DRAFT, max 25 words), "reason": string, "suggestedFix"?: string}]}\n\nReturn an empty array if everything is well-supported. Maximum 8 flags.`,
        maxTokens: 1200,
      });
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
