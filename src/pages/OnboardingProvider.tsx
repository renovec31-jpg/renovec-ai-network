import { useState } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Props = { onComplete: () => void; onSkip: () => void };

const FORMATS = [
  'Échange oral', 'Diagnostic écrit', 'Mission courte', 'Accompagnement',
  'Réponse rapide', 'Atelier', 'Transmission de savoir', 'Mentoring',
];
const AVAILABILITY = [
  'Disponible maintenant', 'Disponible cette semaine',
  'Disponible ce mois', 'Sur demande uniquement',
];

export default function OnboardingProvider({ onComplete, onSkip }: Props) {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    helpSubjects: '',
    howHelp: '',
    strongContexts: '',
    whoHelpWell: '',
    availability: '',
    formats: [] as string[],
  });

  function setField(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function toggleFormat(fmt: string) {
    setForm(f => ({
      ...f,
      formats: f.formats.includes(fmt) ? f.formats.filter(x => x !== fmt) : [...f.formats, fmt],
    }));
  }

  async function handleComplete() {
    setLoading(true);
    const title = form.helpSubjects.substring(0, 80) || 'Capacité humaine';
    await supabase.from('capability_profiles').insert({
      user_id: user!.id,
      title,
      summary: form.howHelp,
      success_contexts: form.strongContexts.split('\n').map(s => s.trim()).filter(Boolean),
      relational_style: form.whoHelpWell,
      help_formats: form.formats,
      availability: form.availability || 'Sur demande',
      is_published: true,
    });
    await supabase.from('user_profiles').update({
      onboarding_provider_done: true,
      roles: ['seeker', 'provider'],
    }).eq('id', user!.id);
    await refreshProfile();
    setLoading(false);
    onComplete();
  }

  const formSteps = [
    {
      title: 'Ce que vous aimez aider à résoudre',
      subtitle: 'Pas votre titre, pas votre CV. Ce que vous aimez vraiment débloquer chez les autres.',
      placeholder: 'Ex : décisions difficiles en période de transition, organisation personnelle, problèmes techniques complexes...',
      field: 'helpSubjects',
      rows: 4,
    },
    {
      title: 'Comment vous aidez le plus souvent',
      subtitle: 'Votre manière d\'aider — pas votre méthode, votre style naturel.',
      placeholder: 'Ex : j\'écoute vraiment, je pose les questions que les autres n\'osent pas, je propose des perspectives inattendues...',
      field: 'howHelp',
      rows: 4,
    },
    {
      title: 'Situations où vous apportez le plus de valeur',
      subtitle: 'Vos contextes de réussite réels. Un par ligne.',
      placeholder: 'Reconversion professionnelle\nDémarrage d\'activité\nGestion de conflit d\'équipe\nPrise de décision sous pression',
      field: 'strongContexts',
      rows: 5,
    },
    {
      title: 'Avec quel type de personnes aidez-vous le mieux ?',
      subtitle: 'Pas de jugement — c\'est pour mieux orienter les situations pertinentes vers vous.',
      placeholder: 'Ex : personnes en transition de vie, entrepreneurs qui démarrent, professionnels aguerris qui doutent...',
      field: 'whoHelpWell',
      rows: 3,
    },
  ];

  const totalSteps = formSteps.length + 2;

  if (step < formSteps.length) {
    const current = formSteps[step];
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
        <div className="max-w-lg w-full">
          <div className="flex items-center justify-between mb-10">
            <div className="flex gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className={`h-0.5 rounded-full transition-all ${i < step ? 'bg-amber-400 w-6' : i === step ? 'bg-amber-400 w-10' : 'bg-white/10 w-4'}`} />
              ))}
            </div>
            <button onClick={onSkip} className="text-sm text-stone-500 hover:text-stone-300 transition-colors">Passer</button>
          </div>

          <div className="mb-8">
            <p className="text-xs text-stone-500 uppercase tracking-widest font-medium mb-3">{step + 1} / {totalSteps}</p>
            <h2 className="text-2xl font-semibold text-white mb-2">{current.title}</h2>
            <p className="text-sm text-stone-500">{current.subtitle}</p>
          </div>

          <div className="bg-white/3 border border-white/8 rounded-2xl p-5 mb-6">
            <textarea
              value={form[current.field as keyof typeof form] as string}
              onChange={e => setField(current.field, e.target.value)}
              placeholder={current.placeholder}
              rows={current.rows}
              className="w-full bg-transparent text-white placeholder-stone-600 text-base resize-none focus:outline-none leading-relaxed"
            />
          </div>

          <div className="flex gap-3">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="p-3.5 rounded-xl border border-white/10 text-stone-400 hover:text-white hover:border-white/20 transition-all">
                <ArrowLeft size={16} />
              </button>
            )}
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Continuer <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === formSteps.length) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
        <div className="max-w-lg w-full">
          <div className="flex items-center justify-between mb-10">
            <div className="flex gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className={`h-0.5 rounded-full transition-all ${i < step ? 'bg-amber-400 w-6' : i === step ? 'bg-amber-400 w-10' : 'bg-white/10 w-4'}`} />
              ))}
            </div>
          </div>

          <div className="mb-8">
            <p className="text-xs text-stone-500 uppercase tracking-widest font-medium mb-3">{step + 1} / {totalSteps}</p>
            <h2 className="text-2xl font-semibold text-white mb-2">Comment aimez-vous aider ?</h2>
            <p className="text-sm text-stone-500">Sélectionnez les formats qui vous correspondent naturellement.</p>
          </div>

          <div className="flex flex-wrap gap-2 mb-8">
            {FORMATS.map(fmt => (
              <button
                key={fmt}
                onClick={() => toggleFormat(fmt)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${form.formats.includes(fmt) ? 'bg-amber-500 text-stone-950 border-amber-500' : 'bg-white/3 text-stone-400 border-white/10 hover:border-white/20 hover:text-white'}`}
              >
                {fmt}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(s => s - 1)} className="p-3.5 rounded-xl border border-white/10 text-stone-400 hover:text-white transition-all">
              <ArrowLeft size={16} />
            </button>
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Continuer <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <div className="flex items-center justify-between mb-10">
          <div className="flex gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`h-0.5 rounded-full transition-all ${i < step ? 'bg-amber-400 w-6' : i === step ? 'bg-amber-400 w-10' : 'bg-white/10 w-4'}`} />
            ))}
          </div>
        </div>

        <div className="mb-8">
          <p className="text-xs text-stone-500 uppercase tracking-widest font-medium mb-3">{step + 1} / {totalSteps}</p>
          <h2 className="text-2xl font-semibold text-white mb-2">Quelle est votre disponibilité ?</h2>
          <p className="text-sm text-stone-500">Cela aide le système à orienter les situations urgentes vers les bonnes personnes.</p>
        </div>

        <div className="space-y-2 mb-8">
          {AVAILABILITY.map(av => (
            <button
              key={av}
              onClick={() => setField('availability', av)}
              className={`w-full px-5 py-4 rounded-xl text-left text-sm font-medium transition-all border flex items-center justify-between ${form.availability === av ? 'bg-amber-500 text-stone-950 border-amber-500' : 'bg-white/3 text-stone-400 border-white/10 hover:border-white/20 hover:text-white'}`}
            >
              {av}
              {form.availability === av && <CheckCircle2 size={15} />}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => setStep(s => s - 1)} className="p-3.5 rounded-xl border border-white/10 text-stone-400 hover:text-white transition-all">
            <ArrowLeft size={16} />
          </button>
          <button
            onClick={handleComplete}
            disabled={loading}
            className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-stone-950/30 border-t-stone-950 rounded-full animate-spin" />
              : <><Sparkles size={15} /> Créer mon profil capacité</>}
          </button>
        </div>
      </div>
    </div>
  );
}
