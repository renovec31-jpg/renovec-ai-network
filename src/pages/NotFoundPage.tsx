import { Sparkles, ArrowRight } from 'lucide-react';

type Props = { onGoHome: () => void };

export default function NotFoundPage({ onGoHome }: Props) {
  return (
    <div className="min-h-screen bg-stone-950 text-white flex flex-col items-center justify-center px-5 text-center">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-[0.04] bg-amber-400 blur-[140px]" />
      </div>

      <div className="relative z-10 animate-fade-up max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-12">
          <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center">
            <Sparkles size={14} className="text-stone-950" />
          </div>
          <span className="text-base font-semibold tracking-tight">RENOVEC</span>
        </div>

        <div className="mb-3">
          <span className="text-6xl font-bold text-white/10 tabular-nums">404</span>
        </div>

        <h1 className="text-xl font-semibold text-white/80 mb-3 leading-snug">
          Cette page n'existe pas encore dans le réseau.
        </h1>
        <p className="text-sm text-white/45 leading-relaxed mb-10">
          La situation que vous cherchez n'a pas été trouvée. Elle sera peut-être exprimée bientôt.
        </p>

        <button
          onClick={onGoHome}
          className="px-7 py-3.5 bg-white text-stone-950 font-semibold rounded-xl hover:bg-stone-100 transition-all text-sm flex items-center gap-2 mx-auto group"
        >
          Retour à l'accueil
          <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
