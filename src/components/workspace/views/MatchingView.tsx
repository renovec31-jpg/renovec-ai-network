import { MapPin, Star } from 'lucide-react';
import type { MockProfile } from '../../../data/mockOccitanie';

interface Props {
  profiles: MockProfile[];
  isConnected: boolean;
  onJoinNetwork: () => void;
}

export default function MatchingView({ profiles, isConnected, onJoinNetwork }: Props) {
  return (
    <div className="aib-view aib-matching">
      <div className="aib-section-label">Profils identifies</div>

      <div className="aib-profiles-list">
        {profiles.map(p => (
          <div key={p.id} className="aib-profile-row">
            <div className="aib-profile-avatar" style={{ background: p.color }}>
              {p.prenom[0]}
            </div>
            <div className="aib-profile-body">
              <span className="aib-profile-name">{p.prenom}</span>
              <span className="aib-profile-cap">{p.capacite}</span>
              <div className="aib-profile-meta">
                <span><MapPin size={9} /> {p.ville}</span>
                <span><Star size={9} /> {p.pts} pts</span>
              </div>
            </div>
            <div className={`aib-profile-status aib-profile-status--${p.disponibilite}`}>
              {p.disponibilite === 'disponible' ? 'Dispo' : 'Bientot'}
            </div>
          </div>
        ))}
      </div>

      {!isConnected && (
        <div className="aib-action-banner">
          <p>Rejoignez le reseau pour activer la mise en relation.</p>
          <button onClick={onJoinNetwork}>Rejoindre</button>
        </div>
      )}
    </div>
  );
}
