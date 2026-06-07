type Listener = (text: string, isFinal: boolean) => void;
type ErrorListener = (msg: string) => void;

export function isSRSupported() {
  return typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export function createRecognizer(
  onText: Listener,
  opts?: { lang?: string; continuous?: boolean; onError?: ErrorListener },
) {
  if (!isSRSupported()) return null;
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const r = new SR();
  r.lang = opts?.lang || 'en-US';
  r.interimResults = true;
  r.continuous = opts?.continuous ?? true;
  r.onresult = (e: any) => {
    let text = '';
    let isFinal = false;
    for (let i = e.resultIndex; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
      if (e.results[i].isFinal) isFinal = true;
    }
    onText(text, isFinal);
  };
  r.onerror = (e: any) => {
    const code = e?.error || 'unknown';
    const msg =
      code === 'not-allowed' || code === 'service-not-allowed'
        ? 'Microphone blocked. Allow mic access in your browser settings.'
        : code === 'no-speech'
        ? 'No speech detected. Try again.'
        : code === 'audio-capture'
        ? 'No microphone found.'
        : `Voice error: ${code}`;
    opts?.onError?.(msg);
  };
  return r;
}

/** Request mic permission up-front so SpeechRecognition.start() doesn't silently fail. */
export async function ensureMicPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}