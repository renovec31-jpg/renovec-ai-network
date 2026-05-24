import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Content messages — philosophy & usage ────────────────────────────────────

const MESSAGES = [
  "Une aide reconnue.",
  "Contexte compris.",
  "Présence activée.",
  "Lien renforcé.",
  "Mémoire utile.",
  "Réseau qui apprend.",
  "Situation orientée.",
  "Capital consolidé.",
  "Échange enregistré.",
  "Profil enrichi.",
  "Activation locale.",
  "Coordination réelle.",
] as const;

interface Signal {
  id: number;
  text: string;
  x: number;   // % from left
  y: number;   // % from top
  scale: number;
  delay: number;
}

const isMob = typeof window !== 'undefined' && window.innerWidth < 768;
const MAX_SIGNALS  = isMob ? 2 : 5;
const SPAWN_MS     = isMob ? 6000 : 3800;

export default function NeuralSignals({ frozen }: { frozen: boolean }) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const counter  = useRef(0);
  const msgIdx   = useRef(0);
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;

  const spawn = useCallback(() => {
    if (frozenRef.current) return;
    const id    = counter.current++;
    const text  = MESSAGES[msgIdx.current % MESSAGES.length];
    msgIdx.current++;
    const signal: Signal = {
      id,
      text,
      x: 8 + Math.random() * 82,
      y: 10 + Math.random() * 78,
      scale: 0.7 + Math.random() * 0.9,
      delay: Math.random() * 0.4,
    };
    setSignals(prev => {
      const next = [...prev, signal];
      return next.length > MAX_SIGNALS ? next.slice(next.length - MAX_SIGNALS) : next;
    });
  }, []);

  const remove = useCallback((id: number) => {
    setSignals(prev => prev.filter(s => s.id !== id));
  }, []);

  useEffect(() => {
    const t0 = setTimeout(() => spawn(), 2000);
    const t1 = setTimeout(() => spawn(), 4200);
    const iv = setInterval(() => {
      if (!frozenRef.current) spawn();
    }, SPAWN_MS);
    return () => { clearTimeout(t0); clearTimeout(t1); clearInterval(iv); };
  }, [spawn]);

  return (
    <div
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {signals.map(sig => (
        <SignalNode
          key={sig.id}
          signal={sig}
          onDone={() => remove(sig.id)}
        />
      ))}
    </div>
  );
}

function SignalNode({ signal, onDone }: { signal: Signal; onDone: () => void }) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const t = setTimeout(() => doneRef.current(), 3800 + signal.delay * 1000);
    return () => clearTimeout(t);
  }, [signal]);

  const style = {
    '--ns-x':     `${signal.x}%`,
    '--ns-y':     `${signal.y}%`,
    '--ns-scale': signal.scale,
    '--ns-delay': `${signal.delay}s`,
  } as React.CSSProperties;

  return (
    <div className="ns-signal" style={style}>
      <div className="ns-text">{signal.text}</div>
      <div className="ns-burst">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="ns-dot" style={{ '--ns-i': i } as React.CSSProperties} />
        ))}
      </div>
    </div>
  );
}
