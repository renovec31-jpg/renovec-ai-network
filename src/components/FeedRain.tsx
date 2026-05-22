import { useState, useEffect, useRef, useCallback } from 'react';
import type { ProfileListing } from '../lib/supabase';

type ListingWithProfile = ProfileListing & {
  _profile?: { title: string; avatar_url?: string | null; city?: string; profile_type?: string };
};

interface RainDrop {
  id: number;
  title: string;
  author: string;
  city: string;
  type: string;
  pricing?: string;
  lane: number;
  depth: number;
  delay: number;
  avatarIdx: number;
  avatarUrl?: string | null;
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
];

const TYPE_LABELS: Record<string, string> = {
  service: 'Offre',
  object_new: 'Neuf',
  object_used: 'Occasion',
  demand: 'Recherche',
  resource: 'Ressource',
};

const LANES = 5;
const MAX_DROPS = 8;

export default function FeedRain({ listings, loading }: { listings: ListingWithProfile[]; loading: boolean }) {
  const [drops, setDrops] = useState<RainDrop[]>([]);
  const counterRef = useRef(0);
  const poolIdx = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listingsRef = useRef(listings);
  listingsRef.current = listings;

  const spawnDrop = useCallback(() => {
    const pool = listingsRef.current;
    if (!pool.length) return;
    const item = pool[poolIdx.current % pool.length];
    poolIdx.current++;
    const id = counterRef.current++;
    const depth = Math.random() < 0.2 ? 0 : Math.random() < 0.48 ? 1 : 2;
    const lane = Math.floor(Math.random() * LANES);
    const delay = Math.random() * 0.5;
    const avatarIdx = id % AVATAR_PHOTOS.length;

    const drop: RainDrop = {
      id,
      title: item.title,
      author: item._profile?.title ?? 'Membre',
      city: item._profile?.city ?? '',
      type: TYPE_LABELS[item.listing_type] ?? 'Offre',
      pricing: item.price_hint ?? undefined,
      lane,
      depth,
      delay,
      avatarIdx,
      avatarUrl: item._profile?.avatar_url,
    };

    setDrops(prev => {
      const next = [...prev, drop];
      if (next.length > MAX_DROPS) return next.slice(next.length - MAX_DROPS);
      return next;
    });
  }, []);

  const removeDrop = useCallback((id: number) => {
    setDrops(prev => prev.filter(d => d.id !== id));
  }, []);

  useEffect(() => {
    if (loading || !listings.length) return;
    spawnDrop();
    const t = setTimeout(() => spawnDrop(), 600);
    intervalRef.current = setInterval(() => spawnDrop(), 1200 + Math.random() * 500);
    return () => {
      clearTimeout(t);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loading, listings.length > 0, spawnDrop]);

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <div className="w-6 h-6 border border-white/15 border-t-white/50 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="feed-rain-stage feed-rain-stage--page">
      {drops.map(drop => (
        <BubbleDrop key={drop.id} drop={drop} onDone={() => removeDrop(drop.id)} />
      ))}
    </div>
  );
}

function BubbleDrop({ drop, onDone }: { drop: RainDrop; onDone: () => void }) {
  useEffect(() => {
    const dur = drop.depth === 0 ? 5600 : drop.depth === 1 ? 4400 : 3800;
    const t = setTimeout(onDone, dur + drop.delay * 1000 + 300);
    return () => clearTimeout(t);
  }, [drop, onDone]);

  const depthClass = `feed-rain-drop--d${drop.depth}`;
  const laneOffset = 4 + (drop.lane / LANES) * 78;
  const avatarSrc = drop.avatarUrl || AVATAR_PHOTOS[drop.avatarIdx];

  const style: React.CSSProperties = {
    '--rain-left': `${laneOffset}%`,
    '--rain-delay': `${drop.delay}s`,
    '--rain-dur': drop.depth === 0 ? '5.6s' : drop.depth === 1 ? '4.4s' : '3.8s',
  } as React.CSSProperties;

  const isClose = drop.depth === 2;
  const isMid = drop.depth === 1;

  return (
    <div className={`feed-rain-drop ${depthClass}`} style={style}>
      <img className="feed-rain-avatar" src={avatarSrc} alt="" loading="lazy" />
      <div className="feed-rain-body">
        <strong>{drop.author}</strong>
        {(isClose || isMid) && <span className="feed-rain-title">{drop.title}</span>}
        {isClose && drop.city && (
          <span className="feed-rain-meta">
            {drop.city} · {drop.type}{drop.pricing ? ` · ${drop.pricing}` : ''}
          </span>
        )}
      </div>
    </div>
  );
}
