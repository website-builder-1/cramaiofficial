/**
 * Browser TTS helpers using SpeechSynthesis.
 * Free, on-device, no network calls.
 */

let currentUtter: SpeechSynthesisUtterance | null = null;

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function isTTSSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string, opts?: { rate?: number; voice?: SpeechSynthesisVoice; onEnd?: () => void }) {
  if (!isTTSSupported()) return;
  const clean = stripHtml(text);
  if (!clean) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(clean);
  u.rate = opts?.rate ?? 1;
  u.pitch = 1;
  if (opts?.voice) u.voice = opts.voice;
  if (opts?.onEnd) u.onend = () => opts.onEnd?.();
  currentUtter = u;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (!isTTSSupported()) return;
  window.speechSynthesis.cancel();
  currentUtter = null;
}

export function isSpeaking() {
  return isTTSSupported() && window.speechSynthesis.speaking;
}

/**
 * Render arbitrary text via speechSynthesis into a downloadable webm audio file
 * by piping a MediaStream destination through MediaRecorder.
 *
 * NOTE: This works in Chromium-based browsers (Chrome/Edge). Firefox/Safari
 * may capture silence because the SpeechSynthesis audio stream is not exposed
 * to WebAudio. We fall back gracefully.
 */
export async function downloadTtsAudio(text: string, filename = 'cramai-notes.webm') {
  if (!isTTSSupported()) throw new Error('Speech synthesis not supported in this browser.');
  const clean = stripHtml(text);
  if (!clean) throw new Error('Nothing to read.');

  // We'll use an offline recording trick: speak into the page while recording
  // via getDisplayMedia is too intrusive. Instead, we render utterance-by-
  // utterance and concatenate timed silences. Since SpeechSynthesis is not
  // routable through WebAudio in most browsers, we fall back to writing a
  // plaintext "script" + the playable URL so the user can record locally if
  // needed.
  //
  // Practical commute mode: just play it back. The "download" returns a
  // .txt transcript fallback if recording isn't supported.
  try {
    // Try MediaRecorder of the page's audio (not universally available).
    const stream = (navigator.mediaDevices as any).getDisplayMedia
      ? await (navigator.mediaDevices as any).getDisplayMedia({ audio: true, video: true }).catch(() => null)
      : null;
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const audioOnly = new MediaStream(audioTracks);
        const rec = new MediaRecorder(audioOnly, { mimeType: 'audio/webm' });
        const chunks: BlobPart[] = [];
        rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        await new Promise<void>((resolve) => {
          rec.onstop = () => resolve();
          rec.start();
          speak(clean, {
            onEnd: () => {
              rec.stop();
              stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
            },
          });
        });
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    }
  } catch {
    // ignore
  }

  // Fallback: download the transcript so commuters can use any TTS app.
  const blob = new Blob([clean], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/\.webm$/, '.txt');
  a.click();
  URL.revokeObjectURL(url);
}