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
  pulsePhase: number;
  pulseSpeed: number;
  connections: number[];
}

const NODE_COUNT = 28;
const CONNECTION_DISTANCE = 0.22;
const BASE_SPEED = 0.00012;

function createNodes(): Node[] {
  const nodes: Node[] = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = BASE_SPEED * (0.6 + Math.random() * 0.8);
    const baseRadius = 1.5 + Math.random() * 2.5;
    nodes.push({
      x: 0.1 + Math.random() * 0.8,
      y: 0.1 + Math.random() * 0.8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: baseRadius,
      baseRadius,
      hue: 25 + Math.random() * 20,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.003 + Math.random() * 0.004,
      connections: [],
    });
  }
  return nodes;
}

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
      const dpr = window.devicePixelRatio || 1;
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
      const speedMult = 1 + act * 3;
      const t = timeRef.current++;

      ctx!.clearRect(0, 0, w, h);

      const nodes = nodesRef.current;

      // Update positions
      for (const node of nodes) {
        node.x += node.vx * speedMult;
        node.y += node.vy * speedMult;

        // Soft bounce at edges
        if (node.x < 0.05 || node.x > 0.95) node.vx *= -1;
        if (node.y < 0.05 || node.y > 0.95) node.vy *= -1;

        // Slight drift
        node.vx += (Math.random() - 0.5) * 0.000005;
        node.vy += (Math.random() - 0.5) * 0.000005;

        // Pulse
        node.pulsePhase += node.pulseSpeed * speedMult;
        node.radius = node.baseRadius + Math.sin(node.pulsePhase) * (0.8 + act * 1.5);
      }

      // Compute connections
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].connections = [];
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DISTANCE) {
            nodes[i].connections.push(j);
          }
        }
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (const j of nodes[i].connections) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const opacity = (1 - dist / CONNECTION_DISTANCE) * (0.06 + act * 0.12);

          // Pulse travelling along connection
          const pulsePos = (Math.sin(t * 0.02 + i * 0.3) * 0.5 + 0.5);

          ctx!.beginPath();
          ctx!.moveTo(a.x * w, a.y * h);
          ctx!.lineTo(b.x * w, b.y * h);
          ctx!.strokeStyle = `rgba(210, 165, 100, ${opacity})`;
          ctx!.lineWidth = 0.5 + act * 0.5;
          ctx!.stroke();

          // Travelling pulse dot
          if (act > 0.1 && opacity > 0.04) {
            const px = a.x + (b.x - a.x) * pulsePos;
            const py = a.y + (b.y - a.y) * pulsePos;
            ctx!.beginPath();
            ctx!.arc(px * w, py * h, 1.2 + act, 0, Math.PI * 2);
            ctx!.fillStyle = `rgba(242, 101, 34, ${opacity * 2})`;
            ctx!.fill();
          }
        }
      }

      // Draw nodes
      for (const node of nodes) {
        const x = node.x * w;
        const y = node.y * h;

        // Halo
        const haloSize = node.radius * (3 + act * 4);
        const grad = ctx!.createRadialGradient(x, y, 0, x, y, haloSize);
        grad.addColorStop(0, `hsla(${node.hue}, 40%, 65%, ${0.06 + act * 0.08})`);
        grad.addColorStop(1, 'hsla(30, 30%, 50%, 0)');
        ctx!.beginPath();
        ctx!.arc(x, y, haloSize, 0, Math.PI * 2);
        ctx!.fillStyle = grad;
        ctx!.fill();

        // Core
        ctx!.beginPath();
        ctx!.arc(x, y, node.radius, 0, Math.PI * 2);
        ctx!.fillStyle = `hsla(${node.hue}, 35%, 60%, ${0.25 + act * 0.35})`;
        ctx!.fill();
      }

      // Territorial halos (larger, subtle, fixed positions representing cities)
      const territories = [
        { x: 0.35, y: 0.4, r: 80, label: 'Toulouse' },
        { x: 0.55, y: 0.25, r: 45, label: 'Merville' },
        { x: 0.7, y: 0.6, r: 50, label: 'Muret' },
      ];

      for (const ter of territories) {
        const breathe = Math.sin(t * 0.008 + ter.x * 10) * 0.3 + 0.7;
        const r = ter.r * (breathe + act * 0.3);
        const grad = ctx!.createRadialGradient(ter.x * w, ter.y * h, 0, ter.x * w, ter.y * h, r);
        grad.addColorStop(0, `rgba(200, 160, 80, ${0.015 + act * 0.02})`);
        grad.addColorStop(0.6, `rgba(180, 140, 60, ${0.008 + act * 0.01})`);
        grad.addColorStop(1, 'rgba(150, 120, 50, 0)');
        ctx!.beginPath();
        ctx!.arc(ter.x * w, ter.y * h, r, 0, Math.PI * 2);
        ctx!.fillStyle = grad;
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
      style={{ opacity: 0.85 }}
    />
  );
}
