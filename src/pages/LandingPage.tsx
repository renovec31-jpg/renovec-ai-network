import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Mic, ShoppingBag, Box, Package, Search, Tag, MapPin } from 'lucide-react';
import VoicePresence from '../components/VoicePresence';
import WorkspaceOverlay from '../components/workspace/WorkspaceOverlay';
import TeaserMap from '../components/TeaserMap';
import GuestMatchFlow from '../components/GuestMatchFlow';
import LiveFeedSidebar from '../components/LiveFeedSidebar';
import GlobalRain from '../components/GlobalRain';
import NeuralSignals from '../components/NeuralSignals';
import HorizontalScroll from '../components/HorizontalScroll';
import ChatRain from '../components/ChatRain';
import { avatarBg as teaserAvatarBg } from '../lib/ui';
import { avatarFallback } from '../data/people';
import { supabase } from '../lib/supabase';
import { NETWORK_STATS } from '../data/mockOccitanie';

// RenovecMap removed — TeaserMap is the single map authority (T05)

type Props = {
  onEnter: () => void;
  onHowItWorks: () => void;
  onGoToPresence?: () => void;
  onMentions?: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// FULL-PAGE SPINE — persistent connectome that runs behind all sections
// ─────────────────────────────────────────────────────────────────────────────

interface SpineNode {
  x: number; // 0-1 relative
  y: number; // 0-1 relative
  r: number;
  vx: number;
  vy: number;
  pulse: number;
  cluster: number;
  consolidated: boolean;
}

interface SpineLink {
  a: number;
  b: number;
  weight: number;
  phase: number;
  signalPos: number;
  signalDir: number;
  signalTimer: number;
}

function buildSpine(): { nodes: SpineNode[]; links: SpineLink[] } {
  // Distribute across full page height (y: 0–1 spread wide)
  const raw: [number, number, number][] = [
    // x, y, cluster
    [0.08, 0.04, 0], [0.22, 0.07, 0], [0.55, 0.03, 1], [0.78, 0.06, 2], [0.92, 0.10, 2],
    [0.15, 0.18, 0], [0.42, 0.16, 1], [0.68, 0.19, 2], [0.85, 0.22, 2],
    [0.05, 0.32, 3], [0.30, 0.30, 3], [0.58, 0.33, 1], [0.82, 0.35, 4],
    [0.18, 0.47, 3], [0.45, 0.48, 1], [0.72, 0.50, 4], [0.95, 0.46, 4],
    [0.10, 0.62, 3], [0.35, 0.64, 3], [0.60, 0.65, 5], [0.88, 0.63, 4],
    [0.22, 0.76, 5], [0.50, 0.78, 5], [0.75, 0.80, 5], [0.93, 0.77, 4],
    [0.08, 0.88, 5], [0.38, 0.90, 5], [0.65, 0.93, 5], [0.85, 0.96, 5],
  ];

  const nodes: SpineNode[] = raw.map(([x, y, c]) => ({
    x, y,
    r: 2.5 + Math.random() * 3.5,
    vx: (Math.random() - 0.5) * 0.00012,
    vy: (Math.random() - 0.5) * 0.00008,
    pulse: Math.random() * Math.PI * 2,
    cluster: c,
    consolidated: Math.random() > 0.62,
  }));

  const links: SpineLink[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const near = nodes
      .map((n, j) => {
        const dx = (n.x - nodes[i].x);
        const dy = (n.y - nodes[i].y) * 0.6;
        return { j, dist: Math.sqrt(dx * dx + dy * dy) };
      })
      .filter(({ j, dist }) => j !== i && dist < 0.22)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);

    for (const { j } of near) {
      if (!links.find(l => (l.a === i && l.b === j) || (l.a === j && l.b === i))) {
        links.push({
          a: i, b: j,
          weight: 0.1 + Math.random() * 0.9,
          phase: Math.random() * Math.PI * 2,
          signalPos: 0, signalDir: 1,
          signalTimer: Math.floor(60 + Math.random() * 180),
        });
      }
    }
  }
  return { nodes, links };
}

