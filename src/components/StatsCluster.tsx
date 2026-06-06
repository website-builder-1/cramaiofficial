import { Flame, Zap, Trophy } from 'lucide-react';
import { useStudyStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const DAILY_GOAL = 100;

export function StatsCluster({ compact = false }: { compact?: boolean }) {
  const g = useStudyStore((s) => s.gamification);
  const today = new Date().toISOString().slice(0, 10);
  const todayXp = g.todayDate === today ? g.todayXp : 0;
  const pct = Math.min(100, Math.round((todayXp / DAILY_GOAL) * 100));
  const r = 16;
  const c = 2 * Math.PI * r;

  return (
    <div className={cn('flex items-center gap-3', compact && 'gap-2')}>
      {/* XP ring */}
      <div className="relative w-9 h-9" title={`${todayXp} / ${DAILY_GOAL} XP today`}>
        <svg className="w-9 h-9 -rotate-90" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r={r} className="stroke-muted" strokeWidth="3" fill="none" />
          <circle
            cx="20"
            cy="20"
            r={r}
            className="stroke-primary transition-all"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c - (c * pct) / 100}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-primary" />
        </div>
      </div>

      {/* Streak */}
      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent" title={`${g.streak}-day streak`}>
        <Flame className={cn('w-3.5 h-3.5', g.streak > 0 ? 'text-orange-500' : 'text-muted-foreground')} />
        <span className="text-xs font-semibold">{g.streak}</span>
      </div>

      {/* Level */}
      <div className="flex items-center gap-1 px-2 py-1 rounded-full gradient-bg text-primary-foreground" title={`Level ${g.level} · ${g.xp} XP`}>
        <Trophy className="w-3.5 h-3.5" />
        <span className="text-xs font-bold">L{g.level}</span>
      </div>
    </div>
  );
}