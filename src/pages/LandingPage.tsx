import { useState, useCallback, useEffect, useRef } from 'react';
import { Mic, ArrowRight, Send, Loader, X, Radio } from 'lucide-react';

type Props = {
  onEnter: () => void;
  onHowItWorks: () => void;
};

// ─── FOREGROUND MEMBERS (visible with full detail) ───────────────────────────
const FG_MEMBERS = [
  { id: 'laurent', name: 'Laurent Esquié', role: 'Coordinateur chantier', city: 'Merville', x: 0.15, y: 0.35, photo: 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=150' },
  { id: 'claire', name: 'Claire Fontan', role: 'Architecte intérieur', city: 'Toulouse', x: 0.42, y: 0.2, photo: 'https://images.pexels.com/photos/3756679/pexels-photo-3756679.jpeg?auto=compress&cs=tinysrgb&w=150' },
  { id: 'bascou', name: 'Atelier Bascou', role: 'Menuiserie bois', city: 'Blagnac', x: 0.68, y: 0.28, photo: 'https://images.pexels.com/photos/5691622/pexels-photo-5691622.jpeg?auto=compress&cs=tinysrgb&w=150' },
  { id: 'sophie', name: 'Sophie Cazenave', role: 'Plomberie / chauffage', city: 'Colomiers', x: 0.28, y: 0.65, photo: 'https://images.pexels.com/photos/3785079/pexels-photo-3785079.jpeg?auto=compress&cs=tinysrgb&w=150' },
  { id: 'remi', name: 'Rémi Delcros', role: 'Électricité générale', city: 'L\'Isle-Jourdain', x: 0.55, y: 0.55, photo: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150' },
];

// ─── MID-LAYER NODES (smaller, discreet labels) ─────────────────────────────
const MID_NODES: { x: number; y: number; label: string }[] = [
  { x: -0.04, y: 0.12, label: 'M. Garnier' },
  { x: 0.88, y: 0.08, label: 'Duval P.' },
  { x: 0.95, y: 0.52, label: 'Leclerc' },
  { x: -0.02, y: 0.58, label: 'Arnaud B.' },
  { x: 0.78, y: 0.78, label: 'Martin J.' },
  { x: 0.08, y: 0.88, label: 'Renaud' },
  { x: 0.52, y: 0.88, label: 'Petit V.' },
  { x: 0.35, y: 0.92, label: 'Lopez' },
  { x: 0.92, y: 0.88, label: 'Blanc' },
  { x: 1.02, y: 0.3, label: 'Faure' },
  { x: -0.06, y: 0.38, label: 'Moreau' },
  { x: 0.18, y: -0.02, label: 'Girard' },
  { x: 0.62, y: -0.04, label: 'Roux H.' },
  { x: 0.88, y: -0.02, label: 'Lambert' },
  { x: 1.04, y: 0.68, label: 'Mercier' },
];

// ─── BACKGROUND CONSTELLATION (dense, anonymous dots) ────────────────────────
// Seeded pseudo-random for deterministic positions across renders
function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const BG_NODES: { x: number; y: number }[] = (() => {
  const rng = seededRandom(42);
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 80; i++) {
    pts.push({ x: -0.12 + rng() * 1.24, y: -0.12 + rng() * 1.24 });
  }
  return pts;
})();

// Build links between all layers
type NetNode = { x: number; y: number; layer: 0 | 1 | 2 };

function buildAllNodes(): NetNode[] {
  const all: NetNode[] = [];
  for (const m of FG_MEMBERS) all.push({ x: m.x, y: m.y, layer: 0 });
  for (const m of MID_NODES) all.push({ x: m.x, y: m.y, layer: 1 });
  for (const m of BG_NODES) all.push({ x: m.x, y: m.y, layer: 2 });
  return all;
}

function buildAllLinks(nodes: NetNode[]): [number, number][] {
  const links: [number, number][] = [];
  const maxDist = 0.22;
  for (let i = 0; i < nodes.length; i++) {
    let connections = 0;
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxDist) {
        links.push([i, j]);
        connections++;
        if (connections > 4) break;
      }
    }
  }
  return links;
}

const ALL_NODES = buildAllNodes();
const ALL_LINKS = buildAllLinks(ALL_NODES);

