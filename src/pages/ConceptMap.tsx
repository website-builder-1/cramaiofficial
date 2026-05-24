import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingCard } from '@/components/LoadingSpinner';
import { Network, Sparkles } from 'lucide-react';
import { useStudyStore } from '@/lib/store';
import { generateConceptMap, explainConcept, type ConceptMap as ConceptMapData } from '@/lib/api';
import { toast } from 'sonner';

export default function ConceptMap() {
  const { documentContent } = useStudyStore();
  const [data, setData] = useState<ConceptMapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [explaining, setExplaining] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<{ concept: string; text: string } | null>(null);

  const handleGenerate = async () => {
    if (!documentContent || documentContent.length < 10) {
      toast.error('Add study material in the Analyzer first.');
      return;
    }
    setLoading(true);
    const res = await generateConceptMap(documentContent);
    setLoading(false);
    if (res.error || !res.data) {
      toast.error(res.error || 'Failed to generate concept map');
      return;
    }
    setData(res.data);
    toast.success('Concept map ready!');
  };

  const explain = async (label: string) => {
    setExplaining(label);
    setExplanation(null);
    const res = await explainConcept(label, documentContent.slice(0, 4000));
    setExplaining(null);
    if (res.error || !res.data) {
      toast.error(res.error || 'Failed to fetch explanation');
      return;
    }
    setExplanation({ concept: label, text: res.data.message });
  };

  // Circular layout sized to node count
  const VB_W = 1000;
  const VB_H = 700;
  const positions = useMemo(() => {
    if (!data) return {} as Record<string, { x: number; y: number }>;
    const n = Math.max(data.nodes.length, 1);
    const cx = VB_W / 2, cy = VB_H / 2;
    // Scale radius with node count so they don't overlap
    const r = Math.min(VB_W, VB_H) / 2 - 110;
    const map: Record<string, { x: number; y: number }> = {};
    data.nodes.forEach((node, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      map[node.id] = { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
    });
    return map;
  }, [data]);

  // Wrap label into up to 2 lines of ~14 chars
  const wrap = (label: string): string[] => {
    const words = label.split(/\s+/);
    const lines: string[] = [''];
    for (const w of words) {
      const last = lines[lines.length - 1];
      if ((last + ' ' + w).trim().length <= 14) {
        lines[lines.length - 1] = (last + ' ' + w).trim();
      } else if (lines.length < 2) {
        lines.push(w);
      } else {
        lines[1] = lines[1].length > 11 ? lines[1].slice(0, 11) + '…' : lines[1] + ' ' + w;
      }
    }
    return lines;
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container px-4 max-w-5xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent border border-border mb-4">
            <Network className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Concept Map</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            See how <span className="gradient-text">ideas connect</span>
          </h1>
          <p className="text-muted-foreground">Click any concept to get an AI explanation.</p>
        </div>

        {loading ? (
          <LoadingCard message="Building concept map..." />
        ) : !data ? (
          <div className="glass-card rounded-xl p-8 text-center space-y-4">
            <p className="text-muted-foreground">
              {documentContent ? 'Ready to map your material.' : 'Add study material in the Analyzer first.'}
            </p>
            <Button onClick={handleGenerate} variant="hero" size="lg" className="gap-2" disabled={!documentContent}>
              <Sparkles className="w-5 h-5" /> Generate Concept Map
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="glass-card rounded-xl p-4">
              <svg
                viewBox={`0 0 ${VB_W} ${VB_H}`}
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-auto max-h-[70vh]"
              >
                {/* Edges first so nodes sit on top */}
                {data.edges?.map((e, i) => {
                  const a = positions[e.from], b = positions[e.to];
                  if (!a || !b) return null;
                  const mx = (a.x + b.x) / 2;
                  const my = (a.y + b.y) / 2;
                  return (
                    <g key={i}>
                      <line
                        x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                        stroke="hsl(var(--primary) / 0.35)"
                        strokeWidth={2}
                      />
                      {e.label && (
                        <g>
                          <rect
                            x={mx - Math.min(e.label.length, 22) * 3.4}
                            y={my - 9}
                            width={Math.min(e.label.length, 22) * 6.8}
                            height={18}
                            rx={4}
                            fill="hsl(var(--background))"
                            opacity={0.85}
                          />
                          <text
                            x={mx} y={my + 4}
                            fontSize={11}
                            fill="hsl(var(--muted-foreground))"
                            textAnchor="middle"
                          >
                            {e.label.length > 22 ? e.label.slice(0, 21) + '…' : e.label}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
                {data.nodes.map((n) => {
                  const p = positions[n.id];
                  if (!p) return null;
                  const lines = wrap(n.label);
                  return (
                    <g
                      key={n.id}
                      className="cursor-pointer"
                      onClick={() => explain(n.label)}
                    >
                      <ellipse
                        cx={p.x} cy={p.y}
                        rx={72} ry={42}
                        fill="hsl(var(--primary) / 0.15)"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                      />
                      <text
                        x={p.x}
                        y={p.y}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={13}
                        fontWeight={600}
                        fill="hsl(var(--foreground))"
                        className="pointer-events-none"
                      >
                        {lines.map((ln, idx) => (
                          <tspan
                            key={idx}
                            x={p.x}
                            dy={idx === 0 ? (lines.length === 1 ? 0 : -7) : 16}
                          >
                            {ln}
                          </tspan>
                        ))}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {(explaining || explanation) && (
              <div className="glass-card rounded-xl p-6">
                {explaining ? (
                  <p className="text-muted-foreground">Explaining "{explaining}"...</p>
                ) : explanation ? (
                  <>
                    <h3 className="text-lg font-semibold mb-2 gradient-text">{explanation.concept}</h3>
                    <p className="whitespace-pre-wrap text-foreground">{explanation.text}</p>
                  </>
                ) : null}
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