function PageSpine() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const isMobile = window.innerWidth < 768;
    const frameInterval = isMobile ? 1000 / 30 : 0;
    let lastFrameTime = 0;
    let paused = false;

    const onVisibility = () => { paused = document.hidden; };
    document.addEventListener('visibilitychange', onVisibility);

    let W = 0, H = 0;
    const setSize = () => {
      const rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setSize();

    const full = buildSpine();
    const nodes = isMobile ? full.nodes.filter((_, i) => i % 2 === 0) : full.nodes;
    const nodeSet = new Set(nodes.map((_, i) => (isMobile ? i * 2 : i)));
    const links = isMobile
      ? full.links.filter(l => nodeSet.has(l.a) && nodeSet.has(l.b)).map(l => isMobile ? { ...l, a: l.a / 2, b: l.b / 2 } : l)
      : full.links;
    let frame = 0;

    const draw = (now: number) => {
      if (paused) { rafRef.current = requestAnimationFrame(draw); return; }
      if (frameInterval && now - lastFrameTime < frameInterval) { rafRef.current = requestAnimationFrame(draw); return; }
      lastFrameTime = now;
      frame++;
      ctx.clearRect(0, 0, W, H);

      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0.01 || n.x > 0.99) n.vx *= -1;
        if (n.y < 0.005 || n.y > 0.995) n.vy *= -1;
        n.pulse += 0.012;
      });

      links.forEach(l => {
        l.phase += 0.005;
        l.signalTimer--;
        if (l.signalTimer <= 0 && l.weight > 0.5) {
          l.signalPos = 0;
          l.signalDir = 1;
          l.signalTimer = 140 + Math.floor(Math.random() * 200);
        }
        if (l.signalTimer > 0 && l.signalPos < 1 && l.signalPos > 0) {
          l.signalPos += 0.014 * l.signalDir;
        } else if (l.signalTimer > 100) {
          // travelling
          l.signalPos += 0.014;
          if (l.signalPos >= 1) l.signalPos = 1;
        }
      });

      links.forEach(l => {
        const na = nodes[l.a], nb = nodes[l.b];
        const ax = na.x * W, ay = na.y * H;
        const bx = nb.x * W, by = nb.y * H;
        const isC = l.weight > 0.68;
        const isA = l.weight > 0.38;

        if (!isA) {
          ctx.save();
          ctx.setLineDash([2, 9]);
          ctx.strokeStyle = `rgba(180,152,115,0.045)`;
          ctx.lineWidth = 0.4;
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
          ctx.setLineDash([]); ctx.restore();
          return;
        }

        const alpha = isC
          ? 0.18 + Math.sin(l.phase) * 0.06
          : 0.08 + Math.sin(l.phase) * 0.025;
        const g = ctx.createLinearGradient(ax, ay, bx, by);
        if (isC) {
          g.addColorStop(0, `rgba(242,101,34,${alpha * 0.5})`);
          g.addColorStop(0.5, `rgba(255,170,70,${alpha})`);
          g.addColorStop(1, `rgba(242,101,34,${alpha * 0.5})`);
        } else {
          g.addColorStop(0, `rgba(200,168,128,${alpha})`);
          g.addColorStop(1, `rgba(180,148,108,${alpha})`);
        }
        ctx.strokeStyle = g;
        ctx.lineWidth = isC ? 0.8 : 0.5;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();

        // signal particle on consolidated links
        if (isC && l.signalPos > 0 && l.signalPos < 1) {
          const sx = ax + (bx - ax) * l.signalPos;
          const sy = ay + (by - ay) * l.signalPos;
          ctx.beginPath();
          ctx.arc(sx, sy, 1.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,210,120,0.7)`;
          ctx.fill();
        }
      });

      nodes.forEach(n => {
        const nx = n.x * W, ny = n.y * H;
        const b = 1 + Math.sin(n.pulse) * 0.08;
        const r = n.r * b;
        if (n.consolidated) {
          const halo = ctx.createRadialGradient(nx, ny, r * 0.5, nx, ny, r * 3.5);
          halo.addColorStop(0, 'rgba(242,101,34,0.055)');
          halo.addColorStop(1, 'rgba(242,101,34,0)');
          ctx.beginPath(); ctx.arc(nx, ny, r * 3.5, 0, Math.PI * 2);
          ctx.fillStyle = halo; ctx.fill();
        }
        const cg = ctx.createRadialGradient(nx, ny, 0, nx, ny, r);
        if (n.consolidated) {
          cg.addColorStop(0, 'rgba(255,200,150,0.85)');
          cg.addColorStop(0.5, 'rgba(242,101,34,0.65)');
          cg.addColorStop(1, 'rgba(200,70,10,0.2)');
        } else {
          cg.addColorStop(0, 'rgba(210,190,165,0.5)');
          cg.addColorStop(1, 'rgba(170,148,120,0.1)');
        }
        ctx.beginPath(); ctx.arc(nx, ny, r, 0, Math.PI * 2);
        ctx.fillStyle = cg; ctx.fill();
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    const ro = new ResizeObserver(setSize);
    ro.observe(canvas);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0, display: 'block',
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HERO CONNECTOME — denser, higher contrast
// ─────────────────────────────────────────────────────────────────────────────

interface HNode {
  x: number; y: number; vx: number; vy: number;
  r: number; label: string; strength: number; pulse: number;
  cluster: number; activated: boolean; activationTimer: number;
}
interface HLink {
  a: number; b: number; weight: number; phase: number;
  signalPos: number; signalTimer: number;
}

const H_LABELS = ['S','M','A','L','C','T','P','N','R','E','F','J','K','H','O','D','B','V','G','Q'];

function buildHeroGraph(w: number, h: number, count: number) {
  const clusters = [
    { cx: w*0.20, cy: h*0.32 }, { cx: w*0.50, cy: h*0.52 },
    { cx: w*0.78, cy: h*0.25 }, { cx: w*0.72, cy: h*0.70 },
    { cx: w*0.32, cy: h*0.70 },
  ];
  const nodes: HNode[] = Array.from({ length: count }, (_, i) => {
    const c = clusters[i % clusters.length];
    const sp = Math.min(w, h) * 0.115;
    return {
      x: c.cx + (Math.random()-0.5)*sp*2.2,
      y: c.cy + (Math.random()-0.5)*sp*1.6,
      vx: (Math.random()-0.5)*0.1,
      vy: (Math.random()-0.5)*0.08,
      r: 4 + Math.random()*6,
      label: H_LABELS[i % H_LABELS.length],
      strength: 0.2 + Math.random()*0.8,
      pulse: Math.random()*Math.PI*2,
      cluster: i % clusters.length,
      activated: false, activationTimer: 0,
    };
  });
  const links: HLink[] = [];
  nodes.forEach((n, i) => {
    nodes.forEach((m, j) => {
      if (j <= i) return;
      const dx = n.x - m.x, dy = n.y - m.y;
      const d = Math.sqrt(dx*dx+dy*dy);
      const same = n.cluster === m.cluster;
      const thresh = same ? w*0.28 : w*0.18;
      if (d < thresh && Math.random() > (same ? 0.35 : 0.65)) {
        links.push({
          a: i, b: j,
          weight: 0.15 + Math.random()*0.85,
          phase: Math.random()*Math.PI*2,
          signalPos: 0,
          signalTimer: Math.floor(50 + Math.random()*160),
        });
      }
    });
  });
  return { nodes, links };
}

function HeroConnectome({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const isMobile = window.innerWidth < 768;
    const nodeCount = isMobile ? 11 : 22;
    const frameInterval = isMobile ? 1000 / 30 : 0;
    let lastFrameTime = 0;
    let paused = false;

    const onVisibility = () => { paused = document.hidden; };
    document.addEventListener('visibilitychange', onVisibility);

    let W = 0, H = 0;
    const setSize = () => {
      const rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W*dpr; canvas.height = H*dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0);
    };
    setSize();

    let graph = buildHeroGraph(W, H, nodeCount);
    let frame = 0;
    let nextActivation = 90 + Math.random()*100;

    const triggerActivation = () => {
      const idx = Math.floor(Math.random()*graph.nodes.length);
      const n = graph.nodes[idx];
      n.activated = true; n.activationTimer = 110;
      graph.links.forEach(l => {
        if ((l.a===idx||l.b===idx) && l.weight>0.55 && l.signalPos===0) {
          l.signalPos = 0.01;
        }
      });
    };

    const draw = (now: number) => {
      if (paused) { rafRef.current = requestAnimationFrame(draw); return; }
      if (frameInterval && now - lastFrameTime < frameInterval) { rafRef.current = requestAnimationFrame(draw); return; }
      lastFrameTime = now;
      frame++; ctx.clearRect(0,0,W,H);
      nextActivation--;
      if (nextActivation<=0) { triggerActivation(); nextActivation=80+Math.random()*130; }

      graph.nodes.forEach(n => {
        n.x+=n.vx; n.y+=n.vy;
        if (n.x<44||n.x>W-44) n.vx*=-1;
        if (n.y<44||n.y>H-44) n.vy*=-1;
        n.pulse+=0.013;
        if (n.activationTimer>0) n.activationTimer--;
        else n.activated=false;
      });

      graph.links.forEach(l => {
        l.phase+=0.006;
        if (l.signalPos>0 && l.signalPos<1) l.signalPos+=0.016;
        else if (l.signalPos>=1) l.signalPos=0;
        l.signalTimer--;
        if (l.signalTimer<=0 && l.weight>0.55 && Math.random()>0.98) {
          l.signalPos=0.01; l.signalTimer=100+Math.floor(Math.random()*180);
        }
      });

      graph.links.forEach(l => {
        const na=graph.nodes[l.a], nb=graph.nodes[l.b];
        const isC=l.weight>0.70, isA=l.weight>0.38;
        if (!isA) {
          ctx.save(); ctx.setLineDash([2,8]);
          ctx.strokeStyle='rgba(178,150,112,0.07)';
          ctx.lineWidth=0.4;
          ctx.beginPath(); ctx.moveTo(na.x,na.y); ctx.lineTo(nb.x,nb.y); ctx.stroke();
          ctx.setLineDash([]); ctx.restore(); return;
        }
        const alpha = isC ? 0.25+Math.sin(l.phase)*0.08 : 0.11+Math.sin(l.phase)*0.03;
        const g = ctx.createLinearGradient(na.x,na.y,nb.x,nb.y);
        if (isC) {
          g.addColorStop(0,`rgba(242,101,34,${alpha*0.55})`);
          g.addColorStop(0.5,`rgba(255,172,72,${alpha})`);
          g.addColorStop(1,`rgba(242,101,34,${alpha*0.55})`);
        } else {
          g.addColorStop(0,`rgba(205,172,130,${alpha})`);
          g.addColorStop(1,`rgba(185,152,110,${alpha})`);
        }
        ctx.strokeStyle=g; ctx.lineWidth=isC?1.2:0.65;
        ctx.beginPath(); ctx.moveTo(na.x,na.y); ctx.lineTo(nb.x,nb.y); ctx.stroke();

        if (isC && l.signalPos>0 && l.signalPos<1) {
          const sx=na.x+(nb.x-na.x)*l.signalPos;
          const sy=na.y+(nb.y-na.y)*l.signalPos;
          const tp=Math.max(0,l.signalPos-0.09);
          const tx=na.x+(nb.x-na.x)*tp, ty=na.y+(nb.y-na.y)*tp;
          const trail=ctx.createLinearGradient(tx,ty,sx,sy);
          trail.addColorStop(0,'rgba(255,195,80,0)');
          trail.addColorStop(1,'rgba(255,215,130,0.45)');
          ctx.strokeStyle=trail; ctx.lineWidth=1.6;
          ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(sx,sy); ctx.stroke();
          ctx.beginPath(); ctx.arc(sx,sy,2.2,0,Math.PI*2);
          ctx.fillStyle='rgba(255,225,140,0.92)'; ctx.fill();
        }
      });

      graph.nodes.forEach(n => {
        const br=1+Math.sin(n.pulse)*0.07;
        const r=n.r*br;
        const isC=n.strength>0.68;
        if (isC||n.activated) {
          const hr=r*(n.activated?5.5:3.5);
          const ha=n.activated?0.14:0.055;
          const hg=ctx.createRadialGradient(n.x,n.y,r*0.4,n.x,n.y,hr);
          hg.addColorStop(0,`rgba(242,101,34,${ha})`);
          hg.addColorStop(1,'rgba(242,101,34,0)');
          ctx.beginPath(); ctx.arc(n.x,n.y,hr,0,Math.PI*2);
          ctx.fillStyle=hg; ctx.fill();
        }
        if (n.activated) {
          const prog=1-(n.activationTimer/110);
          ctx.beginPath(); ctx.arc(n.x,n.y,r+prog*20,0,Math.PI*2);
          ctx.strokeStyle=`rgba(255,170,70,${(1-prog)*0.35})`;
          ctx.lineWidth=0.8; ctx.stroke();
        }
        const cg=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,r);
        if (isC) {
          cg.addColorStop(0,'rgba(255,215,165,0.96)');
          cg.addColorStop(0.5,'rgba(242,101,34,0.8)');
          cg.addColorStop(1,'rgba(185,60,12,0.3)');
        } else {
          cg.addColorStop(0,'rgba(218,196,170,0.65)');
          cg.addColorStop(1,'rgba(158,136,112,0.15)');
        }
        ctx.beginPath(); ctx.arc(n.x,n.y,r,0,Math.PI*2);
        ctx.fillStyle=cg; ctx.fill();
        if (n.r>5.5) {
          ctx.font=`500 ${Math.round(n.r*0.82)}px Inter,sans-serif`;
          ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillStyle=isC?'rgba(255,255,255,0.92)':'rgba(255,255,255,0.38)';
          ctx.fillText(n.label,n.x,n.y);
        }
      });

      rafRef.current=requestAnimationFrame(draw);
    };
    rafRef.current=requestAnimationFrame(draw);
    const ro=new ResizeObserver(()=>{ setSize(); graph=buildHeroGraph(W,H,nodeCount); });
    ro.observe(canvas);
    return ()=>{ cancelAnimationFrame(rafRef.current); ro.disconnect(); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);

  return <canvas ref={canvasRef} className={className} style={{ display:'block', width:'100%', height:'100%' }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// HUMAN AVATARS
// ─────────────────────────────────────────────────────────────────────────────

// Portrait photos from Pexels — natural, non-corporate, diverse
const AVATARS = {
  // Lucie — jeune femme, lunettes, regard calme
  Lucie: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1',
  // Marc — homme, lumière naturelle, détendu
  Marc:  'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1',
  // Anne — femme, fond neutre
  Anne:  'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1',
  // Marie (profil capital)
  Marie: 'https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1',
  // Nœuds hero — présences supplémentaires
  H1:    'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1',
  H2:    'https://images.pexels.com/photos/2208740/pexels-photo-2208740.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1',
};

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT DEMO v2 — scénario vivant en 6 zones
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_ZONES = [
  { zone: 'A', short: 'Situation' },
  { zone: 'B', short: 'Lecture IA' },
  { zone: 'C', short: 'Profils' },
  { zone: 'D', short: 'Échange' },
  { zone: 'E', short: 'Reconnu' },
  { zone: 'F', short: 'Mémoire' },
];

const DEMO_ZONE_DURATIONS = [3400, 3200, 4400, 3800, 3200, 5200];

const DEMO_MATCH_PROFILES = [
  {
    id: 'M',
    name: 'Marc',
    city: 'Lyon 6e',
    capacite: 'Droit du travail · fiches de paie',
    raison: 'A déjà résolu 4 situations similaires à proximité',
    score: 91,
    src: AVATARS.Marc,
    avail: 'Disponible ce soir',
  },
  {
    id: 'A',
    name: 'Anne',
    city: 'Lyon 7e',
    capacite: 'Accompagnement démarches administratives',
    raison: 'Connaît le contexte CAF et blocages courants',
    score: 74,
    src: AVATARS.Anne,
    avail: 'Disponible cette semaine',
  },
];

function ProductDemo({ onEnter }: { onEnter: () => void }) {
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    const dur = DEMO_ZONE_DURATIONS[step] ?? 3400;
    const id = setTimeout(() => setStep(s => (s + 1) % 6), dur);
    return () => clearTimeout(id);
  }, [auto, step]);

  const go = (i: number) => { setStep(i); setAuto(false); };

  return (
    <div className="lp-demo2">

      {/* ── Step nav ─────────────────────────────────────────────── */}
      <nav className="lp-demo2-nav" aria-label="Étapes de la démo produit">
        {DEMO_ZONES.map((dz, i) => (
          <button
            key={dz.zone}
            className={`lp-demo2-step ${i === step ? 'lp-demo2-step--active' : ''} ${i < step ? 'lp-demo2-step--done' : ''}`}
            onClick={() => go(i)}
            aria-current={i === step ? 'step' : undefined}
          >
            <span className="lp-demo2-step-dot">
              {i < step
                ? <span className="lp-demo2-step-check">✓</span>
                : <span className="lp-demo2-step-z">{dz.zone}</span>}
            </span>
            <span className="lp-demo2-step-label">{dz.short}</span>
          </button>
        ))}
      </nav>

      {/* ── Content panel ────────────────────────────────────────── */}
      <div className="lp-demo2-panel" aria-live="polite">

        {/* Zone A — Situation libre */}
        {step === 0 && (
          <div className="lp-demo2-content" key="a">
            <p className="lp-demo2-zone-label">A — Situation exprimée en langage libre</p>
            <div className="lp-demo2-message-wrap">
              <div className="lp-demo2-user-avatar">
                <img src={AVATARS.Lucie} alt="Lucie" className="lp-demo2-avatar-img" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).src = avatarFallback('L'); }} />
              </div>
              <div className="lp-demo2-message-bubble">
                <span className="lp-demo2-message-name">Lucie · Lyon 3e</span>
                <p className="lp-demo2-message-text">
                  "Je comprends mes documents seule d'habitude, mais là ma fiche de paie du mois dernier ne correspond pas à ce que j'aurais dû toucher et je ne sais plus quoi faire."
                </p>
                <span className="lp-demo2-message-meta">langage libre · aucun formulaire · aucune catégorie imposée</span>
              </div>
            </div>
            <p className="lp-demo2-detail">Aucune traduction en cases ou mots-clés. La situation arrive telle qu'elle est vécue.</p>
          </div>
        )}

        {/* Zone B — Lecture IA */}
        {step === 1 && (
          <div className="lp-demo2-content" key="b">
            <p className="lp-demo2-zone-label">B — Ce que l'IA comprend</p>
            <div className="lp-demo2-ai-reading">
              {[
                { k: 'Type de besoin',   v: 'Compréhension et vérification fiche de paie' },
                { k: 'Contexte',         v: 'Écart constaté, incertitude légale, isolement' },
                { k: 'Urgence',          v: 'Modérée — pas de délai immédiat mais situation bloquante' },
                { k: 'Profil recherché', v: 'Connaissance droit du travail + capacité à expliquer' },
              ].map(({ k, v }) => (
                <div className="lp-demo2-ai-item" key={k}>
                  <span className="lp-demo2-ai-key">{k}</span>
                  <span className="lp-demo2-ai-val">{v}</span>
                </div>
              ))}
            </div>
            <p className="lp-demo2-detail">L'IA construit un contexte complet avant d'orienter — pas un filtre par mots-clés.</p>
          </div>
        )}

        {/* Zone C — Profils compatibles */}
        {step === 2 && (
          <div className="lp-demo2-content" key="c">
            <p className="lp-demo2-zone-label">C — Profils sélectionnés par l'IA</p>
            <div className="lp-demo2-profiles-row">
              {DEMO_MATCH_PROFILES.map((p, i) => (
                <div className={`lp-demo2-profile-card ${i === 0 ? 'lp-demo2-profile-card--top' : ''}`} key={p.id}>
                  {i === 0 && <span className="lp-demo2-profile-top-badge">Meilleure correspondance</span>}
                  <div className="lp-demo2-profile-header">
                    <img src={p.src} alt={p.name} className="lp-demo2-profile-avatar" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).src = avatarFallback(p.name); }} />
                    <div className="lp-demo2-profile-identity">
                      <p className="lp-demo2-profile-name">{p.name} <span className="lp-demo2-profile-city">· {p.city}</span></p>
                      <p className="lp-demo2-profile-cap">{p.capacite}</p>
                    </div>
                    <div className="lp-demo2-profile-score">{p.score}%</div>
                  </div>
                  <div className="lp-demo2-profile-raison">
                    <span className="lp-demo2-raison-dot" />
                    {p.raison}
                  </div>
                  <p className="lp-demo2-profile-avail">{p.avail}</p>
                </div>
              ))}
            </div>
            <p className="lp-demo2-detail">Sélection par contexte réel, pas par tags génériques.</p>
          </div>
        )}

        {/* Zone D — Échange */}
        {step === 3 && (
          <div className="lp-demo2-content" key="d">
            <p className="lp-demo2-zone-label">D — L'échange commence</p>
            <div className="lp-demo2-chat">
              <div className="lp-demo2-chat-msg lp-demo2-chat-msg--ai">
                <span className="lp-demo2-chat-who">IA RENOVEC</span>
                <p>Marc peut vous aider à comprendre votre fiche. Il a résolu des situations similaires à quelques rues d'ici.</p>
              </div>
              <div className="lp-demo2-chat-msg lp-demo2-chat-msg--helper">
                <span className="lp-demo2-chat-who">Marc · Lyon 6e</span>
                <p>Bonjour Lucie. Envoyez-moi la fiche, je regarde ça ce soir — j'ai déjà vu ce type d'écart.</p>
              </div>
              <div className="lp-demo2-chat-msg lp-demo2-chat-msg--seeker">
                <span className="lp-demo2-chat-who">Lucie</span>
                <p>Merci. Je vous envoie ça maintenant.</p>
              </div>
            </div>
            <p className="lp-demo2-detail">Marc reçoit le contexte — pas un copié-collé brut.</p>
          </div>
        )}

        {/* Zone E — Reconnaissance */}
        {step === 4 && (
          <div className="lp-demo2-content" key="e">
            <p className="lp-demo2-zone-label">E — L'aide est reconnue</p>
            <div className="lp-demo2-recog">
              <div className="lp-demo2-recog-event">
                <div className="lp-demo2-recog-avatars">
                  <img src={AVATARS.Lucie} alt="Lucie" className="lp-demo2-recog-avatar" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).src = avatarFallback('L'); }} />
                  <span className="lp-demo2-recog-arrow">→</span>
                  <img src={AVATARS.Marc} alt="Marc" className="lp-demo2-recog-avatar lp-demo2-recog-avatar--helper" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).src = avatarFallback('M'); }} />
                </div>
                <p className="lp-demo2-recog-label">Lucie reconnaît l'aide de Marc</p>
              </div>
              <div className="lp-demo2-recog-effects">
                <span className="lp-demo2-recog-badge">+8 pts capital</span>
                <span className="lp-demo2-recog-badge">lien renforcé</span>
                <span className="lp-demo2-recog-badge">contexte enregistré</span>
              </div>
            </div>
            <p className="lp-demo2-detail">Pas un like — une preuve contextuelle qui renforce Marc pour toutes les situations similaires.</p>
          </div>
        )}

        {/* Zone F — Mémoire active */}
        {step === 5 && (
          <div className="lp-demo2-content" key="f">
            <p className="lp-demo2-zone-label">F — Le réseau apprend</p>
            <div className="lp-demo2-memory">
              <div className="lp-demo2-memory-statement">
                <span className="lp-demo2-memory-icon">◈</span>
                <p>Ce type d'aide a fonctionné dans ce contexte précis.</p>
              </div>
              <div className="lp-demo2-memory-tags">
                {['Droit du travail', 'Lyon 3e–6e', 'Fiche de paie', 'Marc · soir disponible'].map(t => (
                  <span key={t} className="lp-demo2-memory-tag">{t}</span>
                ))}
              </div>
              <p className="lp-demo2-memory-consequence">
                La prochaine situation similaire sera mieux orientée — mémoire active, pas algorithme figé.
              </p>
            </div>
            <button className="lp-demo2-cta" onClick={onEnter}>
              Exprimer une situation
              <ArrowRight size={12} />
            </button>
          </div>
        )}
      </div>

      {/* ── Progress bar ─────────────────────────────────────────── */}
      <div className="lp-demo2-progress" role="progressbar" aria-valuenow={step + 1} aria-valuemax={6}>
        {DEMO_ZONES.map((_, i) => (
          <div
            key={i}
            className={`lp-demo2-progress-seg ${i < step ? 'lp-demo2-progress-seg--done' : ''} ${i === step ? 'lp-demo2-progress-seg--active' : ''}`}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CAPITAL BAR
// ─────────────────────────────────────────────────────────────────────────────

function CapitalBar({ label, value, color }: { label: string; value: number; color: string }) {
  const [animated, setAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setAnimated(true); obs.disconnect(); }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:12, color:'rgba(255,255,255,0.55)', fontWeight:500 }}>{label}</span>
        <span style={{ fontSize:11, color, fontFamily:'monospace' }}>{Math.round(value*100)}</span>
      </div>
      <div style={{ height:1, width:'100%', background:'rgba(255,255,255,0.07)', position:'relative', overflow:'hidden' }}>
        <div style={{
          position:'absolute', left:0, top:0, height:'100%',
          background:`linear-gradient(90deg,${color}88,${color})`,
          width: animated ? `${value*100}%` : '0%',
          transition:'width 1.5s cubic-bezier(0.16,1,0.3,1)',
          transitionDelay:'0.15s',
          boxShadow:`0 0 7px ${color}55`,
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO DATA
// ─────────────────────────────────────────────────────────────────────────────

const SCENARIOS = [
  { kind:'cherche', text:'Je cherche un bureau d\'occasion pour mon fils qui commence à travailler chez lui.', meta:'Objet · Proximité' },
  { kind:'offre',   text:'Je peux aider en maths le soir — lycée ou prépa.', meta:'Savoir-faire · Disponibilité' },
  { kind:'cherche', text:'J\'ai besoin d\'un coup de main sur un dossier RSA bloqué depuis 3 mois.', meta:'Aide · Urgence' },
  { kind:'offre',   text:'Je prête une remorque samedi matin.', meta:'Objet · Ponctuel' },
  { kind:'cherche', text:'Je cherche quelqu\'un de fiable pour surveiller mon appartement en août.', meta:'Présence · Confiance' },
  { kind:'offre',   text:'Je connais le droit du travail. Je peux lire un contrat et expliquer.', meta:'Savoir · Accompagnement' },
];

const PROFILE_BARS = [
  { label:'Capital confiance', value:0.82, color:'#F26522' },
  { label:'Capital savoir',    value:0.68, color:'#d4a96a' },
  { label:'Liens consolidés',  value:0.74, color:'#e8b87a' },
  { label:'Contributions',     value:0.59, color:'#c4956a' },
];

// GeoMapSection removed — merged into TeaserMap (T05)

// ─────────────────────────────────────────────────────────────────────────────
// LANDING FEED TEASER
// ─────────────────────────────────────────────────────────────────────────────

type TeaserListing = {
  id: string;
  listing_type: 'service' | 'object_new' | 'object_used' | 'resource' | 'demand';
  title: string;
  price_hint: string;
  image_urls: string[];
  tags: string[];
  _profile?: { title: string; avatar_url?: string | null; city?: string };
};

const TEASER_TYPE_META: Record<TeaserListing['listing_type'], { label: string; color: string; icon: typeof ShoppingBag }> = {
  service:     { label: 'Service',    color: '#60a5fa', icon: ShoppingBag },
  object_new:  { label: 'Neuf',       color: '#22c55e', icon: Box },
  object_used: { label: "Occasion",   color: '#f97316', icon: Package },
  resource:    { label: 'Ressource',  color: '#a78bfa', icon: ShoppingBag },
  demand:      { label: 'Recherche',  color: '#fbbf24', icon: Search },
};


function TeaserCard({ listing, onEnter }: { listing: TeaserListing; onEnter: () => void }) {
  const meta   = TEASER_TYPE_META[listing.listing_type];
  const Icon   = meta.icon;
  const img    = listing.image_urls?.[0];
  const name   = listing._profile?.title ?? '';
  const [imgErr, setImgErr] = useState(false);

  return (
    <button
      onClick={onEnter}
      className="w-full flex items-center gap-4 rounded-2xl overflow-hidden border border-white/8 bg-[#151210] text-left group hover:border-white/18 hover:bg-[#1a1814] transition-all p-3"
    >
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
        {img && !imgErr ? (
          <img src={img} alt={listing.title} onError={() => setImgErr(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: `${teaserAvatarBg(listing.title)}22` }}>
            <Icon size={20} style={{ color: meta.color, opacity: 0.5 }} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="flex items-center gap-1 text-[9px] font-bold" style={{ color: meta.color }}>
            <Icon size={8} /> {meta.label}
          </span>
          {listing._profile?.city && (
            <span className="text-[9px] text-white/20 flex items-center gap-0.5">
              <MapPin size={7} />{listing._profile.city}
            </span>
          )}
        </div>
        <p className="text-[13px] font-semibold text-white/80 leading-snug line-clamp-1">{listing.title}</p>
        <div className="flex items-center justify-between mt-1.5">
          {name && (
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                style={{ background: teaserAvatarBg(name) }}
              >
                {(name[0]||'?').toUpperCase()}
              </div>
              <span className="text-[10px] text-white/30 truncate">{name}</span>
            </div>
          )}
          {listing.price_hint && (
            <span className="text-[10px] font-semibold flex-shrink-0 flex items-center gap-0.5" style={{
              color: listing.price_hint.toLowerCase().includes('gratuit') ? '#22c55e' : 'rgba(255,255,255,0.35)'
            }}>
              <Tag size={8} />{listing.price_hint}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function LandingFeedTeaser({ onEnter, onOpenFeed }: { onEnter: () => void; onOpenFeed: () => void }) {
  const [listings, setListings] = useState<TeaserListing[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from('profile_listings')
        .select('id, listing_type, title, price_hint, image_urls, tags, capability_profiles!inner(title, avatar_url, city)')
        .eq('is_published', true)
        .eq('is_available', true)
        .order('created_at', { ascending: false })
        .limit(12);
      if (!cancelled && data) {
        const mapped = data.map((row: Record<string, unknown>) => {
          const { capability_profiles, ...rest } = row as Record<string, unknown> & { capability_profiles: TeaserListing['_profile'] };
          return { ...(rest as TeaserListing), _profile: capability_profiles };
        });
        setListings(mapped);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading || listings.length === 0) return null;

  return (
    <section style={{ padding: '96px 0', background: 'transparent' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>
        <p className="lp-eyebrow lp-eyebrow--center">Ce qui circule en ce moment</p>
        <h2 className="lp-section-h2 lp-section-h2--center" style={{ marginBottom: 12 }}>
          Le réseau, en direct.
        </h2>
        <p className="lp-body lp-body--center" style={{ marginBottom: 40 }}>
          Services, objets neufs ou d'occasion, ressources partagées — tout ce que les membres proposent.
        </p>

        {/* Vertical feed */}
        <div className="flex flex-col gap-2">
          {listings.map(l => (
            <TeaserCard key={l.id} listing={l} onEnter={onEnter} />
          ))}
          {/* CTA row at end */}
          <button
            onClick={onOpenFeed}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-dashed border-white/12 text-[12px] text-white/30 hover:text-white/60 hover:border-white/25 transition-all group mt-1"
          >
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            Voir toutes les annonces du réseau
          </button>
        </div>

        {/* Stats strip */}
        <div className="flex items-center justify-center gap-6 mt-8 flex-wrap">
          {[
            { icon: ShoppingBag, label: 'Services', color: '#60a5fa' },
            { icon: Box,         label: 'Objets neufs', color: '#22c55e' },
            { icon: Package,     label: "D'occasion", color: '#f97316' },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex items-center gap-1.5 text-[11px] text-white/28">
              <Icon size={10} style={{ color }} />
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-8">
          <button onClick={onOpenFeed} className="lp-btn-secondary group">
            Explorer le fil d'actualité
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

export default function LandingPage({ onEnter, onHowItWorks, onGoToPresence: _onGoToPresence, onMentions }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [heroInput, setHeroInput] = useState('');

  const openAI = useCallback(() => setAiOpen(true), []);
  const closeAI = useCallback(() => setAiOpen(false), []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className="lp-root">


      {/* ── Persistent ambient blobs ─── */}
      <div className="lp-ambient" aria-hidden>
        <div className="lp-blob lp-blob-a" />
        <div className="lp-blob lp-blob-b" />
        <div className="lp-blob lp-blob-c" />
      </div>

      {/* ── Global rain of profiles ── */}
      <GlobalRain frozen={aiOpen} />

      {/* ── Neural signals ── */}
      <NeuralSignals frozen={aiOpen} />

      {/* ── Full-page spine connectome ── */}
      <PageSpine />

      {/* ── Nav ───────────────────────── */}
      <header role="banner">
        <nav className={`lp-nav ${scrolled ? 'lp-nav--scrolled' : ''}`} aria-label="Navigation principale">
          <div className="lp-nav-inner">
            <a href="/" className="lp-logo" aria-label="RENOVEC — Accueil">
              <div className="lp-logo-mark" aria-hidden="true" />
              <span>RENOVEC</span>
            </a>
            <div className="lp-nav-actions">
              <a href="/comment-ca-marche" onClick={(e) => { e.preventDefault(); onHowItWorks(); }} className="lp-nav-link hidden sm:block">
                Comment ça marche
              </a>
              <a href="/entrer" onClick={(e) => { e.preventDefault(); onEnter(); }} className="lp-btn-nav-cta">
                Entrer <ArrowRight size={9} aria-hidden="true" />
              </a>
            </div>
          </div>
        </nav>
      </header>

      {/* ════════════════ 1. HERO ════════════════════════════════════════ */}
      <section className="lp-hero">
        <div className="lp-hero-canvas">
          <HeroConnectome className="w-full h-full" />
        </div>
        <div className="lp-hero-vignette" aria-hidden />

        <div className="lp-hero-humans" aria-hidden="true">
          <div className="lp-hero-human lp-hero-human--1">
            <div className="lp-hero-human-halo" />
            <img src={AVATARS.H1} alt="" className="lp-hero-human-img" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).src = avatarFallback('T'); }} />
            <div className="lp-hero-human-info">
              <span className="lp-hero-human-name">Thomas</span>
              <span className="lp-hero-human-cap">comprend le droit locatif</span>
              <span className="lp-hero-human-loc">Bordeaux · Chartrons</span>
            </div>
          </div>
          <div className="lp-hero-human lp-hero-human--2">
            <div className="lp-hero-human-halo" />
            <img src={AVATARS.H2} alt="" className="lp-hero-human-img" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).src = avatarFallback('F'); }} />
            <div className="lp-hero-human-info">
              <span className="lp-hero-human-name">Fatima</span>
              <span className="lp-hero-human-cap">utile sur les dossiers sociaux</span>
              <span className="lp-hero-human-loc">Lyon · Presqu'île</span>
            </div>
          </div>
          <div className="lp-hero-human lp-hero-human--3">
            <div className="lp-hero-human-halo" />
            <img src={AVATARS.Marc} alt="" className="lp-hero-human-img" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).src = avatarFallback('M'); }} />
            <div className="lp-hero-human-info">
              <span className="lp-hero-human-name">Marc</span>
              <span className="lp-hero-human-cap">accompagne les transitions pro</span>
              <span className="lp-hero-human-loc">Paris · 11e</span>
            </div>
          </div>
        </div>

        <div className="lp-hero-content" id="contenu-principal">
          <div className="lp-hero-text">
            <p className="lp-eyebrow">Infrastructure orchestrée par IA</p>
            <h1 id="hero-title" className="lp-hero-h1">
              Le réseau qui<br />comprend avant<br />d'orienter.
            </h1>
            <p className="lp-hero-sub">
              Décrivez ce que vous vivez ou ce que vous savez faire.<br />
              L'IA comprend la situation et active les bonnes présences.<br />
              Pas de case imposée. Pas de parcours figé.
            </p>

            {/* ── Bulle d'expression libre intégrée ── */}
            <div className="lp-hero-input-wrap">
              <input
                type="text"
                className="lp-hero-input"
                placeholder="Ex : J'ai du mal à comprendre mon contrat de travail…"
                value={heroInput}
                onChange={(e) => setHeroInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const t = heroInput.trim();
                    if (t) {
                      sessionStorage.setItem('renovec_guest_need', t);
                      window.dispatchEvent(new CustomEvent('renovec-hero-search', { detail: { text: t } }));
                      document.getElementById('lp-search-results')?.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      openAI();
                    }
                  }
                }}
                aria-label="Décrivez votre situation"
              />
              <button
                className="lp-hero-input-mic"
                onClick={openAI}
                aria-label="Parler"
              >
                <Mic size={14} />
              </button>
              <button
                className="lp-hero-input-btn"
                onClick={() => {
                  const t = heroInput.trim();
                  if (t) {
                    sessionStorage.setItem('renovec_guest_need', t);
                    window.dispatchEvent(new CustomEvent('renovec-hero-search', { detail: { text: t } }));
                    document.getElementById('lp-search-results')?.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    openAI();
                  }
                }}
                aria-label="Exprimer"
              >
                <ArrowRight size={14} />
              </button>
            </div>
            <p className="lp-hero-microcopy">Pas d'inscription pour voir les premiers profils · L'IA comprend en langage libre · Position approximative, non stockée</p>

            {/* ── CTAs hiérarchisés ── */}
            <div className="lp-hero-ctas">
              <a href="/entrer" onClick={(e) => { e.preventDefault(); openAI(); }} className="lp-btn-primary group">
                Exprimer une situation
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
              </a>
              <a href="/entrer" onClick={(e) => { e.preventDefault(); openAI(); }} className="lp-hero-cta-secondary group">
                Partager ma présence
                <ArrowRight size={10} className="lp-hero-cta-secondary-arrow" aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="lp-hero-proofs" aria-label="Garanties">
            <p className="lp-hero-proof">Pas d'inscription pour voir les premiers profils.</p>
            <p className="lp-hero-proof">Compréhension en langage libre — pas de case, pas de mot-clé.</p>
            <p className="lp-hero-proof">Position approximative, jamais stockée.</p>
          </div>
        </div>
        <div className="lp-hero-fade-bottom" aria-hidden />
      </section>

      {/* ════════════════ 1b. EXEMPLES CONCRETS ════════════════════════ */}
      <section className="lp-scenarios" aria-label="Exemples de situations">
        <div className="lp-scenarios-stream">
          {SCENARIOS.map((s, i) => (
            <button key={i} onClick={openAI} className="lp-scenario-card">
              <div className="lp-scenario-card-inner">
                <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                  <span className={`lp-scenario-badge flex-shrink-0 ${s.kind==='cherche' ? 'lp-badge-cherche' : 'lp-badge-offre'}`} style={{ marginTop:1 }}>
                    {s.kind}
                  </span>
                  <p className="lp-scenario-text">{s.text}</p>
                </div>
                <p className="lp-scenario-meta">{s.meta}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ════════════════ 2. ENTRÉE CONVERSATIONNELLE ═══════════════════ */}
      <section className="lp-guest-match" id="lp-search-results">
        <GuestMatchFlow onEnter={(needText) => {
          if (needText) sessionStorage.setItem('renovec_guest_need', needText);
          onEnter();
        }} isGuest={true} />
      </section>

      {/* ════════════════ 3. DÉMONSTRATION PRODUIT ══════════════════════ */}
      <section className="lp-demo-section">
        <div className="lp-demo-section-inner">
          <div className="lp-demo-header">
            <p className="lp-eyebrow">De la situation à la coordination</p>
            <h2 className="lp-section-h2">
              La boucle complète —<br />en 6 étapes réelles.
            </h2>
            <p className="lp-body">
              Six étapes, un exemple réel — de la situation exprimée à la mémoire collective du réseau.
            </p>
          </div>
          <ProductDemo onEnter={onEnter} />
        </div>
      </section>

      {/* ════════════════ 4. PREUVE SOCIALE & TERRITORIALE ══════════════ */}
      {/* Single unified block — narrative + legend + samples + map      */}
      <TeaserMap onEnter={onEnter} />

      {/* ════════════════ 5. MÉMOIRE ACTIVE ════════════════════════════════ */}
      <section className="lp-memory-section">
        <div className="lp-memory-label-left">
          <p className="lp-eyebrow">Mémoire active</p>
          <h2 className="lp-section-h2 lp-section-h2--tight">
            Chaque aide reconnue<br />instruit le réseau.
          </h2>
          <p className="lp-body">
            Quand une aide fonctionne et qu'elle est reconnue, RENOVEC ne l'oublie pas. Ce n'est pas un like, pas une note — c'est une preuve contextuelle. Le réseau s'en souvient et oriente mieux les fois suivantes.
          </p>

          {/* Profil capital */}
          <div className="lp-profile-card" style={{ marginTop: 28 }}>
            <div className="lp-profile-header">
              <div className="lp-profile-avatar-photo">
                <img src={AVATARS.Marie} alt="Marie" className="lp-profile-avatar-img" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).src = avatarFallback('M'); }} />
              </div>
              <div>
                <p className="lp-profile-name">Marie · Lyon 7e</p>
                <p className="lp-profile-since">Membre depuis 14 mois</p>
              </div>
            </div>
            <div className="lp-profile-bars">
              {PROFILE_BARS.map(b => <CapitalBar key={b.label} label={b.label} value={b.value} color={b.color} />)}
              <p className="lp-profile-bars-note">
                Ces métriques reflètent des aides réelles reconnues dans le réseau — pas des notes, pas des votes.
              </p>
            </div>
            <div className="lp-profile-contexts">
              <p className="lp-profile-contexts-label">Contextes reconnus</p>
              <div className="lp-profile-tags">
                {['Orientation professionnelle','Droit du travail','Soutien administratif'].map(t => (
                  <span key={t} className="lp-profile-tag">{t}</span>
                ))}
              </div>
            </div>
            <div className="lp-profile-links-row">
              <span className="lp-profile-link-badge">7 liens consolidés</span>
              <span className="lp-profile-link-badge">3 clusters actifs</span>
            </div>
          </div>
        </div>

        <div className="lp-memory-canvas-wrap">
          <HeroConnectome className="w-full h-full" />
          <div className="lp-memory-overlay-tag lp-memory-tag-tl">réseau local vivant</div>
          <div className="lp-memory-overlay-tag lp-memory-tag-br">
            <span className="lp-dot-amber-sm" />liaisons consolidées en mémoire
          </div>
        </div>
      </section>

      {/* ════════════════ 6. DEUX PORTES D'ENTRÉE ═══════════════════════ */}
      <section className="lp-dual">
        <div className="lp-dual-header">
          <p className="lp-eyebrow">Deux façons d'être dans le réseau</p>
          <h2 className="lp-section-h2">
            Ceux qui traversent.<br />Ceux qui peuvent aider.
          </h2>
          <p className="lp-body lp-body--center">Le réseau entre les deux.</p>
        </div>
        <div className="lp-dual-cards">
          <div className="lp-dual-card lp-dual-card--seeker">
            <div className="lp-dual-card-glyph"><div className="lp-glyph-seek" /></div>
            <p className="lp-dual-card-role">Les chercheurs</p>
            <p className="lp-dual-card-headline">Vous traversez quelque chose.</p>
            <p className="lp-dual-card-body">
              Décrivez la situation avec vos mots. RENOVEC comprend le contexte et vous montre les présences plausibles.
            </p>
            <ul className="lp-dual-card-list">
              <li>Expression libre, sans case imposée.</li>
              <li>Compréhension du contexte avant orientation.</li>
              <li>Premières présences visibles rapidement.</li>
            </ul>
            <a href="/entrer" onClick={(e) => { e.preventDefault(); openAI(); }} className="lp-dual-cta group">
              Exprimer une situation <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </a>
          </div>

          <div className="lp-dual-bridge" aria-hidden>
            <div className="lp-bridge-inner">
              <div className="lp-bridge-node lp-bridge-node--seeker" />
              <div className="lp-bridge-link" />
              <div className="lp-bridge-dot" />
              <div className="lp-bridge-link" />
              <div className="lp-bridge-node lp-bridge-node--presence" />
            </div>
            <span className="lp-bridge-label">réseau</span>
          </div>

          <div className="lp-dual-card lp-dual-card--presence">
            <div className="lp-dual-card-glyph"><div className="lp-glyph-give" /></div>
            <p className="lp-dual-card-role">Les présences</p>
            <p className="lp-dual-card-headline">Vous pouvez aider dans certains contextes.</p>
            <p className="lp-dual-card-body">
              RENOVEC comprend ce que vous savez réellement faire. Le réseau vous active quand votre présence devient pertinente.
            </p>
            <ul className="lp-dual-card-list">
              <li>Capacités comprises, pas seulement affichées.</li>
              <li>Activation selon la situation réelle.</li>
              <li>Chaque aide reconnue renforce votre place dans le réseau.</li>
            </ul>
            <a href="/entrer" onClick={(e) => { e.preventDefault(); openAI(); }} className="lp-dual-cta group">
              Partager ma présence <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* ════════════════ 7. FIL D'ACTUALITÉ ════════════════════════════ */}
      <LandingFeedTeaser onEnter={onEnter} onOpenFeed={() => openAI()} />

      {/* ════════════════ 8. FINALE ══════════════════════════════════════ */}
      <section className="lp-finale">
        <div className="lp-finale-glow" aria-hidden />
        <div className="lp-finale-rain" aria-hidden><ChatRain /></div>
        <div className="lp-finale-content">
          <div className="lp-finale-connectome">
            <HeroConnectome className="w-full h-full" />
          </div>
          <p className="lp-eyebrow lp-eyebrow--center">Rejoindre le réseau</p>
          <p className="lp-finale-intro">
            Des présences actives aujourd'hui — des gens réels, dans des contextes réels, prêts à aider ou à partager ce qu'ils savent faire.
          </p>
          <blockquote className="lp-finale-quote">
            "L'IA n'est pas l'interface.<br />Elle est l'intelligence qui coordonne."
          </blockquote>
          <div className="lp-finale-ctas">
            <a href="/entrer" onClick={(e) => { e.preventDefault(); openAI(); }} className="lp-btn-primary group">
              Entrer dans le réseau
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </a>
            <a href="/entrer" onClick={(e) => { e.preventDefault(); openAI(); }} className="lp-btn-ghost group">
              Partager ma présence
              <ArrowRight size={11} className="lp-btn-ghost-arrow" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ───── */}
      <footer className="lp-footer" role="contentinfo">
        <div className="lp-footer-inner">
          <p className="lp-footer-copy">RENOVEC · Réseau orchestré par IA · 2026</p>
          <nav aria-label="Liens légaux" className="flex items-center gap-4 flex-wrap">
            <a href="/mentions-legales" onClick={(e) => { e.preventDefault(); onMentions?.(); }} className="lp-footer-link">Mentions légales</a>
            <a href="/politique-de-confidentialite" onClick={(e) => { e.preventDefault(); window.history.pushState(null, '', '/politique-de-confidentialite'); window.dispatchEvent(new PopStateEvent('popstate')); }} className="lp-footer-link">Politique de confidentialité</a>
            <a href="/conditions-generales" onClick={(e) => { e.preventDefault(); window.history.pushState(null, '', '/conditions-generales'); window.dispatchEvent(new PopStateEvent('popstate')); }} className="lp-footer-link">CGU</a>
          </nav>
        </div>
      </footer>

      {!aiOpen && scrolled && <VoicePresence onOpenChat={openAI} />}

      {aiOpen && (
        <WorkspaceOverlay
          onClose={closeAI}
          onJoinNetwork={onEnter}
        />
      )}
    </div>
  );
}
