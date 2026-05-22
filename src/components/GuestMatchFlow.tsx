import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Sparkles, Shield, MapPin, Clock, Star, Lock, CheckCircle2, ChevronRight, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VitrineService {
  title: string;
  description: string;
  price_hint: string;
  format: string;
  highlight: boolean;
}

export interface MatchedProfile {
  id: string;
  initial: string;
  title: string;
  profile_type: string;
  city: string;
  availability: string;
  explicit_capabilities: string[];
  success_contexts: string[];
  help_formats: string[];
  sav_points: number;
  vitrine_hero_title: string;
  vitrine_pitch: string;
  vitrine_services: VitrineService[];
  vitrine_badges: string[];
  vitrine_response_time: string;
  match_score: number;
  match_reasons: string[];
  match_summary: string;
}

interface MatchResult {
  profiles: MatchedProfile[];
  need_reformulation: string;
  need_category: string;
}

interface Props {
  onEnter: (needText?: string) => void;   // CTA → auth, optionally carrying need text
  isGuest: boolean;                        // true = blur PII, false = full view
}

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#F26522' : '#f59e0b';
  return (
    <div className="gmf-score-ring">
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <circle
          cx="20" cy="20" r={r} fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 20 20)"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <span className="gmf-score-value" style={{ color }}>{score}%</span>
    </div>
  );
}

// ─── Availability badge ───────────────────────────────────────────────────────

function AvailDot({ avail }: { avail?: string }) {
  const a = (avail || '').toLowerCase();
  const now = a.includes('maintenant') || a.includes('dispo');
  const soon = a.includes('semaine') || a.includes('bientôt');
  return (
    <span className={`gmf-avail ${now ? 'gmf-avail--now' : soon ? 'gmf-avail--soon' : 'gmf-avail--later'}`}>
      <span className="gmf-avail-dot" />
      {avail || 'Disponible'}
    </span>
  );
}

// ─── Blurred text for guest ───────────────────────────────────────────────────

function Blurred({ children, guest }: { children: string; guest: boolean }) {
  if (!guest) return <>{children}</>;
  return <span className="gmf-blurred">{children}</span>;
}

// ─── Profile card for results ─────────────────────────────────────────────────