// ─── FEED ITEMS ─────────────────────────────────────────────────────────────
const FEED_ITEMS = [
  { type: 'Service', title: 'Conseil comptabilité', author: 'Florian Boyer', city: 'Perpignan', exchange: 'Troc possible' },
  { type: 'Service', title: 'Développement web session découverte', author: 'Florian Boyer', city: 'Perpignan', exchange: 'Gratuit 1h' },
  { type: 'Occasion', title: 'Objet en lien avec activité', author: 'Florian Boyer', city: 'Perpignan', exchange: 'Offert' },
  { type: 'Service', title: 'Lettres de motivation', author: 'Sarah Bonnet', city: 'Rennes', exchange: 'À négocier' },
  { type: 'Service', title: 'Formation WordPress', author: 'Sarah Bonnet', city: 'Rennes', exchange: 'Gratuit 1h' },
  { type: 'Service', title: 'Ateliers couture', author: 'Laura Fontaine', city: 'Amiens', exchange: 'Troc' },
  { type: 'Service', title: 'Transport de personnes', author: 'Tom Du.', city: 'Avignon', exchange: 'À négocier' },
  { type: 'Recherche', title: 'Plombier dispo rapidement', author: 'Sophie Cazenave', city: 'Colomiers', exchange: 'À négocier' },
];

const TYPE_COLORS: Record<string, string> = {
  'Service': '#E55A1E',
  'Recherche': '#5ab478',
  'Occasion': '#c8a85a',
};

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function LandingPage({ onEnter, onHowItWorks }: Props) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white overflow-hidden relative">
      {/* Header */}
      <Header onEnter={onEnter} onHowItWorks={onHowItWorks} />

      {/* Full-screen network canvas behind everything */}
      <NetworkVis />

      {/* Hero content overlaid */}
      <div className="relative z-10">
        <Hero onEnter={onEnter} />
      </div>

      {/* Feed panel — always visible on desktop */}
      <FeedPanel />

      {/* Chat widget — compact overlay, entry point to IA */}
      <ChatWidget />
    </div>
  );
}

// ─── HEADER ──────────────────────────────────────────────────────────────────
function Header({ onEnter, onHowItWorks }: { onEnter: () => void; onHowItWorks: () => void }) {
  return (
    <header className="h-14 flex items-center justify-between px-5 md:px-8 border-b border-white/[0.04] relative z-30">
      <div className="flex items-center gap-2.5">
        <div className="w-5 h-5 bg-[#E55A1E] rounded flex items-center justify-center">
          <div className="w-2 h-2 rounded-sm bg-white opacity-90" />
        </div>
        <span className="text-[14px] font-bold tracking-tight">RENOVEC</span>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={onHowItWorks} className="text-[12px] text-white/30 hover:text-white/60 transition-colors hidden md:block">
          Comment ça marche
        </button>
        <button
          onClick={onEnter}
          className="text-[11px] font-medium text-white/50 hover:text-white border border-white/[0.1] hover:border-white/25 px-4 py-1.5 rounded-lg transition-all hover:bg-white/[0.03]"
        >
          Entrer
        </button>
      </div>
    </header>
  );
}

