import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ShoppingBag, Box, Package, Search, Tag, MapPin } from 'lucide-react';
import VoicePresence from '../components/VoicePresence';
import WorkspaceOverlay from '../components/workspace/WorkspaceOverlay';
import TeaserMap from '../components/TeaserMap';
import GuestMatchFlow from '../components/GuestMatchFlow';
import GlobalRain from '../components/GlobalRain';
import ChatRain from '../components/ChatRain';
import { avatarBg as teaserAvatarBg } from '../lib/ui';
import { supabase } from '../lib/supabase';
import { NETWORK_STATS } from '../data/mockOccitanie';

const RenovecMap = lazy(() => import('../components/RenovecMap'));

type Props = {
  onEnter: () => void;
  onHowItWorks: () => void;
  onGoToPresence?: () => void;
  onMentions?: () => void;
};

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// FULL-PAGE SPINE â persistent connectome that runs behind all sections
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

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
  // Distribute across full page height (y: 0â1 spread wide)
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

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// HERO CONNECTOME â denser, higher contrast
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

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

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// HUMAN AVATARS
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

// Portrait photos from Pexels â natural, non-corporate, diverse
const AVATARS = {
  // Lucie â jeune femme, lunettes, regard calme
  Lucie: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1',
  // Marc â homme, lumiÃ¨re naturelle, dÃ©tendu
  Marc:  'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1',
  // Anne â femme, fond neutre
  Anne:  'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1',
  // Marie (profil capital)
  Marie: 'https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1',
  // NÅuds hero â prÃ©sences supplÃ©mentaires
  H1:    'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1',
  H2:    'https://images.pexels.com/photos/2208740/pexels-photo-2208740.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1',
};

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// PRODUCT DEMO â animated sequence
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const DEMO_STEPS = [
  {
    phase: 'Situation libre',
    text: '"J\'ai besoin d\'un coup de main pour comprendre ma fiche de paie."',
    nodes: ['L', 'M', 'A'],
    active: ['L'],
    detail: 'L\'IA reÃ§oit la situation en langage naturel.',
  },
  {
    phase: 'InterprÃ©tation IA',
    text: 'L\'IA lit le contexte, identifie l\'enjeu â sans case, sans formulaire.',
    nodes: ['L', 'M', 'A'],
    active: ['L', 'M', 'A'],
    detail: 'Deux prÃ©sences pertinentes activÃ©es. Contexte transmis.',
  },
  {
    phase: 'Ãchange',
    text: 'Marc rÃ©pond. 30 minutes d\'accompagnement.',
    nodes: ['L', 'M'],
    active: ['L', 'M'],
    detail: 'Le lien entre L et M est actif.',
    link: ['L', 'M'],
  },
  {
    phase: 'Reconnaissance',
    text: 'Lucie reconnaÃ®t l\'aide de Marc.',
    nodes: ['L', 'M'],
    active: ['L', 'M'],
    detail: 'L\'IA enregistre : ce type d\'aide a fonctionnÃ© dans ce contexte.',
    link: ['L', 'M'],
    consolidating: true,
  },
  {
    phase: 'MÃ©moire IA',
    text: 'Le lien est consolidÃ©. Le rÃ©seau devient plus intelligent.',
    nodes: ['L', 'M'],
    active: ['L', 'M'],
    detail: 'L\'IA s\'en souvient â pour toutes les situations similaires Ã  venir.',
    link: ['L', 'M'],
    consolidated: true,
  },
];

// Demo persons â seeker vs helper distinction baked in
const DEMO_PERSONS = {
  L: {
    name: 'Lucie',
    city: 'Lyon 3e',
    micro: 'comprend son dossier seule, mais lÃ  c\'est bloquÃ©',
    src: AVATARS.Lucie,
    kind: 'seeker' as const,
  },
  M: {
    name: 'Marc',
    city: 'Lyon 6e',
    micro: 'comprend le droit du travail',
    src: AVATARS.Marc,
    kind: 'helper' as const,
  },
  A: {
    name: 'Anne',
    city: 'Lyon 7e',
    micro: 'peut accompagner sur les dÃ©marches',
    src: AVATARS.Anne,
    kind: 'helper' as const,
  },
};

