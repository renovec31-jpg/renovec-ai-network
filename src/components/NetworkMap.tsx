import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { initials as getInitialsUtil } from '../lib/ui';

interface MapProfile {
  id: string;
  lat: number;
  lng: number;
  city: string | null;
  country_code: string | null;
  title: string;
  tagline: string;
  availability: string;
  sav_points: number;
  profile_type: string;
  explicit_capabilities: string[];
  initials: string;
  color: string;
  isActive: boolean;
}

const TOULOUSE = { lat: 43.6047, lng: 1.4442 };
const TILE_SIZE = 256;

const PROFILE_COLORS = [
  '#FF6B35','#2ECC71','#3498DB','#E91E8C','#F39C12',
  '#1ABC9C','#8E44AD','#E74C3C','#16A085','#D35400',
];

const TYPE_FILTERS = [
  { key: 'all',          label: 'Tous' },
  { key: 'individual',   label: 'Personnes' },
  { key: 'professional', label: 'Pros' },
  { key: 'association',  label: 'Associations' },
  { key: 'company',      label: 'Entreprises' },
];

const STATUS_COLOR: Record<string, string> = {
  active: '#22c55e',
  recent: '#f59e0b',
  available: '#94a3b8',
};

function mercatorY(lat: number): number {
  const rad = (lat * Math.PI) / 180;
  return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2;
}

function getInitials(title: string): string { return getInitialsUtil(title); }

function getColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return PROFILE_COLORS[Math.abs(hash) % PROFILE_COLORS.length];
}

interface Props {
  centerOverride?: { lat: number; lng: number } | null;
  staticMode?: boolean;
  onGeoActivate?: (pos: { lat: number; lng: number }) => void;
  showSeeds?: boolean;
}

