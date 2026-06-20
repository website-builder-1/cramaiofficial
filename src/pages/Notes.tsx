import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingCard } from '@/components/LoadingSpinner';
import { NotebookPen, Sparkles, Download, Copy, Printer, ShieldCheck, Loader2 } from 'lucide-react';
import { useStudyStore } from '@/lib/store';
import { generateNotes, hallucinationCheck, type NotesResult } from '@/lib/api';
import { toast } from 'sonner';
import { RichText } from '@/components/RichText';
import { ConceptImage } from '@/components/ConceptImage';
import { ChunkList } from '@/components/ChunkList';
import { Image as ImageIcon } from 'lucide-react';
import { ReentryCard } from '@/components/ReentryCard';
import { TtsPlayButton } from '@/components/TtsPlayButton';

export default function Notes() {
  const { getStudyMaterial, subject, examLevel, examBoard, notesData, setNotesData, awardXp } = useStudyStore();
  const setLastContext = useStudyStore((s) => s.setLastContext);
  const hallucinationCheckEnabled = useStudyStore((s) => s.adhdProfile.hallucinationCheck);
  const material = getStudyMaterial();
  useEffect(() => {
    setLastContext('/notes', { label: notesData?.title ? `Notes: ${notesData.title.replace(/<[^>]+>/g, '')}` : `Notes: ${subject || 'study material'}` });
  }, [setLastContext, subject, notesData?.title]);
  const data = notesData;
  const [loading, setLoading] = useState(false);
  const [showVisuals, setShowVisuals] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<null | { ok: true } | { ok: false; attempts: number }>(null);
  const verifyRunRef = useRef(0);

  const draftText = (n: NotesResult) =>
    [n.title, n.overview || '', ...(n.sections || []).flatMap((s) => [s.heading, s.body || '', ...(s.bullets || []), ...(s.examples || [])]), ...(n.keyTakeaways || [])]
      .join('\n')
      .replace(/<[^>]+>/g, '');

  const verifyAndRegenerate = async (initial: NotesResult) => {
    if (!material) return;
    const runId = ++verifyRunRef.current;
    setVerifying(true);
    setVerifyStatus(null);
    let current = initial;
    const avoid: string[] = [];
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const check = await hallucinationCheck({ source: material, draft: draftText(current) });
      if (verifyRunRef.current !== runId) return; // superseded
      const flags = check.data?.flaggedClaims || [];
      if (!flags.length) {
        setVerifying(false);
        setVerifyStatus({ ok: true });
        return;
      }
      if (attempt === MAX_ATTEMPTS) {
        setVerifying(false);
        setVerifyStatus({ ok: false, attempts: attempt });
        return;
      }
      flags.forEach((f) => { if (f.text) avoid.push(f.text); });
      const regen = await generateNotes(material, { subject, examLevel, examBoard, avoidClaims: avoid });
      if (verifyRunRef.current !== runId) return;
      if (regen.error || !regen.data) {
        setVerifying(false);
        setVerifyStatus({ ok: false, attempts: attempt });
        return;
      }
      current = regen.data;
      setNotesData(current);
    }
  };

  const handleGenerate = async () => {
    if (!material || material.length < 10) {
      toast.error('Add study material in the Analyzer first.');
      return;
    }
    setLoading(true);
    setVerifyStatus(null);
    const res = await generateNotes(material, { subject, examLevel, examBoard });
    setLoading(false);
    if (res.error || !res.data) {
      toast.error(res.error || 'Failed to generate notes');
      return;
    }
    setNotesData(res.data);
    awardXp(20);
    toast.success('Notes ready!');
    if (hallucinationCheckEnabled) {
      void verifyAndRegenerate(res.data);
    }
  };

  useEffect(() => {
    // auto-generate when arriving with material loaded and nothing yet
    if (material && !data && !loading) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildMarkdown = (n: NotesResult) => {
    const lines: string[] = [];
    lines.push(`<h1>${n.title}</h1>`);
    if (n.overview) lines.push(`<p>${n.overview}</p>`);
    n.sections?.forEach((s) => {
      lines.push(`<h2>${s.heading}</h2>`);
      if (s.body) lines.push(`<div>${s.body}</div>`);
      if (s.bullets?.length) lines.push(`<ul>${s.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>`);
      if (s.examples?.length) {
        lines.push(`<p><strong>Examples:</strong></p>`);
        lines.push(`<ul>${s.examples.map((e) => `<li>${e}</li>`).join('')}</ul>`);
      }
    });
    if (n.keyTakeaways?.length) {
      lines.push(`<h2>Key Takeaways</h2>`);
      lines.push(`<ul>${n.keyTakeaways.map((b) => `<li>${b}</li>`).join('')}</ul>`);
    }
    return lines.join('\n');
  };

  const buildPrintableHtml = (n: NotesResult) => {
    const title = (n.title || 'Study Notes').replace(/<[^>]+>/g, '');
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  @page { margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #111; line-height: 1.55; max-width: 800px; margin: 24px auto; padding: 0 16px; }
  h1 { font-size: 26pt; margin: 0 0 8pt; border-bottom: 2px solid #111; padding-bottom: 6pt; }
  h2 { font-size: 16pt; margin: 18pt 0 6pt; }
  h3 { font-size: 13pt; margin: 14pt 0 4pt; }
  p, li { font-size: 11.5pt; }
  ul { padding-left: 22pt; margin: 4pt 0 10pt; }
  li { margin-bottom: 3pt; }
  .overview { font-style: italic; color: #333; }
  .examples { background: #f4f4f0; padding: 8pt 12pt; border-left: 3pt solid #888; margin: 8pt 0; }
  .examples p { margin: 0 0 4pt; font-weight: bold; text-transform: uppercase; font-size: 9.5pt; letter-spacing: 0.5pt; }
  .takeaways { border-top: 1px solid #999; margin-top: 18pt; padding-top: 10pt; }
  @media print { body { margin: 0; max-width: none; } a { color: inherit; text-decoration: none; } }
</style>
</head>
<body>
  <h1>${title}</h1>
  ${n.overview ? `<p class="overview">${n.overview}</p>` : ''}
  ${(n.sections || []).map((s) => `
    <section>
      <h2>${s.heading}</h2>
      ${s.body ? `<div>${s.body}</div>` : ''}
      ${s.bullets?.length ? `<ul>${s.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>` : ''}
      ${s.examples?.length ? `<div class="examples"><p>Examples</p><ul>${s.examples.map((e) => `<li>${e}</li>`).join('')}</ul></div>` : ''}
    </section>
  `).join('')}
  ${n.keyTakeaways?.length ? `<div class="takeaways"><h2>Key Takeaways</h2><ul>${n.keyTakeaways.map((b) => `<li>${b}</li>`).join('')}</ul></div>` : ''}
</body>
</html>`;
  };

  const copyAll = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(buildMarkdown(data));
    toast.success('Notes copied!');
  };

  const download = () => {
    if (!data) return;
    const blob = new Blob([buildPrintableHtml(data)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(data.title || 'notes').replace(/[^a-z0-9-_ ]/gi, '').slice(0, 60)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const print = () => {
    if (!data) return;
    const html = buildPrintableHtml(data);
    const w = window.open('', '_blank', 'width=900,height=1000');
    if (!w) {
      toast.error('Pop-up blocked — allow pop-ups to print.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    const trigger = () => {
      w.focus();
      w.print();
    };
    // Wait for layout before printing
    if (w.document.readyState === 'complete') setTimeout(trigger, 200);
    else w.addEventListener('load', () => setTimeout(trigger, 200));
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container px-4 max-w-3xl">
        <ReentryCard />
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent border border-border mb-4">
            <NotebookPen className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Detailed Notes</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Your <span className="gradient-text">Study Notes</span>
          </h1>
          <p className="text-muted-foreground">
            Detailed, structured notes generated from the material in your Analyzer.
          </p>
        </div>

        {loading ? (
          <LoadingCard message="Writing your notes..." />
        ) : !data ? (
          <div className="glass-card rounded-xl p-8 text-center space-y-4">
            <p className="text-muted-foreground">
              {material
                ? 'Ready to generate detailed notes from your material.'
                : 'Add study material in the Analyzer first.'}
            </p>
            <Button onClick={handleGenerate} variant="hero" size="lg" className="gap-2" disabled={!material}>
              <Sparkles className="w-5 h-5" /> Generate Notes
            </Button>
          </div>
        ) : (
          <div className="space-y-6 animate-slide-up">
            <div className="flex flex-wrap gap-2 justify-end">
              {verifying && (
                <div className="inline-flex items-center gap-2 text-xs text-muted-foreground mr-auto">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Verifying every claim against your source…
                </div>
              )}
              {!verifying && verifyStatus?.ok && (
                <div className="inline-flex items-center gap-2 text-xs text-success mr-auto">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  All claims verified against your source
                </div>
              )}
              <Button
                variant={showVisuals ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowVisuals((v) => !v)}
                className="gap-2"
                title="Generate AI diagrams for each section"
              >
                <ImageIcon className="w-4 h-4" /> {showVisuals ? 'Hide Visuals' : 'Generate Visualizations'}
              </Button>
              <Button variant="outline" size="sm" onClick={copyAll} className="gap-2">
                <Copy className="w-4 h-4" /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={download} className="gap-2">
                <Download className="w-4 h-4" /> Download .html
              </Button>
              <Button variant="outline" size="sm" onClick={print} className="gap-2">
                <Printer className="w-4 h-4" /> Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleGenerate} className="gap-2">
                <Sparkles className="w-4 h-4" /> Regenerate
              </Button>
            </div>

            <div className="glass-card rounded-xl p-6">
              <RichText html={data.title} as="h2" className="text-2xl font-bold mb-3 gradient-text" />
              {data.overview && <RichText html={data.overview} className="text-muted-foreground" />}
              <TtsPlayButton notes={data} subject={subject} className="mt-3" label="Read & explain (AI tutor)" />
            </div>

            {data.sections?.map((s, i) => (
              <div key={i} className="glass-card rounded-xl p-6">
                <RichText html={s.heading} as="h3" className="text-lg font-semibold mb-3" />
                {s.body && <RichText html={s.body} className="text-foreground mb-3" />}
                {s.bullets?.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1.5 text-foreground">
                    {s.bullets.map((b, j) => <li key={j}><RichText html={b} as="span" /></li>)}
                  </ul>
                )}
                {s.examples?.length > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-muted/50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Examples</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-foreground">
                      {s.examples.map((e, j) => <li key={j}><RichText html={e} as="span" /></li>)}
                    </ul>
                  </div>
                )}
                {showVisuals && (
                  <div className="mt-4">
                    <ConceptImage
                      prompt={`${s.heading.replace(/<[^>]+>/g, '').slice(0, 200)} (${subject || 'study topic'})`}
                      cacheKey={`notes:${data.title}:${i}`}
                    />
                  </div>
                )}
                <div className="mt-3">
                  <ChunkList
                    content={`${s.heading.replace(/<[^>]+>/g, '')}\n\n${(s.body || '').replace(/<[^>]+>/g, '')}\n${(s.bullets || []).map((b) => '- ' + b.replace(/<[^>]+>/g, '')).join('\n')}`}
                    topic={s.heading.replace(/<[^>]+>/g, '').slice(0, 100)}
                  />
                </div>
              </div>
            ))}

            {data.keyTakeaways?.length > 0 && (
              <div className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-3 gradient-text">Key Takeaways</h3>
                <ul className="list-disc pl-5 space-y-1.5 text-foreground">
                  {data.keyTakeaways.map((b, i) => <li key={i}><RichText html={b} as="span" /></li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}