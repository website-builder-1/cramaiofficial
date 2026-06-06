import { useEffect, useState } from 'react';
import { useDriftDetection } from '@/hooks/useDriftDetection';
import { generateQuestions, type Question } from '@/lib/api';
import { useStudyStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Sparkles, X, Loader2 } from 'lucide-react';
import { RichText } from '@/components/RichText';

export function DriftToast({ disabled }: { disabled?: boolean }) {
  const getMaterial = useStudyStore((s) => s.getStudyMaterial);
  const subject = useStudyStore((s) => s.subject);
  const examLevel = useStudyStore((s) => s.examLevel);
  const examBoard = useStudyStore((s) => s.examBoard);
  const { drifted, reset } = useDriftDetection({ enabled: !disabled });
  const [q, setQ] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => {
    if (!drifted || q || loading) return;
    const mat = getMaterial();
    if (!mat || mat.length < 30) { reset(); return; }
    setLoading(true);
    generateQuestions({ content: mat, count: 1, difficulty: 'easy', types: ['multiple-choice'], subject, examLevel, examBoard }).then((res) => {
      setLoading(false);
      if (res.data && res.data[0]) setQ(res.data[0]); else reset();
    });
  }, [drifted]);
  const close = () => { setQ(null); setPicked(null); reset(); };
  if (!drifted && !q) return null;
  return (
    <div className="fixed bottom-5 left-5 z-40 w-80 glass-card rounded-2xl border border-primary/40 shadow-glow p-4 animate-slide-up">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="w-4 h-4 text-primary" /> Quick refocus</div>
        <button onClick={close} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
      </div>
      {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground py-3"><Loader2 className="w-4 h-4 animate-spin" />Pulling a tiny question…</div>}
      {q && (<>
        <RichText html={q.question} className="text-sm font-medium mb-2" />
        <div className="space-y-1.5">{q.options?.map((o, i) => {
          const correct = picked && o === q.correctAnswer;
          const wrong = picked === o && o !== q.correctAnswer;
          return (<button key={i} disabled={!!picked} onClick={() => setPicked(o)} className={`w-full text-left text-xs px-2.5 py-1.5 rounded border transition-colors ${correct ? 'border-success bg-success/10' : wrong ? 'border-destructive bg-destructive/10' : 'border-border hover:bg-accent'}`}><RichText html={o} as="span" /></button>);
        })}</div>
        {picked && <Button size="sm" variant="hero" className="w-full mt-3" onClick={close}>Back to studying</Button>}
      </>)}
    </div>
  );
}