export default function NetworkMap({ centerOverride, staticMode, onGeoActivate }: Props = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [center, setCenter] = useState(TOULOUSE);
  const [zoom, setZoom] = useState(13);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [selected, setSelected] = useState<MapProfile | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [filter, setFilter] = useState('all');
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(!staticMode);
  const [geoError, setGeoError] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [filterKey, setFilterKey] = useState(0);
  const [ipGeoFetched, setIpGeoFetched] = useState(false);
  const [profiles, setProfiles] = useState<MapProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, lat: TOULOUSE.lat, lng: TOULOUSE.lng });

  // Load profiles from DB
  useEffect(() => {
    loadMapProfiles();
  }, []);

  async function loadMapProfiles() {
    setLoadingProfiles(true);
    try {
      const { data } = await supabase
        .from('capability_profiles')
        .select('id, title, tagline, availability, sav_points, profile_type, explicit_capabilities, lat, lng, city, country_code')
        .eq('is_published', true)
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .limit(500);

      if (data) {
        setProfiles(data.map(p => ({
          id: p.id,
          lat: p.lat,
          lng: p.lng,
          city: p.city,
          country_code: p.country_code,
          title: p.title,
          tagline: p.tagline,
          availability: p.availability || '',
          sav_points: p.sav_points || 0,
          profile_type: p.profile_type || 'individual',
          explicit_capabilities: p.explicit_capabilities || [],
          initials: getInitials(p.title),
          color: getColor(p.id),
          isActive: (p.availability || '').toLowerCase().includes('maintenant'),
        })));
      }
    } finally {
      setLoadingProfiles(false);
    }
  }

  // IP geolocation fallback
  useEffect(() => {
    if (staticMode || ipGeoFetched) return;
    if (!navigator.geolocation) { fetchIpGeo(); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(coords); setCenter(coords); setGeoLoading(false); setIpGeoFetched(true);
      },
      () => fetchIpGeo()
    );
  }, [staticMode]);

  function fetchIpGeo() {
    setIpGeoFetched(true);
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => {
        if (data.latitude && data.longitude) {
          const coords = { lat: data.latitude, lng: data.longitude };
          setUserPos(coords); setCenter(coords);
        } else { setGeoError(true); }
      })
      .catch(() => setGeoError(true))
      .finally(() => setGeoLoading(false));
  }

  function requestPreciseGeo() {
    navigator.geolocation?.getCurrentPosition(
      pos => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(coords); setCenter(coords); setGeoError(false);
        onGeoActivate?.(coords);
      },
      () => setGeoError(true)
    );
  }

  useEffect(() => { if (centerOverride) setCenter(centerOverride); }, [centerOverride]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSize({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.max(2, Math.min(17, z + (e.deltaY < 0 ? 0.5 : -0.5))));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const latLngToPixel = useCallback(
    (lat: number, lng: number) => {
      const scale = TILE_SIZE * Math.pow(2, zoom);
      const x = ((lng + 180) / 360) * scale;
      const y = mercatorY(lat) * scale;
      const cx = ((center.lng + 180) / 360) * scale;
      const cy = mercatorY(center.lat) * scale;
      return { px: size.w / 2 + (x - cx), py: size.h / 2 + (y - cy) };
    },
    [center, size, zoom]
  );

  const getTiles = useCallback(() => {
    if (size.w === 0 || size.h === 0) return [];
    const n = Math.pow(2, zoom);
    const cxF = ((center.lng + 180) / 360) * n;
    const cyF = mercatorY(center.lat) * n;
    const cx = Math.floor(cxF);
    const cy = Math.floor(cyF);
    const tilesX = Math.ceil(size.w / TILE_SIZE / 2) + 2;
    const tilesY = Math.ceil(size.h / TILE_SIZE / 2) + 2;
    const tiles: { tx: number; ty: number; left: number; top: number }[] = [];
    for (let dx = -tilesX; dx <= tilesX; dx++) {
      for (let dy = -tilesY; dy <= tilesY; dy++) {
        const tx = cx + dx, ty = cy + dy;
        if (tx < 0 || ty < 0 || tx >= n || ty >= n) continue;
        tiles.push({ tx, ty, left: size.w / 2 + (tx - cxF) * TILE_SIZE, top: size.h / 2 + (ty - cyF) * TILE_SIZE });
      }
    }
    return tiles;
  }, [center, size, zoom]);

  function handlePointerDown(e: React.PointerEvent) {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, lat: center.lat, lng: center.lng };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    const scale = TILE_SIZE * Math.pow(2, zoom);
    const newLng = dragStart.current.lng - (dx / scale) * 360;
    const cyF = mercatorY(dragStart.current.lat) * scale;
    const newY = (cyF - dy) / scale;
    const newLat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * newY))) * 180) / Math.PI;
    setCenter({ lat: Math.max(-85, Math.min(85, newLat)), lng: newLng });
  }

  function handlePointerMoveCapture(e: React.PointerEvent) {
    if (isDragging.current) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    detectHover(e.clientX - rect.left, e.clientY - rect.top);
  }

  function detectHover(mx: number, my: number) {
    let found: string | null = null;
    for (const p of visible) {
      const { px, py } = latLngToPixel(p.lat, p.lng);
      if ((mx - px) ** 2 + (my - py) ** 2 < 28 * 28) { found = p.id; break; }
    }
    setHovered(found);
  }

  function handlePointerUp() { isDragging.current = false; }

  function openSheet(p: MapProfile) {
    setSelected(p);
    requestAnimationFrame(() => setSheetVisible(true));
  }

  function closeSheet() {
    setSheetVisible(false);
    setTimeout(() => setSelected(null), 320);
  }

  function changeZoom(delta: number) { setZoom(z => Math.max(2, Math.min(17, z + delta))); }

  function changeFilter(f: string) { setFilter(f); setFilterKey(k => k + 1); }

  const visible = filter === 'all'
    ? profiles
    : profiles.filter(p => p.profile_type === filter);

  const activeCount = profiles.filter(p => p.isActive).length;
  const tiles = getTiles();

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 480, borderRadius: 16, background: '#1a1a2e' }}>

      {/* Map canvas */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ cursor: hovered ? 'pointer' : isDragging.current ? 'grabbing' : 'grab', userSelect: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={e => { handlePointerMove(e); handlePointerMoveCapture(e); }}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => { handlePointerUp(); setHovered(null); }}
        onClick={() => { if (!isDragging.current && selected) closeSheet(); }}
      >
        {/* Tiles */}
        {tiles.map(({ tx, ty, left, top }) => (
          <img
            key={`${tx}-${ty}`}
            src={`https://a.basemaps.cartocdn.com/dark_all/${Math.round(zoom)}/${tx}/${ty}.png`}
            alt=""
            draggable={false}
            style={{ position: 'absolute', left: Math.round(left), top: Math.round(top), width: TILE_SIZE, height: TILE_SIZE, pointerEvents: 'none' }}
          />
        ))}

        {/* User heat */}
        {size.w > 0 && (() => {
          const pos = userPos ?? TOULOUSE;
          const { px, py } = latLngToPixel(pos.lat, pos.lng);
          return (
            <div style={{
              position: 'absolute', left: px - 150, top: py - 150, width: 300, height: 300,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(242,101,34,0.20) 0%, rgba(242,101,34,0.05) 55%, transparent 75%)',
              pointerEvents: 'none',
            }} />
          );
        })()}

        {/* Profile markers */}
        {size.w > 0 && visible.map((p, idx) => {
          const { px, py } = latLngToPixel(p.lat, p.lng);
          // Cull off-screen markers for performance
          if (px < -60 || px > size.w + 60 || py < -60 || py > size.h + 60) return null;

          const isSelected = selected?.id === p.id;
          const isHovered = hovered === p.id;
          const sz = p.isActive ? 44 : 36;
          const half = sz / 2;

          return (
            <div
              key={`${p.id}-${filterKey}`}
              style={{
                position: 'absolute',
                left: px - half - 10, top: py - half - 10,
                width: sz + 20, height: sz + 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: isSelected ? 20 : isHovered ? 15 : 10,
                cursor: 'pointer',
                animation: idx < 200 ? `mapAvatarIn 0.3s ease-out both` : undefined,
                animationDelay: idx < 200 ? `${idx * 8}ms` : undefined,
              }}
              onClick={e => { e.stopPropagation(); openSheet(p); }}
            >
              {p.isActive && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  background: p.color + '30',
                  animation: 'mapPulse 2.2s ease-out infinite',
                }} />
              )}
              <div style={{
                width: sz, height: sz, borderRadius: '50%',
                background: p.color,
                border: isSelected ? '3px solid #fff' : isHovered ? '2.5px solid rgba(255,255,255,0.95)' : '2px solid rgba(255,255,255,0.55)',
                boxShadow: isSelected ? `0 0 0 3px ${p.color}55, 0 8px 24px rgba(0,0,0,0.55)` : isHovered ? '0 4px 18px rgba(0,0,0,0.55)' : '0 3px 10px rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 11, color: '#fff',
                fontFamily: 'system-ui,-apple-system,sans-serif',
                transform: isSelected ? 'scale(1.13)' : isHovered ? 'scale(1.08)' : 'scale(1)',
                transition: 'transform 0.18s, box-shadow 0.18s',
                position: 'relative', zIndex: 1, flexShrink: 0,
              }}>
                {p.initials}
              </div>

              {p.isActive && (
                <div style={{
                  position: 'absolute', bottom: 10 + 1, right: 10 + 1,
                  width: 10, height: 10, background: '#22c55e',
                  borderRadius: '50%', border: '2px solid rgba(20,20,30,0.8)', zIndex: 2,
                }} />
              )}

              {isHovered && (
                <div style={{
                  position: 'absolute', bottom: sz + 20, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.88)', color: '#fff',
                  padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 30,
                  fontFamily: 'system-ui', boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}>
                  <div>{p.title.length > 28 ? p.title.substring(0, 28) + '…' : p.title}</div>
                  <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 500, marginTop: 1 }}>{p.city}</div>
                  <div style={{
                    position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                    width: 0, height: 0,
                    borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
                    borderTop: '5px solid rgba(0,0,0,0.88)',
                  }} />
                </div>
              )}
            </div>
          );
        })}

        {/* User marker */}
        {size.w > 0 && (() => {
          const pos = userPos ?? TOULOUSE;
          const { px, py } = latLngToPixel(pos.lat, pos.lng);
          return (
            <div style={{
              position: 'absolute', left: px - 38, top: py - 38, width: 76, height: 76,
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 25, pointerEvents: 'none',
            }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(242,101,34,0.22)', animation: 'mapPulse 1.6s ease-out infinite' }} />
              <div style={{ position: 'absolute', inset: 6, borderRadius: '50%', background: 'rgba(242,101,34,0.12)', animation: 'mapPulse 1.6s ease-out infinite', animationDelay: '0.45s' }} />
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: '#F26522',
                border: '4px solid #fff', boxShadow: '0 6px 20px rgba(242,101,34,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 13, color: '#fff', fontFamily: 'system-ui',
                position: 'relative', zIndex: 1, flexShrink: 0,
              }}>
                Moi
              </div>
            </div>
          );
        })()}

        {geoLoading && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, pointerEvents: 'none' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.2)', borderTopColor: 'rgba(255,255,255,0.85)', animation: 'mapSpin 0.9s linear infinite' }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontFamily: 'system-ui' }}>Localisation en cours…</span>
          </div>
        )}

        {loadingProfiles && !geoLoading && (
          <div style={{ position: 'absolute', top: 60, right: 12, zIndex: 40, background: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: '4px 12px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'system-ui' }}>
            Chargement du réseau…
          </div>
        )}
      </div>

      {/* Attribution */}
      <div style={{ position: 'absolute', bottom: 60, right: 8, zIndex: 40, fontSize: 10, color: 'rgba(255,255,255,0.3)', pointerEvents: 'none', fontFamily: 'system-ui' }}>
        © OpenStreetMap · CartoDB
      </div>

      {geoError && !geoLoading && (
        <div style={{ position: 'absolute', bottom: 76, left: '50%', transform: 'translateX(-50%)', zIndex: 40, fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: 'system-ui', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
          Position non disponible · Toulouse par défaut
        </div>
      )}

      {staticMode && onGeoActivate && !userPos && (
        <button
          onClick={requestPreciseGeo}
          style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 40, background: 'rgba(242,101,34,0.9)', color: '#fff', border: 'none', borderRadius: 999, padding: '8px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'system-ui', whiteSpace: 'nowrap' }}
        >
          Activer ma position précise
        </button>
      )}

      {/* Filter bar */}
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 40, display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flex: 1, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderRadius: 999, padding: '6px 10px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', msOverflowStyle: 'none', scrollbarWidth: 'none' } as React.CSSProperties}>
          {TYPE_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => changeFilter(f.key)}
              style={{ flexShrink: 0, padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: filter === f.key ? '#111' : 'transparent', color: filter === f.key ? '#fff' : '#666' }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderRadius: 999, padding: '6px 12px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', animation: 'mapPulseDot 2s ease-in-out infinite' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#111', whiteSpace: 'nowrap' }}>{activeCount} actif{activeCount > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Bottom-left count */}
      <div style={{ position: 'absolute', bottom: 16, left: 12, zIndex: 40, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', borderRadius: 999, padding: '6px 14px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)', fontFamily: 'system-ui' }}>
        {visible.length.toLocaleString('fr-FR')} présence{visible.length > 1 ? 's' : ''} dans le réseau
      </div>

      {/* Controls */}
      <div style={{ position: 'absolute', bottom: 16, right: 12, zIndex: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        {[{ delta: 1, label: '+' }, { delta: -1, label: '−' }].map(({ delta, label }) => (
          <button key={label} onClick={() => changeZoom(delta)}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.75)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.35)', fontFamily: 'system-ui', transition: 'background 0.15s' }}
          >{label}</button>
        ))}
        <button onClick={() => { if (userPos) setCenter(userPos); else requestPreciseGeo(); }}
          style={{ width: 44, height: 44, borderRadius: '50%', background: '#111', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', transition: 'transform 0.15s' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </button>
      </div>

      {/* Sheet backdrop */}
      {selected && (
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 45, background: 'rgba(0,0,0,0.42)', opacity: sheetVisible ? 1 : 0, transition: 'opacity 0.3s', pointerEvents: sheetVisible ? 'auto' : 'none' }}
          onClick={closeSheet}
        />
      )}

      {/* Bottom sheet */}
      {selected && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: '#fff', borderRadius: '20px 20px 0 0',
          boxShadow: '0 -10px 50px rgba(0,0,0,0.25)',
          transform: sheetVisible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e5e7eb' }} />
          </div>
          <div style={{ padding: '4px 20px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '8px 0 12px' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', background: selected.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 17, fontFamily: 'system-ui', flexShrink: 0,
              }}>
                {selected.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#111', marginBottom: 2 }}>{selected.title}</div>
                {selected.city && (
                  <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>{selected.city}{selected.country_code && selected.country_code !== 'FR' ? ` · ${selected.country_code}` : ''}</div>
                )}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: selected.isActive ? '#22c55e18' : '#f59e0b18', borderRadius: 999, padding: '3px 8px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: selected.isActive ? STATUS_COLOR.active : STATUS_COLOR.recent }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: selected.isActive ? STATUS_COLOR.active : STATUS_COLOR.recent }}>{selected.availability || 'Disponible'}</span>
                </div>
              </div>
              <button onClick={closeSheet} style={{ width: 28, height: 28, borderRadius: '50%', background: '#f3f4f6', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#6b7280', flexShrink: 0 }}>✕</button>
            </div>

            <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.55, padding: '12px 0', borderTop: '1px solid #f3f4f6', marginBottom: 10 }}>
              {selected.tagline}
            </p>

            {selected.explicit_capabilities.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                {selected.explicit_capabilities.slice(0, 3).map(cap => (
                  <span key={cap} style={{ background: '#f3f4f6', color: '#374151', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 999 }}>
                    {cap}
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F26522' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#F26522' }}>{selected.sav_points} pts SAV</span>
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af', textTransform: 'capitalize' }}>{selected.profile_type}</div>
            </div>

            <button
              style={{ width: '100%', padding: '14px', background: '#111', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'system-ui', transition: 'background 0.15s' }}
              onClick={() => {
                closeSheet();
                window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: { tab: 'discussions' } }));
              }}
            >
              Entrer en contact →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
