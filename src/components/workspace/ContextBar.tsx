import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { ContextLine } from '../../contexts/WorkspaceContext';

export default function ContextBar({ lines }: { lines: ContextLine[] }) {
  const [expanded, setExpanded] = useState(true);

  if (lines.length === 0) return null;

  return (
    <div className="flex-shrink-0 border-b border-white/5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-3 flex items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
          <span className="text-[11px] tracking-widest uppercase text-white/30 font-medium">
            Contexte compris
          </span>
          <span className="text-[10px] text-white/15">{lines.length} elements</span>
        </div>
        {expanded
          ? <ChevronUp size={12} className="text-white/20 group-hover:text-white/40 transition-colors" />
          : <ChevronDown size={12} className="text-white/20 group-hover:text-white/40 transition-colors" />}
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-2 animate-fade-in">
          {lines.map((line, i) => (
            <div key={i} className="flex items-baseline gap-3">
              <span className="text-[11px] text-white/25 font-medium min-w-[80px] flex-shrink-0">{line.label}</span>
              <span className="text-[12px] text-white/55 leading-relaxed">{line.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
