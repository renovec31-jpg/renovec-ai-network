import { X, ArrowRight, MessageSquare, Brain, Users, Zap } from 'lucide-react';

type Props = {
  onClose: () => void;
  onEnter: () => void;
  onGoToPresence?: () => void;
  // standalone page mode (no modal backdrop)
  standalone?: boolean;
};

const STEPS = [
  {
    icon: MessageSquare,
    color: '#F26522',
    title: 'Exprimez votre situation',
    description: 'Pas de formulaire, pas de case. Décrivez en langage libre ce que vous vivez — flou, imprécis, émotionnel si besoin. L\'IA est conçue pour absorber ça.',
  },
  {
    icon: Brain,
    color: '#0ea5e9',
    title: 'L\'IA clarifie et interprète',
    description: 'Le coordinateur IA lit ce que vous avez écrit, identifie ce qui est en jeu, et engage un dialogue court pour préciser. Pas un interrogatoire — une interprétation intelligente qui transforme le flou en contexte actionnable.',
  },
  {
    icon: Users,
    color: '#10b981',
    title: 'Le réseau s\'active',
    description: 'L\'IA identifie les présences dont la manière d\'aider correspond à votre situation spécifique. Une sélection vivante construite à partir de votre contexte réel, pas une liste exhaustive.',
  },
  {
    icon: Zap,
    color: '#f59e0b',
    title: 'La coordination se fait',
    description: 'La présence reçoit déjà le contexte transmis par l\'IA. Pas besoin de tout réexpliquer. L\'IA a construit le pont entre votre situation et la bonne réponse.',
  },
];

function StepCard({ step, index }: { step: typeof STEPS[0]; index: number }) {
  const Icon = step.icon;
  return (
    <div className="relative flex gap-5">
      {/* Vertical connector */}
      {index < STEPS.length - 1 && (
        <div
          className="absolute left-5 top-12 bottom-0 w-px"
          style={{ background: `linear-gradient(to bottom, ${step.color}40, transparent)` }}
        />
      )}
      {/* Icon */}
      <div
        className="relative z-10 w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center"
        style={{ background: step.color + '18', border: `1px solid ${step.color}30` }}
      >
        <Icon size={17} style={{ color: step.color }} />
      </div>
      {/* Content */}
      <div className="pb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono" style={{ color: step.color + 'aa' }}>0{index + 1}</span>
          <h3 className="text-sm font-semibold text-white">{step.title}</h3>
        </div>
        <p className="text-xs text-stone-400 leading-relaxed">{step.description}</p>
      </div>
    </div>
  );
}

function PageContent({ onEnter, onGoToPresence, onClose }: Props) {
  return (
    <div className="px-6 py-8 space-y-10">

      {/* Intro */}
      <div>
        <p className="text-xs text-stone-500 uppercase tracking-widest font-medium mb-3">Infrastructure orchestrée par IA</p>
        <h2 className="text-xl font-semibold text-white leading-snug mb-3">
          Comment fonctionne<br />RENOVEC
        </h2>
        <p className="text-sm text-stone-400 leading-relaxed">
          Là où les plateformes classiques imposent des formulaires et des tunnels, RENOVEC utilise l'IA pour comprendre des situations exprimées librement, interpréter des contextes ambigus, et coordonner des réponses adaptées à chaque cas.
        </p>
      </div>

      {/* 4 steps */}
      <div>
        <p className="text-xs text-stone-600 uppercase tracking-widest font-medium mb-6">Les 4 étapes</p>
        <div>
          {STEPS.map((step, i) => (
            <StepCard key={i} step={step} index={i} />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5" />

      {/* Domains */}
      <div>
        <p className="text-xs text-stone-600 uppercase tracking-widest font-medium mb-4">Domaines couverts</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            'Habitat & logement', 'Éducation & formation', 'Administratif & droits',
            'Aide humaine & dépendance', 'Santé & orientation', 'Mobilité & transport',
            'Voisinage & médiation', 'Réparation & technique', 'Accompagnement personnel',
            'Soutien émotionnel', 'Transitions de vie', 'Isolement & lien social',
            'Coordination familiale', 'Besoins locaux',
          ].map(d => (
            <div key={d} className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-stone-700 flex-shrink-0" />
              <span className="text-xs text-stone-500">{d}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-stone-700 mt-4">Aucune situation n'est hors périmètre.</p>
      </div>

      {/* Divider */}
      <div className="h-px bg-white/5" />

      {/* CTAs */}
      <div className="space-y-3">
        <button
          onClick={() => { onClose?.(); onEnter(); }}
          className="w-full py-3.5 bg-white text-stone-950 text-sm font-semibold rounded-xl hover:bg-stone-100 transition-all flex items-center justify-center gap-2 group"
        >
          Rejoindre le réseau
          <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
        <button
          onClick={() => { onClose?.(); (onGoToPresence || onEnter)(); }}
          className="w-full py-3 border border-white/10 hover:border-white/25 text-stone-500 hover:text-white text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-2"
        >
          Partager ma capacité <ArrowRight size={12} />
        </button>
      </div>

    </div>
  );
}

export default function CommentCaMarchePage({ onClose, onEnter, onGoToPresence, standalone }: Props) {
  if (standalone) {
    return (
      <div className="min-h-screen bg-stone-950 text-white">
        {/* Nav */}
        <div className="sticky top-0 bg-stone-950/95 backdrop-blur-sm border-b border-white/5 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#F26522] rounded-lg flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-sm bg-white/90" />
            </div>
            <span className="text-sm font-semibold tracking-tight">RENOVEC</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            <X size={15} />
          </button>
        </div>
        <div className="max-w-lg mx-auto">
          <PageContent onClose={onClose} onEnter={onEnter} onGoToPresence={onGoToPresence} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-stone-950 text-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-stone-950/95 backdrop-blur-sm px-6 pt-5 pb-4 flex items-center justify-between border-b border-white/5">
          <h2 className="text-base font-semibold text-white">Comment ça marche</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            <X size={15} />
          </button>
        </div>
        <PageContent onClose={onClose} onEnter={onEnter} onGoToPresence={onGoToPresence} />
      </div>
    </div>
  );
}
