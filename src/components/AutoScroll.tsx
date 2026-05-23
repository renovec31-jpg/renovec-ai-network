import { useEffect, useRef } from 'react';

const SPEED = 0.8;
const PAUSE_MS = 2200;

export default function AutoScroll() {
  const rafRef = useRef<number | null>(null);
  const dirRef = useRef(1);
  const pauseRef = useRef(0);

  useEffect(() => {
    const step = (t: number) => {
      if (pauseRef.current > 0) {
        pauseRef.current -= 16;
        rafRef.current = requestAnimationFrame(step);
        return;
      }

      const doc = document.documentElement;
      const maxY = doc.scrollHeight - doc.clientHeight;

      if (maxY <= 0) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }

      const y = window.scrollY;

      if (dirRef.current === 1 && y >= maxY - 2) {
        dirRef.current = -1;
        pauseRef.current = PAUSE_MS;
      } else if (dirRef.current === -1 && y <= 2) {
        dirRef.current = 1;
        pauseRef.current = PAUSE_MS;
      }

      window.scrollBy(0, SPEED * dirRef.current);
      rafRef.current = requestAnimationFrame(step);
    };

    const onInteraction = () => {
      pauseRef.current = 5000;
    };

    window.addEventListener('wheel', onInteraction, { passive: true });
    window.addEventListener('touchstart', onInteraction, { passive: true });
    window.addEventListener('mousedown', onInteraction, { passive: true });

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('wheel', onInteraction);
      window.removeEventListener('touchstart', onInteraction);
      window.removeEventListener('mousedown', onInteraction);
    };
  }, []);

  return null;
}
