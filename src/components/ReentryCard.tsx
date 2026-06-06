import { Button } from '@/components/ui/button';
import { ArrowDown, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStudyStore } from '@/lib/store';
import { quickRecap } from '@/lib/api';
import { useLocation } from 'react-router-dom';

export function ReentryCard({ onResume }: { onResume?: () => void }) {
  const loc = useLocation();
  const lastContexts = useStudyStore((s) => s.lastContexts);
  const getMaterial = useStudyStore((s) => s.getStudyMaterial);
  const ctx = lastContexts[loc.pathname];
  const [dismissed, setDismissed] = useState(false);
  const [bullets, setBullets] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const stale = !!ctx && Date.now() - ctx.ts > 2 * 60 * 1000;
  useEffect(() => {
    if (!stale || dismissed || bullets) return;
    const mat = getMaterial(); if (!mat) return;
    setLoading(true);
    quickRecap(mat, ctx?.label).then((res) => { setLoading(false); if (res.data?.bullets) setBullets(res.data.bullets); });
  }, [stale, dismissed]);
  if (!stale || dismissed) return null;
  return (
    <div className="glass-card rounded-xl p-4 mb-6 border border-primary/30 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-1">Welcome back</p>
          {ctx?.label && <p className="text-xs text-muted-foreground mb-2 truncate">You were on: <span className="text-foreground">{ctx.label}</span></p>}
          {loading && <p className="text-xs text-muted-foreground">Pulling a quick recap…</p>}
          {bullets && bullets.length > 0 && (
            <ul className="text-xs text-foreground space-y-1 list-disc pl-4">
              {bullets.slice(0, 3).map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="hero" onClick={onResume} className="gap-1.5"><ArrowDown className="w-4 h-4" /> Resume</Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>Dismiss</Button>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground" aria-label="Close"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
}