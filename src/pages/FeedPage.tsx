import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Package, Search, ShoppingBag, Box, Layers, Tag, MapPin,
  RefreshCw, SlidersHorizontal, X, ChevronDown,
  Sparkles, Clock,
} from 'lucide-react';
import { supabase, ProfileListing } from '../lib/supabase';
import { avatarBg, initials, relTime as relativeTime } from '../lib/ui';
import FeedRain from '../components/FeedRain';

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileInfo = {
  title: string;
  avatar_url?: string | null;
  city?: string;
  profile_type?: string;
};

type ListingWithProfile = ProfileListing & {
  _profile?: ProfileInfo;
};

type Filter = ProfileListing['listing_type'] | 'all';

const PAGE_SIZE = 15;

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_META: Record<ProfileListing['listing_type'], { label: string; color: string; bg: string; border: string; icon: typeof ShoppingBag }> = {
  service:     { label: 'Service',     color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.18)',  icon: ShoppingBag },
  object_new:  { label: 'Neuf',        color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.18)',   icon: Box },
  object_used: { label: "D'occasion",  color: '#f97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.18)',  icon: Package },
  resource:    { label: 'Ressource',   color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.18)', icon: Layers },
  demand:      { label: 'Recherche',   color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.18)',  icon: Search },
};

const COND_LABELS: Record<string, string> = {
  new: 'Neuf', like_new: 'Comme neuf', good: 'Bon état', fair: 'État correct',
};

const FILTER_CHIPS: Array<{ key: Filter; label: string }> = [
  { key: 'all',         label: 'Tout' },
  { key: 'service',     label: 'Services' },
  { key: 'object_new',  label: 'Neuf' },
  { key: 'object_used', label: "Occasion" },
  { key: 'demand',      label: 'Recherche' },
  { key: 'resource',    label: 'Ressources' },
];

const SORT_OPTIONS = [
  { key: 'recent',   label: 'Plus récents' },
  { key: 'popular',  label: 'Plus vus' },
];

// ─── Avatar component ─────────────────────────────────────────────────────────

function ProfileAvatar({ name, src, size = 32 }: { name: string; src?: string | null; size?: number }) {
  const [err, setErr] = useState(false);
  const bg = avatarBg(name);
  const r  = Math.round(size * 0.3);
  if (src && !err) {
    return (
      <img
        src={src} alt={name} onError={() => setErr(true)}
        style={{ width: size, height: size, minWidth: size, borderRadius: r, objectFit: 'cover' }}
        className="flex-shrink-0"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, minWidth: size, background: bg, borderRadius: r, fontSize: Math.round(size * 0.36) }}
      className="flex items-center justify-center font-bold text-white select-none flex-shrink-0"
    >
      {initials(name)}
    </div>
  );
}

// ─── Listing Card ─────────────────────────────────────────────────────────────

