import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MessageSquare, Plus, CheckCircle2, ArrowLeft, Map, Globe, Users, Zap, ExternalLink } from 'lucide-react';
import { supabase, CapabilityProfile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSituation } from '../contexts/SituationContext';
import SituationThread from '../components/SituationThread';
import NetworkMap from '../components/NetworkMap';
import ProfileVitrine from '../components/ProfileVitrine';

type Tab = 'discover' | 'map' | 'my_profile';

export type ExternalSignal = {
  id: string;
  signal_type: 'person' | 'structure' | 'resource' | 'offer';
  source_platform: string;
  source_url?: string | null;
  display_name: string;
  tagline: string;
  summary: string;
  capabilities: string[];
  domains: string[];
  location_hint?: string | null;
  is_local: boolean;
  confidence_score: number;
  freshness_score: number;
  relevance_tags: string[];
  conversion_status: string;
};

type SelectedItem =
  | { kind: 'internal'; data: CapabilityProfile }
  | { kind: 'external'; data: ExternalSignal };

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  person: 'Personne',
  structure: 'Structure',
  resource: 'Ressource',
  offer: 'Offre',
};

const PAGE_SIZE = 10;

export default function CapacitesPage() {
  const { user } = useAuth();
  const { activeNeed, phase } = useSituation();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [contacting, setContacting] = useState(false);
  const [contacted, setContacted] = useState(false);
  const [myProfile, setMyProfile] = useState<CapabilityProfile | null>(null);
  const [tab, setTab] = useState<Tab>('discover');
  const [searchFocused, setSearchFocused] = useState(false);
  const [externalSignals, setExternalSignals] = useState<ExternalSignal[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryDone, setDiscoveryDone] = useState(false);
  const [internalProfiles, setInternalProfiles] = useState<CapabilityProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadMyProfile(); }, []);

  useEffect(() => {
    setPage(0);
    loadProfiles(0, search);
  }, [search]);

  useEffect(() => {
    if (activeNeed && phase !== 'idle' && !discoveryDone && !discovering) {
      triggerDiscovery(activeNeed.raw_text);
    }
  }, [activeNeed, phase]);

  async function loadMyProfile() {
    const { data } = await supabase
      .from('capability_profiles')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle();
    setMyProfile(data);
  }

  async function loadProfiles(pageIndex: number, searchText: string) {
    setLoadingProfiles(true);
    try {
      let query = supabase
        .from('capability_profiles')
        .select('*', { count: 'exact' })
        .eq('is_published', true)
        .or(`user_id.is.null,user_id.neq.${user!.id}`);

      if (searchText.trim()) {
        const terms = searchText.trim().toLowerCase();
        query = query.or(
          `title.ilike.%${terms}%,tagline.ilike.%${terms}%,summary.ilike.%${terms}%,availability.ilike.%${terms}%`
        );
      }

      query = query
        .order('availability', { ascending: true })
        .order('sav_points', { ascending: false })
        .range(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE - 1);

      const { data, count, error } = await query;
      if (!error && data) {
        if (pageIndex === 0) {
          setInternalProfiles(data);
        } else {
          setInternalProfiles(prev => [...prev, ...data]);
        }
        setTotalCount(count || 0);
      }
    } finally {
      setLoadingProfiles(false);
    }
  }

  function loadMore() {
    const nextPage = page + 1;
    setPage(nextPage);
    loadProfiles(nextPage, search);
  }

  const triggerDiscovery = useCallback(async (situationText: string) => {
    if (discovering || discoveryDone) return;
    setDiscovering(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const jwt = session?.access_token;
      if (!jwt) return;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/discover-signals`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          situationText,
          needId: activeNeed?.id,
        }),
      });

      if (res.ok) {
        const { signals } = await res.json() as { signals: ExternalSignal[] };
        if (Array.isArray(signals)) {
          setExternalSignals(signals.sort((a, b) => b.confidence_score - a.confidence_score));
        }
      }
    } catch { /* non-fatal */ } finally {
      setDiscovering(false);
      setDiscoveryDone(true);
    }
  }, [discovering, discoveryDone, activeNeed]);

  const filteredExternal = useMemo(() => externalSignals.filter(s =>
    search === '' ||
    s.display_name.toLowerCase().includes(search.toLowerCase()) ||
    s.tagline.toLowerCase().includes(search.toLowerCase()) ||
    s.summary.toLowerCase().includes(search.toLowerCase()) ||
    s.capabilities.some(c => c.toLowerCase().includes(search.toLowerCase()))
  ), [search, externalSignals]);

  function handleContactProfile(profile: CapabilityProfile) {
    setSelected({ kind: 'internal', data: profile });
    setContacted(false);
    setContacting(false);
  }

  async function handleContactVitrine(cap: CapabilityProfile) {
    if (contacting || contacted) return;
    // Seed profiles have no real user — mark as contacted without creating a conversation
    if (!cap.user_id) {
      setContacted(true);
      return;
    }
    setContacting(true);
    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('seeker_id', user!.id)
        .eq('provider_id', cap.user_id)
        .eq('need_id', activeNeed?.id || '')
        .maybeSingle();
      if (!existing) {
        await supabase.from('conversations').insert({
          seeker_id: user!.id,
          provider_id: cap.user_id,
          need_id: activeNeed?.id || null,
          status: 'active',
          last_message_at: new Date().toISOString(),
        });
      }
      setContacted(true);
      window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: { tab: 'discussions' } }));
    } catch { /* non-fatal */ } finally {
      setContacting(false);
    }
  }

  if (selected?.kind === 'internal') {
    const isOwner = !!selected.data.user_id && selected.data.user_id === user!.id;
    return (
      <ProfileVitrine
        profile={selected.data}
        isOwner={isOwner}
        onBack={() => { setSelected(null); setContacted(false); }}
        onContact={() => handleContactVitrine(selected.data)}
        contacted={contacted}
        contacting={contacting}
        onRefresh={async () => {
          const { data } = await supabase
            .from('capability_profiles')
            .select('*')
            .eq('id', selected.data.id)
            .maybeSingle();
          if (data) setSelected({ kind: 'internal', data });
          if (isOwner) await loadMyProfile();
        }}
      />
    );
  }
  if (selected?.kind === 'external') {
    return (
      <ExternalSignalDetail
        signal={selected.data}
        onBack={() => setSelected(null)}
        needId={activeNeed?.id}
        userId={user?.id}
      />
    );
  }

  const hasSituation = activeNeed != null && phase !== 'idle';
  const hasMore = (page + 1) * PAGE_SIZE < totalCount;

  return (
    <div className="animate-fade-up">
      {activeNeed && <SituationThread needId={activeNeed.id} />}

      <div className="mb-7">
        <p className="text-[11px] tracking-widest uppercase text-white/25 font-medium mb-2">Le réseau</p>
        <h1 className="text-2xl font-semibold text-white leading-snug mb-2 transition-all duration-700">
          {tab === 'map'
            ? 'Le réseau autour de vous.'
            : tab === 'my_profile'
              ? 'Ce que vous rendez possible.'
              : hasSituation
                ? 'Des capacités autour de ce que vous traversez.'
                : 'Des capacités humaines pertinentes.'}
        </h1>
        <p className="text-white/40 text-sm leading-relaxed transition-all duration-700">
          {tab === 'map'
            ? 'Visualisez les nœuds humains du réseau et leur proximité avec votre situation.'
            : tab === 'my_profile'
              ? "Votre manière d'être utile, rendue visible là où elle compte."
              : hasSituation
                ? "L'IA a étendu la recherche au-delà du réseau interne pour révéler ce qui peut aider."
                : "Réseau interne et signaux externes — unifiés par l'IA."}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-5 mb-8">
        <button
          onClick={() => setTab('discover')}
          className={`text-sm font-medium pb-0.5 transition-all ${tab === 'discover' ? 'text-white border-b border-white' : 'text-white/30 hover:text-white/60'}`}
        >
          Présences
        </button>
        <button
          onClick={() => setTab('map')}
          className={`text-sm font-medium pb-0.5 transition-all flex items-center gap-1.5 ${tab === 'map' ? 'text-white border-b border-white' : 'text-white/30 hover:text-white/60'}`}
        >
          <Map size={11} />
          Carte
        </button>
        <button
          onClick={() => setTab('my_profile')}
          className={`text-sm font-medium pb-0.5 transition-all flex items-center gap-2 ${tab === 'my_profile' ? 'text-white border-b border-white' : 'text-white/30 hover:text-white/60'}`}
        >
          Ma présence
          {myProfile?.is_published && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-dot" />}
        </button>
      </div>

      {/* ── DISCOVER ────────────────────────────────────────── */}
      {tab === 'discover' && (
        <div className="animate-fade-in">
          {/* Search */}
          <div className="relative mb-6">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Dans quel contexte cherchez-vous de l'aide ?"
              className={`w-full py-3 text-sm text-white/80 placeholder-white/20 bg-transparent border-b transition-all focus:outline-none ${
                searchFocused || search ? 'border-white/30' : 'border-white/10'
              }`}
            />
            {search && (
              <button
                onClick={() => { setSearch(''); inputRef.current?.focus(); }}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Layer indicators */}
          {hasSituation && (
            <div className="flex items-center gap-4 mb-6 pb-5 border-b border-white/8">
              <LayerBadge
                icon={<Users size={10} />}
                label={`${totalCount} réseau interne`}
                color="emerald"
              />
              <LayerBadge
                icon={<Globe size={10} />}
                label={discovering ? 'Découverte en cours…' : `${filteredExternal.length} signaux externes`}
                color="amber"
                loading={discovering}
              />
            </div>
          )}

          {!hasSituation && (
            <p className="text-xs text-white/25 mb-6">
              {loadingProfiles && internalProfiles.length === 0
                ? 'Chargement…'
                : totalCount === 0
                  ? 'Aucune présence trouvée — le réseau grandit.'
                  : `${totalCount} présence${totalCount > 1 ? 's' : ''} disponible${totalCount > 1 ? 's' : ''}`}
            </p>
          )}

          {/* ── Internal network ─────────────────────────────── */}
          {internalProfiles.length > 0 && (
            <section>
              {hasSituation && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <p className="text-[11px] text-white/40 font-medium uppercase tracking-widest">Réseau interne</p>
                </div>
              )}
              <div className="animate-stagger">
                {internalProfiles.map((cap, idx) => (
                  <PresenceRow
                    key={cap.id}
                    capability={cap}
                    onClick={() => handleContactProfile(cap)}
                    isLast={idx === internalProfiles.length - 1 && filteredExternal.length === 0 && !hasMore}
                    highlighted={hasSituation}
                  />
                ))}
              </div>

              {/* Pagination */}
              {hasMore && (
                <div className="pt-6 pb-2">
                  <button
                    onClick={loadMore}
                    disabled={loadingProfiles}
                    className="w-full py-3 text-sm text-white/30 hover:text-white/70 border border-white/8 hover:border-white/20 rounded-xl transition-all disabled:opacity-50"
                  >
                    {loadingProfiles ? 'Chargement…' : `Voir plus (${totalCount - (page + 1) * PAGE_SIZE} restantes)`}
                  </button>
                </div>
              )}

              {loadingProfiles && internalProfiles.length === 0 && (
                <div className="py-12 flex justify-center">
                  <div className="w-6 h-6 border border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                </div>
              )}
            </section>
          )}

          {/* Empty state */}
          {!loadingProfiles && internalProfiles.length === 0 && (
            <div className="py-10">
              <p className="text-sm text-white/35 leading-relaxed">
                {search
                  ? 'Aucune présence trouvée pour ce contexte. Essayez d\'autres mots.'
                  : 'Le réseau se construit. Revenez bientôt ou créez votre présence.'}
              </p>
            </div>
          )}

          {/* ── External signals ─────────────────────────────── */}
          {hasSituation && (
            <section className={internalProfiles.length > 0 ? 'mt-8' : ''}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <p className="text-[11px] text-white/40 font-medium uppercase tracking-widest">Signaux externes</p>
                </div>
                {!discoveryDone && !discovering && (
                  <button
                    onClick={() => activeNeed && triggerDiscovery(activeNeed.raw_text)}
                    className="text-xs text-white/30 hover:text-white/70 flex items-center gap-1 transition-colors"
                  >
                    <Zap size={10} /> Lancer la découverte
                  </button>
                )}
              </div>

              {discovering && (
                <div className="py-8 flex flex-col items-center gap-3">
                  <div className="relative w-8 h-8 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border border-amber-400/20 animate-breathe" />
                    <div className="w-1 h-1 rounded-full bg-amber-400/60 animate-pulse-dot" />
                  </div>
                  <p className="text-xs text-white/35">L'IA explore les ressources disponibles…</p>
                </div>
              )}

              {!discovering && filteredExternal.length === 0 && discoveryDone && (
                <div className="py-6 border-t border-white/5">
                  <p className="text-xs text-white/25 leading-relaxed">
                    Aucun signal externe qualifié pour cette situation. Le réseau interne reste la source principale.
                  </p>
                </div>
              )}

              {!discovering && filteredExternal.length > 0 && (
                <>
                  <p className="text-xs text-white/25 mb-4 leading-relaxed">
                    Sources publiques qualifiées par l'IA. La mise en relation se conclut dans RENOVEC.
                  </p>
                  <div className="animate-stagger">
                    {filteredExternal.map((signal, idx) => (
                      <ExternalSignalRow
                        key={signal.id}
                        signal={signal}
                        onClick={() => setSelected({ kind: 'external', data: signal })}
                        isLast={idx === filteredExternal.length - 1}
                      />
                    ))}
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      )}

      {/* ── MAP ─────────────────────────────────────────────── */}
      {tab === 'map' && (
        <div className="animate-fade-in overflow-hidden rounded-2xl">
          <NetworkMap />
        </div>
      )}

      {tab === 'my_profile' && (
        <MyPresenceProfile profile={myProfile} userId={user!.id} onRefresh={loadMyProfile} />
      )}
    </div>
  );
}

// ── Layer Badge ─────────────────────────────────────────────────────────────

function LayerBadge({
  icon, label, color, loading = false,
}: {
  icon: React.ReactNode;
  label: string;
  color: 'emerald' | 'amber';
  loading?: boolean;
}) {
  const colors = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber:   'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${colors[color]}`}>
      {loading ? (
        <span className="w-2 h-2 border border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
      ) : icon}
      {label}
    </div>
  );
}

