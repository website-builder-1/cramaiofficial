import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingCard } from '@/components/LoadingSpinner';
import { ScrollText, Sparkles } from 'lucide-react';
import { useStudyStore } from '@/lib/store';
import { generateSummary, type SummaryResult } from '@/lib/api';
import { toast } from 'sonner';
import { RichText } from '@/components/RichText';

export default function Summary() {
  const { getStudyMaterial, subject, examLevel, examBoard } = useStudyStore();
  const material = getStudyMaterial();
  const [data, setData] = useState<SummaryResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!material || material.length < 10) {
      toast.error('Add study material in the Analyzer first.');
      return;
    }
    setLoading(true);
    const res = await generateSummary(material, { subject, examLevel, examBoard });
    setLoading(false);
    if (res.error || !res.data) {
      toast.error(res.error || 'Failed to generate summary');
      return;
    }
    setData(res.data);
    toast.success('Summary ready!');
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container px-4 max-w-3xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent border border-border mb-4">
            <ScrollText className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Smart Summary</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Cram-ready <span className="gradient-text">Summary & Cheat Sheet</span>
          </h1>
        </div>

        {loading ? (
          <LoadingCard message="Summarizing material..." />
        ) : !data ? (
          <div className="glass-card rounded-xl p-8 text-center space-y-4">
            <p className="text-muted-foreground">
              {material ? 'Ready to summarize your loaded material.' : 'Add study material in the Analyzer first.'}
            </p>
            <Button onClick={handleGenerate} variant="hero" size="lg" className="gap-2" disabled={!material}>
              <Sparkles className="w-5 h-5" /> Generate Summary
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="glass-card rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-2 gradient-text">TL;DR</h2>
              <RichText html={data.tldr} className="text-foreground" />
            </div>

            <div className="glass-card rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-3">Bullet Summary</h2>
              <ul className="space-y-2 list-disc pl-5 text-foreground">
                {data.bulletSummary?.map((b, i) => <li key={i}><RichText html={b} as="span" /></li>)}
              </ul>
            </div>

            <div className="glass-card rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-3">Cheat Sheet</h2>
              <ul className="space-y-2 list-disc pl-5 text-foreground">
                {data.cheatSheet?.map((b, i) => <li key={i}><RichText html={b} as="span" /></li>)}
              </ul>
            </div>

            {data.keyTerms?.length > 0 && (
              <div className="glass-card rounded-xl p-6">
                <h2 className="text-lg font-semibold mb-3">Key Terms</h2>
                <dl className="space-y-3">
                  {data.keyTerms.map((t, i) => (
                    <div key={i}>
                      <dt className="font-semibold text-foreground">{t.term}</dt>
                      <dd className="text-muted-foreground text-sm"><RichText html={t.definition} as="span" /></dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="text-center">
              <Button variant="outline" onClick={handleGenerate} className="gap-2">
                <Sparkles className="w-4 h-4" /> Regenerate
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}