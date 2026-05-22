import { MapPin, Zap, Search, Heart, HelpCircle, ArrowRight, User, Clock } from 'lucide-react';
import type { IntentHypothesis } from '../../services/welcome/types';
import type { MockProfile } from '../../data/mockOccitanie';

export interface UnderstandingState {
  phase: 'idle' | 'building' | 'complete';
  intent: IntentHypothesis | null;
  intentConfidence: number;
  keywords: string[];
  territory: string | null;
  urgency: number;
  isOffer: boolean;
  turnCount: number;
  matchedProfiles: MockProfile[];
  draftSummary: string | null;
  draftTitle: string | null;
}

interface Props {
  state: UnderstandingState;
}

function intentIcon(intent: IntentHypothesis | null) {
  switch (intent) {
    case 'need': return <Search size={12} />;
    case 'offer': return <Heart size={12} />;
    case 'urgency': return <Zap size={12} />;
    case 'discovery': return <HelpCircle size={12} />;
    case 'hesitation': return <HelpCircle size={12} />;
    default: return null;
  }
}

function intentLabel(intent: IntentHypothesis | null): string {
  switch (intent) {
    case 'need': return 'Besoin identifié';
    case 'offer': return 'Offre de compétence';
    case 'urgency': return 'Besoin urgent';
    case 'discovery': return 'Exploration';
    case 'hesitation': return 'Réflexion en cours';
    default: return '';
  }
}

function orientationText(intent: IntentHypothesis | null, isOffer: boolean): string {
  if (isOffer) return 'Création de votre fiche de présence dans le réseau';
  switch (intent) {
    case 'need': return 'Recherche de profils compatibles dans votre zone';
    case 'urgency': return 'Mise en relation prioritaire en cours';
    case 'discovery': return 'Exploration des possibilités du réseau';
    case 'hesitation': return 'RENOVEC continue d\'écouter pour mieux orienter';
    default: return '';
  }
}

export default function ConversationViz({ state }: Props) {
  const { phase, intent, intentConfidence, keywords, territory, urgency, isOffer, turnCount, matchedProfiles, draftSummary, draftTitle } = state;

  if (phase === 'idle') return null;

  const progressPct = Math.min(100, Math.round(intentConfidence * 100));

  return (
    <div className="cviz">
      {/* Understanding card */}
      <div className="cviz-card cviz-card--main">
        <div className="cviz-card-header">
          <div className="cviz-card-icon" />
          <span>Ce que RENOVEC comprend</span>
        </div>

        {/* Progress bar */}
        <div className="cviz-progress">
          <div className="cviz-progress-bar" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="cviz-progress-label">
          Compréhension : {progressPct < 40 ? 'en cours' : progressPct < 70 ? 'précise' : 'claire'}
        </span>

        {/* Intent detected */}
        {intent && intentConfidence > 0.3 && (
          <div className="cviz-intent">
            <div className={`cviz-intent-badge cviz-intent--${intent}`}>
              {intentIcon(intent)}
              <span>{intentLabel(intent)}</span>
            </div>
          </div>
        )}

        {/* Keywords */}
        {keywords.length > 0 && (
          <div className="cviz-keywords">
            {keywords.map((kw, i) => (
              <span key={i} className="cviz-keyword">{kw}</span>
            ))}
          </div>
        )}

        {/* Territory */}
        {territory && (
          <div className="cviz-territory">
            <MapPin size={11} />
            <span>{territory}</span>
          </div>
        )}

        {/* Urgency */}
        {urgency > 0.5 && (
          <div className="cviz-urgency">
            <Zap size={11} />
            <span>Urgence perçue</span>
            <div className="cviz-urgency-bar">
              <div style={{ width: `${Math.round(urgency * 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Draft preview */}
      {(draftTitle || draftSummary) && phase === 'complete' && (
        <div className="cviz-card cviz-card--draft">
          <div className="cviz-card-header">
            <div className="cviz-card-icon cviz-card-icon--draft" />
            <span>{isOffer ? 'Fiche en construction' : 'Situation en construction'}</span>
          </div>
          {draftTitle && <h4 className="cviz-draft-title">{draftTitle}</h4>}
          {draftSummary && <p className="cviz-draft-summary">{draftSummary}</p>}
          <div className="cviz-draft-footer">
            <Clock size={10} />
            <span>Brouillon — sera affiné au fil de l'échange</span>
          </div>
        </div>
      )}

      {/* Matched profiles preview */}
      {matchedProfiles.length > 0 && phase === 'complete' && (
        <div className="cviz-card cviz-card--profiles">
          <div className="cviz-card-header">
            <div className="cviz-card-icon cviz-card-icon--profiles" />
            <span>Premiers profils compatibles</span>
          </div>
          <div className="cviz-profiles">
            {matchedProfiles.slice(0, 3).map(p => (
              <div key={p.id} className="cviz-profile">
                <div className="cviz-profile-avatar" style={{ background: p.color }}>
                  {p.prenom[0]}
                </div>
                <div className="cviz-profile-info">
                  <span className="cviz-profile-name">{p.prenom}</span>
                  <span className="cviz-profile-cap">{p.capacite}</span>
                </div>
                <div className="cviz-profile-city">
                  <MapPin size={9} /> {p.ville}
                </div>
              </div>
            ))}
          </div>
          {matchedProfiles.length > 3 && (
            <span className="cviz-profiles-more">+{matchedProfiles.length - 3} autres</span>
          )}
        </div>
      )}

      {/* Orientation */}
      {intent && intentConfidence > 0.5 && phase === 'complete' && (
        <div className="cviz-orientation">
          <ArrowRight size={11} />
          <span>{orientationText(intent, isOffer)}</span>
        </div>
      )}

      {/* Turn indicator */}
      {turnCount > 0 && (
        <div className="cviz-turns">
          <User size={10} />
          <span>{turnCount} échange{turnCount > 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}
