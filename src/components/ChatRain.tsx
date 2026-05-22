import { useState, useEffect, useRef, useCallback } from 'react';

interface Drop {
  id: number;
  lane: number;
  depth: number;
  delay: number;
  avatarIdx: number;
  size: number;
}

const AVATAR_PHOTOS = [
  'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/2128807/pexels-photo-2128807.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/1040881/pexels-photo-1040881.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/1542085/pexels-photo-1542085.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/712513/pexels-photo-712513.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/3771089/pexels-photo-3771089.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/1212984/pexels-photo-1212984.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/3778603/pexels-photo-3778603.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/3785079/pexels-photo-3785079.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/2726111/pexels-photo-2726111.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/1462637/pexels-photo-1462637.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
];

const LANES = 7;
const MAX_DROPS = 7;

export default function ChatRain() {
  const [drops, setDrops] = useState<Drop[]>([]);
  const counterRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const spawnDrop = useCallback(() => {
    const id = counterRef.current++;
    const r = Math.random();
    const depth = r < 0.3 ? 0 : r < 0.6 ? 1 : r < 0.85 ? 2 : 3;
    const lane = Math.floor(Math.random() * LANES);
    const delay = Math.random() * 0.8;
    const avatarIdx = id % AVATAR_PHOTOS.length;
    const sizeVariation = depth === 0 ? 14 + Math.random() * 4
      : depth === 1 ? 22 + Math.random() * 6
      : depth === 2 ? 32 + Math.random() * 8
      : 46 + Math.random() * 12;

    setDrops(prev => {
      const next = [...prev, { id, lane, depth, delay, avatarIdx, size: sizeVariation }];
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
    intervalRef.current = setInterval(spawnDrop, 2200);
    return () => {
      clearTimeout(t);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [spawnDrop]);

  return (
    <div className="chat-rain" aria-hidden>
      {drops.map(drop => (
        <ChatRainBubble key={drop.id} drop={drop} onDone={() => removeDrop(drop.id)} />
      ))}
    </div>
  );
}

function ChatRainBubble({ drop, onDone }: { drop: Drop; onDone: () => void }) {
  useEffect(() => {
    const dur = drop.depth === 0 ? 9000 : drop.depth === 1 ? 7000 : drop.depth === 2 ? 5500 : 4200;
    const t = setTimeout(onDone, dur + drop.delay * 1000 + 500);
    return () => clearTimeout(t);
  }, [drop, onDone]);

  const laneOffset = 5 + (drop.lane / LANES) * 80;
  const avatarSrc = AVATAR_PHOTOS[drop.avatarIdx];

  const style: React.CSSProperties = {
    '--cr-left': `${laneOffset}%`,
    '--cr-delay': `${drop.delay}s`,
    '--cr-dur': drop.depth === 0 ? '9s' : drop.depth === 1 ? '7s' : drop.depth === 2 ? '5.5s' : '4.2s',
    '--cr-size': `${drop.size}px`,
    '--cr-opacity': drop.depth === 0 ? '0.08' : drop.depth === 1 ? '0.14' : drop.depth === 2 ? '0.25' : '0.38',
    '--cr-blur': drop.depth === 0 ? '2.5px' : drop.depth === 1 ? '1.2px' : drop.depth === 2 ? '0.4px' : '0px',
  } as React.CSSProperties;

  return (
    <div className={`chat-rain-bubble chat-rain-bubble--d${drop.depth}`} style={style}>
      <img src={avatarSrc} alt="" loading="lazy" />
    </div>
  );
}
