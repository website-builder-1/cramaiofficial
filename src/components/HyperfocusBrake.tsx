import { useEffect, useState } from 'react';
import { useStudyStore } from '@/lib/store';

export function HyperfocusBrake() {
  const minutes = useStudyStore((s) => s.adhdProfile.hyperfocusMinutes);
  const active = useStudyStore((s) => s.activeStudySeconds);
  const reset = useStudyStore((s) => s.resetActiveStudySeconds);
  const [phase, setPhase] = useState<'idle' | 'fade-in' | 'hold' | 'fade-out'>('idle');
  const [countdown, setCountdown] = useState(60);
  useEffect(() => {
    if (minutes === 0 || phase !== 'idle') return;
    if (active >= minutes * 60) { setPhase('fade-in'); setCountdown(60); }
  }, [active, minutes, phase]);
  useEffect(() => {
    if (phase === 'idle') return;
    if (phase === 'fade-in') { const t = setTimeout(() => setPhase('hold'), 1500); return () => clearTimeout(t); }
    if (phase === 'hold') {
      if (countdown <= 0) { setPhase('fade-out'); return; }
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000); return () => clearTimeout(t);
    }
    if (phase === 'fade-out') { const t = setTimeout(() => { setPhase('idle'); reset(); }, 1500); return () => clearTimeout(t); }
  }, [phase, countdown, reset]);
  if (phase === 'idle') return null;
  const opacity = phase === 'fade-out' ? 0 : 1;
  const textOpacity = phase === 'hold' ? 1 : 0;
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#ffffff', opacity, transition: 'opacity 1500ms ease-in-out', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-live="polite">
      <div style={{ opacity: textOpacity, transition: 'opacity 600ms ease-in-out', color: '#9ca3af', textAlign: 'center' }}>
        <div style={{ fontSize: 14, marginBottom: 12, fontWeight: 500 }}>Brain break — eyes can rest</div>
        <div style={{ fontSize: 72, fontVariantNumeric: 'tabular-nums', fontWeight: 200 }}>{countdown}</div>
        <button onClick={() => setPhase('fade-out')} style={{ marginTop: 32, padding: '8px 20px', border: '1px solid #e5e7eb', borderRadius: 8, background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: 13 }}>Skip</button>
      </div>
    </div>
  );
}