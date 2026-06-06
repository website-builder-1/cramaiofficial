import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { hallucinationCheck, type HallucinationFlag } from '@/lib/api';
import { useStudyStore } from '@/lib/store';

export function HallucinationFlags({ source, draft, cacheKey }: { source: string; draft: string; cacheKey: string }) {
  const enabled = useStudyStore((s) => s.adhdProfile.hallucinationCheck);
  const [flags, setFlags] = useState<HallucinationFlag[] | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled || !source || !draft) { setFlags(null); return; }
    let cancelled = false; setLoading(true);
    hallucinationCheck({ source, draft }).then((res) => {
      if (cancelled) return; setLoading(false);
      if (res.data) setFlags(res.data.flaggedClaims || []);
    });
    return () => { cancelled = true; };
  }, [enabled, cacheKey]);
  if (!enabled) return null;
  if (loading) return (<div className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" />Running accuracy check…</div>);
  if (!flags || flags.length === 0) return null;
  return (
    <div className="mt-4 rounded-lg border border-warning/40 bg-warning/5 p-3">
      <p className="text-xs font-semibold text-warning flex items-center gap-1.5 mb-2"><AlertTriangle className="w-3.5 h-3.5" />{flags.length} claim{flags.length === 1 ? '' : 's'} to verify</p>
      <ul className="space-y-2 text-xs">
        {flags.map((f, i) => (<li key={i}><div className="font-medium text-foreground">"{f.text}"</div><div className="text-muted-foreground">{f.reason}</div>{f.suggestedFix && <div className="text-foreground italic">Fix: {f.suggestedFix}</div>}</li>))}
      </ul>
    </div>
  );
}