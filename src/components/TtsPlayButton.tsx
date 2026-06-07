import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Square, Volume2 } from 'lucide-react';
import { useStudyStore } from '@/lib/store';
import { speak, stopSpeaking, isSpeaking } from '@/lib/tts';
import { notesSpokenScript } from '@/lib/api';
import { toast } from 'sonner';

interface Props {
  text?: string;
  /** When provided, a tutor-style explanation script will be generated and read aloud. */
  notes?: unknown;
  subject?: string;
  className?: string;
  label?: string;
}

export function TtsPlayButton({ text, notes, subject, className, label }: Props) {
  const on = useStudyStore((s) => s.adhdProfile.voiceFirst);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cachedScript, setCachedScript] = useState<string | null>(null);
  useEffect(() => { const id = setInterval(() => setPlaying(isSpeaking()), 400); return () => clearInterval(id); }, []);
  useEffect(() => { setCachedScript(null); }, [notes]);

  // Always show if voiceFirst is enabled — AI TTS works even without browser SpeechSynthesis
  if (!on) return null;

  const toggle = async () => {
    if (playing) { stopSpeaking(); setPlaying(false); return; }
    let toSpeak = text || '';
    if (notes && !text) {
      if (cachedScript) toSpeak = cachedScript;
      else {
        setLoading(true);
        const res = await notesSpokenScript(notes, subject);
        setLoading(false);
        if (res.error || !res.data?.script) { toast.error(res.error || 'Could not build audio script'); return; }
        toSpeak = res.data.script;
        setCachedScript(toSpeak);
      }
    }
    if (!toSpeak) return;
    speak(toSpeak, { onEnd: () => setPlaying(false) });
    setPlaying(true);
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={toggle} className={className} title={playing ? 'Stop' : 'Read aloud (AI voice)'} disabled={loading}>
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : playing ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      {label && <span className="ml-1.5 text-xs">{label}</span>}
    </Button>
  );
}