import { useState, useEffect, useRef, useCallback } from 'react';
import { MOCK_FEED, FEED_PANEL_ITEMS } from '../../../data/mockOccitanie';

interface RainDrop {
  id: number;
  title: string;
  author: string;
  city: string;
  type: string;
  color: string;
  pricing?: string;
  lane: number;
  depth: number;
  delay: number;
  avatarIdx: number;
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
];

const ALL_ITEMS = [
  ...MOCK_FEED.map(f => ({
    title: f.title,
    author: f.author,
    city: f.city,
    type: f.type === 'service' ? 'Offre' : f.type === 'demand' ? 'Demande' : 'Objet',
    color: f.color,
    pricing: '',
  })),
  ...FEED_PANEL_ITEMS.filter(fp => fp.items.length > 0).flatMap(fp =>
    fp.items.map(item => ({
      title: item.label,
      author: fp.author,
      city: fp.city,
      type: item.pricing ? 'Offre' : 'Demande',
      color: ['#F26522', '#2ECC71', '#3498DB', '#E91E8C', '#F39C12', '#1ABC9C'][Math.floor(Math.random() * 6)],
      pricing: item.pricing,
    }))
  ),
];

const LANES = 4;
const MAX_DROPS = 7;

export default function FeedExploreView() {
  const [drops, setDrops] = useState<RainDrop[]>([]);
  const counterRef = useRef(0);
  const poolIdx = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const spawnDrop = useCallback(() => {
    const item = ALL_ITEMS[poolIdx.current % ALL_ITEMS.length];
    poolIdx.current++;
    const id = counterRef.current++;
    const depth = Math.random() < 0.22 ? 0 : Math.random() < 0.5 ? 1 : 2;
    const lane = Math.floor(Math.random() * LANES);
    const delay = Math.random() * 0.4;
    const avatarIdx = id % AVATAR_PHOTOS.length;

    setDrops(prev => {
      const next = [...prev, { ...item, id, lane, depth, delay, avatarIdx }];
      if (next.length > MAX_DROPS) return next.slice(next.length - MAX_DROPS);
      return next;
    });
  }, []);

  const removeDrop = useCallback((id: number) => {
    setDrops(prev => prev.filter(d => d.id !== id));
  }, []);

  useEffect(() => {
    spawnDrop();
    const t = setTimeout(() => spawnDrop(), 500);
    intervalRef.current = setInterval(() => {
      spawnDrop();
    }, 1300 + Math.random() * 700);
    return () => {
      clearTimeout(t);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [spawnDrop]);

  return (
    <div className="aib-view feed-rain">
      <span className="feed-rain-label">Flux du reseau</span>
      <div className="feed-rain-stage">
        {drops.map(drop => (
          <RainBubble key={drop.id} drop={drop} onDone={() => removeDrop(drop.id)} />
        ))}
      </div>
    </div>
  );
}

function RainBubble({ drop, onDone }: { drop: RainDrop; onDone: () => void }) {
  useEffect(() => {
    const dur = drop.depth === 0 ? 5200 : drop.depth === 1 ? 4200 : 3600;
    const t = setTimeout(onDone, dur + drop.delay * 1000 + 200);
    return () => clearTimeout(t);
  }, [drop, onDone]);

  const depthClass = `feed-rain-drop--d${drop.depth}`;
  const laneOffset = 6 + (drop.lane / LANES) * 74;

  const style: React.CSSProperties = {
    '--rain-left': `${laneOffset}%`,
    '--rain-delay': `${drop.delay}s`,
    '--rain-dur': drop.depth === 0 ? '5.2s' : drop.depth === 1 ? '4.2s' : '3.6s',
  } as React.CSSProperties;

  const isClose = drop.depth === 2;
  const isMid = drop.depth === 1;
  const avatarSrc = AVATAR_PHOTOS[drop.avatarIdx];

  return (
    <div className={`feed-rain-drop ${depthClass}`} style={style}>
      <img
        className="feed-rain-avatar"
        src={avatarSrc}
        alt=""
        loading="lazy"
      />
      <div className="feed-rain-body">
        <strong>{drop.author}</strong>
        {(isClose || isMid) && <span className="feed-rain-title">{drop.title}</span>}
        {isClose && (
          <span className="feed-rain-meta">
            {drop.city} · {drop.type}{drop.pricing ? ` · ${drop.pricing}` : ''}
          </span>
        )}
      </div>
    </div>
  );
}
