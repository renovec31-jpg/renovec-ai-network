import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, Search, X, ArrowRight, Users, Globe, Wifi, Shield, Star } from 'lucide-react';

// Pool of real portrait photos from Pexels
const PORTRAIT_PHOTOS = [
  'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/428364/pexels-photo-428364.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/1300402/pexels-photo-1300402.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/2269872/pexels-photo-2269872.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/1484801/pexels-photo-1484801.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/937481/pexels-photo-937481.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/3764119/pexels-photo-3764119.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/2078265/pexels-photo-2078265.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/1102341/pexels-photo-1102341.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/1680172/pexels-photo-1680172.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/3785079/pexels-photo-3785079.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
  'https://images.pexels.com/photos/2955305/pexels-photo-2955305.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
];

function getProfilePhoto(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PORTRAIT_PHOTOS[hash % PORTRAIT_PHOTOS.length];
}

type MapProfile = {
  id: string;
  user_id: string;
  display_name: string;
  city: string | null;
  lat: number;
  lng: number;
  zone: string | null;
  explicit_capabilities: string[];
  sav_points: number;
  last_seen: string | null;
  availability: string | null;
};

type HoverCard = {
  profile: MapProfile;
  x: number;
  y: number;
};

type Props = {
  onOpenProfile: (userId: string) => void;
};

const ZONE_COLORS: Record<string, string> = {
  local:    '#F26522',
  distance: '#3b82f6',
  both:     '#10b981',
};

function isOnline(lastSeen: string | null): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < 15 * 60 * 1000;
}

const FRANCE_CENTER: [number, number] = [46.5, 2.3522];
const FRANCE_ZOOM = 6;

// ─── Hover vitrine card ───────────────────────────────────────────────────────

