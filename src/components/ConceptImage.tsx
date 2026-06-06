import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImageIcon, Loader2, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { generateConceptImage } from '@/lib/api';
import { useStudyStore } from '@/lib/store';
import { toast } from 'sonner';

interface Props {
  prompt: string;
  cacheKey?: string;
  label?: string;
  autoGenerate?: boolean;
  className?: string;
}

export function ConceptImage({ prompt, cacheKey, label = 'Generate visualization', className }: Props) {
  const key = cacheKey || prompt;
  const { imageCache, setCachedImage } = useStudyStore();
  const cached = imageCache[key];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    const res = await generateConceptImage(prompt);
    setLoading(false);
    if (res.error || !res.data?.image) {
      const msg = res.error || 'Image generation failed';
      setError(msg);
      toast.error(msg);
      return;
    }
    setCachedImage(key, res.data.image);
  };

  if (cached) {
    return (
      <div className={className}>
        <div className="relative rounded-xl overflow-hidden border border-border bg-muted">
          <img
            src={cached}
            alt={prompt}
            className={`w-full h-auto transition-opacity ${loading ? 'opacity-40' : ''}`}
            loading="lazy"
          />
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/40 backdrop-blur-sm">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs text-foreground/80">Regenerating…</p>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); run(); }}
            disabled={loading}
            className="absolute top-2 right-2 gap-1.5 backdrop-blur bg-background/80 z-10"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Regenerate
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 italic text-center">
          CramAI's images are AI-generated and may not always be accurate — verify details against your notes.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 p-6 rounded-xl border border-dashed border-border bg-muted/40 ${className || ''}`}>
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">Generating visualization (can take 10–20s)...</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <Button variant="outline" size="sm" onClick={run} className="gap-2">
        {error ? <AlertCircle className="w-4 h-4 text-destructive" /> : <Sparkles className="w-4 h-4" />}
        {error ? 'Retry visualization' : label}
      </Button>
      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
    </div>
  );
}

// Convenience: show a single button-less spot that triggers generation explicitly
export function ConceptImageInline({ prompt, cacheKey }: { prompt: string; cacheKey?: string }) {
  return (
    <div className="mt-3">
      <ConceptImage prompt={prompt} cacheKey={cacheKey} />
    </div>
  );
}