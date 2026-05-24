import { useState, useEffect, useRef, useCallback } from 'react';
import { AVATAR_PHOTOS, PEOPLE } from '../data/people';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RainDrop {
  id: number;
  name: string;
  caption: string;
  lane: number;
  depth: number;      // 0=far/tiny … 3=close/large
  delay: number;
  avatarIdx: number;
  size: number;
  drift: number;      // horizontal drift px during fall
  dur: number;        // animation duration ms
}

// ─── Config — desktop vs mobile ───────────────────────────────────────────────

const LANES        = 12;
const isMob        = typeof window !== 'undefined' && window.innerWidth < 768;
const MAX_DROPS    = isMob ? 6 : 18;
const SPAWN_MS     = isMob ? 2800 : 1400;

// Duration per depth (ms) — deeper = slower fall
const DEPTH_DUR  = [13500, 9500, 6800, 4600];
// Base size px per depth
const DEPTH_SIZE = [
  () => 11 + Math.random() * 4,
  () => 22 + Math.random() * 8,
  () => 42 + Math.random() * 12,
  () => 62 + Math.random() * 20,
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function GlobalRain({ frozen }: { frozen: boolean }) {
  const [drops, setDrops] = useState<RainDrop[]>([]);
  const counter  = useRef(0);
  const poolIdx  = useRef(0);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;

  const spawnDrop = useCallback(() => {
    if (frozenRef.current) return;

    const person   = PEOPLE[poolIdx.current % PEOPLE.length];
    poolIdx.current++;

    const id       = counter.current++;
    const r        = Math.random();
    const depth    = r < 0.22 ? 0 : r < 0.48 ? 1 : r < 0.78 ? 2 : 3;
    const lane     = Math.floor(Math.random() * LANES);
    const delay    = Math.random() * 0.8;
    const avatarIdx = id % AVATAR_PHOTOS.length;
    const size     = DEPTH_SIZE[depth]();
    const drift    = (Math.random() - 0.5) * 40;   // -20 … +20 px horizontal drift
    const dur      = DEPTH_DUR[depth] * (0.88 + Math.random() * 0.24);

    setDrops(prev => {
      const next = [...prev, { ...person, id, lane, depth, delay, avatarIdx, size, drift, dur }];
      return next.length > MAX_DROPS ? next.slice(next.length - MAX_DROPS) : next;
    });
  }, []);

  const removeDrop = useCallback((id: number) => {
    setDrops(prev => prev.filter(d => d.id !== id));
  }, []);

  useEffect(() => {
    spawnDrop();
    const t0 = setTimeout(() => spawnDrop(), 700);
    const t1 = setTimeout(() => spawnDrop(), 1400);
    interval.current = setInterval(() => {
      if (!frozenRef.current) spawnDrop();
    }, SPAWN_MS);
    return () => {
      clearTimeout(t0); clearTimeout(t1);
      if (interval.current) clearInterval(interval.current);
    };
  }, [spawnDrop]);

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {drops.map(drop => (
        <RainBubble
          key={drop.id}
          drop={drop}
          onDone={() => removeDrop(drop.id)}
          frozen={frozen}
        />
      ))}
    </div>
  );
}

// ─── Individual bubble ────────────────────────────────────────────────────────

function RainBubble({
  drop,
  onDone,
  frozen,
}: {
  drop: RainDrop;
  onDone: () => void;
  frozen: boolean;
}) {
  const [phase, setPhase] = useState<'falling' | 'impact' | 'done'>('falling');
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (frozen) return;
    const impactAt = drop.dur * 0.86;        // radar fires at 86% of fall
    const doneAt   = drop.dur + drop.delay * 1000 + 600;

    const tImpact = setTimeout(() => setPhase('impact'), impactAt + drop.delay * 1000);
    const tDone   = setTimeout(() => { setPhase('done'); doneRef.current(); }, doneAt);
    return () => { clearTimeout(tImpact); clearTimeout(tDone); };
  }, [drop, frozen]);

  const laneOffset = 2 + (drop.lane / LANES) * 92; // 2% … 94% horizontal spread
  const avatarSrc  = AVATAR_PHOTOS[drop.avatarIdx];
  const isVisible  = drop.depth >= 1;
  const isClose    = drop.depth >= 2;

  const style = {
    '--gr-left':    `${laneOffset}%`,
    '--gr-delay':   `${drop.delay}s`,
    '--gr-dur':     `${drop.dur}ms`,
    '--gr-size':    `${drop.size}px`,
    '--gr-opacity': drop.depth === 0 ? '0.06'
                  : drop.depth === 1 ? '0.15'
                  : drop.depth === 2 ? '0.38' : '0.60',
    '--gr-blur':    drop.depth === 0 ? '3px'
                  : drop.depth === 1 ? '1.5px' : '0px',
    '--gr-drift':   `${drop.drift}px`,
  } as React.CSSProperties;

  if (phase === 'done') return null;

  return (
    <div className={`gr-drop gr-drop--d${drop.depth}`} style={style}>
      {/* Avatar */}
      <div className={`gr-avatar-wrap ${isClose ? 'gr-avatar-wrap--ring' : ''}`}>
        <img
          src={avatarSrc}
          alt={drop.name}
          className="gr-avatar"
          style={{ width: 'var(--gr-size)', height: 'var(--gr-size)' }}
          loading="lazy"
        />
      </div>

      {/* Label — only for depth 1+ */}
      {isVisible && (
        <div className="gr-label">
          <strong>{drop.name}</strong>
          {isClose && <span>{drop.caption}</span>}
        </div>
      )}

      {/* T12 — Radar ripple on impact */}
      {phase === 'impact' && isClose && (
        <>
          <div className="gr-ripple gr-ripple--1" />
          <div className="gr-ripple gr-ripple--2" />
          <div className="gr-ripple gr-ripple--3" />
        </>
      )}
    </div>
  );
}
