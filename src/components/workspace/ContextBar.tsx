import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { ContextLine } from '../../contexts/WorkspaceContext';

export default function ContextBar({ lines }: { lines: ContextLine[] }) {
  const [expanded, setExpanded] = useState(true);

  if (lines.length === 0) return null;

  return (
    <div className="flex-shrink-0 mx-5 mt-5 mb-2 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] via-amber-500/[0.015] to-transparent overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-3.5 flex items-center justify-between group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-md bg-amber-500/10 border border-amber-400/15 flex items-center justify-center">
            <Sparkles size={10} className="text-amber-400/70" />
          </div>
          <span className="text-[11px] tracking-wider uppercase text-white/40 font-semibold">
            Contexte compris
          </span>
          <span className="text-[9px] text-white/20 bg-white/[0.04] px-1.5 py-0.5 rounded font-medium">{lines.length}</span>
        </div>
        {expanded
          ? <ChevronUp size={12} className="text-white/15 group-hover:text-white/40 transition-colors" />
          : <ChevronDown size={12} className="text-white/15 group-hover:text-white/40 transition-colors" />}
      </button>

      {expanded && (
        <div className="px-5 pb-4 pt-1 space-y-2 animate-fade-in">
          {lines.map((line, i) => (
            <div key={i} className="flex items-baseline gap-3">
              <span className="text-[10px] text-amber-400/40 font-semibold uppercase tracking-wide min-w-[75px] flex-shrink-0">{line.label}</span>
              <span className="text-[12px] text-white/55 leading-relaxed">{line.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
