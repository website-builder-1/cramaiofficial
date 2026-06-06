import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useStudyStore } from '@/lib/store';
import { cn } from '@/lib/utils';
function fmt(sec: number) {
  const m = Math.floor(sec / 60); const s = sec % 60;
  if (m < 60) return `${m}:${s.toString().padStart(2, '0')}`;
  const h = Math.floor(m / 60); return `${h}h ${m % 60}m`;
}
export function TimePill({ className }: { className?: string }) {
  const active = useStudyStore((s) => s.activeStudySeconds);
  const [, force] = useState(0);
  useEffect(() => { const id = setInterval(() => force((n) => n + 1), 5000); return () => clearInterval(id); }, []);
  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent border border-border text-xs font-medium text-muted-foreground', className)} title="Active study time">
      <Clock className="w-3.5 h-3.5 text-primary" /><span>{fmt(active)}</span>
    </div>
  );
}