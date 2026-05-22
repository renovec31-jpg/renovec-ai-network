import { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Props = {
  sessionId: string;
  reviewedId: string;
  reviewedName: string;
  needId?: string;
  onComplete: () => void;
  onClose: () => void;
};

const DIMENSIONS = [
  { key: 'clarity_score', label: 'Clarté', desc: 'A rendu les choses compréhensibles' },
  { key: 'usefulness_score', label: 'Utilité', desc: 'A apporté quelque chose de concret' },
  { key: 'reliability_score', label: 'Fiabilité', desc: 'A tenu ses engagements' },
  { key: 'pedagogy_score', label: 'Pédagogie', desc: 'A su transmettre et expliquer' },
  { key: 'reassurance_score', label: 'Rassurance', desc: 'A mis en confiance, sans simplifier' },
  { key: 'follow_through_score', label: 'Suivi', desc: 'A assuré la continuité et le suivi' },
] as const;

type Scores = {
  clarity_score: number;
  usefulness_score: number;
  reliability_score: number;
  pedagogy_score: number;
  reassurance_score: number;
  follow_through_score: number;
};

export default function TrustReviewForm({ sessionId, reviewedId, reviewedName, needId, onComplete, onClose }: Props) {
  const { user } = useAuth();
  const [scores, setScores] = useState<Scores>({
    clarity_score: 0,
    usefulness_score: 0,
    reliability_score: 0,
    pedagogy_score: 0,
    reassurance_score: 0,
    follow_through_score: 0,
  });
  const [qualitativeSummary, setQualitativeSummary] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  function setScore(key: keyof Scores, value: number) {
    setScores(s => ({ ...s, [key]: value }));
  }

  async function handleSubmit() {
    setSaving(true);
    await supabase.from('trust_reviews').insert({
      session_id: sessionId,
      need_id: needId || null,
      reviewer_id: user!.id,
      reviewed_id: reviewedId,
      ...scores,
      qualitative_summary: qualitativeSummary,
      is_public: isPublic,
    });

    // Generate contribution event for reviewed person
    const avgScore = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 6);
    const points = Math.max(1, Math.round(avgScore / 10));
    await supabase.from('contribution_events').insert({
      user_id: reviewedId,
      event_type: 'trust_review_received',
      description: qualitativeSummary || 'Retour qualitatif reçu après session',
      context: 'Échange contextuel',
      points,
      is_public: isPublic,
    });

    setSaving(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="text-center py-10 space-y-4">
        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle2 size={24} className="text-emerald-500" />
        </div>
        <div>
          <h3 className="font-semibold text-stone-900 mb-1">Retour enregistré</h3>
          <p className="text-sm text-stone-500">Votre lecture de la contribution de {reviewedName} a été enregistrée.</p>
        </div>
        <button onClick={onComplete} className="w-full py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-all">
          Fermer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-stone-900">Retour sur la session</h2>
        <button onClick={onClose} className="p-2 rounded-xl text-stone-400 hover:bg-stone-100 transition-all">
          <X size={16} />
        </button>
      </div>
      <p className="text-sm text-stone-500">
        Votre lecture de la contribution de <strong className="text-stone-700">{reviewedName}</strong> — sobre, honnête, qualitative.
      </p>

      <div className="space-y-4">
        {DIMENSIONS.map(({ key, label, desc }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-stone-900">{label}</p>
                <p className="text-xs text-stone-400">{desc}</p>
              </div>
              <span className="text-sm font-semibold text-stone-600 w-8 text-right">{scores[key]}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={scores[key]}
              onChange={e => setScore(key, parseInt(e.target.value))}
              className="w-full accent-amber-500"
            />
            <div className="flex justify-between text-xs text-stone-300 mt-0.5">
              <span>Peu présent</span>
              <span>Très présent</span>
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">
          Lecture qualitative (optionnel)
        </label>
        <textarea
          value={qualitativeSummary}
          onChange={e => setQualitativeSummary(e.target.value)}
          placeholder="En quelques mots : ce que cette personne apporte vraiment, comment elle aide..."
          rows={3}
          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none transition-all"
        />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <div
          onClick={() => setIsPublic(!isPublic)}
          className={`w-10 h-6 rounded-full transition-all relative cursor-pointer ${isPublic ? 'bg-emerald-500' : 'bg-stone-200'}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow-sm ${isPublic ? 'left-5' : 'left-1'}`} />
        </div>
        <span className="text-sm text-stone-700">Rendre ce retour visible dans le profil de la personne</span>
      </label>

      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving
          ? <span className="w-4 h-4 border-2 border-stone-950/30 border-t-stone-950 rounded-full animate-spin" />
          : <><CheckCircle2 size={15} /> Enregistrer mon retour</>}
      </button>
    </div>
  );
}
