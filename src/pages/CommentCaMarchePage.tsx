import { X, ArrowRight, MessageSquare, Brain, Users, Zap, Lock, Star, Eye } from 'lucide-react';

type Props = {
  onClose: () => void;
  onEnter: () => void;
  onGoToPresence?: () => void;
  standalone?: boolean;
};

// ─── Steps ────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    icon: MessageSquare,
    color: '#F26522',
    title: 'Exprimez votre situation',
    description:
      'Pas de formulaire, pas de case. Décrivez librement ce que vous vivez — flou, imprécis, émotionnel si besoin. L\'IA est conçue pour absorber l\'ambiguïté.',
  },
  {
    icon: Brain,
    color: '#0ea5e9',
    title: 'L\'IA clarifie et interprète',
    description:
      'Le coordinateur IA lit ce que vous avez écrit, identifie ce qui est en jeu, et engage un court dialogue pour préciser le contexte. Pas un interrogatoire — une lecture intelligente.',
  },
  {
    icon: Users,
    color: '#10b981',
    title: 'Le réseau s\'active',
    description:
      'L\'IA identifie les présences dont la façon d\'aider correspond à votre situation spécifique. Une sélection vivante construite à partir de votre contexte réel, pas une liste générique.',
  },
  {
    icon: Zap,
    color: '#f59e0b',
    title: 'La coordination se fait',
    description:
      'La présence reçoit déjà le contexte transmis par l\'IA. Pas besoin de tout réexpliquer. L\'IA a construit le pont entre votre situation et la bonne réponse.',
  },
] as const;

// ─── Domains ──────────────────────────────────────────────────────────────────

const DOMAINS = [
  'Habitat & logement', 'Éducation & formation', 'Administratif & droits',
  'Aide humaine & dépendance', 'Santé & orientation', 'Mobilité & transport',
  'Voisinage & médiation', 'Réparation & technique', 'Accompagnement personnel',
  'Soutien émotionnel', 'Transitions de vie', 'Isolement & lien social',
  'Coordination familiale', 'Besoins locaux',
] as const;

// ─── Trust items ──────────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  {
    icon: Eye,
    title: 'Pas d\'inscription requise',
    body: 'Les premiers profils sont visibles sans créer de compte. Vous pouvez explorer avant de vous engager.',
  },
  {
    icon: Lock,
    title: 'Position approximative',
    body: 'Votre position est arrondie à ~10 km. Elle n\'est jamais stockée, ni transmise telle quelle.',
  },
  {
    icon: Star,
    title: 'Mémoire utile, pas surveillance',
    body: 'RENOVEC retient ce qui a fonctionné pour mieux orienter ensuite. Pas de profil publicitaire, pas de traçage.',
  },
] as const;

// ─── StepCard ─────────────────────────────────────────────────────────────────

function StepCard({ step, index }: { step: typeof STEPS[0]; index: number }) {
  const Icon = step.icon;
  return (
    <div className="ccm-step">
      {index < STEPS.length - 1 && (
        <div className="ccm-step-connector" style={{ background: `linear-gradient(to bottom, ${step.color}40, transparent)` }} />
      )}
      <div className="ccm-step-icon" style={{ background: step.color + '18', border: `1px solid ${step.color}30` }}>
        <Icon size={16} style={{ color: step.color }} />
      </div>
      <div className="ccm-step-body">
        <div className="ccm-step-meta">
          <span className="ccm-step-num" style={{ color: step.color + 'aa' }}>0{index + 1}</span>
          <h3 className="ccm-step-title">{step.title}</h3>
        </div>
        <p className="ccm-step-desc">{step.description}</p>
      </div>
    </div>
  );
}

// ─── PageContent ──────────────────────────────────────────────────────────────

function PageContent({ onEnter, onGoToPresence, onClose }: Props) {
  return (
    <div className="ccm-content">

      {/* Hero éditorial court */}
      <section className="ccm-hero">
        <p className="ccm-eyebrow">Comment ça marche</p>
        <h1 className="ccm-h1">
          De la situation exprimée<br />à la coordination réelle.
        </h1>
        <p className="ccm-hero-body">
          Vous n'avez pas à trouver les bons mots. Décrivez ce que vous vivez — flou, émotionnel, incomplet si besoin. L'IA lit le contexte, identifie ce qui est vraiment en jeu, et active les présences dont la façon d'aider correspond à votre situation précise.
        </p>
      </section>

      <div className="ccm-sep" />

      {/* 4 étapes */}
      <section className="ccm-steps-section">
        <p className="ccm-section-label">Les 4 étapes</p>
        <div className="ccm-steps-list">
          {STEPS.map((step, i) => <StepCard key={i} step={step} index={i} />)}
        </div>
      </section>

      <div className="ccm-sep" />

      {/* Confiance & transparence */}
      <section className="ccm-trust-section">
        <p className="ccm-section-label">Confiance & transparence</p>
        <div className="ccm-trust-grid">
          {TRUST_ITEMS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="ccm-trust-item">
              <div className="ccm-trust-icon">
                <Icon size={14} />
              </div>
              <div>
                <p className="ccm-trust-title">{title}</p>
                <p className="ccm-trust-body">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="ccm-sep" />

      {/* CTA final */}
      <section className="ccm-cta-section">
        <p className="ccm-cta-pre">
          Le réseau existe. Des présences actives attendent d'être activées dans votre contexte.
        </p>
        <div className="ccm-cta-row">
          <button
            onClick={() => { onClose?.(); onEnter(); }}
            className="ccm-btn-primary"
          >
            Exprimer une situation
            <ArrowRight size={13} aria-hidden />
          </button>
          <button
            onClick={() => { onClose?.(); (onGoToPresence || onEnter)(); }}
            className="ccm-btn-ghost"
          >
            Partager ma présence
            <ArrowRight size={11} aria-hidden />
          </button>
        </div>
      </section>

    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function CommentCaMarchePage({ onClose, onEnter, onGoToPresence, standalone }: Props) {

  // Standalone — full-screen fixed overlay covering the landing page
  if (standalone) {
    return (
      <div className="ccm-standalone" role="main">
        {/* Nav */}
        <nav className="ccm-nav" aria-label="Navigation Comment ça marche">
          <div className="ccm-nav-logo">
            <div className="ccm-nav-logo-mark" aria-hidden />
            <span className="ccm-nav-logo-text">RENOVEC</span>
          </div>
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); onClose(); }}
            className="ccm-nav-back"
            aria-label="Retour à l'accueil"
          >
            ← Accueil
          </a>
        </nav>

        {/* Scrollable content */}
        <div className="ccm-standalone-scroll">
          <div className="ccm-standalone-inner">
            <PageContent onClose={onClose} onEnter={onEnter} onGoToPresence={onGoToPresence} />
          </div>
        </div>
      </div>
    );
  }

  // Modal mode (overlay on landing page)
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-stone-950 text-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-stone-950/95 backdrop-blur-sm px-6 pt-5 pb-4 flex items-center justify-between border-b border-white/5">
          <h2 className="text-base font-semibold text-white">Comment ça marche</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            aria-label="Fermer"
          >
            <X size={15} />
          </button>
        </div>
        <PageContent onClose={onClose} onEnter={onEnter} onGoToPresence={onGoToPresence} />
      </div>
    </div>
  );
}
