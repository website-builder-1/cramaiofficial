import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Zap, Loader2, Check, Play, X } from 'lucide-react';
import { useStudyStore } from '@/lib/store';
import { justStartTask } from '@/lib/api';
import { toast } from 'sonner';
import { RichText } from '@/components/RichText';

export function JustStartButton({ variant = 'hero', size = 'lg', label = 'Just Start (2 min)' }: {
  variant?: 'hero' | 'outline' | 'default';
  size?: 'sm' | 'lg' | 'xl';
  label?: string;
}) {
  const { getStudyMaterial, awardXp } = useStudyStore();
  const [loading, setLoading] = useState(false);
  const [task, setTask] = useState<{ task: string; why: string } | null>(null);
  const [seconds, setSeconds] = useState(120);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    if (seconds <= 0) {
      setRunning(false);
      awardXp(10);
      toast.success('You did it! +10 XP. Keep the momentum?');
      return;
    }
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [running, seconds]);

  const pick = async () => {
    const material = getStudyMaterial();
    if (!material || material.length < 10) {
      toast.error('Add study material in the Analyzer first.');
      return;
    }
    setLoading(true);
    const res = await justStartTask(material);
    setLoading(false);
    if (res.error || !res.data) {
      toast.error(res.error || 'Could not pick a task');
      return;
    }
    setTask({ task: res.data.task, why: res.data.why });
    setSeconds(120);
    setRunning(false);
  };

  if (task) {
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toString().padStart(2, '0');
    return (
      <div className="glass-card rounded-xl p-5 max-w-md mx-auto space-y-3 animate-slide-up">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold">Your 2-minute task</span>
          </div>
          <button onClick={() => { setTask(null); setRunning(false); }} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
        <RichText html={task.task} className="text-base font-medium" />
        <RichText html={task.why} className="text-xs text-muted-foreground" />
        <div className="flex items-center gap-3">
          <div className="text-2xl font-mono font-bold gradient-text">{m}:{s}</div>
          {!running ? (
            <Button onClick={() => setRunning(true)} variant="hero" size="sm" className="gap-1.5">
              <Play className="w-4 h-4" /> Start 2 min
            </Button>
          ) : (
            <Button onClick={() => { setRunning(false); setSeconds(0); }} variant="outline" size="sm" className="gap-1.5">
              <Check className="w-4 h-4" /> Done
            </Button>
          )}
          <Button onClick={pick} variant="ghost" size="sm">Different task</Button>
        </div>
      </div>
    );
  }

  return (
    <Button onClick={pick} variant={variant as 'hero'} size={size as 'lg'} className="gap-2" disabled={loading}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
      {label}
    </Button>
  );
}