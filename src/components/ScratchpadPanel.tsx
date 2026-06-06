import { useState } from 'react';
import { useStudyStore } from '@/lib/store';
import { useLocation } from 'react-router-dom';
import { Brain, Mic, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { createRecognizer, isSRSupported } from '@/lib/voice';

export function ScratchpadPanel() {
  const on = useStudyStore((s) => s.adhdProfile.scratchpadOn);
  const loc = useLocation();
  const scratchpads = useStudyStore((s) => s.scratchpads);
  const setScratchpad = useStudyStore((s) => s.setScratchpad);
  const [open, setOpen] = useState(false);
  const [recRef, setRecRef] = useState<any>(null);
  const text = scratchpads[loc.pathname] || '';
  if (!on) return null;
  const toggleMic = () => {
    if (recRef) { recRef.stop(); setRecRef(null); return; }
    if (!isSRSupported()) return;
    const r = createRecognizer((t, isFinal) => { if (isFinal) setScratchpad(loc.pathname, (text ? text + ' ' : '') + t); });
    r?.start(); if (r) r.onend = () => setRecRef(null);
    setRecRef(r);
  };
  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} className="fixed bottom-20 right-5 z-40 w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-glow flex items-center justify-center hover:scale-105 transition-transform" aria-label="Open scratchpad" title="Park-it scratchpad">
          <Brain className="w-5 h-5" />
        </button>
      )}
      {open && (
        <div className="fixed bottom-20 right-5 z-40 w-80 glass-card rounded-2xl border border-border shadow-glow p-3 space-y-2 animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold"><Brain className="w-4 h-4 text-primary" /> Scratchpad</div>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-accent" aria-label="Close"><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <Textarea value={text} onChange={(e) => setScratchpad(loc.pathname, e.target.value)} placeholder="Park stray thoughts here so they don't steal focus…" className="min-h-[160px] resize-none text-sm" />
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-muted-foreground">Saved per page</span>
            {isSRSupported() && (
              <Button size="sm" variant={recRef ? 'default' : 'outline'} onClick={toggleMic} className="gap-1.5 h-7">
                <Mic className="w-3.5 h-3.5" /> {recRef ? 'Listening…' : 'Voice'}
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}