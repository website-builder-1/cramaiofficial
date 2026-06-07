import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Timer, Play, Pause, X, Volume2, VolumeX, Focus, Settings2 } from 'lucide-react';
import { useStudyStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function fmt(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function FocusWidget() {
  const { focus, setFocus, awardXp } = useStudyStore();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [showSettings, setShowSettings] = useState(false);
  const audioRef = useRef<{ ctx: AudioContext; node: AudioBufferSourceNode } | null>(null);

  // Tick
  useEffect(() => {
    if (!focus.active) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [focus.active]);

  const elapsed = focus.active ? Math.floor((now - focus.startedAt) / 1000) : 0;
  const remaining = Math.max(0, focus.durationSec - elapsed);

  // Auto-transition / completion
  useEffect(() => {
    if (focus.active && remaining === 0) {
      if (focus.mode === 'work') {
        awardXp(30);
        toast.success('Focus session complete! +30 XP. Take a break 🌿');
        setFocus({ mode: 'break', startedAt: Date.now(), durationSec: focus.breakSec });
      } else {
        toast.success('Break over. Ready for another round?');
        setFocus({ active: false });
      }
    }
  }, [remaining, focus.active, focus.mode]);

  // Apply focusModeUI to body
  useEffect(() => {
    if (focus.focusModeUI) document.body.classList.add('focus-mode');
    else document.body.classList.remove('focus-mode');
  }, [focus.focusModeUI]);

  // Brown noise via WebAudio. Plays whenever the sound toggle is on
  // (independent of timer) so users can verify it works and use it ad-hoc.
  useEffect(() => {
    if (!focus.sound) return;
    let stopped = false;
    try {
      const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      const ctx = new AC();
      // Chrome/Safari start the context suspended until a user gesture.
      // The toggle click IS a user gesture, so resume() should succeed.
      ctx.resume().catch(() => { /* noop */ });
      const bufferSize = 2 * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Standard brown-noise IIR + post-gain compensation.
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }
      const node = ctx.createBufferSource();
      node.buffer = buffer;
      node.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0.35; // audible default
      node.connect(gain).connect(ctx.destination);
      node.start();
      audioRef.current = { ctx, node };
      if (!focus.active) {
        toast('Brown noise on 🎧', { duration: 1500 });
      }
      return () => {
        stopped = true;
        try { node.stop(); } catch { /* noop */ }
        try { ctx.close(); } catch { /* noop */ }
        audioRef.current = null;
      };
    } catch (e) {
      console.error('Audio init failed', e);
      toast.error('Could not start brown noise on this browser.');
    }
  }, [focus.sound]);

  // Hyperfocus nudge
  const [sessionStart] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => {
      const mins = (Date.now() - sessionStart) / 60000;
      if (mins > 0 && Math.floor(mins) % 90 === 0 && Math.floor(mins) > 0) {
        toast('You\'ve been at it 90+ min — stand up, water, stretch 💧', { duration: 8000 });
      }
    }, 60000);
    return () => clearInterval(id);
  }, [sessionStart]);

  const start = () => {
    setFocus({ active: true, mode: 'work', startedAt: Date.now(), durationSec: focus.workSec });
    setOpen(true);
  };
  const stop = () => setFocus({ active: false });

  return (
    <>
      {/* Floating toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={cn(
            'fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full gradient-bg shadow-glow flex items-center justify-center text-primary-foreground hover:scale-105 transition-transform',
            focus.active && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
          )}
          aria-label="Open focus timer"
          title="Focus timer"
        >
          <Timer className="w-5 h-5" />
          {focus.active && (
            <span className="absolute -top-1 -right-1 text-[10px] bg-background text-foreground px-1.5 py-0.5 rounded-full border border-border font-mono">
              {fmt(remaining)}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-72 glass-card rounded-2xl border border-border shadow-glow p-4 space-y-3 animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">
                Focus · {focus.mode === 'work' ? 'Work' : 'Break'}
              </span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setShowSettings((v) => !v)} className="p-1 rounded hover:bg-accent" aria-label="Settings">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-accent" aria-label="Close">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="text-center py-2">
            <div className="text-4xl font-mono font-bold gradient-text">
              {fmt(focus.active ? remaining : focus.workSec)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {focus.active ? (focus.mode === 'work' ? 'Stay with one thing.' : 'Rest your eyes.') : 'Ready when you are.'}
            </p>
          </div>

          <div className="flex gap-2">
            {!focus.active ? (
              <Button onClick={start} variant="hero" size="sm" className="flex-1 gap-1.5">
                <Play className="w-4 h-4" /> Start
              </Button>
            ) : (
              <Button onClick={stop} variant="outline" size="sm" className="flex-1 gap-1.5">
                <Pause className="w-4 h-4" /> Stop
              </Button>
            )}
            <Button
              onClick={() => setFocus({ focusModeUI: !focus.focusModeUI })}
              variant={focus.focusModeUI ? 'default' : 'outline'}
              size="sm"
              className="gap-1.5"
              title="Dim distractions"
            >
              <Focus className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setFocus({ sound: !focus.sound })}
              variant={focus.sound ? 'default' : 'outline'}
              size="sm"
              title="Brown noise"
            >
              {focus.sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
          </div>

          {showSettings && (
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground">Preset</p>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { w: 15, b: 3, label: '15/3' },
                  { w: 25, b: 5, label: '25/5' },
                  { w: 50, b: 10, label: '50/10' },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setFocus({ workSec: p.w * 60, breakSec: p.b * 60, durationSec: p.w * 60 })}
                    className={cn(
                      'text-xs py-1.5 rounded border',
                      focus.workSec === p.w * 60 ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}