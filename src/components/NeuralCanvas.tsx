import { useEffect, useRef } from 'react';

type Props = {
  activity: number; // 0 = resting, 1 = max activity
};

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  hue: number;
  saturation: number;
  pulsePhase: number;
  pulseSpeed: number;
}

const NODE_COUNT = 22;
const CONNECTION_DISTANCE = 0.2;
const BASE_SPEED = 0.00008;

function createNodes(): Node[] {
  const nodes: Node[] = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = BASE_SPEED * (0.5 + Math.random() * 1);
    nodes.push({
      x: 0.08 + Math.random() * 0.84,
      y: 0.08 + Math.random() * 0.84,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2.5 + Math.random() * 3,
      baseRadius: 2.5 + Math.random() * 3,
      hue: 20 + Math.random() * 25, // warm amber-orange range
      saturation: 30 + Math.random() * 25,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.002 + Math.random() * 0.003,
    });
  }
  return nodes;
}

// Territorial presence zones — represent communities
const TERRITORIES = [
  { x: 0.32, y: 0.38, r: 110, hue: 28, label: 'Toulouse' },
  { x: 0.58, y: 0.22, r: 65, hue: 35, label: 'Merville' },
  { x: 0.72, y: 0.58, r: 55, hue: 22, label: 'Muret' },
  { x: 0.2, y: 0.7, r: 50, hue: 30, label: 'Colomiers' },
  { x: 0.8, y: 0.3, r: 40, hue: 25, label: 'Blagnac' },
];

export default function NeuralCanvas({ activity }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const animRef = useRef<number>(0);
  const activityRef = useRef(activity);
  const timeRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    activityRef.current = activity;
  }, [activity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas!.getBoundingClientRect();
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      sizeRef.current = { w: rect.width, h: rect.height };
      if (nodesRef.current.length === 0) {
        nodesRef.current = createNodes();
      }
    }

    resize();
    window.addEventListener('resize', resize);

    function draw() {
      const { w, h } = sizeRef.current;
      if (!w || !h) { animRef.current = requestAnimationFrame(draw); return; }

      const act = activityRef.current;
      const speedMult = 1 + act * 2.5;
      const t = timeRef.current++;

      ctx!.clearRect(0, 0, w, h);

      // ── Background warmth: very subtle radial gradient ──
      const bgGrad = ctx!.createRadialGradient(w * 0.4, h * 0.45, 0, w * 0.4, h * 0.45, w * 0.7);
      bgGrad.addColorStop(0, `rgba(60, 35, 10, ${0.04 + act * 0.03})`);
      bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx!.fillStyle = bgGrad;
      ctx!.fillRect(0, 0, w, h);

      // ── Territorial halos ──
      for (const ter of TERRITORIES) {
        const breathe = Math.sin(t * 0.005 + ter.x * 8) * 0.2 + 0.85;
        const r = ter.r * (breathe + act * 0.25);
        const grad = ctx!.createRadialGradient(ter.x * w, ter.y * h, 0, ter.x * w, ter.y * h, r);
        grad.addColorStop(0, `hsla(${ter.hue}, 45%, 50%, ${0.04 + act * 0.035})`);
        grad.addColorStop(0.4, `hsla(${ter.hue}, 35%, 40%, ${0.02 + act * 0.02})`);
        grad.addColorStop(1, 'hsla(30, 20%, 30%, 0)');
        ctx!.beginPath();
        ctx!.arc(ter.x * w, ter.y * h, r, 0, Math.PI * 2);
        ctx!.fillStyle = grad;
        ctx!.fill();
      }

      const nodes = nodesRef.current;

      // ── Update node positions ──
      for (const node of nodes) {
        node.x += node.vx * speedMult;
        node.y += node.vy * speedMult;

        if (node.x < 0.04 || node.x > 0.96) { node.vx *= -1; node.x = Math.max(0.04, Math.min(0.96, node.x)); }
        if (node.y < 0.04 || node.y > 0.96) { node.vy *= -1; node.y = Math.max(0.04, Math.min(0.96, node.y)); }

        node.vx += (Math.random() - 0.5) * 0.000003;
        node.vy += (Math.random() - 0.5) * 0.000003;

        node.pulsePhase += node.pulseSpeed * speedMult;
        node.radius = node.baseRadius + Math.sin(node.pulsePhase) * (1 + act * 2);
      }

      // ── Draw connections (subtle) ──
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DISTANCE) {
            const opacity = (1 - dist / CONNECTION_DISTANCE) * (0.03 + act * 0.06);

            ctx!.beginPath();
            ctx!.moveTo(nodes[i].x * w, nodes[i].y * h);
            ctx!.lineTo(nodes[j].x * w, nodes[j].y * h);
            ctx!.strokeStyle = `rgba(190, 150, 90, ${opacity})`;
            ctx!.lineWidth = 0.4 + act * 0.3;
            ctx!.stroke();

            // Travelling impulse
            if (act > 0.15 && opacity > 0.025) {
              const pulsePos = (Math.sin(t * 0.015 + i * 0.5 + j * 0.3) * 0.5 + 0.5);
              const px = nodes[i].x + (nodes[j].x - nodes[i].x) * pulsePos;
              const py = nodes[i].y + (nodes[j].y - nodes[i].y) * pulsePos;
              const pulseGrad = ctx!.createRadialGradient(px * w, py * h, 0, px * w, py * h, 4 + act * 3);
              pulseGrad.addColorStop(0, `rgba(242, 101, 34, ${opacity * 3})`);
              pulseGrad.addColorStop(1, 'rgba(242, 101, 34, 0)');
              ctx!.beginPath();
              ctx!.arc(px * w, py * h, 4 + act * 3, 0, Math.PI * 2);
              ctx!.fillStyle = pulseGrad;
              ctx!.fill();
            }
          }
        }
      }

      // ── Draw nodes ──
      for (const node of nodes) {
        const x = node.x * w;
        const y = node.y * h;

        // Outer halo
        const haloR = node.radius * (4 + act * 5);
        const haloGrad = ctx!.createRadialGradient(x, y, 0, x, y, haloR);
        haloGrad.addColorStop(0, `hsla(${node.hue}, ${node.saturation}%, 55%, ${0.08 + act * 0.1})`);
        haloGrad.addColorStop(0.5, `hsla(${node.hue}, ${node.saturation - 10}%, 45%, ${0.03 + act * 0.04})`);
        haloGrad.addColorStop(1, 'hsla(30, 20%, 40%, 0)');
        ctx!.beginPath();
        ctx!.arc(x, y, haloR, 0, Math.PI * 2);
        ctx!.fillStyle = haloGrad;
        ctx!.fill();

        // Core
        const coreGrad = ctx!.createRadialGradient(x, y, 0, x, y, node.radius);
        coreGrad.addColorStop(0, `hsla(${node.hue}, ${node.saturation}%, 70%, ${0.4 + act * 0.35})`);
        coreGrad.addColorStop(1, `hsla(${node.hue}, ${node.saturation}%, 50%, ${0.15 + act * 0.2})`);
        ctx!.beginPath();
        ctx!.arc(x, y, node.radius, 0, Math.PI * 2);
        ctx!.fillStyle = coreGrad;
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
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