function FeedCard({
  listing,
  onViewProfile,
  onContact,
}: {
  listing: ListingWithProfile;
  onViewProfile: (profileId: string) => void;
  onContact: (profileId: string) => void;
}) {
  const meta  = TYPE_META[listing.listing_type];
  const Icon  = meta.icon;
  const img   = listing.image_urls?.[0];
  const [imgErr, setImgErr] = useState(false);
  const name  = listing._profile?.title ?? 'Profil';

  return (
    <article
      className="rounded-2xl overflow-hidden border transition-all hover:border-white/16 group"
      style={{ borderColor: 'rgba(255,255,255,0.07)', background: '#141210' }}
    >
      {/* Photo */}
      {img && !imgErr && (
        <div className="relative w-full h-48 overflow-hidden">
          <img
            src={img} alt={listing.title} onError={() => setImgErr(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          {/* Type badge */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            <span
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-sm"
              style={{ color: meta.color, background: `${meta.bg}ee`, borderColor: meta.border }}
            >
              <Icon size={9} /> {meta.label}
            </span>
            {listing.condition && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/55 text-white/75 backdrop-blur-sm border border-white/12">
                {COND_LABELS[listing.condition]}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="p-4">
        {/* No-image type badge */}
        {(!img || imgErr) && (
          <div className="flex items-center gap-2 mb-3">
            <span
              className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border"
              style={{ color: meta.color, borderColor: meta.border, background: meta.bg }}
            >
              <Icon size={9} /> {meta.label}
            </span>
            {listing.condition && (
              <span className="text-[10px] text-white/35 bg-white/5 border border-white/8 px-2 py-0.5 rounded-full">
                {COND_LABELS[listing.condition]}
              </span>
            )}
          </div>
        )}

        <h3 className="text-[14px] font-bold text-white/88 mb-1.5 leading-snug">{listing.title}</h3>
        <p className="text-[12px] text-white/40 leading-relaxed mb-3 line-clamp-2">{listing.description}</p>

        {/* Tags */}
        {listing.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {listing.tags.slice(0, 3).map(t => (
              <span key={t} className="text-[10px] text-white/28 bg-white/5 border border-white/7 px-1.5 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between pt-2 border-t border-white/6">
          {/* Profile */}
          <button
            onClick={() => onViewProfile(listing.profile_id)}
            className="flex items-center gap-2 group/profile min-w-0"
          >
            <ProfileAvatar name={name} src={listing._profile?.avatar_url} size={26} />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-white/55 group-hover/profile:text-white/80 truncate transition-colors">{name}</p>
              {listing._profile?.city && (
                <p className="text-[10px] text-white/22 flex items-center gap-0.5">
                  <MapPin size={7} /> {listing._profile.city}
                </p>
              )}
            </div>
          </button>

          {/* Price + CTA */}
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {listing.price_hint && (
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                listing.price_hint.toLowerCase().includes('gratuit') || listing.price_hint.toLowerCase().includes('offert')
                  ? 'text-emerald-400 border-emerald-500/25 bg-emerald-500/10'
                  : 'text-white/50 border-white/12 bg-white/5'
              }`}>
                <Tag size={8} className="inline mr-0.5" />{listing.price_hint}
              </span>
            )}
            <button
              onClick={() => onContact(listing.profile_id)}
              className="flex items-center gap-1 text-[11px] font-semibold transition-colors hover:opacity-80"
              style={{ color: meta.color }}
            >
              {listing.listing_type === 'demand' ? 'Répondre' : 'Demander'}
              <span className="ml-0.5">→</span>
            </button>
          </div>
        </div>

        {/* Timestamp */}
        <p className="text-[10px] text-white/18 mt-2 flex items-center gap-1">
          <Clock size={8} /> {relativeTime(listing.created_at)}
        </p>
      </div>
    </article>
  );
}

// ─── Hero stat bar ────────────────────────────────────────────────────────────

function StatBar({ counts }: { counts: Record<Filter, number> }) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
      {[
        { key: 'service' as const,     color: '#60a5fa' },
        { key: 'object_new' as const,  color: '#22c55e' },
        { key: 'object_used' as const, color: '#f97316' },
        { key: 'demand' as const,      color: '#fbbf24' },
      ].map(({ key, color }) => {
        const m = TYPE_META[key];
        const Icon = m.icon;
        return (
          <div key={key} className="flex items-center gap-1.5 flex-shrink-0 text-[11px] text-white/35">
            <Icon size={9} style={{ color }} />
            <span style={{ color }}>{counts[key]}</span>
            <span>{m.label.toLowerCase()}{counts[key] > 1 ? 's' : ''}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FeedPage({
  onViewProfile,
  onContact,
}: {
  onViewProfile: (profileId: string) => void;
  onContact: (profileId: string, profileTitle: string) => void;
}) {
  const [listings, setListings]       = useState<ListingWithProfile[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter]           = useState<Filter>('all');
  const [sort, setSort]               = useState<'recent' | 'popular'>('recent');
  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage]               = useState(0);
  const [hasMore, setHasMore]         = useState(true);
  const [total, setTotal]             = useState(0);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [counts, setCounts]           = useState<Record<Filter, number>>({ all: 0, service: 0, object_new: 0, object_used: 0, resource: 0, demand: 0 });
  const searchTimer                   = useRef<ReturnType<typeof setTimeout>>();

  const loadListings = useCallback(async (pageIdx: number, filterVal: Filter, sortVal: string, searchVal: string, append = false) => {
    if (pageIdx === 0) setLoading(true); else setLoadingMore(true);
    try {
      let q = supabase
        .from('profile_listings')
        .select('*, capability_profiles!inner(title, avatar_url, city, profile_type)', { count: 'exact' })
        .eq('is_published', true)
        .eq('is_available', true);

      if (filterVal !== 'all') q = q.eq('listing_type', filterVal);
      if (searchVal.trim())    q = q.or(`title.ilike.%${searchVal.trim()}%,description.ilike.%${searchVal.trim()}%,tags.cs.{${searchVal.trim()}}`);

      q = sortVal === 'popular'
        ? q.order('view_count', { ascending: false }).order('created_at', { ascending: false })
        : q.order('created_at', { ascending: false });

      q = q.range(pageIdx * PAGE_SIZE, (pageIdx + 1) * PAGE_SIZE - 1);

      const { data, count, error } = await q;
      if (error || !data) return;

      const mapped: ListingWithProfile[] = data.map((row: Record<string, unknown>) => {
        const { capability_profiles, ...listing } = row as Record<string, unknown> & { capability_profiles: ProfileInfo };
        return { ...(listing as ProfileListing), _profile: capability_profiles };
      });

      setTotal(count ?? 0);
      setHasMore(((pageIdx + 1) * PAGE_SIZE) < (count ?? 0));
      setListings(prev => append ? [...prev, ...mapped] : mapped);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Count per type (once on mount)
  useEffect(() => {
    async function loadCounts() {
      const { data } = await supabase
        .from('profile_listings')
        .select('listing_type')
        .eq('is_published', true)
        .eq('is_available', true);
      if (!data) return;
      const c: Record<Filter, number> = { all: data.length, service: 0, object_new: 0, object_used: 0, resource: 0, demand: 0 };
      data.forEach(r => { if (r.listing_type in c) c[r.listing_type as Filter]++; });
      setCounts(c);
    }
    loadCounts();
  }, []);

  // Reload on filter/sort change
  useEffect(() => {
    setPage(0);
    loadListings(0, filter, sort, search);
  }, [filter, sort, search, loadListings]);

  // Debounced search
  function handleSearchChange(val: string) {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 350);
  }

  function loadMore() {
    const next = page + 1;
    setPage(next);
    loadListings(next, filter, sort, search, true);
  }

  const activeSort = SORT_OPTIONS.find(s => s.key === sort)!;

  return (
    <div className="pb-4 animate-fade-up">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="mb-5">
        <p className="text-[11px] tracking-widest uppercase text-white/25 font-medium mb-1.5">Fil d'actualité</p>
        <h1 className="text-2xl font-semibold text-white leading-snug mb-2">
          Ce qui circule dans le réseau.
        </h1>
        <p className="text-white/38 text-sm leading-relaxed">
          Services, objets neufs ou d'occasion, ressources partagées — tout ce que le réseau propose.
        </p>
      </div>

      {/* ── Stat bar ────────────────────────────────────────── */}
      {counts.all > 0 && <StatBar counts={counts} />}

      {/* ── Search + Sort ────────────────────────────────────── */}
      <div className="flex items-center gap-2 mt-4 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Chercher un service, objet, compétence…"
            className="w-full py-2.5 px-3 pr-8 text-[13px] text-white/75 placeholder-white/20 bg-white/5 border border-white/8 rounded-xl focus:outline-none focus:border-white/22 transition-all"
          />
          {searchInput ? (
            <button
              onClick={() => { setSearchInput(''); setSearch(''); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/28 hover:text-white/60 transition-colors"
            >
              <X size={14} />
            </button>
          ) : (
            <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/22 pointer-events-none" />
          )}
        </div>

        {/* Sort button */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(s => !s)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/8 bg-white/5 text-[12px] text-white/45 hover:text-white/70 hover:border-white/18 transition-all flex-shrink-0"
          >
            <SlidersHorizontal size={12} />
            <span className="hidden sm:inline">{activeSort.label}</span>
            <ChevronDown size={11} />
          </button>
          {showSortMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
              <div className="absolute right-0 top-full mt-1.5 z-20 bg-[#1a1814] border border-white/10 rounded-xl overflow-hidden shadow-2xl min-w-[140px]">
                {SORT_OPTIONS.map(o => (
                  <button
                    key={o.key}
                    onClick={() => { setSort(o.key as typeof sort); setShowSortMenu(false); }}
                    className={`w-full text-left px-3 py-2.5 text-[12px] transition-colors ${
                      sort === o.key ? 'text-white bg-white/8' : 'text-white/45 hover:text-white/75 hover:bg-white/5'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Filter chips ────────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5 scrollbar-hide">
        {FILTER_CHIPS.filter(c => c.key === 'all' || counts[c.key] > 0).map(chip => {
          const active = filter === chip.key;
          const meta   = chip.key !== 'all' ? TYPE_META[chip.key as ProfileListing['listing_type']] : null;
          const cnt    = counts[chip.key];
          return (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                active
                  ? 'bg-white text-[#0c0a09] border-white'
                  : 'text-white/38 border-white/10 hover:border-white/22 hover:text-white/60'
              }`}
            >
              {meta && !active && <span style={{ color: meta.color }}><meta.icon size={9} /></span>}
              {chip.label}
              {cnt > 0 && <span className={`text-[10px] ${active ? 'text-[#0c0a09]/60' : 'text-white/22'}`}>{cnt}</span>}
            </button>
          );
        })}
      </div>

      {/* ── Rain of listings ─────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] text-white/22">
          {total > 0 ? `${total} annonce${total > 1 ? 's' : ''} dans le réseau` : ''}
        </p>
        <button
          onClick={() => { setPage(0); loadListings(0, filter, sort, search); }}
          className="text-[11px] text-white/22 hover:text-white/50 flex items-center gap-1 transition-colors"
        >
          <RefreshCw size={10} /> Actualiser
        </button>
      </div>

      <FeedRain listings={listings} loading={loading} />
    </div>
  );
}
