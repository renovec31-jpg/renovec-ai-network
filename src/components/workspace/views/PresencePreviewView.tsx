import { Sparkles, Check, Clock } from 'lucide-react';
import type { PresenceDraft } from '../types';

interface Props {
  draft: PresenceDraft;
  isConnected: boolean;
  onJoinNetwork: () => void;
}

export default function PresencePreviewView({ draft, isConnected, onJoinNetwork }: Props) {
  return (
    <div className="aib-view aib-presence">
      <div className="aib-section-label">Fiche de presence en construction</div>

      <div className="aib-draft-card aib-draft-card--presence">
        <div className="aib-presence-header">
          <Sparkles size={13} />
          <span>Generee par RENOVEC</span>
        </div>

        <h4 className="aib-draft-title">{draft.title}</h4>

        <ul className="aib-presence-caps">
          {draft.capabilities.map((c, i) => (
            <li key={i}><Check size={10} /> {c}</li>
          ))}
        </ul>

        <div className="aib-draft-keywords">
          {draft.tags.map(t => <span key={t}>{t}</span>)}
        </div>

        {(draft.territory || draft.availability) && (
          <div className="aib-draft-meta">
            {draft.territory && <span>{draft.territory}</span>}
            {draft.availability && <span>{draft.availability}</span>}
          </div>
        )}

        <div className="aib-draft-footer">
          <Clock size={10} />
          <span>Brouillon — sera complete au fil de l'echange</span>
        </div>
      </div>

      {!isConnected && (
        <div className="aib-action-banner">
          <p>Creez votre compte pour publier cette fiche.</p>
          <button onClick={onJoinNetwork}>Creer mon compte</button>
        </div>
      )}
    </div>
  );
}
