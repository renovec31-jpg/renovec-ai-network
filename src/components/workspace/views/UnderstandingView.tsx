import { Search, Heart, Zap, HelpCircle, MapPin } from 'lucide-react';
import type { ContextSummary } from '../types';

interface Props {
  context: ContextSummary;
  isBuilding: boolean;
}

function intentIcon(intent: string | null) {
  switch (intent) {
    case 'need': return <Search size={13} />;
    case 'offer': return <Heart size={13} />;
    case 'urgency': return <Zap size={13} />;
    default: return <HelpCircle size={13} />;
  }
}

export default function UnderstandingView({ context, isBuilding }: Props) {
  const { intent, intentLabel, territory, keywords, urgency, clarityLevel } = context;
  const progressPct = clarityLevel === 'high' ? 90 : clarityLevel === 'medium' ? 55 : 25;

  return (
    <div className="aib-view aib-understanding">
      <div className="aib-section-label">Ce que RENOVEC comprend</div>

      {/* Progress */}
      <div className="aib-progress-wrap">
        <div className="aib-progress-track">
          <div
            className={`aib-progress-fill ${isBuilding ? 'aib-progress-fill--building' : ''}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="aib-progress-text">
          {clarityLevel === 'high' ? 'Claire' : clarityLevel === 'medium' ? 'En cours' : 'Ecoute'}
        </span>
      </div>

      {/* Intent */}
      {intent && (
        <div className={`aib-intent-pill aib-intent--${intent}`}>
          {intentIcon(intent)}
          <span>{intentLabel}</span>
        </div>
      )}

      {/* Keywords */}
      {keywords.length > 0 && (
        <div className="aib-keywords">
          {keywords.map((kw, i) => (
            <span key={i} className="aib-kw">{kw}</span>
          ))}
        </div>
      )}

      {/* Territory */}
      {territory && (
        <div className="aib-territory">
          <MapPin size={11} />
          <span>{territory}</span>
        </div>
      )}

      {/* Urgency */}
      {urgency > 0.5 && (
        <div className="aib-urgency-indicator">
          <Zap size={11} />
          <span>Urgence perçue</span>
          <div className="aib-urgency-bar">
            <div style={{ width: `${Math.round(urgency * 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
