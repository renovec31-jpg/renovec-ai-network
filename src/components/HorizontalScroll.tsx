import { ReactNode, useEffect, useRef } from 'react';

type Props = {
  children: ReactNode;
};

export default function HorizontalScroll({ children }: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const track = trackRef.current;
    if (!outer || !track) return;

    let scrollX = 0;
    let ticking = false;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      scrollX += delta;
      const sectionW = window.innerWidth;
      const totalW = track.scrollWidth / 2;
      if (scrollX >= totalW) scrollX -= totalW;
      if (scrollX < 0) scrollX += totalW;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          track.style.transform = 'translate3d(' + (-scrollX) + 'px, 0, 0)';
          ticking = false;
        });
      }
    };

    let startX = 0;
    let startScroll = 0;
    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startScroll = scrollX;
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const dx = startX - e.touches[0].clientX;
      scrollX = startScroll + dx;
      const totalW = track.scrollWidth / 2;
      if (scrollX >= totalW) scrollX -= totalW;
      if (scrollX < 0) scrollX += totalW;
      track.style.transform = 'translate3d(' + (-scrollX) + 'px, 0, 0)';
    };

    outer.addEventListener('wheel', onWheel, { passive: false });
    outer.addEventListener('touchstart', onTouchStart, { passive: true });
    outer.addEventListener('touchmove', onTouchMove, { passive: false });

    return () => {
      outer.removeEventListener('wheel', onWheel);
      outer.removeEventListener('touchstart', onTouchStart);
      outer.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return (
    <div
      ref={outerRef}
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <div
        ref={trackRef}
        style={{
          display: 'flex',
          width: 'max-content',
          height: '100%',
          willChange: 'transform',
        }}
      >
        {children}
        {children}
      </div>
    </div>
  );
}
