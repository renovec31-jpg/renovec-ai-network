import { useRef, useEffect, useMemo } from 'react';
import { MapPin, Search, Heart, Zap, Sparkles, FileText } from 'lucide-react';
import type { ContextSummary } from './types';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

interface Props {
  history: Turn[];
  context: ContextSummary;
  turnCount: number;
}

export default function ConversationRail({ history, context, turnCount }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [history.length, turnCount]);

  const { intent, territory, keywords, urgency, clarityLevel } = context;
  const showInsights = turnCount >= 2 && (intent || territory || keywords.length > 0);

  const depthMap = useMemo(() => {
    const len = history.length;
    return history.map((_, i) => {
      const dist = len - 1 - i;
      if (dist === 0) return 1;
      if (dist === 1) return 0.85;
      if (dist === 2) return 0.6;
      return Math.max(0.25, 0.5 - dist * 0.06);
    });
  }, [history]);

  if (history.length === 0) return null;

  return (
    <div className="cvr">
      <div className="cvr-scroll">
        {/* Continuous message stream */}
        {history.map((turn, idx) => (
          <div
            key={turn.id}
            className={`cvr-turn cvr-turn--${turn.role}`}
            style={{
              opacity: depthMap[idx],
              animationDelay: `${Math.min(idx * 50, 300)}ms`,
            }}
          >
            {turn.role === 'assistant' && (
              <div className="cvr-accent" />
            )}
            <p>{turn.content}</p>
          </div>
        ))}

        {/* Organic insight cluster — not a card, a zone */}
        {showInsights && (
          <div className="cvr-zone">
            <div className="cvr-zone-glow" />
            {intent && (
              <span className="cvr-signal cvr-signal--intent">
                {intent === 'need' ? <Search size={9} /> : intent === 'offer' ? <Heart size={9} /> : intent === 'urgency' ? <Zap size={9} /> : <Sparkles size={9} />}
                {intent === 'need' ? 'Besoin' : intent === 'offer' ? 'Offre' : intent === 'urgency' ? 'Urgent' : 'Explore'}
              </span>
            )}
            {territory && (
              <span className="cvr-signal cvr-signal--geo">
                <MapPin size={9} />
                {territory}
              </span>
            )}
            {keywords.length > 0 && (
              <div className="cvr-cluster">
                {keywords.slice(0, 4).map((kw, i) => (
                  <span key={i} className="cvr-kw" style={{ animationDelay: `${i * 70}ms` }}>{kw}</span>
                ))}
              </div>
            )}
            {urgency > 0.5 && (
              <div className="cvr-pulse">
                <div className="cvr-pulse-fill" style={{ width: `${Math.round(urgency * 100)}%` }} />
              </div>
            )}
            {clarityLevel === 'high' && (
              <span className="cvr-signal cvr-signal--fiche">
                <FileText size={9} />
                Fiche active
              </span>
            )}
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
}
