import { useState, useEffect, useRef, useCallback } from 'react';

interface RainDrop {
  id: number;
  name: string;
  caption: string;
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
  'https://images.pexels.com/photos/3771089/pexels-photo-3771089.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/1212984/pexels-photo-1212984.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/3778603/pexels-photo-3778603.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/3785079/pexels-photo-3785079.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/2726111/pexels-photo-2726111.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/1462637/pexels-photo-1462637.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
  'https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face',
];

const PEOPLE = [
  { name: 'Thomas L.', caption: 'Comptabilite · Toulouse' },
  { name: 'Camille R.', caption: 'Informatique · Albi' },
  { name: 'Leo D.', caption: 'Bricolage · Montauban' },
  { name: 'Marine P.', caption: 'Musique · Castres' },
  { name: 'Arnaud C.', caption: 'Redaction CV · Toulouse' },
  { name: 'Sophie M.', caption: 'Ecoute · Muret' },
  { name: 'Karim B.', caption: 'Formation · Blagnac' },
  { name: 'Nathalie F.', caption: 'Parentalite · Colomiers' },
  { name: 'Florian V.', caption: 'Velo · Tournefeuille' },
  { name: 'Emilie G.', caption: 'Yoga · Ramonville' },
  { name: 'Baptiste T.', caption: 'Dev web · Toulouse' },
  { name: 'Lola J.', caption: 'Couture · Balma' },
  { name: 'Claire M.', caption: 'Piano · Toulouse' },
  { name: 'Youssef B.', caption: 'Aide demenagement · Blagnac' },
  { name: 'Hugo R.', caption: 'Plomberie · Aucamville' },
  { name: 'Ines K.', caption: 'Traduction arabe · Toulouse' },
  { name: 'Pierre A.', caption: 'Jardinage · Colomiers' },
  { name: 'Manon D.', caption: 'Design · Toulouse' },
  { name: 'Omar S.', caption: 'Electricite · Blagnac' },
  { name: 'Julie H.', caption: 'Soutien scolaire · Ramonville' },
  { name: 'Maxime L.', caption: 'Photo · Toulouse' },
  { name: 'Aisha T.', caption: 'Cuisine · Muret' },
  { name: 'Lucas F.', caption: 'Droit · Toulouse' },
  { name: 'Sarah N.', caption: 'Sophrologie · Balma' },
];

const LANES = 6;
const MAX_DROPS = 10;

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
    const depth = Math.random() < 0.2 ? 0 : Math.random() < 0.5 ? 1 : 2;
    const lane = Math.floor(Math.random() * LANES);
    const delay = Math.random() * 0.6;
    const avatarIdx = id % AVATAR_PHOTOS.length;

    setDrops(prev => {
      const next = [...prev, { ...person, id, lane, depth, delay, avatarIdx }];
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
    }, 1600);
    return () => {
      clearTimeout(t);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [spawnDrop]);

  return (
    <div
      className={`global-rain ${frozen ? 'global-rain--frozen' : ''}`}
      aria-hidden
    >
      {drops.map(drop => (
        <GlobalRainBubble key={drop.id} drop={drop} onDone={() => removeDrop(drop.id)} frozen={frozen} />
      ))}
    </div>
  );
}

function GlobalRainBubble({ drop, onDone, frozen }: { drop: RainDrop; onDone: () => void; frozen: boolean }) {
  useEffect(() => {
    if (frozen) return;
    const dur = drop.depth === 0 ? 7000 : drop.depth === 1 ? 5500 : 4500;
    const t = setTimeout(onDone, dur + drop.delay * 1000 + 400);
    return () => clearTimeout(t);
  }, [drop, onDone, frozen]);

  const depthClass = `global-rain-drop--d${drop.depth}`;
  const laneOffset = 3 + (drop.lane / LANES) * 82;
  const avatarSrc = AVATAR_PHOTOS[drop.avatarIdx];

  const style: React.CSSProperties = {
    '--gr-left': `${laneOffset}%`,
    '--gr-delay': `${drop.delay}s`,
    '--gr-dur': drop.depth === 0 ? '7s' : drop.depth === 1 ? '5.5s' : '4.5s',
  } as React.CSSProperties;

  const isClose = drop.depth === 2;
  const isMid = drop.depth === 1;

  return (
    <div className={`global-rain-drop ${depthClass}`} style={style}>
      <img className="global-rain-avatar" src={avatarSrc} alt="" loading="lazy" />
      <div className="global-rain-body">
        <strong>{drop.name}</strong>
        {(isClose || isMid) && <span className="global-rain-caption">{drop.caption}</span>}
      </div>
    </div>
  );
}