function ProductDemo({ onEnter }: { onEnter: () => void }) {
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => setStep(s => (s + 1) % DEMO_STEPS.length), 3400);
    return () => clearInterval(id);
  }, [auto]);

  const s = DEMO_STEPS[step];
  const isActive = (id: string) => s.active.includes(id);
  const isLinked = (a: string, b: string) => !!s.link?.includes(a) && !!s.link?.includes(b);

  // Nodes laid out left (seeker) â right (helpers)
  const nodePos: Record<string, { x: string; y: string }> = {
    L: { x: '22%', y: '50%' },
    M: { x: '65%', y: '30%' },
    A: { x: '68%', y: '70%' },
  };

  // SVG coords matching %: Lâ(22,50) Mâ(65,30) Aâ(68,70)
  const lx=22, ly=50, mx=65, my=30, ax=68, ay=70;

  return (
    <div className="lp-demo">
      {/* Step nav */}
      <div className="lp-demo-steps" role="tablist" aria-label="Ãtapes du processus IA">
        {DEMO_STEPS.map((ds, i) => (
          <button
            key={ds.phase}
            role="tab"
            id={`demo-tab-${i}`}
            aria-selected={i === step}
            aria-controls={`demo-panel-${i}`}
            tabIndex={i === step ? 0 : -1}
            className={`lp-demo-step-btn ${i === step ? 'lp-demo-step-btn--active' : ''}`}
            onClick={() => { setStep(i); setAuto(false); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') { setStep(s => (s + 1) % DEMO_STEPS.length); setAuto(false); }
              if (e.key === 'ArrowLeft') { setStep(s => (s - 1 + DEMO_STEPS.length) % DEMO_STEPS.length); setAuto(false); }
            }}
          >
            <span className="lp-demo-step-num">0{i+1}</span>
            <span className="lp-demo-step-label">{ds.phase}</span>
          </button>
        ))}
      </div>

      {/* Main visualization */}
      <div className="lp-demo-viz">
        {/* SVG links */}
        <svg className="lp-demo-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Background topology nodes â abstract secondary network */}
          <circle cx="42" cy="18" r="1.2" fill="rgba(180,152,115,0.15)" />
          <circle cx="85" cy="48" r="0.9" fill="rgba(180,152,115,0.12)" />
          <circle cx="10" cy="28" r="0.8" fill="rgba(180,152,115,0.1)" />
          <circle cx="48" cy="82" r="1.0" fill="rgba(180,152,115,0.1)" />
          <line x1="42" y1="18" x2={lx} y2={ly} stroke="rgba(180,152,115,0.07)" strokeWidth="0.4" strokeDasharray="2 8" />
          <line x1="85" y1="48" x2={mx} y2={my} stroke="rgba(180,152,115,0.06)" strokeWidth="0.4" strokeDasharray="2 8" />
          <line x1="48" y1="82" x2={ax} y2={ay} stroke="rgba(180,152,115,0.06)" strokeWidth="0.4" strokeDasharray="2 8" />

          {/* LâM link */}
          <line
            x1={lx} y1={ly} x2={mx} y2={my}
            strokeWidth={s.consolidated && isLinked('L','M') ? 1.8 : 0.9}
            stroke={
              s.consolidated && isLinked('L','M') ? 'rgba(255,185,70,0.9)' :
              s.consolidating && isLinked('L','M') ? 'rgba(242,101,34,0.65)' :
              isLinked('L','M') ? 'rgba(200,170,130,0.5)' : 'rgba(180,155,120,0.1)'
            }
            strokeDasharray={isLinked('L','M') ? 'none' : '2 6'}
          />
          {/* Signal on LâM when consolidating */}
          {s.consolidating && isLinked('L','M') && (
            <circle r="1.5" fill="rgba(255,200,120,0.9)">
              <animateMotion dur="1.2s" repeatCount="indefinite">
                <mpath href="#lm-path" />
              </animateMotion>
            </circle>
          )}
          <path id="lm-path" d={`M ${lx} ${ly} L ${mx} ${my}`} fill="none" />

          {/* LâA link */}
          <line
            x1={lx} y1={ly} x2={ax} y2={ay}
            strokeWidth={0.7}
            stroke={s.active.includes('A') ? 'rgba(200,165,115,0.35)' : 'rgba(170,145,110,0.08)'}
            strokeDasharray="2 7"
          />
          {/* MâA link (weak topology) */}
          <line x1={mx} y1={my} x2={ax} y2={ay}
            strokeWidth={0.4}
            stroke="rgba(170,145,110,0.07)"
            strokeDasharray="2 10"
          />

          {/* Consolidated glow line on top */}
          {s.consolidated && (
            <line x1={lx} y1={ly} x2={mx} y2={my}
              strokeWidth={3}
              stroke="rgba(255,185,70,0.12)"
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* Human nodes */}
        {(['L', 'M', 'A'] as const).map(id => {
          const pos = nodePos[id];
          const active = isActive(id);
          const person = DEMO_PERSONS[id];
          const isConsolidatedNode = s.consolidated && isLinked('L','M') && (id === 'L' || id === 'M');
          const isSeeker = person.kind === 'seeker';

          return (
            <div
              key={id}
              className={[
                'lp-demo-node',
                active ? 'lp-demo-node--active' : '',
                isConsolidatedNode ? 'lp-demo-node--consolidated' : '',
                isSeeker ? 'lp-demo-node--seeker' : 'lp-demo-node--helper',
              ].filter(Boolean).join(' ')}
              style={{ left: pos.x, top: pos.y }}
            >
              {active && <div className="lp-demo-node-halo" />}
              {isConsolidatedNode && <div className="lp-demo-node-ring" />}

              {/* Role badge â visible when active */}
              {active && (
                <div className={`lp-demo-role-badge lp-demo-role-badge--${person.kind}`}>
                  {isSeeker ? 'cherche' : 'peut aider'}
                </div>
              )}

              <div className="lp-demo-avatar-wrap">
                <img src={person.src} alt={person.name} className="lp-demo-avatar-img" loading="lazy" />
                <div className={`lp-demo-avatar-tint ${active ? 'lp-demo-avatar-tint--active' : ''} ${isConsolidatedNode ? 'lp-demo-avatar-tint--consolidated' : ''}`} />
              </div>

              <div className="lp-demo-node-label">
                <span className="lp-demo-node-name">{person.name}</span>
                <span className="lp-demo-node-city">{person.city}</span>
                {active && <span className="lp-demo-node-micro" key={`${id}-${step}`}>{person.micro}</span>}
              </div>
            </div>
          );
        })}

        {/* Consolidated badge */}
        {s.consolidated && (
          <div className="lp-demo-consolidated-badge">lien consolidÃ© Â· en mÃ©moire</div>
        )}
      </div>

      {/* Text */}
      <div
        className="lp-demo-text"
        role="tabpanel"
        id={`demo-panel-${step}`}
        aria-labelledby={`demo-tab-${step}`}
        aria-live="polite"
      >
        <p className="lp-demo-phase-label">{s.phase}</p>
        <p className="lp-demo-main-text" key={step}>{s.text}</p>
        <p className="lp-demo-detail">{s.detail}</p>
      </div>

      <button onClick={onEnter} className="lp-demo-cta group">
        Voir comment Ã§a marche pour vous
        <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// CAPITAL BAR
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

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

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// SCENARIO DATA
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const SCENARIOS = [
  { kind:'cherche', text:'Je cherche un bureau d\'occasion pour mon fils qui commence Ã  travailler chez lui.', meta:'Objet Â· ProximitÃ©' },
  { kind:'offre',   text:'Je peux aider en maths le soir â lycÃ©e ou prÃ©pa.', meta:'Savoir-faire Â· DisponibilitÃ©' },
  { kind:'cherche', text:'J\'ai besoin d\'un coup de main sur un dossier RSA bloquÃ© depuis 3 mois.', meta:'Aide Â· Urgence' },
  { kind:'offre',   text:'Je prÃªte une remorque samedi matin.', meta:'Objet Â· Ponctuel' },
  { kind:'cherche', text:'Je cherche quelqu\'un de fiable pour surveiller mon appartement en aoÃ»t.', meta:'PrÃ©sence Â· Confiance' },
  { kind:'offre',   text:'Je connais le droit du travail. Je peux lire un contrat et expliquer.', meta:'Savoir Â· Accompagnement' },
];

const PROFILE_BARS = [
  { label:'Capital confiance', value:0.82, color:'#F26522' },
  { label:'Capital savoir',    value:0.68, color:'#d4a96a' },
  { label:'Liens consolidÃ©s',  value:0.74, color:'#e8b87a' },
  { label:'Contributions',     value:0.59, color:'#c4956a' },
];

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// GEO MAP SECTION â wraps the real MapLibre component
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function GeoMapSection() {
  return (
    <section className="lp-geo">
      <div className="lp-geo-inner">
        {/* Left narrative */}
        <div className="lp-geo-text">
          <p className="lp-eyebrow">Territoire vivant</p>
          <h2 className="lp-section-h2">
            Des humains rÃ©els,<br />dans des lieux rÃ©els.
          </h2>
          <p className="lp-body">
            Le rÃ©seau n'existe pas dans un cloud. Il existe dans les quartiers, dans les rues, dans les immeubles. Chaque prÃ©sence est ancrÃ©e dans un territoire.
          </p>
          <div className="lp-geo-legend">
            <div className="lp-geo-legend-item">
              <div className="lp-geo-legend-dot lp-geo-dot-active" />
              <span>PrÃ©sence active</span>
            </div>
            <div className="lp-geo-legend-item">
              <div className="lp-geo-legend-line lp-geo-line-consolidated" />
              <span>Lien consolidÃ©</span>
            </div>
            <div className="lp-geo-legend-item">
              <div className="lp-geo-legend-line lp-geo-line-potential" />
              <span>Connexion possible</span>
            </div>
          </div>
        </div>

        {/* Real MapLibre map â lazy loaded */}
        <Suspense fallback={<div className="renovec-map-wrap renovec-map-loading" />}>
          <RenovecMap className="lp-geo-map-container" />
        </Suspense>
      </div>
    </section>
  );
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// LANDING FEED TEASER
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

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

  const FALLBACK_ITEMS = listings.length > 0 ? listings : [
    { id:'f1', listing_type:'service' as const, title:'Aide à la rédaction de CV et préparation entretiens', price_hint:'Gratuit', image_urls:[], tags:[], _profile:{ title:'Arnaud C.', city:'Toulouse' } },
    { id:'f2', listing_type:'object_used' as const, title:'Bureau en chêne massif — très bon état', price_hint:'80 €', image_urls:[], tags:[], _profile:{ title:'Manon D.', city:'Blagnac' } },
    { id:'f3', listing_type:'service' as const, title:'Soutien scolaire maths lycée et prépa', price_hint:'Libre', image_urls:[], tags:[], _profile:{ title:'Sophie M.', city:'Colomiers' } },
    { id:'f4', listing_type:'resource' as const, title:'Remorque disponible weekends — conduite facile', price_hint:'Gratuit', image_urls:[], tags:[], _profile:{ title:'Florian V.', city:'Tournefeuille' } },
    { id:'f5', listing_type:'service' as const, title:'Explication droit du travail, lecture de contrat', price_hint:'Gratuit', image_urls:[], tags:[], _profile:{ title:'Lucas F.', city:'Toulouse' } },
    { id:'f6', listing_type:'demand' as const, title:"Recherche quelqu'un pour surveiller appartement en août", price_hint:'À convenir', image_urls:[], tags:[], _profile:{ title:'Rania M.', city:'Toulouse' } },
  ];
  if (loading && listings.length === 0) return null;

  return (
    <section style={{ padding: '96px 0', background: 'transparent' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>
        <p className="lp-eyebrow lp-eyebrow--center">Ce qui circule en ce moment</p>
        <h2 className="lp-section-h2 lp-section-h2--center" style={{ marginBottom: 12 }}>
          Le rÃ©seau, en direct.
        </h2>
        <p className="lp-body lp-body--center" style={{ marginBottom: 40 }}>
          Services, objets neufs ou d'occasion, ressources partagÃ©es â tout ce que les membres proposent.
        </p>

        {/* Vertical feed */}
        <div className="flex flex-col gap-2">
          {FALLBACK_ITEMS.map(l => (
            <TeaserCard key={l.id} listing={l} onEnter={onEnter} />
          ))}
          {/* CTA row at end */}
          <button
            onClick={onOpenFeed}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-dashed border-white/12 text-[12px] text-white/30 hover:text-white/60 hover:border-white/25 transition-all group mt-1"
          >
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            Voir toutes les annonces du rÃ©seau
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
            Explorer le fil d'actualitÃ©
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </section>
  );
}

// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// MAIN
// âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export default function LandingPage({ onEnter, onHowItWorks, onGoToPresence: _onGoToPresence, onMentions }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const openAI = useCallback(() => setAiOpen(true), []);
  const closeAI = useCallback(() => setAiOpen(false), []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className="lp-root">


      {/* ââ Persistent ambient blobs âââ */}
      <div className="lp-ambient" aria-hidden>
        <div className="lp-blob lp-blob-a" />
        <div className="lp-blob lp-blob-b" />
        <div className="lp-blob lp-blob-c" />
      </div>

      {/* ââ Global rain of profiles ââ */}
      <GlobalRain frozen={aiOpen} />

      {/* ââ Full-page spine connectome ââ */}
      <PageSpine />

      {/* ââ Nav âââââââââââââââââââââââââ */}
      <header role="banner">
        <nav className={`lp-nav ${scrolled ? 'lp-nav--scrolled' : ''}`} aria-label="Navigation principale">
          <div className="lp-nav-inner">
            <a href="/" className="lp-logo" aria-label="RENOVEC â Accueil">
              <div className="lp-logo-mark" aria-hidden="true" />
              <span>RENOVEC</span>
            </a>
            <div className="lp-nav-actions">
              <a href="/comment-ca-marche" onClick={(e) => { e.preventDefault(); onHowItWorks(); }} className="lp-nav-link hidden sm:block">
                Comment Ã§a marche
              </a>
              <a href="/entrer" onClick={(e) => { e.preventDefault(); onEnter(); }} className="lp-btn-outline-sm">
                Entrer <ArrowRight size={9} aria-hidden="true" />
              </a>
            </div>
          </div>
        </nav>
      </header>

      {/* ââââââââââââââââ 1. HERO ââââââââââââââââââââââââââââââââââââââââ */}
      <section className="lp-hero">
        <div className="lp-hero-canvas">
          <HeroConnectome className="w-full h-full" />
        </div>
        <div className="lp-hero-vignette" aria-hidden />

        <div className="lp-hero-humans" aria-hidden="true">
          <div className="lp-hero-human lp-hero-human--1">
            <div className="lp-hero-human-halo" />
            <img src={AVATARS.H1} alt="" className="lp-hero-human-img" loading="lazy" />
            <div className="lp-hero-human-info">
              <span className="lp-hero-human-name">Thomas</span>
              <span className="lp-hero-human-cap">comprend le droit locatif</span>
              <span className="lp-hero-human-loc">Bordeaux Â· Chartrons</span>
            </div>
          </div>
          <div className="lp-hero-human lp-hero-human--2">
            <div className="lp-hero-human-halo" />
            <img src={AVATARS.H2} alt="" className="lp-hero-human-img" loading="lazy" />
            <div className="lp-hero-human-info">
              <span className="lp-hero-human-name">Fatima</span>
              <span className="lp-hero-human-cap">utile sur les dossiers sociaux</span>
              <span className="lp-hero-human-loc">Lyon Â· Presqu'Ã®le</span>
            </div>
          </div>
          <div className="lp-hero-human lp-hero-human--3">
            <div className="lp-hero-human-halo" />
            <img src={AVATARS.Marc} alt="" className="lp-hero-human-img" loading="lazy" />
            <div className="lp-hero-human-info">
              <span className="lp-hero-human-name">Marc</span>
              <span className="lp-hero-human-cap">accompagne les transitions pro</span>
              <span className="lp-hero-human-loc">Paris Â· 11e</span>
            </div>
          </div>
        </div>

        <div className="lp-hero-content" id="contenu-principal">
          <div className="lp-hero-text">
            <p className="lp-eyebrow">Infrastructure orchestrÃ©e par IA</p>
            <h1 id="hero-title" className="lp-hero-h1">
              Le rÃ©seau qui<br />comprend avant<br />d'orienter.
            </h1>
            <p className="lp-hero-sub">
              L'IA lit chaque situation en langage libre.<br />
              Elle relie. Elle coordonne. Elle se souvient.<br />
              Pas de formulaire. Pas de case Ã  cocher.
            </p>
            <div className="lp-hero-ctas">
              <a href="/entrer" onClick={(e) => { e.preventDefault(); openAI(); }} className="lp-btn-primary group">
                Essayer maintenant
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
              </a>
            </div>
          </div>
          <div className="lp-hero-indicators">
            <div className="lp-indicator"><div className="lp-indicator-dot lp-dot-green" /><span>coordinateur IA actif</span></div>
            <div className="lp-indicator"><div className="lp-indicator-dot lp-dot-amber" /><span>situations en cours d'analyse</span></div>
          </div>
        </div>
        <div className="lp-hero-fade-bottom" aria-hidden />
      </section>

      {/* ââââââââââââââââ 1b. EXEMPLES CONCRETS ââââââââââââââââââââââââ */}
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

      {/* ââââââââââââââââ 2. ENTRÃE CONVERSATIONNELLE âââââââââââââââââââ */}
      <section className="lp-guest-match">
        <div className="lp-guest-match-header">
          <p className="lp-eyebrow lp-eyebrow--center">RÃ©sultats instantanÃ©s</p>
          <h2 className="lp-section-h2 lp-section-h2--center">
            Testez maintenant â<br />sans inscription
          </h2>
          <p className="lp-body lp-body--center" style={{ marginBottom: 0 }}>
            DÃ©crivez votre besoin. L'IA trouve les profils les plus compatibles en quelques secondes.
          </p>
        </div>
        <GuestMatchFlow onEnter={(needText) => {
          if (needText) sessionStorage.setItem('renovec_guest_need', needText);
          onEnter();
        }} isGuest={true} />
      </section>

      {/* ââââââââââââââââ 3. DÃMONSTRATION PRODUIT ââââââââââââââââââââââ */}
      {/* Pipeline steps fused as lead-in, then animated demo below      */}
      <section className="lp-demo-section">
        <div className="lp-demo-section-inner">
          <div className="lp-pipeline-inner" style={{ marginBottom: 56 }}>
            {[
              { n:'01', label:'Situation ouverte', body:'Vous exprimez ce que vous vivez en langage libre. L\'IA lit, interprÃ¨te, clarifie â sans formulaire, sans catÃ©gorie imposÃ©e.' },
              { n:'02', label:'Orchestration IA',  body:'L\'IA identifie les ressources pertinentes, construit le contexte, active les prÃ©sences. Aucun mÃ©canisme figÃ© ne dicte la rÃ©ponse.' },
              { n:'03', label:'Coordination vivante', body:'Un Ã©change commence. L\'IA retient ce qui a fonctionnÃ©. Le rÃ©seau devient plus intelligent Ã  chaque situation rÃ©solue.' },
            ].map((step, i) => (
              <div key={step.n} className="lp-pipeline-step">
                <div className="lp-pipeline-step-inner">
                  <span className="lp-pipeline-num">{step.n}</span>
                  <div className="lp-pipeline-line" />
                  <h3 className="lp-pipeline-label">{step.label}</h3>
                  <p className="lp-pipeline-body">{step.body}</p>
                </div>
                {i < 2 && <div className="lp-pipeline-arrow" />}
              </div>
            ))}
          </div>
          <div className="lp-demo-header">
            <p className="lp-eyebrow">L'IA en action</p>
            <h2 className="lp-section-h2">
              De la situation Ã  la coordination â<br />sans case, sans workflow.
            </h2>
            <p className="lp-body">
              L'IA comprend la situation, identifie les prÃ©sences, orchestre la mise en relation. Aucun chemin prÃ©visible ne s'impose.
            </p>
          </div>
          <ProductDemo onEnter={onEnter} />
        </div>
      </section>

      {/* ââââââââââââââââ 4. RÃSEAU VIVANT LOCAL ââââââââââââââââââââââââ */}
      {/* GeoMapSection + fused stats + TeaserMap                        */}
      <GeoMapSection />

      <section className="lp-network-stats">
        <div className="lp-network-stats-inner">
          <p className="lp-eyebrow lp-eyebrow--center">RÃ©seau actif</p>
          <h2 className="lp-section-h2 lp-section-h2--center">
            Un rÃ©seau vivant,<br />pas un annuaire figÃ©.
          </h2>
          <div className="lp-stats-row">
            <div className="lp-stat">
              <span className="lp-stat-number">{NETWORK_STATS.profiles.toLocaleString('fr-FR')}</span>
              <span className="lp-stat-label">profils actifs</span>
            </div>
            <div className="lp-stat-sep" />
            <div className="lp-stat">
              <span className="lp-stat-number">{NETWORK_STATS.zones}</span>
              <span className="lp-stat-label">zones couvertes</span>
            </div>
            <div className="lp-stat-sep" />
            <div className="lp-stat">
              <span className="lp-stat-number">{NETWORK_STATS.nearToulouse}</span>
              <span className="lp-stat-label">autour de Toulouse</span>
            </div>
          </div>
        </div>
      </section>

      <TeaserMap onEnter={onEnter} />

      {/* ââââââââââââââââ 5. INTELLIGENCE CUMULATIVE ââââââââââââââââââââ */}
      {/* MÃ©moire + Reconnaissance + Capital fusionnÃ©s en un seul bloc     */}
      <section className="lp-memory-section">
        <div className="lp-memory-label-left">
          <p className="lp-eyebrow">Intelligence cumulative</p>
          <h2 className="lp-section-h2 lp-section-h2--tight">
            Chaque aide reconnue<br />instruit le rÃ©seau.
          </h2>
          <p className="lp-body">
            L'IA mÃ©morise ce qui a fonctionnÃ© â pas comme un log, mais comme une connaissance active. Une aide reconnue n'est pas un like : c'est une inscription durable dans la mÃ©moire collective, qui renforce le capital du membre et amÃ©liore le rÃ©seau.
          </p>

          {/* SÃ©quence consolidation */}
          <div className="lp-consolidation-steps" style={{ marginTop: 28 }}>
            {[
              { n:'01', phase:'Situation',     detail:'Un besoin exprimÃ©.' },
              { n:'02', phase:'Ãchange',       detail:'Une aide se produit.' },
              { n:'03', phase:'Reconnaissance',detail:'L\'aide est reconnue.' },
              { n:'04', phase:'Consolidation', detail:'En mÃ©moire collective.', highlight:true },
            ].map((s, i) => (
              <div key={s.n} className="lp-consol-step">
                <div className={`lp-consol-num ${s.highlight ? 'lp-consol-num--active' : ''}`}>
                  <span>{s.n}</span>
                </div>
                <p className={`lp-consol-phase ${s.highlight ? 'lp-consol-phase--active' : ''}`}>{s.phase}</p>
                <p className="lp-consol-detail">{s.detail}</p>
                {i < 3 && <div className="lp-consol-arrow" />}
              </div>
            ))}
          </div>

          {/* Profil capital */}
          <div className="lp-profile-card" style={{ marginTop: 32 }}>
            <div className="lp-profile-header">
              <div className="lp-profile-avatar-photo">
                <img src={AVATARS.Marie} alt="Marie" className="lp-profile-avatar-img" loading="lazy" />
              </div>
              <div>
                <p className="lp-profile-name">Marie Â· Lyon 7e</p>
                <p className="lp-profile-since">Membre depuis 14 mois</p>
              </div>
            </div>
            <div className="lp-profile-bars">
              {PROFILE_BARS.map(b => <CapitalBar key={b.label} label={b.label} value={b.value} color={b.color} />)}
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
              <span className="lp-profile-link-badge">7 liens consolidÃ©s</span>
              <span className="lp-profile-link-badge">3 clusters actifs</span>
            </div>
          </div>
        </div>

        <div className="lp-memory-canvas-wrap">
          <HeroConnectome className="w-full h-full" />
          <div className="lp-memory-overlay-tag lp-memory-tag-tl">rÃ©seau local vivant</div>
          <div className="lp-memory-overlay-tag lp-memory-tag-br">
            <span className="lp-dot-amber-sm" />liaisons consolidÃ©es en mÃ©moire
          </div>
        </div>
      </section>

      {/* ââââââââââââââââ 6. DEUX PORTES D'ENTRÃE âââââââââââââââââââââââ */}
      <section className="lp-dual">
        <div className="lp-dual-header">
          <p className="lp-eyebrow">Deux faÃ§ons d'Ãªtre dans le rÃ©seau</p>
          <h2 className="lp-section-h2">
            Ceux qui traversent.<br />Ceux qui peuvent aider.
          </h2>
          <p className="lp-body lp-body--center">Le rÃ©seau entre les deux.</p>
        </div>
        <div className="lp-dual-cards">
          <div className="lp-dual-card lp-dual-card--seeker">
            <div className="lp-dual-card-glyph"><div className="lp-glyph-seek" /></div>
            <p className="lp-dual-card-role">Les chercheurs</p>
            <p className="lp-dual-card-headline">Vous traversez quelque chose.</p>
            <p className="lp-dual-card-body">
              Une situation difficile, floue, urgente. Exprimez-la. L'IA interprÃ¨te avant d'orienter â elle ne vous force pas dans une case.
            </p>
            <ul className="lp-dual-card-list">
              <li>Expression libre en langage naturel</li>
              <li>InterprÃ©tation IA du contexte rÃ©el</li>
              <li>Coordination adaptÃ©e Ã  votre situation spÃ©cifique</li>
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
            <span className="lp-bridge-label">rÃ©seau</span>
          </div>

          <div className="lp-dual-card lp-dual-card--presence">
            <div className="lp-dual-card-glyph"><div className="lp-glyph-give" /></div>
            <p className="lp-dual-card-role">Les prÃ©sences</p>
            <p className="lp-dual-card-headline">Vous savez aider.</p>
            <p className="lp-dual-card-body">
              Dans certains contextes prÃ©cis. L'IA sait quand vous Ãªtes pertinent â et vous active au bon moment, sans que vous ayez Ã  surveiller.
            </p>
            <ul className="lp-dual-card-list">
              <li>CapacitÃ©s comprises, pas seulement listÃ©es</li>
              <li>Activation IA selon la situation rÃ©elle</li>
              <li>Chaque aide reconnue renforce votre profil</li>
            </ul>
            <a href="/entrer" onClick={(e) => { e.preventDefault(); openAI(); }} className="lp-dual-cta group">
              Partager ma prÃ©sence <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* ââââââââââââââââ 7. FIL D'ACTUALITÃ ââââââââââââââââââââââââââââ */}
      <LandingFeedTeaser onEnter={onEnter} onOpenFeed={() => openAI()} />

      {/* ââââââââââââââââ 8. FINALE ââââââââââââââââââââââââââââââââââââââ */}
      <section className="lp-finale">
        <div className="lp-finale-glow" aria-hidden />
        <div className="lp-finale-rain" aria-hidden><ChatRain /></div>
        <div className="lp-finale-content">
          <div className="lp-finale-connectome">
            <HeroConnectome className="w-full h-full" />
          </div>
          <p className="lp-eyebrow lp-eyebrow--center">Rejoindre le rÃ©seau</p>
          <blockquote className="lp-finale-quote">
            "L'IA n'est pas l'interface.<br />Elle est l'intelligence qui coordonne."
          </blockquote>
          <div className="lp-finale-ctas">
            <a href="/entrer" onClick={(e) => { e.preventDefault(); openAI(); }} className="lp-btn-primary group">
              Entrer dans le rÃ©seau
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </a>
            <a href="/entrer" onClick={(e) => { e.preventDefault(); openAI(); }} className="lp-btn-ghost group">
              Partager ma prÃ©sence
              <ArrowRight size={11} className="lp-btn-ghost-arrow" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      {/* ââ Footer âââââ */}
      <footer className="lp-footer" role="contentinfo">
        <div className="lp-footer-inner">
          <p className="lp-footer-copy">RENOVEC Â· RÃ©seau orchestrÃ© par IA Â· 2026</p>
          <nav aria-label="Liens lÃ©gaux" className="flex items-center gap-4 flex-wrap">
            <a href="/mentions-legales" onClick={(e) => { e.preventDefault(); onMentions?.(); }} className="lp-footer-link">Mentions lÃ©gales</a>
            <a href="/politique-de-confidentialite" onClick={(e) => { e.preventDefault(); window.history.pushState(null, '', '/politique-de-confidentialite'); window.dispatchEvent(new PopStateEvent('popstate')); }} className="lp-footer-link">Politique de confidentialitÃ©</a>
            <a href="/conditions-generales" onClick={(e) => { e.preventDefault(); window.history.pushState(null, '', '/conditions-generales'); window.dispatchEvent(new PopStateEvent('popstate')); }} className="lp-footer-link">CGU</a>
          </nav>
        </div>
      </footer>

      {!aiOpen && <VoicePresence onOpenChat={openAI} />}

      {aiOpen && (
        <WorkspaceOverlay
          onClose={closeAI}
          onJoinNetwork={onEnter}
        />
      )}
    </div>
  );
}
