import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingCard } from '@/components/LoadingSpinner';
import { Layers, Sparkles, RotateCcw, Check, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStudyStore } from '@/lib/store';
import { generateFlashcards, type Flashcard } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Flashcards() {
  const { getStudyMaterial, subject, examLevel, examBoard } = useStudyStore();
  const material = getStudyMaterial();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewIds, setReviewIds] = useState<Set<string>>(new Set());

  const handleGenerate = async () => {
    if (!material || material.length < 10) {
      toast.error('Add study material in the Analyzer first.');
      return;
    }
    setLoading(true);
    const res = await generateFlashcards(material, 15, { subject, examLevel, examBoard });
    setLoading(false);
    if (res.error || !res.data) {
      toast.error(res.error || 'Failed to generate flashcards');
      return;
    }
    const list = (res.data.cards || []).map((c, i) => ({ ...c, id: c.id || `card-${i}` }));
    setCards(list);
    setIndex(0);
    setFlipped(false);
    setReviewIds(new Set());
    toast.success(`Generated ${list.length} flashcards!`);
  };

  const current = cards[index];

  const next = () => {
    setFlipped(false);
    setIndex((i) => (i + 1) % cards.length);
  };
  const prev = () => {
    setFlipped(false);
    setIndex((i) => (i - 1 + cards.length) % cards.length);
  };

  const markGot = () => {
    const id = current.id;
    setReviewIds((s) => {
      const n = new Set(s); n.delete(id); return n;
    });
    next();
  };
  const markReview = () => {
    const id = current.id;
    setReviewIds((s) => new Set(s).add(id));
    next();
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container px-4 max-w-3xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent border border-border mb-4">
            <Layers className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Smart Flashcards</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            AI <span className="gradient-text">Flashcards</span>
          </h1>
          <p className="text-muted-foreground">Flip through bite-sized prompts generated from your material.</p>
        </div>

        {loading ? (
          <LoadingCard message="Generating flashcards..." />
        ) : cards.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center space-y-4">
            <p className="text-muted-foreground">
              {material ? 'Ready to generate flashcards from your material.' : 'Add study material in the Analyzer first.'}
            </p>
            <Button onClick={handleGenerate} variant="hero" size="lg" className="gap-2" disabled={!material}>
              <Sparkles className="w-5 h-5" /> Generate Flashcards
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{index + 1} / {cards.length}</span>
              <span>{reviewIds.size} to review</span>
            </div>

            <div
              className={cn(
                'glass-card rounded-2xl p-10 min-h-[280px] flex items-center justify-center text-center cursor-pointer transition-transform select-none',
                flipped && 'ring-2 ring-primary'
              )}
              onClick={() => setFlipped((f) => !f)}
            >
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                  {flipped ? 'Answer' : 'Question'} · {current.topic}
                </div>
                <p className="text-xl md:text-2xl font-medium">
                  {flipped ? current.back : current.front}
                </p>
                <p className="text-xs text-muted-foreground mt-6">Click card to flip</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-center">
              <Button variant="outline" onClick={prev} className="gap-2"><ChevronLeft className="w-4 h-4" /> Prev</Button>
              <Button variant="outline" onClick={() => setFlipped((f) => !f)} className="gap-2"><RotateCcw className="w-4 h-4" /> Flip</Button>
              <Button onClick={markReview} variant="outline" className="gap-2"><RefreshCw className="w-4 h-4" /> Review again</Button>
              <Button onClick={markGot} variant="hero" className="gap-2"><Check className="w-4 h-4" /> Got it</Button>
              <Button variant="outline" onClick={next} className="gap-2">Next <ChevronRight className="w-4 h-4" /></Button>
            </div>

            <div className="text-center">
              <Button variant="ghost" onClick={handleGenerate} className="gap-2">
                <Sparkles className="w-4 h-4" /> Regenerate
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}