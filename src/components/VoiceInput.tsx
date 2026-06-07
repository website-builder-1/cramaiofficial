import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ensureMicPermission } from '@/lib/voice';
import { toast } from 'sonner';

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onTranscript, disabled }: Props) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) setSupported(true);
  }, []);

  const toggle = async () => {
    if (!supported) return;
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const ok = await ensureMicPermission();
    if (!ok) { toast.error('Microphone access denied'); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const r = new SR();
    r.lang = 'en-US';
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e: any) => {
      const text = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
      onTranscript(text);
    };
    r.onend = () => setListening(false);
    r.onerror = (e: any) => {
      setListening(false);
      const code = e?.error || 'unknown';
      if (code === 'not-allowed') toast.error('Microphone blocked. Allow mic access in browser settings.');
      else if (code === 'no-speech') toast.error('No speech detected. Try again.');
      else if (code !== 'aborted') toast.error(`Voice error: ${code}`);
    };
    recRef.current = r;
    try { r.start(); setListening(true); } catch (e: any) { toast.error(e?.message || 'Could not start mic'); }
  };

  if (!supported) return null;

  return (
    <Button
      type="button"
      variant={listening ? 'default' : 'outline'}
      size="icon"
      onClick={toggle}
      disabled={disabled}
      title={listening ? 'Stop listening' : 'Dictate your question'}
      className={cn(listening && 'animate-pulse')}
    >
      {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </Button>
  );
}