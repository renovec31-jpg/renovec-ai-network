import { Clock, MapPin, Zap } from 'lucide-react';
import type { SituationDraft } from '../types';

interface Props {
  draft: SituationDraft;
}

export default function SituationPreviewView({ draft }: Props) {
  return (
    <div className="aib-view aib-situation">
      <div className="aib-section-label">Situation en construction</div>

      <div className="aib-draft-card">
        <h4 className="aib-draft-title">{draft.title}</h4>
        <p className="aib-draft-summary">{draft.summary}</p>

        <div className="aib-draft-meta">
          {draft.territory && (
            <span className="aib-draft-tag">
              <MapPin size={10} /> {draft.territory}
            </span>
          )}
          {draft.urgency > 0.5 && (
            <span className="aib-draft-tag aib-draft-tag--urgency">
              <Zap size={10} /> Urgent
            </span>
          )}
        </div>

        {draft.keywords.length > 0 && (
          <div className="aib-draft-keywords">
            {draft.keywords.map((kw, i) => (
              <span key={i}>{kw}</span>
            ))}
          </div>
        )}

        <div className="aib-draft-footer">
          <Clock size={10} />
          <span>Brouillon — s'affine au fil de l'echange</span>
        </div>
      </div>
    </div>
  );
}
