import { useState, useEffect } from 'react';
import {
  ArrowLeft, MessageSquare, CheckCircle2, Sparkles, Clock, Shield,
  Star, MapPin, ChevronDown, ChevronUp, Zap, Award, Package,
  Wrench, BookOpen, Tag, Heart, ShoppingBag, Send, RefreshCw,
  Camera, Box, Search, Layers,
} from 'lucide-react';
import { supabase, ProfileListing } from '../lib/supabase';
import { avatarBg as avatarColor, initials } from '../lib/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VitrineProfile {
  id: string;
  user_id: string;
  title: string;
  tagline?: string;
  summary?: string;
  explicit_capabilities: string[];
  implicit_capabilities: string[];
  success_contexts: string[];
  relational_style?: string;
  help_formats: string[];
  availability?: string;
  sav_points: number;
  impact_summary?: string;
  city?: string;
  profile_type?: string;
  avatar_url?: string | null;
  cover_url?: string | null;
  vitrine_hero_title?: string;
  vitrine_bio?: string;
  vitrine_pitch?: string;
  vitrine_services?: VitrineService[];
  vitrine_portfolio?: VitrinePortfolio[];
  vitrine_faq?: VitrineFAQ[];
  vitrine_response_time?: string;
  vitrine_badges?: string[];
  vitrine_generated_at?: string;
}

interface VitrineService {
  title: string;
  description: string;
  price_hint: string;
  format: string;
  highlight: boolean;
}

interface VitrinePortfolio {
  title: string;
  description: string;
  image_url?: string;
  tags: string[];
}

interface VitrineFAQ {
  question: string;
  answer: string;
}

interface Props {
  profile: VitrineProfile;
  isOwner: boolean;
  onBack: () => void;
  onContact: () => void;
  contacted: boolean;
  contacting: boolean;
  onRefresh: () => void;
  matchScore?: number;
  matchReasons?: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROFILE_TYPE_LABELS: Record<string, string> = {
  individual: 'Particulier',
  artisan: 'Artisan',
  independant: 'Indépendant',
  formateur: 'Formateur',
  entreprise: 'Entreprise',
  association: 'Association',
};

const LISTING_TYPE_META: Record<ProfileListing['listing_type'], { label: string; color: string; bg: string; border: string; icon: typeof ShoppingBag }> = {
  service:     { label: 'Service',    color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',   border: 'rgba(96,165,250,0.2)',   icon: ShoppingBag },
  object_new:  { label: 'Neuf',       color: '#22c55e', bg: 'rgba(34,197,94,0.08)',    border: 'rgba(34,197,94,0.2)',    icon: Box },
  object_used: { label: "D'occasion", color: '#f97316', bg: 'rgba(249,115,22,0.08)',   border: 'rgba(249,115,22,0.2)',   icon: Package },
  resource:    { label: 'Ressource',  color: '#a78bfa', bg: 'rgba(167,139,250,0.08)',  border: 'rgba(167,139,250,0.2)',  icon: Layers },
  demand:      { label: 'Recherche',  color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',   border: 'rgba(251,191,36,0.2)',   icon: Search },
};

const CONDITION_LABELS: Record<string, string> = {
  new: 'Neuf',
  like_new: 'Comme neuf',
  good: 'Bon état',
  fair: 'État correct',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────


function trustLevel(pts: number) {
  if (pts >= 300) return { label: 'Expert',   color: '#f59e0b', pct: 100 };
  if (pts >= 200) return { label: 'Confirmé', color: '#f97316', pct: Math.round(pts / 300 * 100) };
  if (pts >= 100) return { label: 'Reconnu',  color: '#22c55e', pct: Math.round(pts / 300 * 100) };
  if (pts >= 50)  return { label: 'Actif',    color: '#60a5fa', pct: Math.round(pts / 300 * 100) };
  return               { label: 'Nouveau',   color: '#a8a29e', pct: Math.max(8, Math.round(pts / 300 * 100)) };
}

function capIcon(cap: string) {
  const c = cap.toLowerCase();
  if (c.includes('cours') || c.includes('formation')) return BookOpen;
  if (c.includes('répar') || c.includes('dépann') || c.includes('électr') || c.includes('plomb')) return Wrench;
  if (c.includes('objet') || c.includes('vend') || c.includes('don')) return Package;
  return ShoppingBag;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ name, src, size = 72 }: { name: string; src?: string | null; size?: number }) {
  const [imgErr, setImgErr] = useState(false);
  const bg     = avatarColor(name);
  const radius = Math.round(size * 0.22);
  const fsize  = Math.round(size * 0.35);

  if (src && !imgErr) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgErr(true)}
        style={{ width: size, height: size, minWidth: size, borderRadius: radius, objectFit: 'cover' }}
        className="flex-shrink-0"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, minWidth: size, background: bg, borderRadius: radius, fontSize: fsize }}
      className="flex items-center justify-center font-bold text-white select-none flex-shrink-0"
    >
      {initials(name)}
    </div>
  );
}

