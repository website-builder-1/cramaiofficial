import { useEffect } from 'react';
import { useStudyStore } from '@/lib/store';

export function useActiveTimer(enabled = true) {
  const add = useStudyStore((s) => s.addActiveStudySeconds);
  useEffect(() => {
    if (!enabled) return;
    let visible = !document.hidden;
    const onVis = () => { visible = !document.hidden; };
    document.addEventListener('visibilitychange', onVis);
    const id = setInterval(() => { if (visible) add(1); }, 1000);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, [enabled, add]);
}