import { Search, Heart, Zap, HelpCircle, MapPin } from 'lucide-react';
import type { ContextSummary } from '../types';

interface Props {
  context: ContextSummary;
  isBuilding: boolean;
}

export default function UnderstandingView({ context, isBuilding }: Props) {
  const { intent, intentLabel, territory, keywords, urgency, clarityLevel } = context;
  const progressPct = clarityLevel === 'high' ? 90 : clarityLevel === 'medium' ? 55 : 25;

  return (
    <div className="aib-view aib-und">
      {/* Ambient glow reacting to clarity */}
      <div className={`aib-und-glow aib-und-glow--${clarityLevel}`} />

      {/* Fluid progress — not a bar, a breath */}
      <div className={`aib-und-breath ${isBuilding ? 'aib-und-breath--active' : ''}`}>
        <div className="aib-und-breath-fill" style={{ width: `${progressPct}%` }} />
        <span>{clarityLevel === 'high' ? 'Claire' : clarityLevel === 'medium' ? 'Se precise' : 'Ecoute'}</span>
      </div>

      {/* Intent — floating signal, not a pill */}
      {intent && (
        <div className={`aib-und-intent aib-und-intent--${intent}`}>
          {intent === 'need' ? <Search size={14} /> : intent === 'offer' ? <Heart size={14} /> : intent === 'urgency' ? <Zap size={14} /> : <HelpCircle size={14} />}
          <span>{intentLabel}</span>
        </div>
      )}

      {/* Keywords — scattered cluster, not aligned list */}
      {keywords.length > 0 && (
        <div className="aib-und-scatter">
          {keywords.map((kw, i) => (
            <span
              key={i}
              className="aib-und-token"
              style={{
                animationDelay: `${i * 80 + 100}ms`,
                fontSize: i === 0 ? '13px' : i < 3 ? '12px' : '11px',
                opacity: i === 0 ? 0.7 : i < 3 ? 0.5 : 0.35,
              }}
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* Territory + urgency — inline field */}
      {(territory || urgency > 0.5) && (
        <div className="aib-und-field">
          {territory && (
            <span className="aib-und-geo">
              <MapPin size={10} />
              {territory}
            </span>
          )}
          {urgency > 0.5 && (
            <span className="aib-und-urg">
              <Zap size={10} />
              Urgence
            </span>
          )}
        </div>
      )}
    </div>
  );
}
