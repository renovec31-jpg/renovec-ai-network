import { useRef, useEffect } from 'react';
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

  if (history.length === 0) return null;

  const { intent, territory, keywords, urgency, clarityLevel } = context;
  const showInsights = turnCount >= 2 && (intent || territory || keywords.length > 0);

  return (
    <div className="aib-rail">
      <div className="aib-rail-header">
        <div className="aib-rail-dot" />
        <span>Conversation</span>
      </div>
      <div className="aib-rail-messages">
        {history.map((turn, idx) => {
          const isRecent = idx >= history.length - 3;
          return (
            <div
              key={turn.id}
              className={`aib-rail-msg aib-rail-msg--${turn.role} ${isRecent ? 'aib-rail-msg--recent' : 'aib-rail-msg--faded'}`}
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <span className="aib-rail-role">
                {turn.role === 'assistant' ? 'RENOVEC' : 'Vous'}
              </span>
              <p>{turn.content}</p>
            </div>
          );
        })}

        {/* Contextual insight blocks — emerge after 2+ turns */}
        {showInsights && (
          <div className="aib-rail-insights">
            {intent && (
              <div className="aib-rail-insight aib-rail-insight--intent">
                {intent === 'need' ? <Search size={10} /> : intent === 'offer' ? <Heart size={10} /> : intent === 'urgency' ? <Zap size={10} /> : <Sparkles size={10} />}
                <span>{intent === 'need' ? 'Besoin detecte' : intent === 'offer' ? 'Offre detectee' : intent === 'urgency' ? 'Urgence percue' : 'Exploration'}</span>
              </div>
            )}

            {territory && (
              <div className="aib-rail-insight aib-rail-insight--territory">
                <MapPin size={10} />
                <span>{territory}</span>
              </div>
            )}

            {keywords.length > 0 && (
              <div className="aib-rail-insight aib-rail-insight--keywords">
                <span className="aib-rail-insight-label">Mots-cles</span>
                <div className="aib-rail-kws">
                  {keywords.slice(0, 5).map((kw, i) => (
                    <span key={i} className="aib-rail-kw">{kw}</span>
                  ))}
                </div>
              </div>
            )}

            {urgency > 0.5 && (
              <div className="aib-rail-insight aib-rail-insight--urgency">
                <Zap size={10} />
                <span>Urgence</span>
                <div className="aib-rail-urgency-bar">
                  <div style={{ width: `${Math.round(urgency * 100)}%` }} />
                </div>
              </div>
            )}

            {clarityLevel === 'high' && (
              <div className="aib-rail-insight aib-rail-insight--fiche">
                <FileText size={10} />
                <span>Fiche en construction</span>
              </div>
            )}
          </div>
        )}

        <div ref={endRef} />
      </div>
    </div>
  );
}
