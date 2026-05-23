import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShoppingBag, Box, Package, Search, Layers,
  Tag, MapPin, ArrowRight, RefreshCw, X, Newspaper,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { avatarBg, initials, relTime } from '../lib/ui';
import type { ProfileListing } from '../lib/supabase';
import { FEED_PANEL_ITEMS, NETWORK_STATS } from '../data/mockOccitanie';

type FeedEntry = ProfileListing & {
  _profile?: { title: string; avatar_url?: string | null; city?: string };
};

const TYPE_META: Record<ProfileListing['listing_type'], {
  label: string; color: string; bg: string; icon: typeof ShoppingBag;
}> = {
  service:     { label: 'Service',   color: '#60a5fa', bg: '#60a5fa12', icon: ShoppingBag },
  object_new:  { label: 'Neuf',      color: '#22c55e', bg: '#22c55e12', icon: Box },
  object_used: { label: 'Occasion',  color: '#f97316', bg: '#f9731612', icon: Package },
  resource:    { label: 'Ressource', color: '#a78bfa', bg: '#a78bfa12', icon: Layers },
  demand:      { label: 'Recherche', color: '#fbbf24', bg: '#fbbf2412', icon: Search },
};

function MiniAvatar({ name, src, size = 28 }: { name: string; src?: string | null; size?: number }) {
  const [err, setErr] = useState(false);
  const bg = avatarBg(name);
  const r  = Math.round(size * 0.28);
  const fs = Math.round(size * 0.38);
  if (src && !err) {
    return (
      <img src={src} alt={name} onError={() => setErr(true)}
        style={{ width: size, height: size, minWidth: size, borderRadius: r, objectFit: 'cover' }}
        className="flex-shrink-0"
      />
    );
  }
  return (
    <div style={{ width: size, height: size, minWidth: size, background: bg, borderRadius: r, fontSize: fs }}
      className="flex items-center justify-center font-bold text-white select-none flex-shrink-0"
    >
      {initials(name)}
    </div>
  );
}

