import { useEffect, useRef, useState } from 'react';
import { AVATAR_PHOTOS, PEOPLE } from '../data/people';

type Bubble = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  stopY: number;
  bounces: number;
  maxBounces: number;
  impacted: boolean;
  exiting: boolean;
  opacity: number;
  avatar: string;
  name: string;
  caption: string;
};

type Ripple = {
  id: number;
  x: number;
  y: number;
  r: number;
  maxR: number;
  opacity: number;
  lineWidth: number;
  color: string;
};

type Splash = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
};

const MIN_SIZE = 48;
const MAX_SIZE = 120;
const GRAVITY = 0.26;
const BOUNCE_DAMPING = 0.55;
const FLOOR_PADDING = 28;
const MAX_BUBBLES = typeof window !== 'undefined' && window.innerWidth < 768 ? 14 : 28;
const SPAWN_MS = 480;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function mapStopY(size: number, vh: number) {
  const t = (size - MIN_SIZE) / (MAX_SIZE - MIN_SIZE);
  return lerp(vh * 0.55, vh - FLOOR_PADDING - size, Math.max(0, Math.min(1, t)));
}

let UID = 1;

export default function ChatRain() {
  const [, force] = useState(0);
  const bubblesRef = useRef<Bubble[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const splashesRef = useRef<Splash[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastSpawnRef = useRef<number>(0);
  const poolIdxRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const spawn = () => {
      if (bubblesRef.current.length >= MAX_BUBBLES) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const size = lerp(MIN_SIZE, MAX_SIZE, Math.random());
      const person: any = PEOPLE[poolIdxRef.current % PEOPLE.length];
      poolIdxRef.current++;
      const avatar = AVATAR_PHOTOS[poolIdxRef.current % AVATAR_PHOTOS.length];
      bubblesRef.current.push({
        id: UID++,
        x: Math.random() * (vw - size),
        y: -size - Math.random() * vh * 0.25,
        vx: (Math.random() - 0.5) * 0.4,
        vy: 0,
        size,
        stopY: mapStopY(size, vh),
        bounces: 0,
        maxBounces: 3,
        impacted: false,
        exiting: false,
        opacity: lerp(0.78, 1, (size - MIN_SIZE) / (MAX_SIZE - MIN_SIZE)),
        avatar,
        name: person?.name || 'RENOVEC',
        caption: person?.caption || person?.skill || '',
      });
    };

    const emitImpact = (x: number, y: number, size: number) => {
      const base = Math.max(36, size * 0.85);
      ripplesRef.current.push({
        id: UID++, x, y, r: size * 0.45, maxR: base * 1.9,
        opacity: 0.55, lineWidth: Math.max(1.5, size * 0.045),
        color: 'rgba(255,255,255,1)',
      });
      ripplesRef.current.push({
        id: UID++, x, y, r: size * 0.4, maxR: base * 2.5,
        opacity: 0.32, lineWidth: Math.max(1, size * 0.03),
        color: 'rgba(255,140,40,1)',
      });
      const n = Math.round(lerp(5, 11, (size - MIN_SIZE) / (MAX_SIZE - MIN_SIZE)));
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
        const sp = lerp(2, 5.5, Math.random()) * (size / MAX_SIZE);
        splashesRef.current.push({
          id: UID++, x, y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: 0, maxLife: 38 + Math.random() * 22,
        });
      }
    };

    const step = (t: number) => {
      if (t - lastSpawnRef.current > SPAWN_MS) {
        spawn();
        lastSpawnRef.current = t;
      }
      const vw = window.innerWidth;
      const bubbles = bubblesRef.current;
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        if (b.exiting) {
          b.x += 2.4;
          b.opacity -= 0.018;
          if (b.opacity <= 0 || b.x > vw + 200) bubbles.splice(i, 1);
          continue;
        }
        b.vy += GRAVITY;
        b.x += b.vx;
        b.y += b.vy;
        if (b.y >= b.stopY) {
          b.y = b.stopY;
          if (!b.impacted) {
            b.impacted = true;
            emitImpact(b.x + b.size / 2, b.y + b.size, b.size);
          } else {
            emitImpact(b.x + b.size / 2, b.y + b.size, b.size * 0.65);
          }
          if (b.bounces < b.maxBounces && Math.abs(b.vy) > 1) {
            b.vy = -Math.abs(b.vy) * BOUNCE_DAMPING;
            b.vx *= 0.9;
            b.bounces++;
          } else {
            b.exiting = true;
          }
        }
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const ripples = ripplesRef.current;
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.r += (r.maxR - r.r) * 0.08;
        r.opacity -= 0.018;
        if (r.opacity <= 0) { ripples.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.strokeStyle = r.color.replace('1)', r.opacity.toFixed(3) + ')');
        ctx.lineWidth = r.lineWidth;
        ctx.stroke();
      }
      const splashes = splashesRef.current;
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.vy += 0.18;
        s.x += s.vx;
        s.y += s.vy;
        s.life++;
        if (s.life >= s.maxLife) { splashes.splice(i, 1); continue; }
        const a = 1 - s.life / s.maxLife;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 2.2, s.y - s.vy * 2.2);
        ctx.strokeStyle = 'rgba(255,122,24,' + (0.85 * a).toFixed(3) + ')';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      force((v) => (v + 1) % 1000000);
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 30,
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      {bubblesRef.current.map((b) => (
        <div
          key={b.id}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transform: 'translate3d(' + b.x + 'px,' + b.y + 'px,0)',
            opacity: b.opacity,
            willChange: 'transform, opacity',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <div
            style={{
              width: b.size,
              height: b.size,
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25), 0 0 0 2px rgba(255,255,255,0.6)',
              background: '#0b1220',
            }}
          >
            <img
              src={b.avatar}
              alt={b.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              loading="lazy"
            />
          </div>
          {b.size > 64 && (
            <div
              style={{
                background: 'rgba(0,0,0,0.65)',
                borderRadius: 8,
                padding: '2px 8px',
                maxWidth: b.size + 24,
                textAlign: 'center',
                backdropFilter: 'blur(6px)',
              }}
            >
              <div style={{ color: '#fff', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {b.name}
              </div>
              {b.caption && (
                <div style={{ color: 'rgba(255,180,80,0.9)', fontSize: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {b.caption}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
