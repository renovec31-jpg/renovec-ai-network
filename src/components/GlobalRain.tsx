import { useState, useEffect, useRef, useCallback } from 'react';
import { AVATAR_PHOTOS, PEOPLE } from '../data/people';

interface RainDrop {
  id: number;
  name: string;
  caption: string;
  lane: number;
  depth: number;
  delay: number;
  avatarIdx: number;
  size: number;
}

const LANES = 7;
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
const MAX_DROPS = isMobile ? 5 : 10;
const SPAWN_INTERVAL = isMobile ? 2600 : 1600;

export default function GlobalRain({ frozen }: { frozen: boolean }) {
  const [drops, setDrops] = useState<RainDrop[]>([]);
  const counterRef = useRef(0);
  const poolIdx = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;

  const spawnDrop = useCallback(() => {
    if (frozenRef.current) return;
    const person = PEOPLE[poolIdx.current % PEOPLE.length];
    poolIdx.current++;
    const id = counterRef.current++;
    const r = Math.random();
    const depth = r < 0.25 ? 0 : r < 0.5 ? 1 : r < 0.8 ? 2 : 3;
    const lane = Math.floor(Math.random() * LANES);
    const delay = Math.random() * 0.7;
    const avatarIdx = id % AVATAR_PHOTOS.length;
    const size =
      depth === 0 ? 12 + Math.random() * 5 :
      depth === 1 ? 24 + Math.random() * 8 :
      depth === 2 ? 44 + Math.random() * 12 :
                    68 + Math.random() * 18;
    setDrops(prev => {
      const next = [...prev, { ...person, id, lane, depth, delay, avatarIdx, size }];
      if (next.length > MAX_DROPS) return next.slice(next.length - MAX_DROPS);
      return next;
    });
  }, []);

  const removeDrop = useCallback((id: number) => {
    setDrops(prev => prev.filter(d => d.id !== id));
  }, []);

  useEffect(() => {
    spawnDrop();
    const t = setTimeout(() => spawnDrop(), 800);
    intervalRef.current = setInterval(() => {
      if (!frozenRef.current) spawnDrop();
    }, SPAWN_INTERVAL);
    return () => {
      clearTimeout(t);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [spawnDrop]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {drops.map(drop => (
        <GlobalRainBubble
          key={drop.id}
          drop={drop}
          onDone={() => removeDrop(drop.id)}
          frozen={frozen}
        />
      ))}
    </div>
  );
}

function GlobalRainBubble({
  drop,
  onDone,
  frozen,
}: {
  drop: RainDrop;
  onDone: () => void;
  frozen: boolean;
}) {
  useEffect(() => {
    if (frozen) return;
    const dur =
      drop.depth === 0 ? 11000 :
      drop.depth === 1 ? 8500 :
      drop.depth === 2 ? 6000 : 4000;
    const t = setTimeout(onDone, dur + drop.delay * 1000 + 500);
    return () => clearTimeout(t);
  }, [drop, onDone, frozen]);

  const laneOffset = 3 + (drop.lane / LANES) * 84;
  const avatarSrc = AVATAR_PHOTOS[drop.avatarIdx];

  const style: React.CSSProperties = {
    '--gr-left': `${laneOffset}%`,
    '--gr-delay': `${drop.delay}s`,
    '--gr-dur':
      drop.depth === 0 ? '11s' :
      drop.depth === 1 ? '8.5s' :
      drop.depth === 2 ? '6s' : '4s',
    '--gr-size': `${drop.size}px`,
    '--gr-opacity':
      drop.depth === 0 ? '0.07' :
      drop.depth === 1 ? '0.16' :
      drop.depth === 2 ? '0.4' : '0.62',
    '--gr-blur':
      drop.depth === 0 ? '3.5px' :
      drop.depth === 1 ? '1.6px' : '0px',
  } as React.CSSProperties;

  const isClose = drop.depth >= 2;
  const isMidDepth = drop.depth === 1;

  return (
    <div className={`global-rain-drop global-rain-drop--d${drop.depth}`} style={style}>
      <img
        src={avatarSrc}
        alt={drop.name}
        className="global-rain-avatar"
        style={{ width: 'var(--gr-size)', height: 'var(--gr-size)' }}
        loading="lazy"
      />
      {(isClose || isMidDepth) && (
        <div className="global-rain-label">
          <strong>{drop.name}</strong>
          <span>{drop.caption}</span>
        </div>
      )}
    </div>
  );
}
