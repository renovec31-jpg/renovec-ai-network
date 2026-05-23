import { useEffect, useRef, useState } from 'react';

const MESSAGES: { text: string; importance: number }[] = [
  { text: 'Le premier reseau qui comprend avant d\'agir', importance: 3 },
  { text: 'IA conversationnelle au service de l\'humain', importance: 3 },
  { text: 'Pas de like, pas de scroll infini, juste de l\'entraide', importance: 2 },
  { text: 'Matching intelligent entre offres et besoins', importance: 3 },
  { text: 'Chaque competence compte, chaque besoin est entendu', importance: 2 },
  { text: 'Zero algorithme de retention, 100% utilite', importance: 2 },
  { text: 'Parlez naturellement, Ali comprend votre situation', importance: 3 },
  { text: 'Un reseau local, humain et orchestree par IA', importance: 3 },
  { text: 'Plomberie, demenagement, cours, admin... tout le quotidien', importance: 1 },
  { text: 'Vos donnees restent les votres, toujours', importance: 2 },
  { text: 'Connexions reelles entre voisins, pas des followers', importance: 2 },
  { text: 'Infrastructure ethique, transparente, open', importance: 1 },
  { text: 'Disponible 24h/24 via Ali, votre coordinateur IA', importance: 2 },
  { text: 'Toulouse, Blagnac, Colomiers, Muret et toute l\'Occitanie', importance: 1 },
  { text: 'RENOVEC reinvente le lien social de proximite', importance: 3 },
  { text: 'Gratuit, sans pub, sans revente de donnees', importance: 2 },
  { text: 'Une situation ? Exprimez-la. Le reseau fait le reste.', importance: 3 },
  { text: 'Chaque interaction renforce le tissu local', importance: 1 },
];

type MsgBubble = {
  id: number;
  text: string;
  importance: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  scale: number;
  targetScale: number;
  opacity: number;
  phase: 'growing' | 'visible' | 'exploding' | 'done';
  born: number;
  angle: number;
  particles: Particle[];
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
};

const MAX_MSG = 5;
const SPAWN_MS = 3200;
const GROW_SPEED = 0.04;
const VISIBLE_DURATION = 3500;
const RADAR_COLOR = '#F26522';

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

let UID = 1;

export default function MessageBubbles() {
  const [, force] = useState(0);
  const msgsRef = useRef<MsgBubble[]>([]);
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

    const spawn = (t: number) => {
      if (msgsRef.current.filter(m => m.phase !== 'done').length >= MAX_MSG) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const msg = MESSAGES[poolIdxRef.current % MESSAGES.length];
      poolIdxRef.current++;
      const targetX = 0.15 * vw + Math.random() * 0.7 * vw;
      const targetY = 0.12 * vh + Math.random() * 0.6 * vh;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.max(vw, vh) * 0.8;
      const startX = targetX + Math.cos(angle) * dist;
      const startY = targetY + Math.sin(angle) * dist;
      const targetScale = msg.importance === 3 ? 1.3 : msg.importance === 2 ? 1.0 : 0.75;
      msgsRef.current.push({
        id: UID++,
        text: msg.text,
        importance: msg.importance,
        x: startX,
        y: startY,
        targetX,
        targetY,
        scale: 0.08,
        targetScale,
        opacity: 0,
        phase: 'growing',
        born: t,
        angle,
        particles: [],
      });
    };

    const explode = (m: MsgBubble) => {
      m.phase = 'exploding';
      const count = 12 + m.importance * 4;
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
        const sp = 2 + Math.random() * 4;
        m.particles.push({
          x: m.targetX,
          y: m.targetY,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0,
          maxLife: 30 + Math.random() * 20,
          size: 2 + Math.random() * 3,
        });
      }
    };

    const step = (t: number) => {
      if (t - lastSpawnRef.current > SPAWN_MS) {
        spawn(t);
        lastSpawnRef.current = t;
      }

      const msgs = msgsRef.current;
      for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i];
        if (m.phase === 'growing') {
          m.x = lerp(m.x, m.targetX, 0.045);
          m.y = lerp(m.y, m.targetY, 0.045);
          m.scale = lerp(m.scale, m.targetScale, GROW_SPEED);
          m.opacity = Math.min(1, m.opacity + 0.03);
          if (m.scale > m.targetScale * 0.95 && Math.abs(m.x - m.targetX) < 5) {
            m.phase = 'visible';
            m.born = t;
            m.x = m.targetX;
            m.y = m.targetY;
            m.scale = m.targetScale;
          }
        } else if (m.phase === 'visible') {
          if (t - m.born > VISIBLE_DURATION) {
            explode(m);
          }
        } else if (m.phase === 'exploding') {
          m.opacity -= 0.06;
          let allDead = true;
          for (const p of m.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.08;
            p.vx *= 0.98;
            p.life++;
            if (p.life < p.maxLife) allDead = false;
          }
          if (allDead && m.opacity <= 0) {
            m.phase = 'done';
          }
        } else {
          msgs.splice(i, 1);
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const m of msgs) {
        if (m.phase === 'exploding' || m.phase === 'done') {
          for (const p of m.particles) {
            if (p.life >= p.maxLife) continue;
            const a = 1 - p.life / p.maxLife;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = RADAR_COLOR;
            ctx.globalAlpha = a * 0.8;
            ctx.fill();
          }
        }
      }
      ctx.globalAlpha = 1;

      force((v) => (v + 1) % 1000000);
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const fontSizeFor = (imp: number) => imp === 3 ? 18 : imp === 2 ? 14 : 11;
  const maxWFor = (imp: number) => imp === 3 ? 340 : imp === 2 ? 260 : 200;

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 28,
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />
      {msgsRef.current.filter(m => m.phase !== 'done').map((m) => (
        <div
          key={m.id}
          style={{
            position: 'absolute',
            left: m.x,
            top: m.y,
            transform: 'translate(-50%, -50%) scale(' + m.scale.toFixed(3) + ')',
            opacity: Math.max(0, m.opacity),
            background: m.importance === 3
              ? 'linear-gradient(135deg, rgba(242,101,34,0.2), rgba(242,101,34,0.08))'
              : 'rgba(255,255,255,0.06)',
            border: m.importance === 3 ? '1.5px solid rgba(242,101,34,0.6)' : '1px solid rgba(255,255,255,0.15)',
            borderRadius: 16,
            padding: m.importance === 3 ? '14px 22px' : '10px 16px',
            maxWidth: maxWFor(m.importance),
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
            boxShadow: m.importance === 3
              ? '0 0 30px rgba(242,101,34,0.25), 0 4px 20px rgba(0,0,0,0.3)'
              : '0 4px 16px rgba(0,0,0,0.25)',
            willChange: 'transform, opacity',
            transition: 'none',
          }}
        >
          <div style={{
            color: m.importance === 3 ? '#F26522' : m.importance === 2 ? '#fff' : 'rgba(255,255,255,0.7)',
            fontSize: fontSizeFor(m.importance),
            fontWeight: m.importance === 3 ? 700 : m.importance === 2 ? 600 : 400,
            lineHeight: 1.35,
            letterSpacing: m.importance === 3 ? '0.02em' : 'normal',
          }}>
            {m.text}
          </div>
        </div>
      ))}
    </div>
  );
}
