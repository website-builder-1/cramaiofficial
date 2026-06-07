import { transcribeAudio } from './api';

type Listener = (text: string, isFinal: boolean) => void;
type ErrorListener = (msg: string) => void;

export type VoiceController = { stop: () => void };

export function isSRSupported() {
  return typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export function isRecorderSupported() {
  return typeof window !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined';
}

export function isVoiceSupported() {
  return isSRSupported() || isRecorderSupported();
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
      : code === 'network'
        ? 'Browser voice service is unavailable. Use tap-to-record voice instead.'
        : `Voice error: ${code}`;
    opts?.onError?.(msg);
  };
  return r;
}

function bestRecordingMime() {
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return options.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** Records locally, then transcribes via the app proxy. Use when native SpeechRecognition has network issues. */
export async function startTranscriptionRecorder(
  onText: Listener,
  opts?: { onError?: ErrorListener; onStatus?: (status: 'recording' | 'transcribing' | 'idle') => void },
): Promise<VoiceController | null> {
  if (!isRecorderSupported()) {
    opts?.onError?.('Voice recording is not supported in this browser.');
    return null;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = bestRecordingMime();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunks.push(event.data);
    };
    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      opts?.onStatus?.('transcribing');
      try {
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
        if (blob.size < 200) throw new Error('No speech detected. Try again.');
        const res = await transcribeAudio(await blobToBase64(blob), blob.type || 'audio/webm');
        if (res.error || !res.data?.text) throw new Error(res.error || 'Could not transcribe speech.');
        onText(res.data.text.trim(), true);
      } catch (error) {
        opts?.onError?.(error instanceof Error ? error.message : 'Could not transcribe speech.');
      } finally {
        opts?.onStatus?.('idle');
      }
    };
    recorder.start();
    opts?.onStatus?.('recording');
    return { stop: () => recorder.state !== 'inactive' && recorder.stop() };
  } catch {
    opts?.onError?.('Microphone access denied');
    opts?.onStatus?.('idle');
    return null;
  }
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