import { useState, useEffect } from 'react';
import { ArrowRight, X } from 'lucide-react';

const STORAGE_KEY = 'renovec_onboarding_seen';

const STEPS = [
  {
    step: 1,
    title: "Exprimez votre situation",
    description: "Pas de formulaire, pas de case à cocher. Décrivez simplement ce que vous vivez, avec vos mots. Le coordinateur lit et comprend.",
    visual: (
      <div className="relative w-14 h-14 mx-auto">
        <div className="absolute inset-0 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
          <div className="space-y-1.5 px-3 py-2 w-full">
            <div className="h-1 bg-amber-200 rounded-full w-full" />
            <div className="h-1 bg-amber-100 rounded-full w-4/5" />
            <div className="h-1 bg-amber-100 rounded-full w-3/5" />
          </div>
        </div>
        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white rounded-full" />
        </div>
      </div>
    ),
  },
  {
    step: 2,
    title: "Le réseau identifie les présences pertinentes",
    description: "Des personnes réelles, à proximité ou à distance, avec les capacités adaptées à votre situation, sont identifiées silencieusement.",
    visual: (
      <div className="relative w-14 h-14 mx-auto">
        <div className="absolute inset-0 rounded-full border border-stone-200 animate-breathe" />
        <div className="absolute inset-2 rounded-full border border-stone-100 animate-breathe" style={{ animationDelay: '0.3s' }} />
        <div className="absolute inset-4 rounded-full bg-stone-100 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />
        </div>
        {[0, 60, 120, 200, 280, 320].map((deg, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-stone-300"
            style={{
              top: `calc(50% + ${Math.sin(deg * Math.PI / 180) * 22}px - 4px)`,
              left: `calc(50% + ${Math.cos(deg * Math.PI / 180) * 22}px - 4px)`,
            }}
          />
        ))}
      </div>
    ),
  },
  {
    step: 3,
    title: "Un échange humain commence",
    description: "Une présence pertinente vous contacte. L'échange porte déjà le contexte de votre situation — pas besoin de tout réexpliquer.",
    visual: (
      <div className="relative w-14 h-14 mx-auto flex flex-col items-end justify-center gap-1.5">
        <div className="bg-stone-900 text-white text-[8px] px-2 py-1 rounded-xl rounded-br-none">Bonjour !</div>
        <div className="bg-stone-100 text-stone-700 text-[8px] px-2 py-1 rounded-xl rounded-bl-none self-start">Je comprends votre situation.</div>
        <div className="bg-stone-900 text-white text-[8px] px-2 py-1 rounded-xl rounded-br-none">Merci.</div>
      </div>
    ),
  },
];

export default function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setVisible(true);
  }, []);

  function dismiss() {
    setExiting(true);
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, '1');
      setVisible(false);
      setExiting(false);
    }, 300);
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      dismiss();
    }
  }

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0 transition-all duration-300 ${exiting ? 'opacity-0' : 'opacity-100'}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/20 backdrop-blur-sm"
        onClick={dismiss}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-sm bg-white rounded-3xl shadow-xl p-7 transition-all duration-300 ${exiting ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'}`}
      >
        {/* Close */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-stone-300 hover:text-stone-600 hover:bg-stone-100 transition-all"
        >
          <X size={14} />
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${i === step ? 'w-5 h-1.5 bg-amber-500' : i < step ? 'w-1.5 h-1.5 bg-stone-300' : 'w-1.5 h-1.5 bg-stone-100'}`}
            />
          ))}
        </div>

        {/* Visual */}
        <div className="mb-6">
          {current.visual}
        </div>

        {/* Content */}
        <div className="mb-8">
          <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-2">{current.step} / {STEPS.length}</p>
          <h2 className="text-lg font-semibold text-stone-900 leading-snug mb-3">{current.title}</h2>
          <p className="text-sm text-stone-500 leading-relaxed">{current.description}</p>
        </div>

        {/* Action */}
        <button
          onClick={next}
          className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium rounded-2xl transition-all flex items-center justify-center gap-2 group"
        >
          {isLast ? 'Commencer' : 'Suivant'}
          <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </button>

        {!isLast && (
          <button
            onClick={dismiss}
            className="w-full mt-3 py-2 text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            Passer l'introduction
          </button>
        )}
      </div>
    </div>
  );
}
