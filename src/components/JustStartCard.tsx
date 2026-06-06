import { JustStartButton } from '@/components/JustStartButton';
import { Zap } from 'lucide-react';
export function JustStartCard() {
  return (
    <div className="glass-card rounded-xl p-5 border border-primary/30">
      <div className="flex items-center gap-2 mb-2"><Zap className="w-5 h-5 text-primary" /><h3 className="font-semibold">Can't decide where to start?</h3></div>
      <p className="text-sm text-muted-foreground mb-3">Let the AI pick one tiny 2-minute starter task from this material — no choices, no menu.</p>
      <JustStartButton variant="hero" size="lg" />
    </div>
  );
}