function stripHtml(s: string) { return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
export function isTTSSupported() { return typeof window !== 'undefined' && 'speechSynthesis' in window; }
export function speak(text: string, opts?: { rate?: number; onEnd?: () => void }) {
  if (!isTTSSupported()) return;
  const clean = stripHtml(text); if (!clean) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(clean);
  u.rate = opts?.rate ?? 1; u.pitch = 1;
  if (opts?.onEnd) u.onend = () => opts.onEnd?.();
  window.speechSynthesis.speak(u);
}
export function stopSpeaking() { if (isTTSSupported()) window.speechSynthesis.cancel(); }
export function isSpeaking() { return isTTSSupported() && window.speechSynthesis.speaking; }

export async function downloadTtsAudio(text: string, filename = 'cramai-notes.txt') {
  const clean = stripHtml(text);
  const blob = new Blob([clean], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}