function ProfileHoverCard({ card, onOpenProfile, containerRect }: {
  card: HoverCard;
  onOpenProfile: (userId: string) => void;
  containerRect: DOMRect | null;
}) {
  const p = card.profile;
  const color = ZONE_COLORS[p.zone || 'both'] || '#999';

  if (!containerRect) return null;

  // Position card near the marker, clamped inside container
  const CARD_W = 260;
  const CARD_H = 200;
  const PAD = 12;

  let left = card.x + 14;
  let top = card.y - CARD_H / 2;

  // Clamp horizontally
  if (left + CARD_W > containerRect.width - PAD) {
    left = card.x - CARD_W - 14;
  }
  // Clamp vertically
  if (top < PAD) top = PAD;
  if (top + CARD_H > containerRect.height - PAD) top = containerRect.height - CARD_H - PAD;

  const level = p.sav_points >= 200 ? 'Expert' : p.sav_points >= 100 ? 'Confirmé' : p.sav_points >= 50 ? 'Reconnu' : p.sav_points >= 20 ? 'Actif' : 'Nouveau';

  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        left,
        top,
        width: CARD_W,
        zIndex: 1200,
        filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.18))',
        transition: 'opacity 0.15s ease',
      }}
    >
      <div className="bg-white rounded-2xl overflow-hidden border border-stone-100" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.06)' }}>
        {/* Color band */}
        <div className="h-1.5 w-full" style={{ background: color }} />

        <div className="px-4 pt-3 pb-4">
          {/* Header */}
          <div className="flex items-start gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden border-2" style={{ borderColor: color + '40' }}>
              <img
                src={getProfilePhoto(p.id)}
                alt={p.display_name}
                className="w-full h-full object-cover"
                onError={e => {
                  const el = e.currentTarget as HTMLImageElement;
                  el.style.display = 'none';
                  el.parentElement!.style.background = color;
                  el.parentElement!.textContent = (p.display_name || '?')[0].toUpperCase();
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-stone-900 truncate leading-tight">{p.display_name}</p>
                {isOnline(p.last_seen) && (
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </div>
              {p.city && (
                <p className="text-xs text-stone-400 flex items-center gap-0.5 mt-0.5">
                  <MapPin size={9} /> {p.city}
                </p>
              )}
            </div>
          </div>

          {/* Capabilities */}
          {p.explicit_capabilities.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {p.explicit_capabilities.slice(0, 3).map(cap => (
                <span
                  key={cap}
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: color + '15', color }}
                >
                  {cap}
                </span>
              ))}
              {p.explicit_capabilities.length > 3 && (
                <span className="text-xs text-stone-400 self-center">
                  +{p.explicit_capabilities.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3 mb-3">
            {p.sav_points > 0 && (
              <div className="flex items-center gap-1 text-xs text-stone-500">
                <Shield size={9} className="text-amber-500" />
                <span className="font-medium text-stone-700">{p.sav_points}</span> pts · {level}
              </div>
            )}
            {p.availability && (
              <div className="flex items-center gap-1 text-xs">
                <Star size={9} className="text-emerald-500" />
                <span className="text-stone-500 truncate max-w-[100px]">{p.availability}</span>
              </div>
            )}
          </div>

          {/* Zone badge */}
          <div className="flex items-center justify-between">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: color + '18', color }}
            >
              {p.zone === 'local' ? 'Proximité' : p.zone === 'distance' ? 'À distance' : 'Flexible'}
            </span>
            <button
              className="flex items-center gap-1 text-xs font-semibold text-white px-2.5 py-1 rounded-lg transition-all hover:opacity-90 active:scale-95"
              style={{ background: color }}
              onClick={() => onOpenProfile(p.user_id)}
            >
              Voir <ArrowRight size={9} />
            </button>
          </div>
        </div>
      </div>

      {/* Pointer arrow */}
      <div
        className="absolute top-1/2 -translate-y-1/2"
        style={{
          left: left < card.x ? 'auto' : -6,
          right: left < card.x ? -6 : 'auto',
          width: 0,
          height: 0,
          borderTop: '6px solid transparent',
          borderBottom: '6px solid transparent',
          borderRight: left < card.x ? 'none' : '6px solid white',
          borderLeft: left < card.x ? '6px solid white' : 'none',
        }}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CartePage({ onOpenProfile }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapWrapper = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [profiles, setProfiles] = useState<MapProfile[]>([]);
  const [filtered, setFiltered] = useState<MapProfile[]>([]);
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [capSearch, setCapSearch] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<MapProfile | null>(null);
  const [hoverCard, setHoverCard] = useState<HoverCard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    if (typeof L === 'undefined') return;

    const map = L.map(mapContainer.current, {
      center: FRANCE_CENTER,
      zoom: FRANCE_ZOOM,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [profiles, zoneFilter, capSearch]);

  useEffect(() => {
    if (!mapRef.current) return;
    renderMarkers();
  }, [filtered]);

  async function loadProfiles() {
    const { data } = await supabase
      .from('capability_profiles')
      .select('*')
      .eq('is_published', true);

    const mapped: MapProfile[] = (data || [])
      .filter((r: Record<string, unknown>) => r.lat != null && r.lng != null)
      .map((r: Record<string, unknown>) => ({
        id: r.id as string,
        user_id: (r.user_id as string) || (r.id as string),
        display_name: (r.display_name as string) || (r.title as string) || 'Membre',
        city: r.city as string | null,
        lat: r.lat as number,
        lng: r.lng as number,
        zone: (r.zone as string) || 'both',
        explicit_capabilities: (r.explicit_capabilities as string[]) || [],
        sav_points: (r.sav_points as number) || 0,
        last_seen: null,
        availability: r.availability as string | null,
      }));

    setProfiles(mapped);
    setLoading(false);
  }

  function applyFilters() {
    let result = profiles;
    if (zoneFilter !== 'all') {
      result = result.filter(p => p.zone === zoneFilter);
    }
    if (capSearch.trim()) {
      const q = capSearch.toLowerCase();
      result = result.filter(p =>
        p.explicit_capabilities.some(c => c.toLowerCase().includes(q)) ||
        (p.display_name || '').toLowerCase().includes(q) ||
        (p.city || '').toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }

  const showHoverCard = useCallback((p: MapProfile, e: L.LeafletMouseEvent) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    const container = mapWrapper.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = e.originalEvent.clientX - rect.left;
    const y = e.originalEvent.clientY - rect.top;
    setHoverCard({ profile: p, x, y });
  }, []);

  const hideHoverCard = useCallback(() => {
    hoverTimerRef.current = setTimeout(() => setHoverCard(null), 120);
  }, []);

  function renderMarkers() {
    if (!mapRef.current) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    filtered.forEach(p => {
      const color = ZONE_COLORS[p.zone || 'both'] || '#999';

      const marker = L.circleMarker([p.lat, p.lng], {
        radius: 10,
        fillColor: color,
        fillOpacity: 0.9,
        color: 'white',
        weight: 2,
      }).addTo(mapRef.current!);

      marker.on('mouseover', (e: L.LeafletMouseEvent) => showHoverCard(p, e));
      marker.on('mouseout', hideHoverCard);
      marker.on('mousemove', (e: L.LeafletMouseEvent) => showHoverCard(p, e));

      marker.on('click', () => {
        setSelectedProfile(p);
        setHoverCard(null);
        mapRef.current?.flyTo([p.lat, p.lng], Math.max(mapRef.current.getZoom(), 10), { duration: 0.6 });
      });

      markersRef.current.push(marker);
    });
  }

  const containerRect = mapWrapper.current?.getBoundingClientRect() ?? null;

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 88px)' }}>

      {/* Filters */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 bg-white border-b border-stone-100">
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={capSearch}
              onChange={e => setCapSearch(e.target.value)}
              placeholder="Capacité, ville…"
              className="w-full pl-8 pr-8 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all"
            />
            {capSearch && (
              <button onClick={() => setCapSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors">
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { value: 'all',      label: 'Tous',        icon: MapPin },
            { value: 'local',    label: 'Proximité',   icon: MapPin },
            { value: 'distance', label: 'À distance',  icon: Globe },
            { value: 'both',     label: 'Flexible',    icon: Users },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setZoneFilter(value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border flex-shrink-0 transition-all ${
                zoneFilter === value
                  ? 'bg-stone-900 border-stone-900 text-white'
                  : 'bg-white border-stone-200 text-stone-500 hover:border-stone-400'
              }`}
              style={zoneFilter === value ? {} : { borderColor: value !== 'all' ? ZONE_COLORS[value] + '60' : undefined }}
            >
              <Icon size={10} style={{ color: zoneFilter === value ? 'white' : (value !== 'all' ? ZONE_COLORS[value] : undefined) }} />
              {label}
            </button>
          ))}
        </div>

        {filtered.length > 0 && (
          <p className="text-xs text-stone-400 mt-2">
            {filtered.length} présence{filtered.length > 1 ? 's' : ''} sur la carte
          </p>
        )}
      </div>

      {/* Map */}
      <div ref={mapWrapper} className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-[1000] bg-white">
            <div className="w-8 h-8 border border-stone-200 border-t-stone-500 rounded-full animate-spin" />
          </div>
        )}

        <div ref={mapContainer} style={{ width: '100%', height: '100%', minHeight: 300 }} />

        {/* Hover vitrine card */}
        {hoverCard && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 1100 }}
          >
            <ProfileHoverCard
              card={hoverCard}
              onOpenProfile={onOpenProfile}
              containerRect={mapWrapper.current ? mapWrapper.current.getBoundingClientRect() : containerRect}
            />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[500]">
            <div className="bg-white rounded-2xl shadow-lg px-6 py-5 text-center max-w-xs mx-4">
              <p className="text-sm text-stone-500 mb-1">Aucune présence trouvée</p>
              <p className="text-xs text-stone-400">Modifiez les filtres ou élargissez la recherche.</p>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-8 left-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-md px-3 py-2.5 border border-stone-100 z-[500]">
          {[
            { color: ZONE_COLORS.local, label: 'Proximité' },
            { color: ZONE_COLORS.distance, label: 'À distance' },
            { color: ZONE_COLORS.both, label: 'Flexible' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2 mb-1.5 last:mb-0">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-xs text-stone-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Profile mini-card (on click) */}
      {selectedProfile && (
        <div className="flex-shrink-0 bg-white border-t border-stone-200 shadow-lg">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden border-2" style={{ borderColor: ZONE_COLORS[selectedProfile.zone || 'both'] + '50' }}>
                <img
                  src={getProfilePhoto(selectedProfile.id)}
                  alt={selectedProfile.display_name}
                  className="w-full h-full object-cover"
                  onError={e => {
                    const el = e.currentTarget as HTMLImageElement;
                    el.style.display = 'none';
                    el.parentElement!.style.background = ZONE_COLORS[selectedProfile.zone || 'both'];
                    el.parentElement!.style.display = 'flex';
                    el.parentElement!.style.alignItems = 'center';
                    el.parentElement!.style.justifyContent = 'center';
                    el.parentElement!.style.color = 'white';
                    el.parentElement!.style.fontSize = '14px';
                    el.parentElement!.style.fontWeight = '600';
                    el.parentElement!.textContent = (selectedProfile.display_name || '?')[0].toUpperCase();
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-stone-900 truncate">{selectedProfile.display_name}</p>
                  {isOnline(selectedProfile.last_seen) && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium flex-shrink-0">
                      <Wifi size={9} /> En ligne
                    </span>
                  )}
                </div>
                {selectedProfile.city && (
                  <p className="text-xs text-stone-400 flex items-center gap-1 mb-2">
                    <MapPin size={9} /> {selectedProfile.city}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {selectedProfile.explicit_capabilities.slice(0, 2).map(cap => (
                    <span key={cap} className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full">{cap}</span>
                  ))}
                  {selectedProfile.explicit_capabilities.length > 2 && (
                    <span className="text-xs text-stone-400">+{selectedProfile.explicit_capabilities.length - 2}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setSelectedProfile(null)}
                  className="p-1.5 text-stone-300 hover:text-stone-600 transition-colors"
                >
                  <X size={14} />
                </button>
                <button
                  onClick={() => onOpenProfile(selectedProfile.user_id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white text-xs font-semibold rounded-xl hover:bg-stone-800 transition-all"
                >
                  Voir <ArrowRight size={10} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}