import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { NETWORK_STATS } from '../data/mockOccitanie';
import { MapPin, Lock } from 'lucide-react';

interface Cluster {
  grid_lat: number;
  grid_lng: number;
  profile_count: number;
  sample_capability: string;
  city: string;
  display_lat: number;
  display_lng: number;
}

interface Props {
  onEnter: () => void;
}

const DEFAULT_CENTER: [number, number] = [43.6047, 1.4442];
const DEFAULT_ZOOM = 9;

// Curated static presences — illustrate the human tissue, not a catalogue
const TV_PRESENCES = [
  { name: 'Karim',  zone: 'Toulouse 3e', context: 'Droit du travail, lecture de contrats',      state: 'active'       },
  { name: 'Nadia',  zone: 'Toulouse 7e', context: 'Accompagnement démarches CAF et RSA',        state: 'consolidated' },
  { name: 'Théo',   zone: 'Balma',       context: 'Soutien scolaire lycée — maths et physique', state: 'active'       },
  { name: 'Léa',    zone: 'Muret',       context: 'Orientation professionnelle, reconversion',   state: 'potential'    },
] as const;

type PresenceState = 'active' | 'consolidated' | 'potential';

const STATE_LABELS: Record<PresenceState, string> = {
  active:       'actif',
  consolidated: 'consolidé',
  potential:    'possible',
};

