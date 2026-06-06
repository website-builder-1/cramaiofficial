import type { MarkScheme as MS } from '@/lib/api';
import { ChevronDown, ChevronUp, Award } from 'lucide-react';
import { useState } from 'react';

export function MarkScheme({ ms }: { ms?: MS }) {
  const [open, setOpen] = useState(false);
  if (!ms || !ms.points?.length) return null;
  return (
    <div className="mt-3 ml-12 rounded-lg border border-border bg-muted/40">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold hover:bg-muted">
        <span className="flex items-center gap-2"><Award className="w-3.5 h-3.5 text-primary" />Mark scheme · {ms.totalMarks} mark{ms.totalMarks === 1 ? '' : 's'}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div className="px-3 py-3 space-y-2 text-sm">
          <ul className="space-y-1.5">{ms.points.map((p, i) => (<li key={i} className="flex gap-2"><span className="text-primary font-mono text-xs shrink-0">[{p.marks}m]</span><span>{p.point}</span></li>))}</ul>
          {ms.examinerNotes && <p className="text-xs italic text-muted-foreground"><strong>Examiner note:</strong> {ms.examinerNotes}</p>}
          {ms.commonMistakes && ms.commonMistakes.length > 0 && (<div className="text-xs text-muted-foreground"><strong>Common mistakes:</strong><ul className="list-disc pl-5 mt-1 space-y-0.5">{ms.commonMistakes.map((m, i) => <li key={i}>{m}</li>)}</ul></div>)}
        </div>
      )}
    </div>
  );
}