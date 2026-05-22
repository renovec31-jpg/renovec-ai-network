import { MapPin, Zap } from 'lucide-react';
import type { SituationDraft } from '../types';

interface Props {
  draft: SituationDraft;
}

export default function SituationPreviewView({ draft }: Props) {
  return (
    <div className="aib-view aib-situ">
      <div className="aib-situ-glow" />

      <span className="aib-situ-label">Situation en construction</span>

      <h4 className="aib-situ-title">{draft.title}</h4>
      <p className="aib-situ-text">{draft.summary}</p>

      {(draft.territory || draft.urgency > 0.5) && (
        <div className="aib-situ-meta">
          {draft.territory && (
            <span><MapPin size={9} /> {draft.territory}</span>
          )}
          {draft.urgency > 0.5 && (
            <span className="aib-situ-urg"><Zap size={9} /> Urgent</span>
          )}
        </div>
      )}

      {draft.keywords.length > 0 && (
        <div className="aib-situ-tokens">
          {draft.keywords.map((kw, i) => (
            <span key={i} style={{ animationDelay: `${i * 60}ms` }}>{kw}</span>
          ))}
        </div>
      )}

      <span className="aib-situ-state">S'affine au fil de l'echange</span>
    </div>
  );
}
