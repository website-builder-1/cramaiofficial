import { GraduationCap } from 'lucide-react';
import { useStudyStore } from '@/lib/store';
export function SyllabusChip() {
  const ctx = useStudyStore((s) => s.syllabusContext);
  const subject = useStudyStore((s) => s.subject);
  const examLevel = useStudyStore((s) => s.examLevel);
  const examBoard = useStudyStore((s) => s.examBoard);
  const label = ctx?.label || [examBoard, examLevel, subject].filter(Boolean).join(' · ') || null;
  if (!label) return null;
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/30 bg-primary/5 text-xs font-medium text-primary max-w-full" title={ctx ? `Grounded to ${ctx.label}` : 'Exam board context'}>
      <GraduationCap className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate max-w-[260px]">{ctx ? `Grounded · ${label}` : label}</span>
    </div>
  );
}