// ─── HERO ────────────────────────────────────────────────────────────────────
function Hero({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="relative z-10 px-6 md:px-12 pt-16 md:pt-24 pb-8 max-w-2xl">
      <div className="mb-4 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#E55A1E]/60" />
        <span className="text-[10px] tracking-[0.2em] uppercase text-white/25 font-medium">
          Infrastructure orchestrée par IA
        </span>
      </div>
      <h1 className="text-[28px] md:text-[38px] font-bold leading-[1.15] tracking-tight text-white/95 mb-5">
        Le réseau qui comprend<br />avant d'orienter.
      </h1>
      <p className="text-[14px] md:text-[15px] leading-[1.7] text-white/40 max-w-lg mb-8">
        L'IA lit chaque situation en langage libre. Elle relie. Elle coordonne. Elle se souvient.
        Pas de formulaire. Pas de case à cocher.
      </p>
      <div className="flex flex-wrap items-center gap-3 mb-12">
        <button
          onClick={onEnter}
          className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-[#E55A1E] text-white text-[13px] font-semibold hover:bg-[#d04f16] transition-colors"
        >
          Exprimer une situation
          <ArrowRight size={14} />
        </button>
        <button
          onClick={onEnter}
          className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl border border-white/[0.1] text-white/60 text-[13px] font-medium hover:border-white/25 hover:text-white/85 transition-all hover:bg-white/[0.02]"
        >
          Partager ma présence
        </button>
      </div>
      {/* Indicators */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-white/25">coordinateur IA actif</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
          <span className="text-[11px] text-white/25">situations en cours d'analyse</span>
        </div>
      </div>
    </div>
  );
}

// ─── NETWORK VIS (3-layer full-screen) ───────────────────────────────────────
function NetworkVis() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas!.getBoundingClientRect();
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    let t = 0;
    function draw() {
      const rect = canvas!.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx!.clearRect(0, 0, w, h);
      t++;

      // ── LAYER 3: Background constellation dots ──
      for (const bg of BG_NODES) {
        const x = bg.x * w;
        const y = bg.y * h;
        ctx!.beginPath();
        ctx!.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx!.fillStyle = 'rgba(229, 90, 30, 0.12)';
        ctx!.fill();
      }

      // ── Draw all links with layer-based styling ──
      for (let li = 0; li < ALL_LINKS.length; li++) {
        const [ai, bi] = ALL_LINKS[li];
        const a = ALL_NODES[ai];
        const b = ALL_NODES[bi];
        const ax = a.x * w, ay = a.y * h;
        const bx = b.x * w, by = b.y * h;

        // Determine link opacity/width by deepest layer of the pair
        const deepest = Math.max(a.layer, b.layer);
        const lineAlpha = deepest === 0 ? 0.14 : deepest === 1 ? 0.07 : 0.03;
        const lineWidth = deepest === 0 ? 1.2 : deepest === 1 ? 0.8 : 0.4;
        const impulseR = deepest === 0 ? 14 : deepest === 1 ? 8 : 4;
        const impulseAlpha = deepest === 0 ? 0.8 : deepest === 1 ? 0.4 : 0.15;

        // Link line
        ctx!.beginPath();
        ctx!.moveTo(ax, ay);
        ctx!.lineTo(bx, by);
        ctx!.strokeStyle = `rgba(229, 90, 30, ${lineAlpha})`;
        ctx!.lineWidth = lineWidth;
        ctx!.stroke();

        // Travelling impulse
        const speed = 0.0007 + (li % 7) * 0.00015;
        const pos = ((t * speed + li * 0.09) % 1);
        const px = ax + (bx - ax) * pos;
        const py = ay + (by - ay) * pos;

        const grad = ctx!.createRadialGradient(px, py, 0, px, py, impulseR);
        grad.addColorStop(0, `rgba(229, 90, 30, ${impulseAlpha})`);
        grad.addColorStop(0.5, `rgba(229, 90, 30, ${impulseAlpha * 0.3})`);
        grad.addColorStop(1, 'rgba(229, 90, 30, 0)');
        ctx!.beginPath();
        ctx!.arc(px, py, impulseR, 0, Math.PI * 2);
        ctx!.fillStyle = grad;
        ctx!.fill();
      }

      // ── LAYER 2: Mid-layer node dots ──
      for (const mid of MID_NODES) {
        const x = mid.x * w;
        const y = mid.y * h;
        const hGrad = ctx!.createRadialGradient(x, y, 0, x, y, 18);
        hGrad.addColorStop(0, 'rgba(229, 90, 30, 0.08)');
        hGrad.addColorStop(1, 'rgba(229, 90, 30, 0)');
        ctx!.beginPath();
        ctx!.arc(x, y, 18, 0, Math.PI * 2);
        ctx!.fillStyle = hGrad;
        ctx!.fill();

        ctx!.beginPath();
        ctx!.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx!.fillStyle = 'rgba(229, 90, 30, 0.3)';
        ctx!.fill();
      }

      // ── LAYER 1: Foreground node halos ──
      for (const m of FG_MEMBERS) {
        const x = m.x * w;
        const y = m.y * h;
        const haloGrad = ctx!.createRadialGradient(x, y, 0, x, y, 55);
        haloGrad.addColorStop(0, 'rgba(229, 90, 30, 0.12)');
        haloGrad.addColorStop(0.5, 'rgba(229, 90, 30, 0.04)');
        haloGrad.addColorStop(1, 'rgba(229, 90, 30, 0)');
        ctx!.beginPath();
        ctx!.arc(x, y, 55, 0, Math.PI * 2);
        ctx!.fillStyle = haloGrad;
        ctx!.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    }
    animRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div className="absolute inset-0 top-14 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Mid-layer labels (very discreet) */}
      {MID_NODES.map((m, i) => {
        const inView = m.x > -0.01 && m.x < 1.01 && m.y > -0.01 && m.y < 1.01;
        if (!inView) return null;
        return (
          <div
            key={`mid-${i}`}
            className="absolute pointer-events-none"
            style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%`, transform: 'translate(-50%, -50%)' }}
          >
            <span className="text-[8px] text-white/12 font-medium whitespace-nowrap">{m.label}</span>
          </div>
        );
      })}

      {/* Foreground members with full detail */}
      {FG_MEMBERS.map(m => (
        <div
          key={m.id}
          className="absolute flex flex-col items-center gap-1.5 pointer-events-none"
          style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%`, transform: 'translate(-50%, -50%)' }}
        >
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#E55A1E]/40 shadow-lg shadow-black/50">
            <img src={m.photo} alt={m.name} className="w-full h-full object-cover" />
          </div>
          <div className="text-center">
            <div className="text-[10px] md:text-[11px] font-semibold text-white/75 whitespace-nowrap">{m.name}</div>
            <div className="text-[9px] text-white/30 whitespace-nowrap">{m.role} · {m.city}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── FEED PANEL (always visible on desktop) ─────────────────────────────────
function FeedPanel() {
  return (
    <div className="fixed top-14 right-0 bottom-0 w-[360px] z-20 bg-[#0D0D0D]/95 backdrop-blur-xl border-l border-white/[0.05] hidden lg:flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-white/50 tracking-[0.08em] uppercase">Fil d'actualité</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] text-white/25">En direct</span>
          </div>
        </div>
      </div>
      {/* Counter */}
      <div className="px-5 py-2.5 border-b border-white/[0.03]">
        <span className="text-[10px] text-white/20">2 645 services dans le réseau</span>
      </div>
      {/* Items */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {FEED_ITEMS.map((item, i) => (
          <div key={i} className="px-5 py-3.5 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ color: TYPE_COLORS[item.type], backgroundColor: `${TYPE_COLORS[item.type]}12` }}
              >
                {item.type}
              </span>
              <span
                className="text-[9px] px-1.5 py-0.5 rounded border ml-auto"
                style={{ color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.06)' }}
              >
                {item.exchange}
              </span>
            </div>
            <p className="text-[12px] text-white/55 leading-[1.5] font-medium mb-0.5">{item.title}</p>
            <p className="text-[10px] text-white/20">{item.author} · {item.city}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CHAT WIDGET ─────────────────────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const CHAT_URL = `${SUPABASE_URL}/functions/v1/voice-welcome`;
const TTS_URL = `${SUPABASE_URL}/functions/v1/tts-elevenlabs`;
const API_HEADERS = {
  'Authorization': `Bearer ${SUPABASE_ANON}`,
  'Apikey': SUPABASE_ANON,
};

function ChatWidget() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [history, setHistory] = useState<{ id: string; role: 'user' | 'assistant'; content: string }[]>([]);
  const [textInput, setTextInput] = useState('');
  const [thinking, setThinking] = useState(false);

  const historyRef = useRef(history);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<ReturnType<typeof getSR> | null>(null);
  const isListeningRef = useRef(false);
  const processingRef = useRef(false);

  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history, thinking]);

  const addTurn = useCallback((role: 'user' | 'assistant', content: string) => {
    setHistory(h => [...h, { id: `${role}_${Date.now()}_${Math.random()}`, role, content }]);
  }, []);

  const playTTS = useCallback(async (text: string) => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      const res = await fetch(TTS_URL, {
        method: 'POST',
        headers: { ...API_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice_id: "3xmA3rwGMRsLGbkC7E3u" }),
      });
      if (!res.ok) return;
      const buf = await res.arrayBuffer();
      if (!buf.byteLength) return;
      const audioBuf = await ctx.decodeAudioData(buf);
      const source = ctx.createBufferSource();
      source.buffer = audioBuf;
      source.connect(ctx.destination);
      source.start(0);
    } catch {}
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || processingRef.current) return;
    processingRef.current = true;
    setThinking(true);
    addTurn('user', text.trim());

    try {
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { ...API_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: historyRef.current.slice(-8).map(t => ({ role: t.role, content: t.content })),
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error();
      const data = await res.json() as { reply?: string };
      const reply = data.reply || 'Je suis là.';
      addTurn('assistant', reply);
      await playTTS(reply);
    } catch {
      addTurn('assistant', 'Dis-moi.');
    } finally {
      processingRef.current = false;
      setThinking(false);
    }
  }, [addTurn, playTTS]);

  const handleOpen = useCallback(async () => {
    setPanelOpen(true);

    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
    }
    audioCtxRef.current.resume().catch(() => {});

    if (history.length === 0) {
      addTurn('assistant', 'Salut. Dis-moi ce qui t\'amène.');
    }
    setTimeout(() => inputRef.current?.focus(), 200);
  }, [history.length, addTurn]);

  const toggleListening = useCallback(async () => {
    if (listening) {
      isListeningRef.current = false;
      try { recognitionRef.current?.abort(); } catch {}
      recognitionRef.current = null;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setListening(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch {
      return;
    }

    const Ctor = getSR();
    if (!Ctor) { streamRef.current?.getTracks().forEach(t => t.stop()); return; }

    const rec = new Ctor();
    rec.lang = 'fr-FR';
    rec.continuous = true;
    rec.interimResults = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const transcript = e.results[i][0].transcript.trim();
          if (transcript.length > 1) {
            sendMessage(transcript);
          }
        }
      }
    };

    rec.onend = () => {
      if (isListeningRef.current) try { rec.start(); } catch {}
    };

    rec.onerror = () => {};

    recognitionRef.current = rec;
    isListeningRef.current = true;
    setListening(true);
    try { rec.start(); } catch {}
  }, [listening, sendMessage]);

  const handleTextSubmit = () => {
    const msg = textInput.trim();
    if (!msg || thinking) return;
    setTextInput('');
    sendMessage(msg);
  };

  // Cleanup
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    try { recognitionRef.current?.abort(); } catch {}
  }, []);

  return (
    <>
      {/* Trigger button — bottom right */}
      {!panelOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-full bg-[#E55A1E] text-white shadow-xl shadow-black/40 hover:bg-[#d04f16] transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Radio size={15} />
          <span className="text-[12px] font-semibold">Parler à RENOVEC</span>
        </button>
      )}

      {/* Panel */}
      {panelOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[340px] max-h-[480px] flex flex-col rounded-2xl bg-[#111111] border border-white/[0.08] shadow-2xl shadow-black/60 overflow-hidden animate-fade-up">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[12px] font-bold text-white/70">RENOVEC</span>
              <span className="text-[10px] text-white/25">{listening ? 'à l\'écoute' : 'en ligne'}</span>
            </div>
            <button onClick={() => { setPanelOpen(false); if (listening) toggleListening(); }} className="p-1.5 text-white/20 hover:text-white/50 transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 scrollbar-hide max-h-[300px]">
            {history.map(turn => (
              <div key={turn.id} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[12px] leading-[1.6] ${
                  turn.role === 'user'
                    ? 'bg-white/[0.07] text-white/80 rounded-br-md'
                    : 'text-white/50 rounded-bl-md'
                }`}>
                  {turn.content}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="flex gap-1 px-3 py-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Voice control */}
          <div className="px-4 py-2 border-t border-white/[0.04]">
            <button
              onClick={toggleListening}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-semibold transition-all ${
                listening
                  ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                  : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:text-white/60 hover:border-white/[0.12]'
              }`}
            >
              <Mic size={13} />
              {listening ? 'À l\'écoute · tap pour arrêter' : 'Activer le micro'}
            </button>
          </div>

          {/* Text input */}
          <div className="px-4 pb-3 pt-1">
            <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
              <input
                ref={inputRef}
                type="text"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
                placeholder="Ou écrivez..."
                disabled={thinking}
                className="flex-1 bg-transparent px-3.5 py-2.5 text-[12px] text-white/70 placeholder-white/15 focus:outline-none"
              />
              <button
                onClick={handleTextSubmit}
                disabled={!textInput.trim() || thinking}
                className="p-2 text-white/20 hover:text-white/50 disabled:opacity-20 transition-colors"
              >
                {thinking ? <Loader size={13} className="animate-spin" /> : <Send size={13} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSR(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}