function AvailDot({ avail }: { avail?: string }) {
  const a = (avail || '').toLowerCase();
  if (a.includes('maintenant'))  return <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />;
  if (a.includes('48h') || a.includes('weekend') || a.includes('bientôt')) return <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />;
  return <span className="w-2 h-2 rounded-full bg-white/20 flex-shrink-0" />;
}

function PriceBadge({ hint }: { hint?: string }) {
  if (!hint) return null;
  const free = (hint || '').toLowerCase().includes('gratuit') || (hint || '').toLowerCase().includes('offert');
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${
      free ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
           : 'bg-white/8 text-white/55 border border-white/12'
    }`}>
      <Tag size={9} /> {hint}
    </span>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/6 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 py-4 text-left group"
      >
        <span className="text-sm text-white/65 group-hover:text-white transition-colors">{q}</span>
        <span className="text-white/25 flex-shrink-0">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>
      {open && <p className="text-sm text-white/38 leading-relaxed pb-4">{a}</p>}
    </div>
  );
}

function GenerateBtn({ profileId, onDone }: { profileId: string; onDone: () => void }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  async function run() {
    setState('loading');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-vitrine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ profile_id: profileId }),
      });
      if (!res.ok) throw new Error();
      setState('done');
      setTimeout(() => { setState('idle'); onDone(); }, 1400);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }
  return (
    <button
      onClick={run}
      disabled={state === 'loading'}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
        state === 'done'    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
        state === 'error'   ? 'text-red-400 border-red-500/30 bg-red-500/10' :
        state === 'loading' ? 'text-white/30 border-white/10 bg-white/4 cursor-default' :
        'text-[#F26522] border-[#F26522]/25 bg-[#F26522]/8 hover:bg-[#F26522]/15'
      }`}
    >
      {state === 'loading' ? <span className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin" />
       : state === 'done'  ? <CheckCircle2 size={12} />
       : state === 'error' ? <Zap size={12} />
       : <Sparkles size={12} />}
      {state === 'loading' ? 'Génération…' : state === 'done' ? 'Vitrine à jour !' : state === 'error' ? 'Réessayer' : 'Améliorer avec l\'IA'}
    </button>
  );
}

