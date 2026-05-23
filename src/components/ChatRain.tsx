import { useState, useEffect, useRef, useCallback } from 'react';
import { AVATAR_PHOTOS, PEOPLE } from '../data/people';

interface Drop {
  id: number;
  lane: number;
  depth: number;
  delay: number;
  avatarIdx: number;
  size: number;
  name: string;
  caption: string;
}

const LANES = 7;
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
const MAX_DROPS = isMobile ? 4 : 7;
const SPAWN_INTERVAL = isMobile ? 3000 : 2200;

export default function ChatRain() {
  const [drops, setDrops] = useState<Drop[]>([]);
  const counterRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const poolIdx = useRef(0);

  const spawnDrop = useCallback(() => {
    const id = counterRef.current++;
    const person = PEOPLE[poolIdx.current % PEOPLE.length];
    poolIdx.current++;
    const r = Math.random();
    const depth = r < 0.25 ? 0 : r < 0.5 ? 1 : r < 0.8 ? 2 : 3;
    const lane = Math.floor(Math.random() * LANES);
    const delay = Math.random() * 0.8;
    const avatarIdx = id % AVATAR_PHOTOS.length;
    const sizeVariation =
      depth === 0 ? 10 + Math.random() * 4 :
      depth === 1 ? 20 + Math.random() * 6 :
      depth === 2 ? 38 + Math.random() * 10 :
                    60 + Math.random() * 16;
    setDrops(prev => {
      const next = [...prev, { id, lane, depth, delay, avatarIdx, size: sizeVariation, name: person.name, caption: person.caption }];
      if (next.length > MAX_DROPS) return next.slice(next.length - MAX_DROPS);
      return next;
    });
  }, []);

  const removeDrop = useCallback((id: number) => {
    setDrops(prev => prev.filter(d => d.id !== id));
  }, []);

  useEffect(() => {
    spawnDrop();
    const t = setTimeout(() => spawnDrop(), 1200);
    intervalRef.current = setInterval(spawnDrop, SPAWN_INTERVAL);
    return () => {
      clearTimeout(t);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [spawnDrop]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {drops.map(drop => (
        <ChatRainBubble key={drop.id} drop={drop} onDone={() => removeDrop(drop.id)} />
      ))}
    </div>
  );
}

function ChatRainBubble({ drop, onDone }: { drop: Drop; onDone: () => void }) {
  useEffect(() => {
    const dur =
      drop.depth === 0 ? 12000 :
      drop.depth === 1 ? 9000 :
      drop.depth === 2 ? 6200 : 4000;
    const t = setTimeout(onDone, dur + drop.delay * 1000 + 500);
    return () => clearTimeout(t);
  }, [drop, onDone]);

  const laneOffset = 5 + (drop.lane / LANES) * 80;
  const avatarSrc = AVATAR_PHOTOS[drop.avatarIdx];

  const style: React.CSSProperties = {
    '--cr-left': `${laneOffset}%`,
    '--cr-delay': `${drop.delay}s`,
    '--cr-dur':
      drop.depth === 0 ? '12s' :
      drop.depth === 1 ? '9s' :
      drop.depth === 2 ? '6.2s' : '4s',
    '--cr-size': `${drop.size}px`,
    '--cr-opacity':
      drop.depth === 0 ? '0.1' :
      drop.depth === 1 ? '0.25' :
      drop.depth === 2 ? '0.5' : '0.72',
    '--cr-blur':
      drop.depth === 0 ? '4px' :
      drop.depth === 1 ? '2px' : '0px',
  } as React.CSSProperties;

  const showLabel = drop.depth >= 2;

  return (
    <div className={`chat-rain-drop chat-rain-drop--d${drop.depth}`} style={style}>
      <img
        src={avatarSrc}
        alt={drop.name}
        className="chat-rain-avatar"
        style={{ width: 'var(--cr-size)', height: 'var(--cr-size)' }}
        loading="lazy"
      />
      {showLabel && (
        <div className="chat-rain-label">
          <span className="chat-rain-name">{drop.name}</span>
          <span className="chat-rain-caption">{drop.caption}</span>
        </div>
      )}
    </div>
  );
}