function MatchCard({
  profile: p,
  guest,
  onCTA,
  rank,
}: {
  profile: MatchedProfile;
  guest: boolean;
  onCTA: () => void;
  rank: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const heroTitle = p.vitrine_hero_title || p.title;
  const pitch = p.vitrine_pitch || (p.explicit_capabilities[0] ?? '');
  const topService = p.vitrine_services?.find(s => s.highlight) ?? p.vitrine_services?.[0];
  const isTop = rank === 0;

  return (
    <div className={`gmf-card ${isTop ? 'gmf-card--top' : ''}`}>
      {isTop && <div className="gmf-card-top-badge">Meilleure correspondance</div>}

      <div className="gmf-card-header">
        {/* Avatar */}
        <div className="gmf-card-avatar">
          <span>{p.initial || (p.title || 'P')[0].toUpperCase()}</span>
          <AvailDot avail={p.availability} />
        </div>

        {/* Identity */}
        <div className="gmf-card-identity">
          <div className="gmf-card-name-row">
            <p className="gmf-card-name">
              <Blurred guest={guest}>{heroTitle}</Blurred>
            </p>
            {p.sav_points > 0 && (
              <span className="gmf-card-trust">
                <Shield size={9} /> {p.sav_points} pts
              </span>
            )}
          </div>
          {pitch && <p className="gmf-card-pitch">{pitch}</p>}
          <div className="gmf-card-meta">
            {p.city && (
              <span className="gmf-card-city">
                <MapPin size={9} />
                <Blurred guest={guest}>{p.city}</Blurred>
              </span>
            )}
            {p.vitrine_response_time && (
              <span className="gmf-card-resp">
                <Clock size={9} /> {p.vitrine_response_time}
              </span>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="gmf-card-score-wrap">
          <ScoreRing score={p.match_score} />
          <span className="gmf-card-score-label">compatibilité</span>
        </div>
      </div>

      {/* Match summary */}
      {p.match_summary && (
        <p className="gmf-card-summary">{p.match_summary}</p>
      )}

      {/* Reasons */}
      {p.match_reasons.length > 0 && (
        <div className="gmf-card-reasons">
          {p.match_reasons.map((r, i) => (
            <span key={i} className="gmf-card-reason">
              <CheckCircle2 size={9} /> {r}
            </span>
          ))}
        </div>
      )}

      {/* Expandable content */}
      <button className="gmf-card-expand-btn" onClick={() => setExpanded(e => !e)}>
        {expanded ? 'Réduire' : 'Voir la vitrine'}
        <ChevronRight size={11} className={`gmf-card-expand-arrow ${expanded ? 'gmf-card-expand-arrow--open' : ''}`} />
      </button>

      {expanded && (
        <div className="gmf-card-expanded">
          {/* Top service preview */}
          {topService && (
            <div className="gmf-card-service">
              <p className="gmf-card-service-title">{topService.title}</p>
              <p className="gmf-card-service-desc">{topService.description}</p>
              <div className="gmf-card-service-row">
                {topService.price_hint && <span className="gmf-card-service-price">{topService.price_hint}</span>}
                {topService.format && <span className="gmf-card-service-format">{topService.format}</span>}
              </div>
            </div>
          )}

          {/* Capabilities */}
          {p.explicit_capabilities.length > 0 && (
            <div className="gmf-card-caps">
              {p.explicit_capabilities.slice(0, 4).map(c => (
                <span key={c} className="gmf-card-cap">{c}</span>
              ))}
            </div>
          )}

          {/* Success contexts */}
          {p.success_contexts.length > 0 && (
            <div className="gmf-card-contexts">
              {p.success_contexts.slice(0, 2).map((ctx, i) => (
                <div key={i} className="gmf-card-context">
                  <Star size={9} className="gmf-card-context-star" />
                  <span>{ctx}</span>
                </div>
              ))}
            </div>
          )}

          {/* Badges */}
          {p.vitrine_badges?.length > 0 && (
            <div className="gmf-card-badges">
              {p.vitrine_badges.map(b => (
                <span key={b} className="gmf-card-badge">{b}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="gmf-card-cta-row">
        {guest ? (
          <button className="gmf-card-cta gmf-card-cta--guest" onClick={onCTA}>
            <Lock size={11} />
            Contacter {guest ? <Blurred guest>{heroTitle.split(' ')[0]}</Blurred> : heroTitle.split(' ')[0]}
            — créer mon compte
          </button>
        ) : (
          <button className="gmf-card-cta" onClick={onCTA}>
            <ArrowRight size={11} />
            Contacter — démarrer un échange
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Guest request form (lightweight, shown before full signup) ───────────────

function GuestRequestForm({
  needText,
  needCategory,
  profileName,
  onSubmit,
  onClose,
}: {
  needText: string;
  needCategory: string;
  profileName: string;
  onSubmit: (email: string) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [valid, setValid] = useState(false);

  useEffect(() => {
    setValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));
  }, [email]);

  return (
    <div className="gmf-request-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="gmf-request-modal">
        <button className="gmf-request-close" onClick={onClose}><X size={14} /></button>
        <div className="gmf-request-icon"><Lock size={16} /></div>
        <h3 className="gmf-request-title">Envoyer votre demande à {profileName}</h3>
        <p className="gmf-request-sub">
          Indiquez votre email pour recevoir la réponse. Votre compte sera créé en un clic.
        </p>
        <div className="gmf-request-need-preview">
          <span className="gmf-request-need-label">{needCategory || 'Votre besoin'}</span>
          <p className="gmf-request-need-text">"{needText}"</p>
        </div>
        <input
          type="email"
          placeholder="votre@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="gmf-request-input"
          autoFocus
        />
        <button
          className="gmf-request-submit"
          disabled={!valid}
          onClick={() => valid && onSubmit(email.trim())}
        >
          Envoyer ma demande
          <ArrowRight size={12} />
        </button>
        <p className="gmf-request-fine">Gratuit · Aucune carte bancaire · Annulable à tout moment</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GuestMatchFlow({ onEnter, isGuest }: Props) {
  const [step, setStep] = useState<'input' | 'loading' | 'results'>('input');
  const [needText, setNeedText] = useState('');
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState('');
  const [requestTarget, setRequestTarget] = useState<MatchedProfile | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const thinkingPhrases = [
    'Analyse de votre situation…',
    'Recherche des profils compatibles…',
    'Calcul des scores de matching…',
    'Sélection des meilleures correspondances…',
  ];
  const [thinkingIdx, setThinkingIdx] = useState(0);

  useEffect(() => {
    if (step !== 'loading') return;
    const id = setInterval(() => setThinkingIdx(i => (i + 1) % thinkingPhrases.length), 1100);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (step === 'results' && resultsRef.current) {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [step]);

  async function handleSearch() {
    if (needText.trim().length < 10) {
      setError('Décrivez votre besoin en quelques mots (minimum 10 caractères)');
      return;
    }
    setError('');
    setStep('loading');

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/instant-match`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ need_text: needText.trim() }),
      });
      if (!res.ok) throw new Error('Matching error');
      const data: MatchResult = await res.json();
      setResult(data);
      setStep('results');
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
      setStep('input');
    }
  }

  function handleProfileCTA(profile: MatchedProfile) {
    if (isGuest) {
      setRequestTarget(profile);
    } else {
      // Authenticated: fire navigate event
      window.dispatchEvent(new CustomEvent('guest-match-contact', { detail: { profileId: profile.id } }));
    }
  }

  function handleGuestSubmit(email: string) {
    // Carry email + need text into auth flow
    onEnter(needText);
    // Store guest intent in sessionStorage for post-signup pickup
    sessionStorage.setItem('renovec_guest_need', needText);
    sessionStorage.setItem('renovec_guest_email', email);
    if (requestTarget) {
      sessionStorage.setItem('renovec_guest_target_profile', requestTarget.id);
    }
    setRequestTarget(null);
  }

  return (
    <div className="gmf-root">

      {/* ── Input step ──────────────────────────────────────────────────── */}
      <div className="gmf-input-section">
        <div className="gmf-input-inner">
          <div className="gmf-input-header">
            <Sparkles size={16} className="gmf-input-spark" />
            <p className="gmf-input-label">Décrivez votre besoin en langage libre</p>
          </div>
          <div className="gmf-input-wrap">
            <textarea
              ref={textareaRef}
              className="gmf-textarea"
              placeholder="Ex : Je cherche quelqu'un pour m'aider à rédiger mon CV et me préparer à des entretiens d'embauche..."
              value={needText}
              onChange={e => { setNeedText(e.target.value); setError(''); }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey && step !== 'loading') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              rows={3}
              disabled={step === 'loading'}
            />
            <button
              className={`gmf-search-btn ${step === 'loading' ? 'gmf-search-btn--loading' : ''}`}
              onClick={handleSearch}
              disabled={step === 'loading' || needText.trim().length < 3}
            >
              {step === 'loading'
                ? <span className="gmf-search-spinner" />
                : <><ArrowRight size={14} /> Trouver des profils</>}
            </button>
          </div>
          {error && <p className="gmf-input-error">{error}</p>}
          {step === 'loading' && (
            <p className="gmf-thinking">{thinkingPhrases[thinkingIdx]}</p>
          )}
          <p className="gmf-input-hint">Appuyez sur Entrée · Résultats instantanés · {isGuest ? 'Aucune inscription requise pour voir les profils' : 'Connecté'}</p>
        </div>
      </div>

      {/* ── Results step ────────────────────────────────────────────────── */}
      {step === 'results' && result && (
        <div className="gmf-results" ref={resultsRef}>

          {/* Results header */}
          <div className="gmf-results-header">
            <div className="gmf-results-header-left">
              <p className="gmf-results-count">
                {result.profiles.length} profil{result.profiles.length !== 1 ? 's' : ''} trouvé{result.profiles.length !== 1 ? 's' : ''}
              </p>
              {result.need_category && (
                <span className="gmf-results-category">{result.need_category}</span>
              )}
            </div>
            <button className="gmf-results-reset" onClick={() => { setStep('input'); setResult(null); }}>
              Nouveau besoin
            </button>
          </div>

          {/* Need reformulation */}
          {result.need_reformulation && (
            <div className="gmf-results-reformulation">
              <p className="gmf-results-reformulation-label">Votre besoin tel que compris par l'IA :</p>
              <p className="gmf-results-reformulation-text">"{result.need_reformulation}"</p>
            </div>
          )}

          {/* Guest privacy notice */}
          {isGuest && (
            <div className="gmf-guest-notice">
              <Lock size={11} className="gmf-guest-notice-icon" />
              <p>
                Certaines informations sont masquées pour les visiteurs.{' '}
                <button className="gmf-guest-notice-cta" onClick={() => onEnter(needText)}>
                  Créer un compte gratuit
                </button>{' '}
                pour voir les profils complets et envoyer des messages.
              </p>
            </div>
          )}

          {/* Profile cards */}
          <div className="gmf-cards-list">
            {result.profiles.map((p, i) => (
              <MatchCard
                key={p.id}
                profile={p}
                guest={isGuest}
                rank={i}
                onCTA={() => handleProfileCTA(p)}
              />
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="gmf-results-footer">
            <button className="gmf-results-footer-cta" onClick={() => onEnter(needText)}>
              {isGuest
                ? 'Créer mon compte pour accéder à tous les profils et envoyer des messages'
                : 'Voir tous les profils et démarrer un échange'}
              <ArrowRight size={13} />
            </button>
            {isGuest && (
              <p className="gmf-results-footer-sub">Gratuit · Aucune carte bancaire</p>
            )}
          </div>
        </div>
      )}

      {/* ── Guest request modal ──────────────────────────────────────────── */}
      {requestTarget && (
        <GuestRequestForm
          needText={result?.need_reformulation || needText}
          needCategory={result?.need_category || ''}
          profileName={requestTarget.title.split(' ')[0]}
          onSubmit={handleGuestSubmit}
          onClose={() => setRequestTarget(null)}
        />
      )}
    </div>
  );
}