// ── External Signal Row ─────────────────────────────────────────────────────

function ExternalSignalRow({
  signal: s,
  onClick,
  isLast,
}: {
  signal: ExternalSignal;
  onClick: () => void;
  isLast: boolean;
}) {
  const typeLabel = SIGNAL_TYPE_LABELS[s.signal_type] || 'Source';
  const score = Math.round(s.confidence_score * 100);

  return (
    <button
      onClick={onClick}
      className={`w-full text-left group py-6 transition-all hover:pl-1 ${!isLast ? 'border-b border-white/8' : ''}`}
    >
      <div className="flex items-start gap-3.5 mb-2.5">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Globe size={14} className="text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white">{s.display_name}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
              EXTERNE
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/8 text-white/40 font-medium">
              {typeLabel}
            </span>
            {s.is_local && s.location_hint && (
              <span className="text-[10px] text-white/30">{s.location_hint}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-white/25">{s.source_platform}</span>
            <span className="text-white/15">·</span>
            <span className="text-[10px] text-amber-400 font-medium">{score}% pertinence IA</span>
          </div>
        </div>
        <span className="ml-auto text-white/15 group-hover:text-white/50 transition-colors text-sm mt-1 flex-shrink-0">→</span>
      </div>

      <p className="text-white/60 text-sm leading-relaxed mb-2.5 pl-[52px]">
        {s.tagline}
      </p>

      {s.capabilities.length > 0 && (
        <div className="pl-[52px] flex flex-wrap gap-x-3 gap-y-1">
          {s.capabilities.slice(0, 3).map(c => (
            <div key={c} className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-amber-400/30 flex-shrink-0" />
              <p className="text-xs text-white/40">{c}</p>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

// ── External Signal Detail ──────────────────────────────────────────────────

function ExternalSignalDetail({
  signal: s,
  onBack,
  needId,
  userId,
}: {
  signal: ExternalSignal;
  onBack: () => void;
  needId?: string;
  userId?: string;
}) {
  const [converting, setConverting] = useState(false);
  const [converted, setConverted] = useState<string | null>(null);
  const typeLabel = SIGNAL_TYPE_LABELS[s.signal_type] || 'Source';
  const score = Math.round(s.confidence_score * 100);

  async function handleConversion(action: 'invite_sent' | 'message_sent' | 'dossier_opened') {
    if (!userId) return;
    setConverting(true);
    try {
      await supabase.from('signal_conversions').insert({
        signal_id: s.id,
        need_id: needId || null,
        user_id: userId,
        action,
        context_note: '',
      });
      await supabase
        .from('external_signals')
        .update({ conversion_status: action === 'invite_sent' ? 'invited' : 'contacted' })
        .eq('id', s.id);
      setConverted(action);
    } catch { /* non-fatal */ } finally {
      setConverting(false);
    }
  }

  return (
    <div className="animate-slide-in">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-white/30 hover:text-white/70 text-sm mb-8 transition-all group"
      >
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        Retour
      </button>

      <div className="flex items-start gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Globe size={22} className="text-amber-400" />
        </div>
        <div className="flex-1 pt-0.5">
          <h2 className="text-xl font-semibold text-white">{s.display_name}</h2>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">EXTERNE</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/40">{typeLabel}</span>
            {s.location_hint && <span className="text-xs text-white/30">{s.location_hint}</span>}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-white/25">{s.source_platform}</span>
            <span className="text-white/15">·</span>
            <span className="text-xs text-amber-400 font-medium">{score}% pertinence IA</span>
          </div>
        </div>
      </div>

      <div className="mb-6 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/15 flex items-start gap-3">
        <Globe size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs text-amber-400 font-medium mb-0.5">Signal externe qualifié par l'IA</p>
          <p className="text-xs text-white/40 leading-relaxed">
            Ce profil a été détecté depuis une source publique et qualifié par le coordinateur IA.
            La mise en relation se conclut dans RENOVEC.
          </p>
          {s.source_url && (
            <a
              href={s.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 mt-1.5 transition-colors"
            >
              Voir la source <ExternalLink size={9} />
            </a>
          )}
        </div>
      </div>

      <div className="mb-8 py-5 border-y border-white/8">
        <p className="text-base text-white/70 leading-relaxed">{s.tagline}</p>
      </div>

      <div className="mb-8">
        <p className="text-[11px] tracking-widest uppercase text-white/25 font-medium mb-3">Ce qu'ils apportent</p>
        <p className="text-white/55 text-sm leading-relaxed">{s.summary}</p>
      </div>

      {s.capabilities.length > 0 && (
        <div className="mb-8">
          <p className="text-[11px] tracking-widest uppercase text-white/25 font-medium mb-3">Capacités identifiées</p>
          <div className="space-y-1.5">
            {s.capabilities.map(c => (
              <div key={c} className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-amber-400/40 flex-shrink-0" />
                <span className="text-sm text-white/55">{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {s.relevance_tags.length > 0 && (
        <div className="mb-8">
          <p className="text-[11px] tracking-widest uppercase text-white/25 font-medium mb-3">Contextes pertinents</p>
          <div className="flex flex-wrap gap-2">
            {s.relevance_tags.map(tag => (
              <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/8 text-white/40">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-10 pt-5 border-t border-white/8">
        <p className="text-[11px] tracking-widest uppercase text-white/25 font-medium mb-4">Qualification IA</p>
        <div className="space-y-3">
          <ScoreBar label="Pertinence" value={s.confidence_score} />
          <ScoreBar label="Fraîcheur" value={s.freshness_score} />
        </div>
      </div>

      {converted ? (
        <div className="flex items-center gap-2.5 py-4 border-t border-emerald-500/20">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <p className="text-sm text-emerald-400">
            {converted === 'invite_sent' ? 'Invitation envoyée via RENOVEC.' : 'Dossier ouvert dans RENOVEC.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            onClick={() => handleConversion('invite_sent')}
            disabled={converting}
            className="w-full py-4 bg-white hover:bg-white/90 text-stone-950 font-medium rounded-2xl transition-all flex items-center justify-center gap-2 group text-sm disabled:opacity-50"
          >
            {converting ? (
              <span className="w-4 h-4 border-2 border-stone-900/30 border-t-stone-900 rounded-full animate-spin" />
            ) : (
              <>
                <MessageSquare size={13} />
                Inviter dans RENOVEC pour coordonner
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </>
            )}
          </button>
          <button
            onClick={() => handleConversion('dossier_opened')}
            disabled={converting}
            className="w-full py-3 border border-white/10 hover:border-white/25 text-white/50 hover:text-white/80 font-medium rounded-2xl transition-all text-sm disabled:opacity-50"
          >
            Ouvrir un dossier de relation
          </button>
        </div>
      )}
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-white/35 w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-px bg-white/8 relative">
        <div
          className="absolute top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-amber-400/60 to-amber-400 transition-all"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <span className="text-xs text-white/25 w-7 text-right tabular-nums">{Math.round(value * 100)}</span>
    </div>
  );
}

// ── Internal Presence Row ───────────────────────────────────────────────────

function PresenceRow({
  capability: cap,
  onClick,
  isLast,
  highlighted,
}: {
  capability: CapabilityProfile;
  onClick: () => void;
  isLast: boolean;
  highlighted: boolean;
}) {
  const isAvailableNow = cap.availability?.toLowerCase().includes('maintenant');

  return (
    <button
      onClick={onClick}
      className={`w-full text-left group py-7 transition-all hover:pl-1 ${!isLast ? 'border-b border-white/8' : ''}`}
    >
      <div className="flex items-start gap-3.5 mb-3">
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center overflow-hidden">
            <span className="text-sm font-semibold text-white/50">
              {(cap.title || 'P')[0].toUpperCase()}
            </span>
          </div>
          {isAvailableNow && (
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border-2 border-stone-950" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white">{cap.title}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
              RÉSEAU
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${isAvailableNow ? 'text-emerald-400' : 'text-white/25'}`}>
            {cap.availability || 'Disponibilité non précisée'}
          </p>
        </div>
        <span className="ml-auto text-white/15 group-hover:text-white/50 transition-colors text-sm mt-1 flex-shrink-0">→</span>
      </div>

      <p className="text-white/55 text-sm leading-relaxed mb-3 pl-[52px]">
        {cap.tagline}
      </p>

      {highlighted && cap.explicit_capabilities.length > 0 && (
        <div className="pl-[52px] flex flex-wrap gap-x-3 gap-y-1">
          {cap.explicit_capabilities.slice(0, 3).map(ctx => (
            <div key={ctx} className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-white/15 flex-shrink-0" />
              <p className="text-xs text-white/35 leading-relaxed">{ctx}</p>
            </div>
          ))}
        </div>
      )}

      {!highlighted && cap.success_contexts.length > 0 && (
        <div className="pl-[52px] space-y-1">
          {cap.success_contexts.slice(0, 2).map(ctx => (
            <div key={ctx} className="flex items-start gap-2">
              <div className="w-1 h-1 rounded-full bg-white/15 mt-1.5 flex-shrink-0" />
              <p className="text-xs text-white/35 leading-relaxed">{ctx}</p>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

// ── My Presence Profile ─────────────────────────────────────────────────────

function MyPresenceProfile({ profile, userId, onRefresh }: { profile: CapabilityProfile | null; userId: string; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: profile?.title || '',
    summary: profile?.summary || '',
    explicit_capabilities: profile?.explicit_capabilities.join(', ') || '',
    implicit_capabilities: profile?.implicit_capabilities.join(', ') || '',
    success_contexts: profile?.success_contexts.join('\n') || '',
    relational_style: profile?.relational_style || '',
    availability: profile?.availability || '',
    help_formats: profile?.help_formats.join(', ') || '',
    is_published: profile?.is_published ?? true,
  });

  async function handleSave() {
    setSaving(true);
    const payload = {
      title: form.title,
      summary: form.summary,
      explicit_capabilities: form.explicit_capabilities.split(',').map(s => s.trim()).filter(Boolean),
      implicit_capabilities: form.implicit_capabilities.split(',').map(s => s.trim()).filter(Boolean),
      success_contexts: form.success_contexts.split('\n').map(s => s.trim()).filter(Boolean),
      relational_style: form.relational_style,
      availability: form.availability,
      help_formats: form.help_formats.split(',').map(s => s.trim()).filter(Boolean),
      is_published: form.is_published,
      updated_at: new Date().toISOString(),
    };
    if (profile) {
      await supabase.from('capability_profiles').update(payload).eq('id', profile.id);
    } else {
      await supabase.from('capability_profiles').insert({ ...payload, user_id: userId });
    }
    await onRefresh();
    setSaving(false);
    setEditing(false);
  }

  if (!profile && !editing) {
    return (
      <div className="animate-fade-in py-12 space-y-5">
        <p className="text-white/40 text-sm leading-relaxed max-w-xs">
          Ce n'est pas votre titre qui compte ici. C'est votre manière d'être utile — vos contextes de réussite, ce que vous faites sans le nommer.
        </p>
        <button
          onClick={() => setEditing(true)}
          className="px-5 py-3 bg-white text-stone-950 text-sm font-medium rounded-xl hover:bg-white/90 transition-all inline-flex items-center gap-2"
        >
          <Plus size={12} /> Créer ma présence
        </button>
      </div>
    );
  }

  const FIELDS = [
    { label: 'Comment vous aidez — en une ligne', key: 'title', placeholder: 'Ce que vous apportez, exprimé avec précision', multiline: false },
    { label: 'Votre manière d\'aider', key: 'summary', placeholder: 'Décrivez ce que vous apportez, comment vous intervenez...', multiline: true },
    { label: 'Ce que vous apportez (virgules)', key: 'explicit_capabilities', placeholder: 'Accompagnement, diagnostic, pédagogie...', multiline: false },
    { label: 'Ce que vous faites sans le nommer (virgules)', key: 'implicit_capabilities', placeholder: 'Détection des non-dits, mise en mouvement...', multiline: false },
    { label: 'Là où vous aidez le mieux (un par ligne)', key: 'success_contexts', placeholder: 'Reconversion professionnelle\nDécision complexe...', multiline: true },
    { label: 'Comment vous vous positionnez naturellement', key: 'relational_style', placeholder: 'Votre style d\'aide, votre posture naturelle...', multiline: true },
    { label: 'Disponibilité', key: 'availability', placeholder: 'Disponible maintenant / cette semaine / ce mois...', multiline: false },
    { label: 'Formats proposés (virgules)', key: 'help_formats', placeholder: 'Échange oral, Diagnostic écrit, Mission courte...', multiline: false },
  ];

  if (editing || !profile) {
    return (
      <div className="animate-fade-in space-y-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-white">{profile ? 'Ajuster ma présence' : 'Créer ma présence'}</h3>
          {profile && (
            <button onClick={() => setEditing(false)} className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Annuler
            </button>
          )}
        </div>
        {FIELDS.map(({ label, key, placeholder, multiline }) => (
          <div key={key}>
            <label className="block text-[11px] font-medium text-white/30 uppercase tracking-widest mb-1.5">{label}</label>
            {multiline ? (
              <textarea
                value={form[key as keyof typeof form] as string}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white/80 placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none transition-all"
              />
            ) : (
              <input
                type="text"
                value={form[key as keyof typeof form] as string}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white/80 placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
              />
            )}
          </div>
        ))}
        <label className="flex items-center gap-3 cursor-pointer py-1">
          <div
            onClick={() => setForm(f => ({ ...f, is_published: !f.is_published }))}
            className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${form.is_published ? 'bg-emerald-400' : 'bg-white/12'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-all ${form.is_published ? 'left-5' : 'left-1'}`} />
          </div>
          <span className="text-sm text-white/60">Présence visible dans le réseau</span>
        </label>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 bg-white text-stone-950 font-medium rounded-xl hover:bg-white/90 disabled:opacity-50 flex items-center justify-center gap-2 text-sm transition-all"
        >
          {saving
            ? <span className="w-4 h-4 border-2 border-stone-900/30 border-t-stone-900 rounded-full animate-spin" />
            : 'Enregistrer ma présence'}
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 pr-4">
          <h3 className="font-semibold text-white mb-1">{profile.title}</h3>
          <span className={`inline-flex items-center gap-1.5 text-xs ${profile.is_published ? 'text-emerald-400' : 'text-white/25'}`}>
            <CheckCircle2 size={10} />
            {profile.is_published ? 'Visible dans le réseau' : 'Masquée'}
          </span>
        </div>
        <button
          onClick={() => {
            setForm({
              title: profile.title, summary: profile.summary,
              explicit_capabilities: profile.explicit_capabilities.join(', '),
              implicit_capabilities: profile.implicit_capabilities.join(', '),
              success_contexts: profile.success_contexts.join('\n'),
              relational_style: profile.relational_style,
              availability: profile.availability,
              help_formats: profile.help_formats.join(', '),
              is_published: profile.is_published,
            });
            setEditing(true);
          }}
          className="text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          Ajuster
        </button>
      </div>
      <p className="text-sm text-white/55 leading-relaxed">{profile.summary}</p>
      {profile.explicit_capabilities.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {profile.explicit_capabilities.map(c => (
            <div key={c} className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-white/15 flex-shrink-0" />
              <span className="text-sm text-white/45">{c}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
