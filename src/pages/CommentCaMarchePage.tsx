import { X, ArrowRight } from 'lucide-react';

type Props = {
  onClose: () => void;
  onEnter: () => void;
  onGoToPresence?: () => void;
  standalone?: boolean;
};

// ─── PageContent ──────────────────────────────────────────────────────────────

function PageContent({ onEnter, onGoToPresence, onClose }: Props) {
  return (
    <div className="ccm-content">

      {/* Titre factuel — pas de copie homepage */}
      <div className="ccm-hero">
        <p className="ccm-eyebrow">Fonctionnement</p>
        <h1 className="ccm-h1">Comment RENOVEC coordonne.</h1>
        <p className="ccm-intro-sub">
          Pas un annuaire. Pas un formulaire à cases. Un réseau orchestré par IA — de la situation telle qu'elle est vécue à la coordination réelle.
        </p>
      </div>

      <div className="ccm-sep" />

      {/* 4 étapes numérotées — texte lisible, sans icônes animées */}
      <section>
        <p className="ccm-section-label">En 4 étapes</p>
        <ol className="ccm-items">
          <li className="ccm-item">
            <span className="ccm-item-num">1</span>
            <div className="ccm-item-body">
              <strong className="ccm-item-title">Vous décrivez votre situation</strong>
              <p className="ccm-item-desc">En langage libre — flou, émotionnel, incomplet si besoin. Pas de catégorie à choisir, pas de formulaire à remplir. L'IA absorbe l'ambiguïté.</p>
            </div>
          </li>
          <li className="ccm-item">
            <span className="ccm-item-num">2</span>
            <div className="ccm-item-body">
              <strong className="ccm-item-title">L'IA comprend ce qui est vraiment en jeu</strong>
              <p className="ccm-item-desc">Elle identifie le contexte réel, l'urgence, le type d'aide nécessaire — et engage un court dialogue si des points restent flous. Pas un interrogatoire, une lecture intelligente.</p>
            </div>
          </li>
          <li className="ccm-item">
            <span className="ccm-item-num">3</span>
            <div className="ccm-item-body">
              <strong className="ccm-item-title">Les présences pertinentes sont activées</strong>
              <p className="ccm-item-desc">Pas une liste générique — une sélection construite sur votre contexte précis, la géographie réelle, et l'historique des aides reconnues dans le réseau.</p>
            </div>
          </li>
          <li className="ccm-item">
            <span className="ccm-item-num">4</span>
            <div className="ccm-item-body">
              <strong className="ccm-item-title">La coordination se fait sans friction</strong>
              <p className="ccm-item-desc">La présence reçoit déjà le contexte. Vous n'avez pas à tout réexpliquer. L'aide reconnue alimente la mémoire du réseau — orientations futures mieux calibrées.</p>
            </div>
          </li>
        </ol>
      </section>

      <div className="ccm-sep" />

      {/* Ce qu'il faut savoir — faits, pas marketing */}
      <section>
        <p className="ccm-section-label">Ce qu'il faut savoir</p>
        <ul className="ccm-facts">
          <li className="ccm-fact">
            <strong>Pas d'inscription pour commencer</strong> — les premiers profils sont visibles sans compte. Explorez avant de vous engager.
          </li>
          <li className="ccm-fact">
            <strong>Position approximative</strong> — arrondie à ~10 km, jamais stockée ni transmise telle quelle.
          </li>
          <li className="ccm-fact">
            <strong>Mémoire utile, pas surveillance</strong> — RENOVEC retient ce qui a fonctionné dans quels contextes. Pas de profil publicitaire, pas de traçage.
          </li>
        </ul>
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
