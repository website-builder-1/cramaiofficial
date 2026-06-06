import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Square, Volume2 } from 'lucide-react';
import { useStudyStore } from '@/lib/store';
import { isTTSSupported, speak, stopSpeaking, isSpeaking } from '@/lib/tts';
export function TtsPlayButton({ text, className }: { text: string; className?: string }) {
  const on = useStudyStore((s) => s.adhdProfile.voiceFirst);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { const id = setInterval(() => setPlaying(isSpeaking()), 500); return () => clearInterval(id); }, []);
  if (!on || !isTTSSupported()) return null;
  const toggle = () => {
    if (playing) { stopSpeaking(); setPlaying(false); return; }
    speak(text, { onEnd: () => setPlaying(false) }); setPlaying(true);
  };
  return (
    <Button type="button" variant="ghost" size="sm" onClick={toggle} className={className} title={playing ? 'Stop' : 'Read aloud'}>
      {playing ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
    </Button>
  );
}