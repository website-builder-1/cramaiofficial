// Browser SpeechRecognition wrapper (free, on-device-ish).

type Listener = (text: string, isFinal: boolean) => void;

export function isSRSupported() {
  return typeof window !== 'undefined' &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export function createRecognizer(onText: Listener, opts?: { lang?: string; continuous?: boolean }) {
  if (!isSRSupported()) return null;
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const r = new SR();
  r.lang = opts?.lang || 'en-US';
  r.interimResults = true;
  r.continuous = !!opts?.continuous;
  r.onresult = (e: any) => {
    let text = '';
    let isFinal = false;
    for (let i = e.resultIndex; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
      if (e.results[i].isFinal) isFinal = true;
    }
    onText(text, isFinal);
  };
  return r;
}