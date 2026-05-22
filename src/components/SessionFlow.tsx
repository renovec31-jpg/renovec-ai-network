import { useState } from 'react';
import { CheckCircle2, Calendar, ArrowRight, X, Star } from 'lucide-react';
import { supabase, Conversation } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Props = {
  conversation: Conversation;
  onClose: () => void;
  onComplete: () => void;
};

const SESSION_TYPES = [
  { id: 'micro_aide', label: 'Micro-aide', desc: 'Réponse rapide à une question précise', duration: '15–30 min' },
  { id: 'diagnostic', label: 'Diagnostic', desc: 'Analyse et identification de la cause', duration: '45–60 min' },
  { id: 'mission_courte', label: 'Mission courte', desc: 'Travail concret sur un livrable défini', duration: '2–5h' },
  { id: 'accompagnement', label: 'Accompagnement', desc: 'Suivi sur plusieurs échanges', duration: 'Sur mesure' },
];

export default function SessionFlow({ conversation, onClose, onComplete }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<'type' | 'details' | 'confirm' | 'done'>('type');
  const [sessionType, setSessionType] = useState('');
  const [objective, setObjective] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  const [saving, setSaving] = useState(false);

  const isSeeker = conversation.seeker_id === user?.id;

  async function createSession() {
    setSaving(true);
    const { data } = await supabase.from('sessions').insert({
      conversation_id: conversation.id,
      need_id: conversation.need_id,
      seeker_id: conversation.seeker_id,
      provider_id: conversation.provider_id,
      session_type: sessionType,
      objective,
      deliverables,
      amount_cents: amountCents,
      currency: 'EUR',
      status: 'proposed',
    }).select().single();

    if (data && amountCents > 0) {
      await supabase.from('payments').insert({
        session_id: data.id,
        payer_id: conversation.seeker_id,
        receiver_id: conversation.provider_id,
        amount_cents: amountCents,
        currency: 'EUR',
        status: 'pending',
      });
    }
    setSaving(false);
    setStep('done');
  }

  const selectedType = SESSION_TYPES.find(t => t.id === sessionType);

  if (step === 'done') {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle2 size={28} className="text-emerald-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-stone-900 mb-1">Session proposée</h3>
          <p className="text-sm text-stone-500">La personne sera notifiée et pourra accepter ou ajuster la proposition.</p>
        </div>
        <button onClick={onComplete} className="w-full py-3.5 bg-stone-900 text-white font-medium rounded-xl hover:bg-stone-800 transition-all">
          Retour à la discussion
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-900">
          {step === 'type' ? 'Type de session' : step === 'details' ? 'Détails de la session' : 'Confirmer la session'}
        </h2>
        <button onClick={onClose} className="p-2 rounded-xl text-stone-400 hover:bg-stone-100 transition-all">
          <X size={16} />
        </button>
      </div>

      {/* Progress */}
      <div className="flex gap-1.5">
        {['type', 'details', 'confirm'].map((s, i) => (
          <div key={s} className={`h-0.5 flex-1 rounded-full transition-all ${
            step === 'type' && i === 0 ? 'bg-amber-500' :
            step === 'details' && i <= 1 ? 'bg-amber-500' :
            step === 'confirm' ? 'bg-amber-500' : 'bg-stone-200'
          }`} />
        ))}
      </div>

      {step === 'type' && (
        <div className="space-y-2.5">
          <p className="text-sm text-stone-500">Quel type d'aide souhaitez-vous formaliser ?</p>
          {SESSION_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setSessionType(type.id)}
              className={`w-full text-left px-5 py-4 rounded-2xl border transition-all ${sessionType === type.id ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-100 hover:border-stone-200'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-stone-900 text-sm">{type.label}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{type.desc}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs text-stone-400 flex items-center gap-1">
                    <Calendar size={10} /> {type.duration}
                  </span>
                  {sessionType === type.id && <CheckCircle2 size={14} className="text-amber-500 mt-1 ml-auto" />}
                </div>
              </div>
            </button>
          ))}
          <button
            onClick={() => setStep('details')}
            disabled={!sessionType}
            className="w-full py-3.5 bg-stone-900 text-white font-medium rounded-xl hover:bg-stone-800 transition-all disabled:opacity-40 flex items-center justify-center gap-2 mt-2"
          >
            Continuer <ArrowRight size={15} />
          </button>
        </div>
      )}

      {step === 'details' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-700 font-medium">Session · {selectedType?.label} · {selectedType?.duration}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">Objectif de la session</label>
            <textarea
              value={objective}
              onChange={e => setObjective(e.target.value)}
              placeholder="Qu'est-ce qu'une session réussie changerait concrètement ?"
              rows={3}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">Livrables attendus (optionnel)</label>
            <textarea
              value={deliverables}
              onChange={e => setDeliverables(e.target.value)}
              placeholder="Document, plan d'action, réponse écrite, diagnostic..."
              rows={2}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none transition-all"
            />
          </div>
          {isSeeker && (
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">Montant proposé (€, 0 = libre contribution)</label>
              <input
                type="number"
                min={0}
                value={amountCents / 100}
                onChange={e => setAmountCents(Math.round(parseFloat(e.target.value || '0') * 100))}
                placeholder="0"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all"
              />
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep('type')} className="p-3.5 rounded-xl border border-stone-200 text-stone-500 hover:text-stone-900 transition-all">←</button>
            <button
              onClick={() => setStep('confirm')}
              disabled={!objective.trim()}
              className="flex-1 py-3.5 bg-stone-900 text-white font-medium rounded-xl hover:bg-stone-800 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              Vérifier <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-4">
          <div className="bg-white border border-stone-100 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-stone-400 uppercase tracking-widest font-medium">Type</p>
              <p className="text-sm font-medium text-stone-900">{selectedType?.label}</p>
            </div>
            <div className="border-t border-stone-50" />
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-1">Objectif</p>
              <p className="text-sm text-stone-700 leading-relaxed">{objective}</p>
            </div>
            {deliverables && (
              <>
                <div className="border-t border-stone-50" />
                <div>
                  <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-1">Livrables</p>
                  <p className="text-sm text-stone-700">{deliverables}</p>
                </div>
              </>
            )}
            {amountCents > 0 && (
              <>
                <div className="border-t border-stone-50" />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-stone-400 uppercase tracking-widest font-medium">Montant</p>
                  <p className="text-sm font-semibold text-stone-900">{(amountCents / 100).toFixed(2)} €</p>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('details')} className="p-3.5 rounded-xl border border-stone-200 text-stone-500 hover:text-stone-900 transition-all">←</button>
            <button
              onClick={createSession}
              disabled={saving}
              className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving
                ? <span className="w-4 h-4 border-2 border-stone-950/30 border-t-stone-950 rounded-full animate-spin" />
                : <><CheckCircle2 size={15} /> Proposer la session</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
