import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createRecognizer, isRecorderSupported, isSRSupported, isVoiceSupported, startTranscriptionRecorder, type VoiceController } from '@/lib/voice';
import { toast } from 'sonner';

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onTranscript, disabled }: Props) {
  const [status, setStatus] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [supported, setSupported] = useState(false);
  const recRef = useRef<VoiceController | null>(null);

  useEffect(() => {
    setSupported(isVoiceSupported());
  }, []);

  const toggle = async () => {
    if (!supported) return;
    if (status === 'recording') {
      recRef.current?.stop();
      return;
    }
    if (status === 'transcribing') return;
    if (isRecorderSupported()) {
      const recorder = await startTranscriptionRecorder(
        (text) => onTranscript(text),
        { onError: toast.error, onStatus: setStatus },
      );
      recRef.current = recorder;
      return;
    }
    if (!isSRSupported()) { toast.error('Voice not supported in this browser'); return; }
    const recognizer = createRecognizer(
      (text, isFinal) => { if (isFinal) onTranscript(text); },
      { continuous: false, onError: (msg) => { toast.error(msg); setStatus('idle'); } },
    );
    if (!recognizer) return;
    recognizer.onend = () => setStatus('idle');
    recRef.current = recognizer;
    try { recognizer.start(); setStatus('recording'); } catch (e: any) { toast.error(e?.message || 'Could not start mic'); setStatus('idle'); }
  };

  if (!supported) return null;

  const listening = status === 'recording';

  return (
    <Button
      type="button"
      variant={listening ? 'default' : 'outline'}
      size="icon"
      onClick={toggle}
      disabled={disabled || status === 'transcribing'}
      title={status === 'transcribing' ? 'Transcribing…' : listening ? 'Stop and transcribe' : 'Dictate your question'}
      className={cn(listening && 'animate-pulse')}
    >
      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </Button>
  );
}