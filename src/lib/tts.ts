import { ttsAudio } from './api';

function stripHtml(s: string) { return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }

export function isTTSSupported() { return typeof window !== 'undefined' && 'speechSynthesis' in window; }

// ---------- Browser fallback (uses best available voice) ----------
function pickBestVoice(): SpeechSynthesisVoice | null {
  if (!isTTSSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const prefs = [
    /Google.*US English/i,
    /Google UK English Female/i,
    /Microsoft.*Aria/i,
    /Microsoft.*Jenny/i,
    /Microsoft.*Natural/i,
    /Samantha/i,
    /Karen/i,
    /en-US/i,
    /en-GB/i,
  ];
  for (const re of prefs) {
    const v = voices.find((x) => re.test(x.name) || re.test(x.lang));
    if (v) return v;
  }
  return voices[0];
}

function browserSpeak(text: string, onEnd?: () => void) {
  if (!isTTSSupported()) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickBestVoice();
  if (v) { u.voice = v; u.lang = v.lang; }
  u.rate = 1; u.pitch = 1;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

// ---------- AI voice (HuggingFace MMS-TTS via edge function) ----------
type Controller = {
  cancel: () => void;
  done: Promise<void>;
};

let active: Controller | null = null;
let speakingFlag = false;

export function isSpeaking() {
  return speakingFlag || (isTTSSupported() && window.speechSynthesis.speaking);
}

export function stopSpeaking() {
  speakingFlag = false;
  active?.cancel();
  active = null;
  if (isTTSSupported()) window.speechSynthesis.cancel();
}

function chunkText(text: string, maxLen = 380): string[] {
  const clean = stripHtml(text);
  if (!clean) return [];
  const sentences = clean.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + ' ' + s).trim().length > maxLen && cur) { chunks.push(cur.trim()); cur = s; }
    else cur = (cur ? cur + ' ' : '') + s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

async function playBase64(b64: string, mime: string, signal: { cancelled: boolean }): Promise<void> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime || 'audio/flac' });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  return new Promise((resolve) => {
    const cleanup = () => { URL.revokeObjectURL(url); resolve(); };
    audio.onended = cleanup;
    audio.onerror = cleanup;
    const tick = setInterval(() => {
      if (signal.cancelled) { clearInterval(tick); try { audio.pause(); } catch { /* noop */ } cleanup(); }
    }, 200);
    audio.play().catch(cleanup);
  });
}

/** Speak text using AI voice; falls back to the browser voice on failure. */
export function speak(text: string, opts?: { onEnd?: () => void; forceBrowser?: boolean }) {
  stopSpeaking();
  const clean = stripHtml(text);
  if (!clean) { opts?.onEnd?.(); return; }
  if (opts?.forceBrowser) { speakingFlag = true; browserSpeak(clean, () => { speakingFlag = false; opts?.onEnd?.(); }); return; }

  const chunks = chunkText(clean);
  const signal = { cancelled: false };
  speakingFlag = true;
  const done = (async () => {
    let usedFallback = false;
    for (let i = 0; i < chunks.length; i++) {
      if (signal.cancelled) break;
      try {
        const res = await ttsAudio(chunks[i]);
        if (signal.cancelled) break;
        if (res.error || !res.data?.audio) { usedFallback = true; break; }
        await playBase64(res.data.audio, res.data.mime, signal);
      } catch {
        usedFallback = true;
        break;
      }
    }
    if (usedFallback && !signal.cancelled) {
      // Fall back to browser TTS for the remainder
      await new Promise<void>((r) => browserSpeak(clean, () => r()));
    }
    speakingFlag = false;
    opts?.onEnd?.();
  })();
  active = { cancel: () => { signal.cancelled = true; }, done };
}

export async function downloadTtsAudio(text: string, filename = 'cramai-notes.txt') {
  const clean = stripHtml(text);
  const blob = new Blob([clean], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}