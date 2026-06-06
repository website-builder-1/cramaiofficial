import { useStudyStore } from '@/lib/store';
export function WeeklyMomentum() {
  const days = useStudyStore((s) => s.recentStudyDays);
  const set = new Set(days);
  const today = new Date();
  const labels = ['M','T','W','T','F','S','S'];
  const cells: { d: string; active: boolean; isToday: boolean; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(today); dt.setDate(today.getDate() - i);
    const iso = dt.toISOString().slice(0, 10);
    cells.push({ d: iso, active: set.has(iso), isToday: i === 0, label: labels[(dt.getDay() + 6) % 7] });
  }
  return (
    <div className="inline-flex items-center gap-1" title="This week — every dot you fill is a win">
      {cells.map((c, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <div className={`w-2 h-2 rounded-full ${c.active ? 'bg-primary' : c.isToday ? 'bg-muted-foreground/40 ring-1 ring-primary/40' : 'bg-muted-foreground/20'}`} />
          <span className="text-[8px] text-muted-foreground">{c.label}</span>
        </div>
      ))}
    </div>
  );
}