function FeedItem({ entry, onCta, isNew }: { entry: FeedEntry; onCta: () => void; isNew: boolean }) {
  const meta   = TYPE_META[entry.listing_type];
  const Icon   = meta.icon;
  const img    = entry.image_urls?.[0];
  const name   = entry._profile?.title ?? '';
  const [imgErr, setImgErr] = useState(false);
  const isFree = entry.price_hint?.toLowerCase().includes('gratuit') || entry.price_hint?.toLowerCase().includes('offert');

  return (
    <button
      onClick={onCta}
      className={`w-full text-left flex gap-2.5 p-2.5 rounded-xl border transition-all group hover:bg-white/4 ${isNew ? 'animate-feed-in' : ''}`}
      style={{ borderColor: 'rgba(255,255,255,0.055)', background: isNew ? meta.bg : 'transparent' }}
    >
      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ background: meta.bg }}>
        {img && !imgErr ? (
          <img src={img} alt={entry.title} onError={() => setImgErr(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon size={16} style={{ color: meta.color, opacity: 0.55 }} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className="flex items-center gap-0.5 text-[9px] font-bold leading-none" style={{ color: meta.color }}>
            <Icon size={7} /> {meta.label}
          </span>
          <span className="text-[9px] text-white/20 flex-shrink-0">{relTime(entry.created_at)}</span>
        </div>
        <p className="text-[11.5px] font-semibold text-white/78 leading-snug line-clamp-2 mb-1">{entry.title}</p>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 min-w-0">
            <MiniAvatar name={name} src={entry._profile?.avatar_url} size={14} />
            <span className="text-[9px] text-white/28 truncate">{name}</span>
            {entry._profile?.city && (
              <span className="text-[9px] text-white/18 flex items-center gap-0.5 flex-shrink-0">
                <MapPin size={6} />{entry._profile.city}
              </span>
            )}
          </div>
          {entry.price_hint && (
            <span className="text-[9px] font-semibold flex-shrink-0 flex items-center gap-0.5"
              style={{ color: isFree ? '#22c55e' : 'rgba(255,255,255,0.3)' }}>
              <Tag size={7} />{entry.price_hint}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

type PanelProps = {
  entries: FeedEntry[];
  loading: boolean;
  total: number;
  newIds: Set<string>;
  onCta: () => void;
  onViewAll: () => void;
  onRefresh: () => void;
  isAuthenticated: boolean;
};

function FeedPanel({ entries, loading, total, newIds, onCta, onViewAll, onRefresh, isAuthenticated }: PanelProps) {
  return (
    <>
      <div className="flex-shrink-0 px-3.5 pt-4 pb-3 border-b border-white/6">
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-[10px] font-bold tracking-widest uppercase text-white/30">Fil d'actualité</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-[9px] text-emerald-400 font-medium">En direct</span>
          </div>
        </div>
        <p className="text-[10px] text-white/20">{total > 0 ? total : NETWORK_STATS.feedCount} annonces dans le réseau</p>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-0.5 scrollbar-hide">
        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="w-5 h-5 border border-white/15 border-t-white/50 rounded-full animate-spin" />
          </div>
        ) : entries.length === 0 ? (
          <div className="py-2 space-y-1">
            {FEED_PANEL_ITEMS.map(fp => (
              <button key={fp.id} onClick={onCta} className="w-full text-left p-2.5 rounded-xl border border-white/5 hover:bg-white/4 transition-all group">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                    style={{ background: avatarBg(fp.author) }}>
                    {fp.author[0]}
                  </div>
                  <span className="text-[11px] font-semibold text-white/60">{fp.author}</span>
                  <span className="text-[9px] text-white/20 flex items-center gap-0.5 ml-auto flex-shrink-0">
                    <MapPin size={7} />{fp.city}
                  </span>
                </div>
                {fp.items.length > 0 && (
                  <div className="flex flex-wrap gap-1 ml-8">
                    {fp.items.map((item, i) => (
                      <span key={i} className="text-[9.5px] text-white/35 px-1.5 py-0.5 rounded bg-white/3 border border-white/5">
                        {item.label}{item.pricing ? ` · ${item.pricing}` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          entries.map(e => <FeedItem key={e.id} entry={e} onCta={onCta} isNew={newIds.has(e.id)} />)
        )}
      </div>

      <div className="flex-shrink-0 px-3 py-3 border-t border-white/6 space-y-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onViewAll}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-white/8 text-[11px] text-white/35 hover:text-white/65 hover:border-white/20 transition-all"
          >
            Voir toutes les annonces
          </button>
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl border border-white/8 text-white/25 hover:text-white/55 hover:border-white/20 transition-all group"
            title="Rafraîchir"
          >
            <RefreshCw size={11} className="group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>
        {!isAuthenticated && (
          <button
            onClick={onCta}
            className="w-full py-2.5 rounded-xl bg-white text-[#0c0a09] text-[11px] font-bold hover:bg-white/92 transition-all flex items-center justify-center gap-1.5"
          >
            Rejoindre le réseau <ArrowRight size={10} />
          </button>
        )}
      </div>
    </>
  );
}

type Props = {
  onCta: () => void;
  onViewAll?: () => void;
  ctaLabel?: string;
  isAuthenticated?: boolean;
};

export default function LiveFeedSidebar({ onCta, onViewAll, isAuthenticated = false }: Props) {
  const [entries, setEntries]     = useState<FeedEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [newIds, setNewIds]       = useState<Set<string>>(new Set());
  const [total, setTotal]         = useState(0);
  const [collapsed, setCollapsed] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile]   = useState(() => typeof window !== 'undefined' && window.innerWidth < 1100);
  const knownIds                  = useRef<Set<string>>(new Set());
  const newIdsTimer               = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Single resize effect — debounced, closes drawer when switching to desktop
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function onResize() {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const mobile = window.innerWidth < 1100;
        setIsMobile(mobile);
        if (!mobile) setDrawerOpen(false);
      }, 100);
    }
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(timer); };
  }, []);

  const fetchFeed = useCallback(async () => {
    const { data, count } = await supabase
      .from('profile_listings')
      .select('*, capability_profiles!inner(title, avatar_url, city)', { count: 'estimated' })
      .eq('is_published', true)
      .eq('is_available', true)
      .order('created_at', { ascending: false })
      .limit(30);

    if (!data) return;

    const mapped: FeedEntry[] = data.map((row: Record<string, unknown>) => {
      const { capability_profiles, ...rest } = row as Record<string, unknown> & {
        capability_profiles: FeedEntry['_profile'];
      };
      return { ...(rest as ProfileListing), _profile: capability_profiles };
    });

    const fresh = new Set<string>();
    if (knownIds.current.size > 0) {
      mapped.forEach(e => { if (!knownIds.current.has(e.id)) fresh.add(e.id); });
    }
    // Cap knownIds to last 200 to avoid unbounded memory growth
    if (knownIds.current.size > 200) knownIds.current = new Set(Array.from(knownIds.current).slice(-100));
    mapped.forEach(e => knownIds.current.add(e.id));

    setEntries(mapped);
    setTotal(count ?? mapped.length);

    if (fresh.size > 0) {
      if (newIdsTimer.current) clearTimeout(newIdsTimer.current);
      setNewIds(fresh);
      newIdsTimer.current = setTimeout(() => setNewIds(new Set()), 3000);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFeed();
    return () => { if (newIdsTimer.current) clearTimeout(newIdsTimer.current); };
  }, [fetchFeed]);

  useEffect(() => {
    const channel = supabase
      .channel('feed-sidebar-realtime')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'profile_listings',
        filter: 'is_published=eq.true',
      }, () => fetchFeed())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchFeed]);

  function closeDrawer() { setDrawerOpen(false); }

  const panelProps: PanelProps = {
    entries, loading, total, newIds, isAuthenticated,
    onRefresh: fetchFeed,
    onCta:     () => { onCta(); if (drawerOpen) closeDrawer(); },
    onViewAll: () => { (onViewAll ?? onCta)(); if (drawerOpen) closeDrawer(); },
  };

  if (isMobile) {
    return (
      <>
        {!drawerOpen && (
          <button
            onClick={() => setDrawerOpen(true)}
            className="fixed bottom-20 right-4 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-full shadow-2xl transition-all active:scale-95"
            style={{ background: '#1a1814', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <Newspaper size={14} className="text-white/60" />
            <span className="text-[11px] font-semibold text-white/60">Fil</span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/12 px-1.5 py-0.5 rounded-full">
              {total > 0 ? total : NETWORK_STATS.feedCount}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </button>
        )}

        {drawerOpen && (
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={closeDrawer} />
        )}

        <div
          className="fixed left-0 right-0 bottom-0 z-50 flex flex-col rounded-t-2xl transition-transform duration-300"
          style={{
            height: '80vh',
            background: 'rgba(10,9,8,0.98)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            transform: drawerOpen ? 'translateY(0)' : 'translateY(100%)',
          }}
        >
          <div className="flex-shrink-0 flex items-center justify-end px-4 pt-3 pb-1 relative">
            <div className="w-8 h-1 rounded-full bg-white/15 absolute left-1/2 -translate-x-1/2 top-3" />
            <button
              onClick={closeDrawer}
              className="w-7 h-7 flex items-center justify-center rounded-full text-white/30 hover:text-white/70 hover:bg-white/8 transition-all"
            >
              <X size={14} />
            </button>
          </div>
          <FeedPanel {...panelProps} />
        </div>
      </>
    );
  }

  return (
    <aside
      className="fixed right-0 top-0 bottom-0 z-30 flex flex-col transition-all duration-300"
      style={{
        width: collapsed ? 36 : 300,
        background: 'rgba(10,9,8,0.96)',
        borderLeft: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -left-3.5 top-20 w-7 h-7 rounded-full bg-[#141210] border border-white/10 flex items-center justify-center text-white/30 hover:text-white/70 hover:border-white/25 transition-all z-10"
        title={collapsed ? 'Ouvrir le fil' : 'Réduire'}
      >
        {collapsed ? <ArrowRight size={11} /> : <X size={10} />}
      </button>

      {collapsed ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="text-[9px] font-bold tracking-[0.2em] uppercase text-white/25 select-none"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            Fil d'actualité
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      ) : (
        <FeedPanel {...panelProps} />
      )}
    </aside>
  );
}
