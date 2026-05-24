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
    <div className="teaser-map-root">

      <div className="teaser-map-header">
        <p className="teaser-eyebrow">Preuve territoriale</p>
        <h2 className="teaser-heading">
          Des humains réels,<br className="teaser-heading-br" /> dans des lieux réels.
        </h2>
        <p className="teaser-narrative">
          Le réseau n'existe pas dans un cloud. Il existe dans les quartiers, dans les communes, là où les situations se vivent réellement. L'orientation part de présences territorialement plausibles — pas d'une base de données nationale.
        </p>

        {/* Legend — states visible on the map */}
        <div className="teaser-legend">
          <div className="teaser-legend-item">
            <span className="teaser-legend-dot" />
            <span>Présence active</span>
          </div>
          <div className="teaser-legend-item">
            <span className="teaser-legend-line teaser-legend-line--solid" />
            <span>Lien consolidé</span>
          </div>
          <div className="teaser-legend-item">
            <span className="teaser-legend-line teaser-legend-line--dashed" />
            <span>Connexion possible</span>
          </div>
        </div>

        {/* Qualitative proof — sample presence chips from live data */}
        {!loading && clusters.filter(c => c.sample_capability).length > 0 && (
          <div className="teaser-presence-samples">
            {clusters
              .filter(c => c.sample_capability)
              .slice(0, 3)
              .map((c, i) => (
                <div key={i} className="teaser-presence-chip">
                  <span className="teaser-presence-dot" />
                  <span className="teaser-presence-cap">{c.sample_capability}</span>
                  <span className="teaser-presence-city">· {c.city}</span>
                </div>
              ))}
          </div>
        )}

        {/* 3-level proof stats: macro → meso → local */}
        {!loading && (
          <div className="teaser-proof-stats">
            <div className="teaser-proof-stat">
              <span className="teaser-proof-stat-num">{totalProfiles.toLocaleString('fr-FR')}</span>
              <span className="teaser-proof-stat-label">profils actifs</span>
            </div>
            <div className="teaser-proof-stat-sep" />
            <div className="teaser-proof-stat">
              <span className="teaser-proof-stat-num">{clusters.length || NETWORK_STATS.zones}</span>
              <span className="teaser-proof-stat-label">zones couvertes</span>
            </div>
            <div className="teaser-proof-stat-sep" />
            <div className="teaser-proof-stat">
              <span className="teaser-proof-stat-num">{displayNearby}</span>
              <span className="teaser-proof-stat-label">autour de {displayCity}</span>
            </div>
          </div>
        )}
      </div>

      {geoState === 'idle' && !loading && (
        <div className="teaser-geo-banner">
          <MapPin size={13} className="teaser-geo-icon" />
          <span className="teaser-geo-text">Voir les personnes autour de vous ?</span>
          <button className="teaser-geo-btn" onClick={requestGeo}>
            Autoriser ma position approximative
          </button>
          <span className="teaser-geo-hint">Position arrondie à ~10 km · Jamais stockée</span>
        </div>
      )}
      {geoState === 'requesting' && (
        <div className="teaser-geo-banner teaser-geo-banner--waiting">
          <span className="teaser-geo-spinner" />
          <span className="teaser-geo-text">En attente de votre autorisation…</span>
        </div>
      )}
      {geoState === 'granted' && nearbyCount !== null && (
        <div className="teaser-geo-banner teaser-geo-banner--success">
          <MapPin size={13} className="teaser-geo-icon teaser-geo-icon--success" />
          <span className="teaser-geo-text">
            <strong>{nearbyCount} personnes</strong> dans votre zone — inscrivez-vous pour les voir
          </span>
        </div>
      )}

      <div className="teaser-map-wrap">
        {loading && (
          <div className="teaser-map-loader">
            <span className="teaser-map-loader-dot" />
            <span className="teaser-map-loader-dot teaser-map-loader-dot--2" />
            <span className="teaser-map-loader-dot teaser-map-loader-dot--3" />
          </div>
        )}
        <div ref={containerRef} className="teaser-map-canvas" />
        <div className="teaser-map-vignette" aria-hidden />
        <div className="teaser-map-privacy-badge" aria-label="Données anonymisées">
          <Lock size={9} />
          <span>Données agrégées · Positions approximatives · Jamais stockées</span>
        </div>
      </div>

      <div className="teaser-cta-row">
        <button className="teaser-cta-primary" onClick={onEnter}>
          Voir les présences autour de moi — créer mon profil
        </button>
        <p className="teaser-cta-sub">
          Gratuit · Aucune carte bancaire · Position arrondie à ~10 km, jamais stockée
        </p>
      </div>

    </div>
  );
}
