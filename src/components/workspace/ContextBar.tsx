import { ChevronDown, ChevronUp, Brain } from 'lucide-react';
import { useState } from 'react';
import type { ContextLine } from '../../contexts/WorkspaceContext';

export default function ContextBar({ lines }: { lines: ContextLine[] }) {
  const [expanded, setExpanded] = useState(true);

  if (lines.length === 0) return null;

  return (
    <div className="flex-shrink-0 border-b border-white/[0.04] bg-white/[0.01]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-3.5 flex items-center justify-between group"
      >
        <div className="flex items-center gap-2.5">
          <Brain size={12} className="text-amber-400/60" />
          <span className="text-[11px] tracking-widest uppercase text-white/30 font-medium">
            Contexte compris
          </span>
          <span className="text-[10px] text-white/15 bg-white/[0.04] px-1.5 py-0.5 rounded">{lines.length}</span>
        </div>
        {expanded
          ? <ChevronUp size={13} className="text-white/15 group-hover:text-white/35 transition-colors" />
          : <ChevronDown size={13} className="text-white/15 group-hover:text-white/35 transition-colors" />}
      </button>

      {expanded && (
        <div className="px-6 pb-5 space-y-2.5 animate-fade-in">
          {lines.map((line, i) => (
            <div key={i} className="flex items-baseline gap-4">
              <span className="text-[11px] text-white/20 font-medium min-w-[85px] flex-shrink-0">{line.label}</span>
              <span className="text-[12px] text-white/55 leading-relaxed">{line.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
