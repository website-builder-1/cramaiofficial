import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingCard } from '@/components/LoadingSpinner';
import { NotebookPen, Sparkles, Download, Copy } from 'lucide-react';
import { useStudyStore } from '@/lib/store';
import { generateNotes, type NotesResult } from '@/lib/api';
import { toast } from 'sonner';
import { RichText } from '@/components/RichText';

export default function Notes() {
  const { getStudyMaterial, subject, examLevel, examBoard } = useStudyStore();
  const material = getStudyMaterial();
  const [data, setData] = useState<NotesResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!material || material.length < 10) {
      toast.error('Add study material in the Analyzer first.');
      return;
    }
    setLoading(true);
    const res = await generateNotes(material, { subject, examLevel, examBoard });
    setLoading(false);
    if (res.error || !res.data) {
      toast.error(res.error || 'Failed to generate notes');
      return;
    }
    setData(res.data);
    toast.success('Notes ready!');
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

  const copyAll = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(buildMarkdown(data));
    toast.success('Notes copied!');
  };

  const download = () => {
    if (!data) return;
    const blob = new Blob([buildMarkdown(data)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(data.title || 'notes').replace(/[^a-z0-9-_ ]/gi, '').slice(0, 60)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container px-4 max-w-3xl">
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
              <Button variant="outline" size="sm" onClick={copyAll} className="gap-2">
                <Copy className="w-4 h-4" /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={download} className="gap-2">
                <Download className="w-4 h-4" /> Download .html
              </Button>
              <Button variant="outline" size="sm" onClick={handleGenerate} className="gap-2">
                <Sparkles className="w-4 h-4" /> Regenerate
              </Button>
            </div>

            <div className="glass-card rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-3 gradient-text">{data.title}</h2>
              {data.overview && <RichText html={data.overview} className="text-muted-foreground" />}
            </div>

            {data.sections?.map((s, i) => (
              <div key={i} className="glass-card rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-3">{s.heading}</h3>
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