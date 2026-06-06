import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Scissors, Loader2, Check } from 'lucide-react';
import { chunkContent, type ChunkStep } from '@/lib/api';
import { useStudyStore } from '@/lib/store';
import { toast } from 'sonner';
import { RichText } from '@/components/RichText';
import { cn } from '@/lib/utils';

interface Props {
  content: string;
  topic?: string;
}

export function ChunkList({ content, topic }: Props) {
  const { awardXp } = useStudyStore();
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<ChunkStep[] | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());

  const run = async () => {
    if (!content || content.length < 10) {
      toast.error('Not enough content to chunk.');
      return;
    }
    setLoading(true);
    const res = await chunkContent(content, topic);
    setLoading(false);
    if (res.error || !res.data?.steps?.length) {
      toast.error(res.error || 'Could not chunk this');
      return;
    }
    setSteps(res.data.steps);
    setDone(new Set());
  };

  const toggle = (id: string) => {
    setDone((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else { n.add(id); awardXp(5); }
      return n;
    });
  };

  if (!steps) {
    return (
      <Button variant="outline" size="sm" onClick={run} disabled={loading} className="gap-1.5">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scissors className="w-3.5 h-3.5" />}
        Break it down
      </Button>
    );
  }

  return (
    <div className="mt-3 p-3 rounded-lg bg-accent/30 border border-border space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Micro-steps</p>
        <button onClick={run} className="text-xs text-muted-foreground hover:text-foreground">Re-chunk</button>
      </div>
      <ul className="space-y-1.5">
        {steps.map((s) => {
          const isDone = done.has(s.id);
          return (
            <li key={s.id} className="flex items-start gap-2">
              <button
                onClick={() => toggle(s.id)}
                className={cn(
                  'mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0',
                  isDone ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'
                )}
                aria-label="toggle done"
              >
                {isDone && <Check className="w-3 h-3" />}
              </button>
              <div className={cn('flex-1 text-sm', isDone && 'opacity-60 line-through')}>
                <div className="flex items-baseline gap-2">
                  <RichText html={s.title} as="span" className="font-medium" />
                  <span className="text-[10px] text-muted-foreground">{s.minutes}m</span>
                </div>
                {s.detail && <RichText html={s.detail} className="text-xs text-muted-foreground" />}
                {s.reward && <RichText html={`✓ ${s.reward}`} className="text-[11px] text-primary mt-0.5" />}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}