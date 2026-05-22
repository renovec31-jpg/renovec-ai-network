import { useState, useEffect, useCallback, useRef } from 'react';
import { MOCK_FEED } from '../../../data/mockOccitanie';

const TYPE_LABELS: Record<string, string> = {
  service: 'Offre',
  demand: 'Demande',
  object: 'Objet',
};

export default function FeedExploreView() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');
  const [nextPreview, setNextPreview] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const items = MOCK_FEED;
  const current = items[currentIdx % items.length];
  const next = items[(currentIdx + 1) % items.length];

  const advance = useCallback(() => {
    setPhase('exit');
    timerRef.current = setTimeout(() => {
      setCurrentIdx(i => (i + 1) % items.length);
      setPhase('enter');
      setNextPreview(false);
      timerRef.current = setTimeout(() => {
        setPhase('visible');
        setNextPreview(true);
      }, 60);
    }, 600);
  }, [items.length]);

  useEffect(() => {
    setPhase('enter');
    const t = setTimeout(() => setPhase('visible'), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase === 'visible') {
      timerRef.current = setTimeout(advance, 3200 + Math.random() * 800);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phase, advance]);

  const variationStyle = {
    '--bounce-offset': `${1.5 + (currentIdx % 3) * 0.8}px`,
    '--exit-dir': currentIdx % 2 === 0 ? '1' : '-1',
  } as React.CSSProperties;

  return (
    <div className="aib-view feed-gravity" style={variationStyle}>
      <span className="aib-match-label">Fil du reseau</span>

      <div className="feed-gravity-stage">
        {/* Next item preview — ghosted above */}
        {nextPreview && phase === 'visible' && (
          <div className="feed-gravity-ghost">
            <div className="feed-gravity-avatar" style={{ background: next.color }}>
              {next.author[0]}
            </div>
            <span>{next.title}</span>
          </div>
        )}

        {/* Current item */}
        <div className={`feed-gravity-item feed-gravity-item--${phase}`} key={currentIdx}>
          <div className="feed-gravity-avatar" style={{ background: current.color }}>
            {current.author[0]}
          </div>
          <div className="feed-gravity-body">
            <strong>{current.author}</strong>
            <span className="feed-gravity-title">{current.title}</span>
            <span className="feed-gravity-meta">
              {current.city} · {TYPE_LABELS[current.type]} · {current.time}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
