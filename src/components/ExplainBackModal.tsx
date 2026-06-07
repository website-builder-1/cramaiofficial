import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { explainBack } from '@/lib/api';
import { useStudyStore } from '@/lib/store';
import { createRecognizer, isRecorderSupported, isSRSupported, isVoiceSupported, startTranscriptionRecorder, type VoiceController } from '@/lib/voice';
import { toast } from 'sonner';

export function ExplainBackModal({ open, onClose, concept, context }: { open: boolean; onClose: () => void; concept: string; context: string; }) {
  const [text, setText] = useState('');
  const [rec, setRec] = useState<VoiceController | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ score: number; missing: string[]; goodPoints: string[]; oneLineFix: string } | null>(null);
  const awardXp = useStudyStore((s) => s.awardXp);
  const toggleMic = async () => {
    if (rec) { rec.stop(); setRec(null); return; }
    if (!isVoiceSupported()) { toast.error('Voice not supported'); return; }
    if (isRecorderSupported()) {
      const recorder = await startTranscriptionRecorder(
        (t) => setText((p) => (p ? p + ' ' : '') + t),
        {
          onError: toast.error,
          onStatus: (status) => { setVoiceBusy(status === 'transcribing'); if (status === 'idle') setRec(null); },
        },
      );
      setRec(recorder);
      return;
    }
    const r = createRecognizer(
      (t, isFinal) => { if (isFinal) setText((p) => (p ? p + ' ' : '') + t); },
      { onError: (m) => { toast.error(m); setRec(null); } },
    );
    if (!r) return;
    r.onend = () => setRec(null);
    try { r.start(); setRec(r); } catch (e: any) { toast.error(e?.message || 'Could not start mic'); }
  };
  const submit = async () => {
    if (text.trim().length < 10) { toast.error('Give a bit more explanation (10+ chars)'); return; }
    setLoading(true);
    const res = await explainBack({ concept, userExplanation: text, context });
    setLoading(false);
    if (res.error || !res.data) { toast.error(res.error || 'Could not score'); return; }
    setResult(res.data); awardXp(15);
  };
  const close = () => { rec?.stop?.(); setRec(null); setText(''); setResult(null); onClose(); };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Explain it back</DialogTitle>
          <DialogDescription>Teach it to me in your own words. Active recall = top study move.</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground italic line-clamp-2">{concept}</p>
        {!result ? (
          <>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type or speak your explanation…" className="min-h-[160px]" />
            <div className="flex justify-between items-center gap-2">
              {isVoiceSupported() && (
                <Button onClick={toggleMic} variant={rec ? 'default' : 'outline'} size="sm" className="gap-1.5" disabled={voiceBusy}>
                  {rec ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}{voiceBusy ? 'Transcribing…' : rec ? 'Stop' : 'Speak'}
                </Button>
              )}
              <Button onClick={submit} variant="hero" disabled={loading} className="gap-1.5">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}Check
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="text-center"><div className="text-5xl font-bold gradient-text">{result.score}</div><div className="text-xs text-muted-foreground">out of 100</div></div>
            {result.goodPoints?.length > 0 && (<div><p className="text-sm font-semibold mb-1">What you got right</p><ul className="text-sm space-y-1">{result.goodPoints.map((p, i) => (<li key={i} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" /><span>{p}</span></li>))}</ul></div>)}
            {result.missing?.length > 0 && (<div><p className="text-sm font-semibold mb-1">What's missing</p><ul className="text-sm space-y-1 list-disc pl-5 text-muted-foreground">{result.missing.map((p, i) => <li key={i}>{p}</li>)}</ul></div>)}
            {result.oneLineFix && (<div className="p-3 rounded-lg bg-primary/5 border border-primary/30 text-sm"><strong>Quick fix:</strong> {result.oneLineFix}</div>)}
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => { setResult(null); setText(''); }}>Try again</Button><Button variant="hero" onClick={close}>Done</Button></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}