import { MapPin, Star } from 'lucide-react';
import type { MockProfile } from '../../../data/mockOccitanie';

interface Props {
  profiles: MockProfile[];
  isConnected: boolean;
  onJoinNetwork: () => void;
}

export default function MatchingView({ profiles, isConnected, onJoinNetwork }: Props) {
  return (
    <div className="aib-view aib-match">
      <span className="aib-match-label">Profils identifies</span>

      <div className="aib-match-flow">
        {profiles.map((p, i) => (
          <div
            key={p.id}
            className="aib-match-capsule"
            style={{ animationDelay: `${i * 120}ms` }}
          >
            <div className="aib-match-avatar" style={{ background: p.color }}>
              {p.prenom[0]}
            </div>
            <div className="aib-match-body">
              <strong>{p.prenom}</strong>
              <span className="aib-match-cap">{p.capacite}</span>
              <span className="aib-match-sub">
                <MapPin size={8} /> {p.ville}
                <Star size={8} /> {p.pts}
              </span>
            </div>
            <span className={`aib-match-dispo aib-match-dispo--${p.disponibilite}`}>
              {p.disponibilite === 'disponible' ? 'Dispo' : 'Bientot'}
            </span>
          </div>
        ))}
      </div>

      {!isConnected && (
        <div className="aib-match-cta">
          <p>Rejoignez le reseau pour activer la mise en relation.</p>
          <button onClick={onJoinNetwork}>Rejoindre</button>
        </div>
      )}
    </div>
  );
}
