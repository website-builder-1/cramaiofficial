function stripHtml(s: string) { return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }

export function isTTSSupported() { return typeof window !== 'undefined' && 'speechSynthesis' in window; }

const isSafari = () =>
  typeof navigator !== 'undefined' &&
  /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);

// ---------- Voice selection: prefer modern "Natural / Neural" browser voices ----------
// These voices are free, unlimited, and sound dramatically better than HuggingFace MMS-TTS.
// Chrome ships "Google ..." voices, Edge ships Microsoft Online Natural neural voices,
// macOS/iOS ship premium voices like Samantha/Ava/Evan.
function pickBestVoice(): SpeechSynthesisVoice | null {
  if (!isTTSSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Safari/macOS/iOS — prioritise Apple's premium/enhanced voices first.
  const applePrefs: RegExp[] = [
    /Ava \(Premium\)/i,
    /Ava \(Enhanced\)/i,
    /^Ava$/i,
    /Evan \(Premium\)/i,
    /Evan \(Enhanced\)/i,
    /Allison \(Premium\)/i,
    /Allison \(Enhanced\)/i,
    /Samantha \(Enhanced\)/i,
    /^Samantha$/i,
    /Serena \(Premium\)/i,
    /Serena \(Enhanced\)/i,
    /Karen \(Premium\)/i,
    /Karen \(Enhanced\)/i,
    /Daniel \(Enhanced\)/i,
    /^Daniel$/i,
    /Moira \(Enhanced\)/i,
  ];
  const otherPrefs: RegExp[] = [
    // Microsoft Edge neural "Online Natural" voices — by far the most human-sounding free option
    /Microsoft Ava Online \(Natural\)/i,
    /Microsoft Jenny Online \(Natural\)/i,
    /Microsoft Aria Online \(Natural\)/i,
    /Microsoft Emma Online \(Natural\)/i,
    /Microsoft Sonia Online \(Natural\)/i,
    /Microsoft Libby Online \(Natural\)/i,
    /Microsoft Guy Online \(Natural\)/i,
    /Microsoft Andrew Online \(Natural\)/i,
    /Online \(Natural\).*English/i,
    // Apple premium voices
    /Ava \(Premium\)/i,
    /Evan \(Premium\)/i,
    /Samantha/i,
    // Google Chrome built-ins
    /Google UK English Female/i,
    /Google US English/i,
    // Generic English fallback
    /en-GB/i,
    /en-US/i,
  ];
  const prefs = isSafari() ? [...applePrefs, ...otherPrefs] : otherPrefs;
  for (const re of prefs) {
    const v = voices.find((x) => re.test(x.name) || re.test(`${x.name} ${x.lang}`));
    if (v) return v;
  }
  // Avoid the awful default "Fred"/"Albert"/"Bad News" on Safari.
  const badSafari = /(Fred|Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Pipe Organ|Trinoids|Whisper|Wobble|Zarvox|Jester|Junior|Kathy|Princess|Ralph|Vicki|Victoria|Reed|Rocko|Sandy|Shelley|Grandma|Grandpa|Eddy|Flo)/i;
  const enVoices = voices.filter((v) => /^en/i.test(v.lang) && !badSafari.test(v.name));
  return enVoices[0] || voices.find((v) => /^en/i.test(v.lang)) || voices[0];
}

let speakingFlag = false;
let cancelled = false;

export function isSpeaking() {
  return speakingFlag || (isTTSSupported() && window.speechSynthesis.speaking);
}

export function stopSpeaking() {
  cancelled = true;
  speakingFlag = false;
  if (isTTSSupported()) window.speechSynthesis.cancel();
}

function ensureVoicesLoaded(): Promise<void> {
  return new Promise((resolve) => {
    if (!isTTSSupported()) return resolve();
    if (window.speechSynthesis.getVoices().length) return resolve();
    const handler = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve();
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    // safety timeout
    setTimeout(() => resolve(), 800);
  });
}

function splitForSpeech(text: string, maxLen = 220): string[] {
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

function speakChunk(text: string, voice: SpeechSynthesisVoice | null): Promise<void> {
  return new Promise((resolve) => {
    if (!isTTSSupported()) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    if (voice) { u.voice = voice; u.lang = voice.lang; }
    u.rate = 1.0;
    u.pitch = 1.05;
    u.volume = 1;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

/**
 * Speak text using the best natural browser voice available.
 * IMPORTANT: must be called from a user-gesture handler (e.g. click). Safari
 * silently falls back to the default voice if the FIRST `speak()` call happens
 * outside the gesture. We therefore queue the first chunk synchronously and
 * only do async voice loading on subsequent chunks.
 */
export function speak(text: string, opts?: { onEnd?: () => void }) {
  stopSpeaking();
  cancelled = false;
  const clean = stripHtml(text);
  if (!clean) { opts?.onEnd?.(); return; }
  if (!isTTSSupported()) { opts?.onEnd?.(); return; }
  speakingFlag = true;

  const chunks = splitForSpeech(clean);
  // Pick a voice synchronously if voices are already loaded (Safari usually is).
  let voice = pickBestVoice();
  // Kick off the first chunk synchronously so we keep the user-gesture context.
  const firstChunk = chunks.shift() || '';
  const firstUtter = new SpeechSynthesisUtterance(firstChunk);
  if (voice) { firstUtter.voice = voice; firstUtter.lang = voice.lang; }
  firstUtter.rate = 1.0;
  firstUtter.pitch = 1.05;
  firstUtter.volume = 1;
  firstUtter.onend = () => { void runRest(); };
  firstUtter.onerror = () => { void runRest(); };
  window.speechSynthesis.speak(firstUtter);

  const runRest = async () => {
    if (!voice) {
      await ensureVoicesLoaded();
      voice = pickBestVoice();
    }
    for (const c of chunks) {
      if (cancelled) break;
      await speakChunk(c, voice);
    }
    speakingFlag = false;
    opts?.onEnd?.();
  };
}

export async function downloadTtsAudio(text: string, filename = 'cramai-notes.txt') {
  const clean = stripHtml(text);
  const blob = new Blob([clean], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}