// Listing card for the feed
function ListingCard({ listing, onContact }: { listing: ProfileListing; onContact: () => void }) {
  const meta  = LISTING_TYPE_META[listing.listing_type];
  const Icon  = meta.icon;
  const img   = listing.image_urls?.[0];
  const [imgErr, setImgErr] = useState(false);

  return (
    <div
      className="rounded-2xl overflow-hidden border transition-all hover:border-white/16 group"
      style={{ borderColor: meta.border, background: meta.bg }}
    >
      {/* Image */}
      {img && !imgErr && (
        <div className="w-full h-44 overflow-hidden relative">
          <img
            src={img}
            alt={listing.title}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          {/* Overlay badge */}
          <div className="absolute top-2.5 left-2.5">
            <span
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-sm"
              style={{ color: meta.color, background: `${meta.bg}dd`, borderColor: meta.border }}
            >
              <Icon size={9} /> {meta.label}
            </span>
          </div>
          {listing.condition && (
            <div className="absolute top-2.5 right-2.5">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/60 text-white/80 backdrop-blur-sm">
                {CONDITION_LABELS[listing.condition]}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        {/* No-image badge */}
        {(!img || imgErr) && (
          <div className="flex items-center gap-2 mb-3">
            <span
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
              style={{ color: meta.color, borderColor: meta.border }}
            >
              <Icon size={9} /> {meta.label}
            </span>
            {listing.condition && (
              <span className="text-[10px] text-white/35 bg-white/6 border border-white/8 px-2 py-0.5 rounded-full">
                {CONDITION_LABELS[listing.condition]}
              </span>
            )}
          </div>
        )}

        <h3 className="text-[14px] font-bold text-white/88 mb-1.5 leading-snug">{listing.title}</h3>
        <p className="text-[12px] text-white/42 leading-relaxed mb-3 line-clamp-3">{listing.description}</p>

        {/* Tags */}
        {listing.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {listing.tags.slice(0, 3).map(t => (
              <span key={t} className="text-[10px] text-white/30 bg-white/5 border border-white/7 px-1.5 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/6">
          <PriceBadge hint={listing.price_hint} />
          <button
            onClick={onContact}
            className="flex items-center gap-1.5 text-[12px] font-semibold transition-colors hover:opacity-80"
            style={{ color: meta.color }}
          >
            {listing.listing_type === 'demand' ? 'Répondre' : 'Demander'}
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProfileVitrine({
  profile: p,
  isOwner,
  onBack,
  onContact,
  contacted,
  contacting,
  onRefresh,
  matchScore,
  matchReasons,
}: Props) {
  const [activeTab, setActiveTab] = useState<'feed' | 'about' | 'faq'>('feed');
  const [listings, setListings] = useState<ProfileListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [feedFilter, setFeedFilter] = useState<ProfileListing['listing_type'] | 'all'>('all');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingListings(true);
      const { data } = await supabase
        .from('profile_listings')
        .select('*')
        .eq('profile_id', p.id)
        .eq('is_published', true)
        .eq('is_available', true)
        .order('created_at', { ascending: false });
      if (!cancelled) {
        setListings(data ?? []);
        setLoadingListings(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [p.id]);

  const heroTitle = p.vitrine_hero_title || p.title;
  const pitch     = p.vitrine_pitch || p.tagline || '';
  const bio       = p.vitrine_bio || p.summary || '';
  const respTime  = p.vitrine_response_time || 'Répond sous 48h';
  const typeLabel = PROFILE_TYPE_LABELS[p.profile_type ?? 'individual'] ?? 'Professionnel';
  const trust     = trustLevel(p.sav_points);
  const color     = avatarColor(p.title);

  const badges: string[] = p.vitrine_badges?.length
    ? p.vitrine_badges
    : [
        'Vérifié RENOVEC',
        p.sav_points >= 50  ? 'Reconnu réseau'     : null,
        p.sav_points >= 100 ? 'Contributeur actif'  : null,
        (p.availability || '').toLowerCase().includes('maintenant') ? 'Dispo maintenant' : null,
      ].filter(Boolean) as string[];

  const faq: VitrineFAQ[] = p.vitrine_faq?.length
    ? p.vitrine_faq
    : [
        { question: 'Comment vous contacter ?', answer: 'Via la messagerie RENOVEC — je réponds sous 48h.' },
        {
          question: 'Quels besoins acceptez-vous ?',
          answer: p.success_contexts[0]
            ? `Je suis particulièrement à l'aise avec : ${p.success_contexts.slice(0, 2).join(', ')}.`
            : 'Décrivez-moi votre situation et on voit ensemble.',
        },
      ];

  const feedCounts = {
    all:        listings.length,
    service:    listings.filter(l => l.listing_type === 'service').length,
    object_new: listings.filter(l => l.listing_type === 'object_new').length,
    object_used:listings.filter(l => l.listing_type === 'object_used').length,
    demand:     listings.filter(l => l.listing_type === 'demand').length,
    resource:   listings.filter(l => l.listing_type === 'resource').length,
  };

  const visibleListings = feedFilter === 'all' ? listings : listings.filter(l => l.listing_type === feedFilter);

  return (
    <div className="min-h-screen bg-[#0c0a09] text-white pb-36 animate-fade-in">

      {/* ── Topbar ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between py-4 mb-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/30 hover:text-white/70 text-sm transition-colors group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Retour
        </button>
        {isOwner && <GenerateBtn profileId={p.id} onDone={onRefresh} />}
      </div>

      {/* ── COVER PHOTO ───────────────────────────────────────── */}
      <div className="relative -mx-4 mb-0 h-40 overflow-hidden">
        {p.cover_url ? (
          <img src={p.cover_url} alt="cover" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: `linear-gradient(135deg, ${color}22 0%, #131109 80%)` }}
          />
        )}
        {/* Gradient fade bottom */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0c0a09]" />
        {isOwner && (
          <button className="absolute top-3 right-3 flex items-center gap-1.5 text-[11px] text-white/60 bg-black/50 hover:bg-black/70 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-white/12 transition-all">
            <Camera size={11} /> Modifier
          </button>
        )}
      </div>

      {/* ── IDENTITY CARD (overlaps cover) ────────────────────── */}
      <div className="relative -mt-14 mx-0 mb-4 px-0">
        <div className="flex items-end gap-4 mb-4 px-0">
          {/* Avatar with ring */}
          <div className="relative flex-shrink-0" style={{ marginBottom: 4 }}>
            <div className="p-0.5 rounded-2xl" style={{ background: `linear-gradient(135deg, ${color}, ${color}44)` }}>
              <Avatar name={p.title} src={p.avatar_url} size={76} />
            </div>
            {isOwner && (
              <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#1a1714] border border-white/15 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors">
                <Camera size={10} />
              </button>
            )}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="text-[10px] font-medium uppercase tracking-widest text-white/28 bg-white/5 border border-white/8 px-2 py-0.5 rounded-full">
                {typeLabel}
              </span>
              {p.city && (
                <span className="flex items-center gap-1 text-[10px] text-white/28">
                  <MapPin size={9} /> {p.city}
                </span>
              )}
              {matchScore !== undefined && (
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full border"
                  style={{
                    color: matchScore >= 80 ? '#22c55e' : '#F26522',
                    borderColor: matchScore >= 80 ? '#22c55e30' : '#F2652230',
                    background:  matchScore >= 80 ? '#22c55e10' : '#F2652210',
                  }}
                >
                  {matchScore}% match
                </span>
              )}
            </div>
            <h1 className="text-[17px] font-bold text-white leading-tight">{heroTitle}</h1>
          </div>
        </div>

        {pitch && <p className="text-[13px] text-white/48 leading-snug mb-3">{pitch}</p>}

        {/* Status strip */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <AvailDot avail={p.availability} />
            <span className="text-[12px] text-white/42">{p.availability || 'Disponible'}</span>
          </div>
          <span className="text-white/12">·</span>
          <div className="flex items-center gap-1.5">
            <Clock size={9} className="text-white/22" />
            <span className="text-[12px] text-white/32">{respTime}</span>
          </div>
          <span className="text-white/12">·</span>
          <div className="flex items-center gap-1.5">
            <Shield size={9} style={{ color: trust.color }} />
            <span className="text-[12px] font-semibold" style={{ color: trust.color }}>{trust.label}</span>
            <span className="text-[11px] text-white/22">· {p.sav_points} pts</span>
          </div>
        </div>

        {/* Trust bar */}
        <div className="h-[3px] rounded-full bg-white/6 mb-4 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${trust.pct}%`, background: `linear-gradient(90deg, ${trust.color}70, ${trust.color})` }}
          />
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2.5">
          {contacted ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/12 border border-emerald-500/25 text-emerald-400 text-sm font-medium flex-1 justify-center">
              <CheckCircle2 size={14} /> Échange démarré
            </div>
          ) : (
            <button
              onClick={onContact}
              disabled={contacting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-[#0c0a09] text-sm font-bold transition-all hover:bg-white/92 active:scale-[0.98] disabled:opacity-50"
            >
              {contacting
                ? <span className="w-4 h-4 border-2 border-[#0c0a09]/20 border-t-[#0c0a09] rounded-full animate-spin" />
                : <Send size={13} />}
              {contacting ? 'En cours…' : 'Contacter'}
            </button>
          )}
          <button className="w-10 h-10 rounded-xl bg-white/6 border border-white/8 flex items-center justify-center text-white/35 hover:text-white/65 hover:bg-white/10 transition-all">
            <Heart size={15} />
          </button>
        </div>
      </div>

      {/* ── MATCH REASONS ─────────────────────────────────────── */}
      {matchReasons && matchReasons.length > 0 && (
        <div className="mb-4 px-3.5 py-3 rounded-xl bg-[#F26522]/8 border border-[#F26522]/18">
          <p className="text-[10px] uppercase tracking-widest text-[#F26522]/60 font-medium mb-2">Pourquoi ce profil vous correspond</p>
          <div className="flex flex-wrap gap-1.5">
            {matchReasons.map((r, i) => (
              <span key={i} className="flex items-center gap-1 text-[11px] text-white/52 bg-white/5 border border-white/8 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={8} className="text-[#F26522]" /> {r}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── AI NUDGE (owner without vitrine) ──────────────────── */}
      {isOwner && !p.vitrine_hero_title && (
        <div className="mb-4 p-4 rounded-xl bg-[#F26522]/8 border border-[#F26522]/18 flex items-start gap-3">
          <Sparkles size={15} className="text-[#F26522] flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white/80 mb-0.5">Créez votre vitrine en 10 secondes</p>
            <p className="text-xs text-white/30 leading-relaxed">L'IA génère vos offres, votre bio et votre FAQ automatiquement.</p>
          </div>
          <GenerateBtn profileId={p.id} onDone={onRefresh} />
        </div>
      )}

      {/* ── BADGES ────────────────────────────────────────────── */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {badges.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-white/42 bg-white/5 border border-white/7">
              <Award size={9} className="text-[#F26522]" /> {b}
            </span>
          ))}
        </div>
      )}

      {/* ── STATS STRIP ───────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { val: listings.length,                    label: 'Annonces' },
          { val: p.explicit_capabilities.length,     label: 'Compétences' },
          { val: p.sav_points,                       label: 'Points SAV' },
        ].map(({ val, label }) => (
          <div key={label} className="rounded-xl bg-[#141210] border border-white/6 p-3 text-center">
            <p className="text-[20px] font-bold text-white/78 leading-none">{val}</p>
            <p className="text-[10px] text-white/22 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* ── TABS ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-0 mb-4 bg-white/4 rounded-xl p-1 border border-white/6">
        {(['feed', 'about', 'faq'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-2 rounded-lg text-[12px] font-medium transition-all ${
              activeTab === t ? 'bg-white/12 text-white' : 'text-white/28 hover:text-white/52'
            }`}
          >
            {t === 'feed' ? `Boutique${listings.length > 0 ? ` (${listings.length})` : ''}` : t === 'about' ? 'À propos' : 'FAQ'}
          </button>
        ))}
      </div>

      {/* ── TAB: FEED / BOUTIQUE ──────────────────────────────── */}
      {activeTab === 'feed' && (
        <div className="animate-fade-in">

          {/* Filter chips */}
          {listings.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
              {([
                { key: 'all',         label: `Tout (${feedCounts.all})` },
                feedCounts.service     > 0 && { key: 'service',     label: `Services (${feedCounts.service})` },
                feedCounts.object_new  > 0 && { key: 'object_new',  label: `Neuf (${feedCounts.object_new})` },
                feedCounts.object_used > 0 && { key: 'object_used', label: `Occasion (${feedCounts.object_used})` },
                feedCounts.demand      > 0 && { key: 'demand',      label: `Recherche (${feedCounts.demand})` },
              ].filter(Boolean) as { key: string; label: string }[]).map(chip => (
                <button
                  key={chip.key}
                  onClick={() => setFeedFilter(chip.key as typeof feedFilter)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${
                    feedFilter === chip.key
                      ? 'bg-white text-[#0c0a09] border-white'
                      : 'text-white/40 border-white/12 hover:border-white/25 hover:text-white/65'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {loadingListings ? (
            <div className="py-14 flex justify-center">
              <div className="w-6 h-6 border border-white/15 border-t-white/50 rounded-full animate-spin" />
            </div>
          ) : visibleListings.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-white/25 text-sm">Aucune annonce pour le moment.</p>
              {isOwner && (
                <p className="text-white/18 text-xs mt-2">Ajoutez vos services et objets depuis votre espace.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {visibleListings.map(listing => (
                <ListingCard key={listing.id} listing={listing} onContact={onContact} />
              ))}
            </div>
          )}

          {isOwner && (
            <button
              onClick={onRefresh}
              className="w-full mt-4 py-3 rounded-xl border border-dashed border-white/12 text-[12px] text-white/28 hover:text-white/50 hover:border-white/22 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={12} /> Rafraîchir les annonces
            </button>
          )}
        </div>
      )}

      {/* ── TAB: ABOUT ────────────────────────────────────────── */}
      {activeTab === 'about' && (
        <div className="space-y-4 animate-fade-in">

          {/* Bio */}
          {bio && (
            <div className="p-4 rounded-xl bg-[#141210] border border-white/6">
              <div className="flex items-center gap-2 mb-3">
                <Avatar name={p.title} src={p.avatar_url} size={26} />
                <p className="text-[10px] uppercase tracking-widest text-white/22 font-medium">Présentation</p>
              </div>
              <p className="text-[13px] text-white/52 leading-relaxed">{bio}</p>
              {p.relational_style && (
                <p className="mt-3 text-xs text-white/28 italic border-t border-white/6 pt-3">{p.relational_style}</p>
              )}
            </div>
          )}

          {/* Capabilities */}
          {p.explicit_capabilities.length > 0 && (
            <div className="p-4 rounded-xl bg-[#141210] border border-white/6">
              <p className="text-[10px] uppercase tracking-widest text-white/22 font-medium mb-3">Compétences déclarées</p>
              <div className="flex flex-wrap gap-1.5">
                {p.explicit_capabilities.map((cap, i) => {
                  const Icon = capIcon(cap);
                  return (
                    <button
                      key={i}
                      onClick={onContact}
                      className="flex items-center gap-1.5 text-[12px] text-white/48 bg-white/5 border border-white/8 px-2.5 py-1 rounded-full hover:border-white/18 hover:text-white/68 transition-all"
                    >
                      <Icon size={9} className="flex-shrink-0" /> {cap}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Success contexts */}
          {p.success_contexts.length > 0 && (
            <div className="p-4 rounded-xl bg-[#141210] border border-white/6">
              <p className="text-[10px] uppercase tracking-widest text-white/22 font-medium mb-3">Réalisations & contextes</p>
              <div className="space-y-2">
                {p.success_contexts.map((ctx, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `${color}18`, border: `1px solid ${color}28` }}
                    >
                      <Star size={9} style={{ color }} />
                    </div>
                    <p className="text-[13px] text-white/48 leading-relaxed">{ctx}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Help formats */}
          {p.help_formats.length > 0 && (
            <div className="p-4 rounded-xl bg-[#141210] border border-white/6">
              <p className="text-[10px] uppercase tracking-widest text-white/22 font-medium mb-3">Formats d'aide</p>
              <div className="flex flex-wrap gap-2">
                {p.help_formats.map((f, i) => (
                  <span key={i} className="text-[12px] text-white/38 bg-white/4 border border-white/7 px-2.5 py-1 rounded-lg">{f}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: FAQ ──────────────────────────────────────────── */}
      {activeTab === 'faq' && (
        <div className="rounded-xl bg-[#141210] border border-white/6 px-4 animate-fade-in">
          {faq.map((item, i) => <FAQItem key={i} q={item.question} a={item.answer} />)}
        </div>
      )}

      {/* ── STICKY BOTTOM CTA ─────────────────────────────────── */}
      <div className="fixed bottom-16 inset-x-0 px-4 z-30 pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl border border-white/8 bg-[#13110e]/95 backdrop-blur-xl shadow-2xl">
            <Avatar name={p.title} src={p.avatar_url} size={34} />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-white/78 truncate">{p.title}</p>
              <div className="flex items-center gap-1.5">
                <AvailDot avail={p.availability} />
                <p className="text-[10px] text-white/28 truncate">{p.availability || 'Disponible'}</p>
              </div>
            </div>
            {contacted ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/12 border border-emerald-500/25 text-emerald-400 text-[11px] font-medium flex-shrink-0">
                <CheckCircle2 size={11} /> Démarré
              </div>
            ) : (
              <button
                onClick={onContact}
                disabled={contacting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-[#0c0a09] text-[12px] font-bold hover:bg-white/90 transition-all flex-shrink-0 disabled:opacity-50"
              >
                {contacting
                  ? <span className="w-3 h-3 border-2 border-[#0c0a09]/20 border-t-[#0c0a09] rounded-full animate-spin" />
                  : <MessageSquare size={11} />}
                {contacting ? '…' : 'Contacter'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
