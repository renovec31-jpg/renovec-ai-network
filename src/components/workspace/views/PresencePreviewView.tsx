import { Sparkles, Check } from 'lucide-react';
import type { PresenceDraft } from '../types';

interface Props {
  draft: PresenceDraft;
  isConnected: boolean;
  onJoinNetwork: () => void;
}

export default function PresencePreviewView({ draft, isConnected, onJoinNetwork }: Props) {
  return (
    <div className="aib-view aib-pres">
      <div className="aib-pres-glow" />

      <div className="aib-pres-origin">
        <Sparkles size={11} />
        <span>Generee par RENOVEC</span>
      </div>

      <h4 className="aib-pres-title">{draft.title}</h4>

      <div className="aib-pres-caps">
        {draft.capabilities.map((c, i) => (
          <span key={i} className="aib-pres-cap" style={{ animationDelay: `${i * 80}ms` }}>
            <Check size={9} />
            {c}
          </span>
        ))}
      </div>

      <div className="aib-pres-tags">
        {draft.tags.map(t => <span key={t}>{t}</span>)}
      </div>

      {(draft.territory || draft.availability) && (
        <div className="aib-pres-field">
          {draft.territory && <span>{draft.territory}</span>}
          {draft.availability && <span>{draft.availability}</span>}
        </div>
      )}

      <span className="aib-pres-state">Brouillon — se complete au fil de l'echange</span>

      {!isConnected && (
        <div className="aib-match-cta">
          <p>Creez votre compte pour publier cette fiche.</p>
          <button onClick={onJoinNetwork}>Creer mon compte</button>
        </div>
      )}
    </div>
  );
}