export default function TeaserMap({ onEnter }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);

  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [totalProfiles, setTotalProfiles] = useState(NETWORK_STATS.profiles);
  const [nearbyCount, setNearbyCount] = useState<number | null>(NETWORK_STATS.nearToulouse);
  const [userCenter, setUserCenter] = useState<[number, number] | null>(null);
  const [geoState, setGeoState] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('public_map_clusters')
        .select('grid_lat, grid_lng, profile_count, sample_capability, city, display_lat, display_lng')
        .order('profile_count', { ascending: false })
        .limit(300);

      if (data && data.length > 0) {
        setClusters(data as Cluster[]);
        const total = (data as Cluster[]).reduce((acc, c) => acc + c.profile_count, 0);
        setTotalProfiles(total);
      }
      setLoading(false);
    }
    load();
  }, []);

  const requestGeo = useCallback(() => {
    if (!navigator.geolocation) { setGeoState('denied'); return; }
    setGeoState('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const approxLat = Math.round(pos.coords.latitude * 10) / 10;
        const approxLng = Math.round(pos.coords.longitude * 10) / 10;
        setUserCenter([approxLat, approxLng]);
        setGeoState('granted');

        const nearby = clusters.filter(c =>
          Math.abs(c.grid_lat - approxLat) <= 0.5 &&
          Math.abs(c.grid_lng - approxLng) <= 0.5
        );
        setNearbyCount(nearby.reduce((acc, c) => acc + c.profile_count, 0));

        if (mapRef.current) {
          mapRef.current.flyTo([approxLat, approxLng], 10, { duration: 1.4 });
        }
      },
      () => setGeoState('denied')
    );
  }, [clusters]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current || clusters.length === 0) return;
    if (typeof L === 'undefined') return;

    const map = L.map(container, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 0);

    clusters.forEach(c => {
      const radius = Math.min(6 + Math.sqrt(c.profile_count) * 1.8, 22);
      const opacity = Math.min(0.5 + c.profile_count / 200, 0.88);

      const marker = L.circleMarker([c.display_lat, c.display_lng], {
        radius,
        fillColor: c.profile_count >= 100 ? '#F26522' : c.profile_count >= 30 ? '#e8a84c' : '#c9a96e',
        fillOpacity: opacity,
        color: 'rgba(255,200,120,0.3)',
        weight: 1,
      }).addTo(map);

      markersRef.current.push(marker);

      marker.bindPopup(`
        <div style="min-width:160px;font-family:inherit">
          <p style="font-weight:700;font-size:14px;margin:0 0 2px">${c.profile_count} personne${c.profile_count > 1 ? 's' : ''}</p>
          <p style="font-size:12px;color:#666;margin:0 0 4px">${c.city || 'Zone active'}</p>
          ${c.sample_capability ? `<p style="font-size:11px;color:#999;margin:0 0 6px">${c.sample_capability}</p>` : ''}
          <p style="font-size:10px;color:#aaa;margin:0">&#x1F512; Inscrivez-vous pour voir les profils</p>
        </div>
      `, { closeButton: false });
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [clusters]);

  useEffect(() => {
    if (userCenter && mapRef.current) {
      mapRef.current.flyTo(userCenter, 10, { duration: 1.4 });
    }
  }, [userCenter]);

  const displayNearby = nearbyCount !== null
    ? nearbyCount
    : clusters.filter(c =>
        c.grid_lat >= 43.3 && c.grid_lat <= 44.0 &&
        c.grid_lng >= 1.0 && c.grid_lng <= 1.9
      ).reduce((acc, c) => acc + c.profile_count, 0);

  const displayCity = geoState === 'granted' ? 'votre zone' : 'Toulouse et alentours';

  return (
    <div className="tv-root">

      {/* ══ LEFT — narrative + états + présences ═══════════════════════════════ */}
      <div className="tv-content">

        {/* Zone A — Titre et thèse */}
        <p className="tv-eyebrow">Territoire vivant</p>
        <h2 className="tv-heading">
          Des humains réels,<br /> dans des lieux réels.
        </h2>
        <p className="tv-thesis">
          La coordination devient plus juste quand les présences sont ancrées dans un territoire réel. Le réseau n'existe pas dans un cloud — il existe dans les quartiers, dans les rues, là où les situations se vivent. La proximité seule ne suffit pas, mais elle compte dans le contexte.
        </p>

        {/* Zone B — Trois états avec micro-explications */}
        <div className="tv-states">
          <div className="tv-state">
            <span className="tv-state-dot tv-state-dot--active" />
            <div className="tv-state-text">
              <p className="tv-state-name">Présence active</p>
              <p className="tv-state-desc">Quelqu'un disponible, activable dans ce contexte précis.</p>
            </div>
          </div>
          <div className="tv-state">
            <span className="tv-state-line tv-state-line--consolidated" />
            <div className="tv-state-text">
              <p className="tv-state-name">Lien consolidé</p>
              <p className="tv-state-desc">Une relation éprouvée — une aide déjà reconnue dans ce territoire.</p>
            </div>
          </div>
          <div className="tv-state">
            <span className="tv-state-line tv-state-line--potential" />
            <div className="tv-state-text">
              <p className="tv-state-name">Connexion possible</p>
              <p className="tv-state-desc">Une piste d'orientation crédible, non encore consolidée.</p>
            </div>
          </div>
        </div>

        {/* Zone C — Présences exemples */}
        <div className="tv-presences">
          {TV_PRESENCES.map((p, i) => (
            <div key={i} className="tv-presence">
              <div className={`tv-presence-indicator tv-presence-indicator--${p.state}`} />
              <div className="tv-presence-info">
                <p className="tv-presence-name">{p.name} <span className="tv-presence-zone">· {p.zone}</span></p>
                <p className="tv-presence-context">{p.context}</p>
              </div>
              <span className={`tv-presence-badge tv-presence-badge--${p.state}`}>
                {STATE_LABELS[p.state as PresenceState]}
              </span>
            </div>
          ))}
          {/* Chip live depuis la DB si disponible */}
          {!loading && (() => {
            const c = clusters.find(cc => cc.sample_capability);
            if (!c) return null;
            return (
              <div className="tv-presence tv-presence--live">
                <div className="tv-presence-indicator tv-presence-indicator--active" />
                <div className="tv-presence-info">
                  <p className="tv-presence-name">Réseau <span className="tv-presence-zone">· {c.city}</span></p>
                  <p className="tv-presence-context">{c.sample_capability}</p>
                </div>
                <span className="tv-presence-badge tv-presence-badge--active">actif</span>
              </div>
            );
          })()}
        </div>

        {/* Zone E — Phrase de liaison vers l'intelligence cumulative */}
        <p className="tv-bridge">
          RENOVEC n'oriente pas seulement vers quelqu'un de proche — mais vers une présence plausible dans un contexte réel. Le territoire est une couche parmi d'autres ; la mémoire fait le reste.
        </p>
      </div>

      {/* ══ RIGHT — carte + stats + geo + CTA ══════════════════════════════════ */}
      <div className="tv-map-col">

        {/* Stats compactes */}
        {!loading && (
          <div className="tv-stats-compact">
            <div className="tv-stat-compact">
              <span className="tv-stat-compact-num">{totalProfiles.toLocaleString('fr-FR')}</span>
              <span className="tv-stat-compact-label">profils actifs</span>
            </div>
            <div className="tv-stat-compact-sep" />
            <div className="tv-stat-compact">
              <span className="tv-stat-compact-num">{clusters.length || NETWORK_STATS.zones}</span>
              <span className="tv-stat-compact-label">zones</span>
            </div>
            <div className="tv-stat-compact-sep" />
            <div className="tv-stat-compact">
              <span className="tv-stat-compact-num">{displayNearby}</span>
              <span className="tv-stat-compact-label">autour de {displayCity}</span>
            </div>
          </div>
        )}

        {/* Géolocalisation */}
        {geoState === 'idle' && !loading && (
          <div className="tv-geo-nudge">
            <div className="tv-geo-nudge-main">
              <MapPin size={12} className="tv-geo-nudge-icon" aria-hidden />
              <div className="tv-geo-nudge-text">
                <p className="tv-geo-nudge-title">Présences autour de vous ?</p>
                <p className="tv-geo-nudge-sub">Rayon ~10 km · Position jamais stockée</p>
              </div>
            </div>
            <button onClick={requestGeo} className="tv-geo-nudge-btn">Autoriser</button>
          </div>
        )}
        {geoState === 'requesting' && (
          <div className="tv-geo-nudge tv-geo-nudge--waiting">
            <span className="tv-geo-spinner" />
            <span>En attente de votre autorisation…</span>
          </div>
        )}
        {geoState === 'granted' && nearbyCount !== null && (
          <div className="tv-geo-nudge tv-geo-nudge--success">
            <MapPin size={11} />
            <span><strong>{nearbyCount} personnes</strong> dans votre zone</span>
          </div>
        )}

        {/* Carte — preuve d'ancrage spatial, pas interface principale */}
        <div className="tv-map-wrap">
          {loading && (
            <div className="tv-map-loading">
              <span /><span /><span />
            </div>
          )}
          <div ref={containerRef} className="tv-map-canvas" />
          <div className="tv-map-vignette" aria-hidden />
          <div className="tv-map-privacy">
            <Lock size={9} />
            <span>Agrégé · Approx. · Jamais stocké</span>
          </div>
        </div>

        {/* CTA */}
        <button className="tv-cta" onClick={onEnter}>
          Voir les présences autour de moi
          <span className="tv-cta-arrow">→</span>
        </button>
        <p className="tv-cta-sub">Gratuit · Position arrondie, jamais stockée</p>

      </div>
    </div>
  );
}
