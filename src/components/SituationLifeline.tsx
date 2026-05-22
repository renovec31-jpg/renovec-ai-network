import { useState } from 'react';

export type LifelineEvent = {
  id: string;
  phase: 'seed' | 'clarifying' | 'emerging' | 'exchange' | 'contribution' | 'resolved';
  label: string;
  sub?: string;
  timestamp?: string;
  active?: boolean;
  future?: boolean;
};

type Props = {
  events: LifelineEvent[];
  compact?: boolean;
};

const PHASE_COLORS: Record<LifelineEvent['phase'], { dot: string; line: string; text: string; glow: string }> = {
  seed:         { dot: 'bg-stone-300',   line: 'bg-stone-200',   text: 'text-stone-500',   glow: '' },
  clarifying:   { dot: 'bg-amber-400',   line: 'bg-amber-200',   text: 'text-amber-700',   glow: 'shadow-[0_0_8px_2px_rgba(251,191,36,0.3)]' },
  emerging:     { dot: 'bg-amber-500',   line: 'bg-amber-300',   text: 'text-amber-700',   glow: 'shadow-[0_0_10px_3px_rgba(245,158,11,0.35)]' },
  exchange:     { dot: 'bg-stone-700',   line: 'bg-stone-300',   text: 'text-stone-700',   glow: '' },
  contribution: { dot: 'bg-emerald-400', line: 'bg-emerald-200', text: 'text-emerald-700', glow: 'shadow-[0_0_8px_2px_rgba(52,211,153,0.3)]' },
  resolved:     { dot: 'bg-emerald-500', line: 'bg-emerald-200', text: 'text-emerald-700', glow: '' },
};

export function buildLifeline(status: string, raw_text?: string): LifelineEvent[] {
  const base: LifelineEvent[] = [
    {
      id: 'seed',
      phase: 'seed',
      label: 'Situation exprimée',
      sub: raw_text ? raw_text.substring(0, 60) + (raw_text.length > 60 ? '…' : '') : undefined,
      active: status === 'draft' || status === 'submitted',
    },
    {
      id: 'clarifying',
      phase: 'clarifying',
      label: 'Ce qui devient plus clair',
      sub: 'La confusion se précise en objectif.',
      active: status === 'clarifying',
      future: !['clarifying', 'matched', 'closed'].includes(status),
    },
    {
      id: 'emerging',
      phase: 'emerging',
      label: 'Des appuis humains émergent',
      sub: "Des présences pertinentes s'organisent.",
      active: status === 'matched',
      future: !['matched', 'closed'].includes(status),
    },
    {
      id: 'exchange',
      phase: 'exchange',
      label: 'Un échange prend corps',
      sub: 'La situation avance dans la relation.',
      future: status !== 'closed',
    },
    {
      id: 'resolved',
      phase: 'resolved',
      label: 'Quelque chose se déplace',
      sub: 'Un mouvement a eu lieu.',
      future: status !== 'closed',
    },
  ];
  return base;
}

export default function SituationLifeline({ events, compact = false }: Props) {
  const [expanded, setExpanded] = useState(!compact);

  if (compact && !expanded) {
    // Compact mode: just the current active dot + label
    const active = events.find(e => e.active) || events[0];
    const colors = PHASE_COLORS[active.phase];
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2.5 group"
      >
        <div className={`w-2 h-2 rounded-full ${colors.dot} ${active.phase === 'clarifying' || active.phase === 'emerging' ? 'animate-pulse-dot' : ''} flex-shrink-0`} />
        <span className={`text-xs font-medium ${colors.text} group-hover:opacity-80 transition-opacity`}>{active.label}</span>
        <span className="text-xs text-stone-300 ml-1">···</span>
      </button>
    );
  }

  return (
    <div className={`${compact ? 'py-3' : 'py-1'}`}>
      {compact && (
        <button
          onClick={() => setExpanded(false)}
          className="text-xs text-stone-300 hover:text-stone-500 transition-colors mb-4 block"
        >
          Réduire ↑
        </button>
      )}
      <div className="space-y-0">
        {events.map((ev, i) => {
          const colors = PHASE_COLORS[ev.phase];
          const isLast = i === events.length - 1;
          const isActive = ev.active;
          const isFuture = ev.future && !isActive;

          return (
            <div key={ev.id} className="flex gap-3.5">
              {/* Track */}
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: 20 }}>
                {/* Dot */}
                <div className={`
                  relative z-10 flex-shrink-0 transition-all duration-500
                  ${isFuture ? 'w-2 h-2 mt-1.5' : 'w-3 h-3 mt-1'}
                  rounded-full
                  ${isFuture ? 'bg-stone-200' : colors.dot}
                  ${isActive && (ev.phase === 'clarifying' || ev.phase === 'emerging') ? 'animate-pulse-dot ' + colors.glow : ''}
                `} />
                {/* Line down */}
                {!isLast && (
                  <div className={`flex-1 w-px mt-1 mb-0 transition-all duration-500 ${isFuture ? 'bg-stone-100' : colors.line}`}
                    style={{ minHeight: 20 }}
                  />
                )}
              </div>

              {/* Content */}
              <div className={`pb-5 last:pb-0 flex-1 min-w-0 ${isFuture ? 'opacity-50' : ''} transition-opacity duration-300`}>
                <p className={`text-sm font-medium leading-tight ${isFuture ? 'text-stone-500' : isActive ? colors.text : 'text-stone-700'}`}>
                  {ev.label}
                </p>
                {ev.sub && !compact && (
                  <p className={`text-xs mt-0.5 leading-relaxed ${isFuture ? 'text-stone-400' : 'text-stone-500'}`}>
                    {ev.sub}
                  </p>
                )}
                {ev.timestamp && !isFuture && (
                  <p className="text-xs text-stone-300 mt-1">{ev.timestamp}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
