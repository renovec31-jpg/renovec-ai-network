import { useState, useEffect, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { supabase, Need } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useSituation } from '../contexts/SituationContext';
import ClarificationFlow from '../components/ClarificationFlow';
import SituationLifeline, { buildLifeline } from '../components/SituationLifeline';
import GuestMatchFlow from '../components/GuestMatchFlow';
import VoiceInput from '../components/VoiceInput';

const STATUS_HUMAN: Record<string, { phrase: string; sub: string }> = {
  draft:      { phrase: 'Quelque chose a été posé',        sub: 'En attente de clarification.' },
  submitted:  { phrase: 'Situation reçue · En analyse',   sub: 'Le réseau cherche les bons appuis.' },
  clarifying: { phrase: 'Situation en cours de précision', sub: 'Quelque chose devient plus clair.' },
  matched:    { phrase: 'Présences identifiées',           sub: 'Des appuis humains s\'organisent.' },
  closed:     { phrase: 'Quelque chose s\'est déplacé',    sub: 'La situation a trouvé sa forme.' },
};

export default function DemanderPage() {
  const { user } = useAuth();
  const { setLocalPhase, refreshPhase } = useSituation();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [clarifyingNeedId, setClarifyingNeedId] = useState<string | null>(null);
  const [view, setView] = useState<'express' | 'match' | 'situations'>('express');
  const [selectedNeed, setSelectedNeed] = useState<Need | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const savedNeed = sessionStorage.getItem('renovec_guest_need');
    if (savedNeed) {
      sessionStorage.removeItem('renovec_guest_need');
      sessionStorage.removeItem('renovec_guest_email');
      sessionStorage.removeItem('renovec_guest_target_profile');
      setView('match');
    }
  }, []);

  useEffect(() => { loadNeeds(); }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
    if (text.length > 10) setLocalPhase('expressed');
  }, [text]);

  async function loadNeeds() {
    const { data } = await supabase
      .from('needs').select('*').eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setNeeds(data || []);
  }

  async function handleSubmit() {
    if (!text.trim() || !user?.id) return;
    setLoading(true);
    setLocalPhase('reading');
    try {
      const { data, error } = await supabase.from('needs').insert({
        user_id: user.id,
        raw_text: text.trim(),
        status: 'submitted',
      }).select().single();
      if (error) throw error;
      if (data) {
        setText('');
        setNeeds(prev => [data, ...prev]);
        setClarifyingNeedId(data.id);
        setLocalPhase('clarifying');
      }
    } catch {
      setLocalPhase('idle');
    } finally {
      setLoading(false);
    }
  }

  if (clarifyingNeedId) {
    return (
      <ClarificationFlow
        needId={clarifyingNeedId}
        onComplete={() => { setClarifyingNeedId(null); loadNeeds(); refreshPhase(); setView('situations'); }}
        onClose={() => { setClarifyingNeedId(null); loadNeeds(); refreshPhase(); }}
      />
    );
  }

  if (selectedNeed) {
    const st = STATUS_HUMAN[selectedNeed.status] || STATUS_HUMAN.draft;
    const lifeline = buildLifeline(selectedNeed.status, selectedNeed.raw_text);
    return (
      <div className="animate-slide-in">
        <button
          onClick={() => setSelectedNeed(null)}
          className="flex items-center gap-2 text-white/30 hover:text-white/70 text-sm mb-8 transition-all group"
        >
          <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
          Retour aux situations
        </button>

        <div className="mb-8">
          <p className="text-[11px] tracking-widest uppercase text-white/25 font-medium mb-3">
            Ce qui a été exprimé
          </p>
          <p className="text-white/80 text-base leading-relaxed">{selectedNeed.raw_text}</p>
        </div>

        <div className="flex items-center gap-2.5 py-4 border-y border-white/8 mb-8">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
            selectedNeed.status === 'matched' ? 'bg-emerald-400' :
            selectedNeed.status === 'clarifying' ? 'bg-amber-400' :
            selectedNeed.status === 'submitted' ? 'bg-blue-400' : 'bg-white/20'
          }`} />
          <div>
            <p className="text-sm font-medium text-white/90">{st.phrase}</p>
            <p className="text-xs text-white/35 mt-0.5">{st.sub}</p>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-[11px] tracking-widest uppercase text-white/25 font-medium mb-5">
            Protocole de coordination
          </p>
          <SituationLifeline events={lifeline} />
        </div>

        <div className="pt-6 border-t border-white/8">
          <p className="text-[11px] tracking-widest uppercase text-white/25 font-medium mb-4">
            Ce qui reste ouvert
          </p>
          <div className="space-y-2">
            {['La clarification peut encore s\'approfondir.', 'De nouvelles présences peuvent émerger.', 'L\'échange peut commencer à tout moment.'].map((m, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-1 h-1 rounded-full bg-white/15 mt-2 flex-shrink-0" />
                <p className="text-xs text-white/35 leading-relaxed">{m}</p>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => setClarifyingNeedId(selectedNeed.id)}
          className="mt-8 w-full py-3.5 bg-white/10 hover:bg-white/15 text-white font-medium transition-all flex items-center justify-center gap-2 group text-sm rounded-xl border border-white/10"
        >
          Continuer à clarifier cette situation
          <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white leading-snug mb-1.5">
          {view === 'express' ? 'Votre situation.' : 'Vos situations dans le réseau.'}
        </h1>
        <p className="text-white/40 text-sm leading-relaxed">
          {view === 'express'
            ? 'Exprimez-la. Le réseau s\'organise autour d\'elle.'
            : 'Chaque situation est un fil vivant dans le réseau.'}
        </p>
      </div>

      {/* Tab toggle */}
      <div className="flex items-center gap-5 mb-8">
        {[
          { id: 'express' as const, label: 'Exprimer' },
          { id: 'match' as const, label: 'Matching instantané', badge: 'IA' },
          { id: 'situations' as const, label: 'Mes situations', count: needs.length > 0 ? needs.length : undefined },
        ].map(({ id, label, badge, count }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`text-sm font-medium pb-0.5 transition-all flex items-center gap-1.5 ${view === id ? 'text-white border-b border-white' : 'text-white/30 hover:text-white/60'}`}
          >
            {label}
            {badge && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold transition-all ${view === id ? 'bg-amber-400 text-stone-950' : 'bg-amber-400/15 text-amber-400 border border-amber-400/20'}`}>{badge}</span>
            )}
            {count !== undefined && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 font-semibold transition-all ${view === id ? 'bg-white/15 text-white' : 'bg-white/8 text-white/40'}`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Express view */}
      {view === 'express' && (
        <div className="animate-fade-in">
          <div className="relative mb-4">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Décrivez ce que vous vivez, ou maintenez le micro..."
              className="w-full min-h-[140px] text-white placeholder-white/20 resize-none focus:outline-none leading-relaxed bg-white/5 border border-white/8 rounded-xl p-4 pr-14 text-base focus:border-white/15 transition-colors"
              style={{ lineHeight: 1.7 }}
            />
            <div className="absolute bottom-3 right-3">
              <VoiceInput
                onTranscript={t => setText(prev => prev ? `${prev} ${t}` : t)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex justify-end mb-10">
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || loading}
              className="px-6 py-2.5 bg-white text-stone-950 text-sm font-medium transition-all disabled:opacity-30 rounded-xl flex items-center gap-2 hover:bg-white/90"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-stone-900/30 border-t-stone-900 rounded-full animate-spin" />
                : <>Soumettre au réseau <ArrowRight size={13} /></>}
            </button>
          </div>

          {needs.length > 0 && needs[0].status !== 'closed' && (
            <div className="mb-10 border-l-2 border-white/20 pl-4 py-1">
              <p className="text-[11px] tracking-widest uppercase text-white/25 font-medium mb-3">
                État de votre situation
              </p>
              <div className="border-t border-white/8 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/30">
                    Reçue {(() => {
                      const diff = Math.floor((Date.now() - new Date(needs[0].created_at).getTime()) / 60000);
                      if (diff < 1) return 'à l\'instant';
                      if (diff < 60) return `il y a ${diff} min`;
                      return `il y a ${Math.floor(diff / 60)}h`;
                    })()}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold text-white/80">Active</span>
                  </div>
                </div>
                <p className="text-xs text-white/30 mb-1.5">Situation soumise au coordinateur IA</p>
                <p className="text-xs text-white/40">
                  Statut : <span className="font-medium text-white/70">
                    {needs[0].status === 'clarifying' ? 'En clarification' :
                     needs[0].status === 'matched' ? 'Présences identifiées' :
                     needs[0].status === 'submitted' ? 'En analyse' : 'Reçue'}
                  </span>
                </p>
              </div>
            </div>
          )}

          <div>
            <p className="text-[11px] tracking-widest uppercase text-white/25 font-medium mb-5">
              Protocole de coordination
            </p>
            <SituationLifeline events={buildLifeline('draft')} />
          </div>
        </div>
      )}

      {view === 'match' && (
        <div className="animate-fade-in demander-match-wrap">
          <GuestMatchFlow isGuest={false} onEnter={() => setView('express')} />
        </div>
      )}

      {view === 'situations' && (
        <div className="animate-fade-in">
          <button
            onClick={() => setView('express')}
            className="w-full py-4 border border-dashed border-white/10 text-white/30 hover:border-white/20 hover:text-white/60 transition-all text-sm flex items-center justify-center gap-2 mb-6 rounded-xl"
          >
            Exprimer une nouvelle situation
          </button>

          {needs.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-sm text-white/30">Aucune situation encore exprimée.</p>
              <p className="text-xs text-white/20 mt-1.5">Quand vous serez prêt, le réseau sera là.</p>
            </div>
          ) : (
            <div>
              {needs.map(need => {
                const st = STATUS_HUMAN[need.status] || STATUS_HUMAN.draft;
                const isActive = ['clarifying', 'matched'].includes(need.status);
                return (
                  <div
                    key={need.id}
                    onClick={() => setSelectedNeed(need)}
                    className="group py-5 border-b border-white/8 last:border-0 cursor-pointer transition-all hover:pl-1"
                  >
                    <p className="text-white/70 text-sm leading-relaxed mb-3 line-clamp-2">{need.raw_text}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          need.status === 'matched' ? 'bg-emerald-400' :
                          need.status === 'clarifying' ? 'bg-amber-400' :
                          need.status === 'submitted' ? 'bg-blue-400' : 'bg-white/20'
                        }`} />
                        <span className="text-xs text-white/35">{st.phrase}</span>
                      </div>
                      <span className="text-xs text-white/20 group-hover:text-white/50 transition-colors">→</span>
                    </div>
                    {isActive && (
                      <div className="mt-3 overflow-hidden max-h-0 group-hover:max-h-40 transition-all duration-500 ease-in-out">
                        <SituationLifeline events={buildLifeline(need.status, need.raw_text)} compact />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
