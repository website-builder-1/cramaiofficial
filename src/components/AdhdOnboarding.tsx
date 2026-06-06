import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Brain,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
} from 'lucide-react';
import { useStudyStore, type AdhdProfile, type AttentionSpan, type ChunkStyle, type CoachTone } from '@/lib/store';
import { setAdhdHint } from '@/lib/api';
import { toast } from 'sonner';

const STRUGGLES = [
  { id: 'task_initiation', label: 'Getting started (task paralysis)' },
  { id: 'distraction', label: 'Easily distracted mid-task' },
  { id: 'working_memory', label: 'Losing my train of thought' },
  { id: 'overwhelm', label: 'Feeling overwhelmed by big topics' },
  { id: 'hyperfocus', label: 'Hyperfocusing and forgetting breaks' },
  { id: 'time_blindness', label: 'Time blindness (under/over-estimating)' },
  { id: 'boredom', label: 'Getting bored with dry material' },
  { id: 'perfectionism', label: 'Perfectionism / fear of starting wrong' },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AdhdOnboarding({ open, onClose }: Props) {
  const { adhdProfile, completeOnboarding } = useStudyStore();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<AdhdProfile>(adhdProfile);

  useEffect(() => {
    if (open) {
      setDraft(adhdProfile);
      setStep(0);
    }
  }, [open, adhdProfile]);

  const toggleStruggle = (id: string) =>
    setDraft((d) => ({
      ...d,
      struggles: d.struggles.includes(id) ? d.struggles.filter((x) => x !== id) : [...d.struggles, id],
    }));

  const totalSteps = 5;
  const next = () => setStep((s) => Math.min(s + 1, totalSteps - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));
  const finish = () => {
    completeOnboarding(draft);
    setAdhdHint({
      hasAdhd: draft.hasAdhd,
      attentionSpan: draft.attentionSpan,
      chunkStyle: draft.chunkStyle,
      coachTone: draft.coachTone,
      struggles: draft.struggles,
      rewardsOn: draft.rewardsOn,
    });
    toast.success('CramAI is now tuned to how you focus 🧠');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-2 shadow-glow">
            <Brain className="w-6 h-6 text-primary-foreground" />
          </div>
          <DialogTitle className="text-center text-2xl">
            Tune CramAI to your <span className="gradient-text">brain</span>
          </DialogTitle>
          <DialogDescription className="text-center">
            A 60-second setup so focus sessions, micro-steps, and tutor coaching fit how you actually study.
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex gap-1.5 justify-center mb-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-8 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
        </div>

        <div className="min-h-[260px] py-2">
          {step === 0 && (
            <div className="space-y-3">
              <p className="font-medium">Do you have (or suspect) ADHD?</p>
              <RadioGroup
                value={draft.hasAdhd === null ? 'unsure' : draft.hasAdhd ? 'yes' : 'no'}
                onValueChange={(v) =>
                  setDraft((d) => ({ ...d, hasAdhd: v === 'yes' ? true : v === 'no' ? false : null }))
                }
              >
                {[
                  { v: 'yes', l: 'Yes — diagnosed or strongly suspect' },
                  { v: 'unsure', l: 'Not sure, but I struggle to focus' },
                  { v: 'no', l: "No, but I'd still like ADHD-friendly tools" },
                ].map((o) => (
                  <Label
                    key={o.v}
                    htmlFor={`adhd-${o.v}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent cursor-pointer"
                  >
                    <RadioGroupItem value={o.v} id={`adhd-${o.v}`} />
                    <span className="text-sm">{o.l}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="font-medium">What's your realistic attention span in one sitting?</p>
              <RadioGroup
                value={draft.attentionSpan}
                onValueChange={(v) => setDraft((d) => ({ ...d, attentionSpan: v as AttentionSpan }))}
              >
                {[
                  { v: 'short', l: 'Short — 10-15 min', d: 'Sets 15/3 Pomodoro' },
                  { v: 'medium', l: 'Medium — 25-30 min', d: 'Classic 25/5 Pomodoro' },
                  { v: 'long', l: 'Long — 45-60 min', d: 'Deep 50/10 sessions' },
                ].map((o) => (
                  <Label
                    key={o.v}
                    htmlFor={`span-${o.v}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent cursor-pointer"
                  >
                    <RadioGroupItem value={o.v} id={`span-${o.v}`} />
                    <div className="text-sm">
                      <div className="font-medium">{o.l}</div>
                      <div className="text-xs text-muted-foreground">{o.d}</div>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="font-medium">How do you want material broken down?</p>
              <RadioGroup
                value={draft.chunkStyle}
                onValueChange={(v) => setDraft((d) => ({ ...d, chunkStyle: v as ChunkStyle }))}
              >
                {[
                  { v: 'tiny', l: 'Tiny bites', d: '1-2 min steps. Maximum momentum.' },
                  { v: 'standard', l: 'Standard', d: '2-5 min steps. Recommended.' },
                  { v: 'deep', l: 'Deeper chunks', d: '5-10 min when concepts need it.' },
                ].map((o) => (
                  <Label
                    key={o.v}
                    htmlFor={`chunk-${o.v}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent cursor-pointer"
                  >
                    <RadioGroupItem value={o.v} id={`chunk-${o.v}`} />
                    <div className="text-sm">
                      <div className="font-medium">{o.l}</div>
                      <div className="text-xs text-muted-foreground">{o.d}</div>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="font-medium">How should your AI tutor talk to you?</p>
              <RadioGroup
                value={draft.coachTone}
                onValueChange={(v) => setDraft((d) => ({ ...d, coachTone: v as CoachTone }))}
              >
                {[
                  { v: 'gentle', l: 'Gentle', d: 'Warm, low-pressure, validating.' },
                  { v: 'direct', l: 'Direct', d: 'Crisp, action-first, body-double style.' },
                  { v: 'playful', l: 'Playful', d: 'Fun, dopamine-hitting, light emoji.' },
                ].map((o) => (
                  <Label
                    key={o.v}
                    htmlFor={`tone-${o.v}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent cursor-pointer"
                  >
                    <RadioGroupItem value={o.v} id={`tone-${o.v}`} />
                    <div className="text-sm">
                      <div className="font-medium">{o.l}</div>
                      <div className="text-xs text-muted-foreground">{o.d}</div>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <p className="font-medium">Where do you struggle most? (pick any)</p>
              <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1">
                {STRUGGLES.map((s) => {
                  const on = draft.struggles.includes(s.id);
                  return (
                    <Label
                      key={s.id}
                      htmlFor={`str-${s.id}`}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer ${
                        on ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                      }`}
                    >
                      <Checkbox id={`str-${s.id}`} checked={on} onCheckedChange={() => toggleStruggle(s.id)} />
                      <span className="text-sm">{s.label}</span>
                    </Label>
                  );
                })}
              </div>
              <div className="pt-2 space-y-2">
                <Label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer">
                  <Checkbox
                    checked={draft.rewardsOn}
                    onCheckedChange={(v) => setDraft((d) => ({ ...d, rewardsOn: !!v }))}
                  />
                  <span className="text-sm">Add dopamine rewards at the end of AI responses</span>
                </Label>
                <Label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer">
                  <Checkbox
                    checked={draft.brownNoise}
                    onCheckedChange={(v) => setDraft((d) => ({ ...d, brownNoise: !!v }))}
                  />
                  <span className="text-sm">Turn on brown-noise by default in focus sessions</span>
                </Label>
                <div className="pt-2 border-t border-border space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Focus tools</p>
                  <Label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer">
                    <Checkbox checked={draft.driftOn} onCheckedChange={(v) => setDraft((d) => ({ ...d, driftOn: !!v }))} />
                    <span className="text-sm">Drift detection — tiny refocus quiz when I zone out</span>
                  </Label>
                  <Label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer">
                    <Checkbox checked={draft.scratchpadOn} onCheckedChange={(v) => setDraft((d) => ({ ...d, scratchpadOn: !!v }))} />
                    <span className="text-sm">Scratchpad — park stray thoughts without losing focus</span>
                  </Label>
                  <Label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer">
                    <Checkbox checked={draft.voiceFirst} onCheckedChange={(v) => setDraft((d) => ({ ...d, voiceFirst: !!v }))} />
                    <span className="text-sm">Voice-first — read answers aloud, speak instead of type</span>
                  </Label>
                  <Label className="flex items-center gap-3 p-2 rounded-lg cursor-pointer">
                    <Checkbox checked={draft.hallucinationCheck} onCheckedChange={(v) => setDraft((d) => ({ ...d, hallucinationCheck: !!v }))} />
                    <span className="text-sm">Accuracy check — flag claims that may be wrong</span>
                  </Label>
                  <div className="p-2">
                    <p className="text-sm mb-2">Hyperfocus brake</p>
                    <RadioGroup
                      value={String(draft.hyperfocusMinutes)}
                      onValueChange={(v) => setDraft((d) => ({ ...d, hyperfocusMinutes: Number(v) as 0 | 30 | 45 | 60 }))}
                      className="flex flex-wrap gap-2"
                    >
                      {[
                        { v: '0', l: 'Off' },
                        { v: '30', l: '30 min' },
                        { v: '45', l: '45 min' },
                        { v: '60', l: '60 min' },
                      ].map((o) => (
                        <Label key={o.v} htmlFor={`hf-${o.v}`} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border cursor-pointer text-xs">
                          <RadioGroupItem value={o.v} id={`hf-${o.v}`} />
                          {o.l}
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          {step > 0 ? (
            <Button variant="ghost" onClick={back} className="gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          ) : (
            <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
              Skip for now
            </Button>
          )}
          {step < totalSteps - 1 ? (
            <Button variant="hero" onClick={next} className="gap-1.5">
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button variant="hero" onClick={finish} className="gap-1.5">
              <Check className="w-4 h-4" /> Personalize
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function OnboardingTrigger() {
  const { adhdProfile } = useStudyStore();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        title="Personalize for ADHD / focus"
      >
        <Sparkles className="w-3.5 h-3.5" />
        {adhdProfile.onboarded ? 'Personalize' : 'Setup'}
      </button>
      <AdhdOnboarding open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Auto-shows onboarding the first time. */
export function OnboardingGate() {
  const { adhdProfile } = useStudyStore();
  const [open, setOpen] = useState(false);

  // Push profile into API hint on every mount + when profile changes
  useEffect(() => {
    if (adhdProfile.onboarded) {
      setAdhdHint({
        hasAdhd: adhdProfile.hasAdhd,
        attentionSpan: adhdProfile.attentionSpan,
        chunkStyle: adhdProfile.chunkStyle,
        coachTone: adhdProfile.coachTone,
        struggles: adhdProfile.struggles,
        rewardsOn: adhdProfile.rewardsOn,
      });
    } else {
      setAdhdHint(null);
    }
  }, [adhdProfile]);

  useEffect(() => {
    if (!adhdProfile.onboarded) {
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [adhdProfile.onboarded]);

  return <AdhdOnboarding open={open} onClose={() => setOpen(false)} />;
}