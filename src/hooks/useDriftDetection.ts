import { useEffect, useState } from 'react';
import { useStudyStore } from '@/lib/store';

export function useDriftDetection(opts: { enabled?: boolean; idleSeconds?: number; hiddenSeconds?: number } = {}) {
  const driftOn = useStudyStore((s) => s.adhdProfile.driftOn);
  const enabled = (opts.enabled ?? true) && driftOn;
  const idleSec = opts.idleSeconds ?? 90;
  const hiddenSec = opts.hiddenSeconds ?? 60;
  const [drifted, setDrifted] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let lastActivity = Date.now();
    let hiddenAt: number | null = null;
    const bump = () => { lastActivity = Date.now(); };
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else {
        if (hiddenAt && Date.now() - hiddenAt > hiddenSec * 1000) setDrifted(true);
        hiddenAt = null; lastActivity = Date.now();
      }
    };
    window.addEventListener('scroll', bump, { passive: true });
    window.addEventListener('keydown', bump);
    window.addEventListener('click', bump);
    document.addEventListener('visibilitychange', onVis);
    const id = setInterval(() => {
      if (Date.now() - lastActivity > idleSec * 1000 && !document.hidden) setDrifted(true);
    }, 5000);
    return () => {
      clearInterval(id);
      window.removeEventListener('scroll', bump);
      window.removeEventListener('keydown', bump);
      window.removeEventListener('click', bump);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled, idleSec, hiddenSec]);
  return { drifted, reset: () => setDrifted(false) };
}