import { useState, useEffect, useRef } from 'react';
import { ArrowRight, X, AlertTriangle } from 'lucide-react';
import { supabase, Need } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateCoordinatorReply, CoordinatorReply, ConversationTurn } from '../services/ai/renovecCoordinator';
import { processWithCoordinator } from '../services/coordinator/CoordinatorCore';
import VoiceInput from './VoiceInput';

type Props = {
  needId: string;
  onComplete: () => void;
  onClose: () => void;
};

type Turn = {
  role: 'coordinator' | 'user';
  content: string;
  id: string;
};

type CoordinatorResponse = CoordinatorReply;

// Thinking phrases — shown while coordinator is "reading"
const THINKING = [
  '',           // instant first tick — no phrase needed
  'Un instant…',
  'On lit ce que vous avez écrit…',
  'On cherche la meilleure question…',
];

export default function ClarificationFlow({ needId, onComplete, onClose }: Props) {
  const { user } = useAuth();
  const [need, setNeed] = useState<Need | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [thinkingPhrase, setThinkingPhrase] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finalData, setFinalData] = useState<CoordinatorResponse | null>(null);
  const [isDone, setIsDone] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const thinkingRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => { init(); }, [needId]);

  // Scroll to bottom whenever turns change
  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 80);
  }, [turns, thinking]);

  // Auto-focus input when not thinking
  useEffect(() => {
    if (!thinking && !isDone && !loading) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [thinking, isDone, loading]);

  async function init() {
    setLoading(true);
    const { data: needData } = await supabase.from('needs').select('*').eq('id', needId).maybeSingle();
    setNeed(needData);

    // Load existing turns for this need
    const { data: existingTurns } = await supabase
      .from('clarification_turns')
      .select('*')
      .eq('need_id', needId)
      .order('turn_index', { ascending: true });

    if (existingTurns && existingTurns.length > 0) {
      const mapped: Turn[] = existingTurns.map(t => ({
        id: t.id,
        role: t.role as 'coordinator' | 'user',
        content: t.content,
      }));
      setTurns(mapped);

      // Check if conversation was already finalized
      const { data: clarif } = await supabase
        .from('clarifications')
        .select('*')
        .eq('need_id', needId)
        .maybeSingle();

      if (clarif?.status === 'completed') {
        setFinalData({
          intent: 'clarification_answer',
          reply: '',
          message: '',
          is_final: true,
          canProgressSituation: true,
          shouldAskClarification: false,
          nextQuestion: null,
          situationConfidence: 0.8,
          situationUpdate: { summary: clarif.reformulated_objective || '', category: 'inconnu', urgency: clarif.urgency_level || 'normal', missingInfo: [] },
          urgency_level: clarif.urgency_level,
          reformulated_objective: clarif.reformulated_objective,
          context_description: clarif.context_description,
          recommended_format: clarif.recommended_format,
          vigilance_points: clarif.vigilance_points || [],
        });
        setIsDone(true);
      }
    } else {
      // Fresh start — coordinator opens first
      setLoading(false);
      await sendCoordinatorReply(needData?.raw_text || '', []);
      return;
    }
    setLoading(false);
  }

  async function sendCoordinatorReply(rawText: string, currentTurns: Turn[]) {
    setThinking(true);
    setThinkingPhrase(0);

    let phraseIdx = 0;
    thinkingRef.current = setInterval(() => {
      phraseIdx = Math.min(phraseIdx + 1, THINKING.length - 1);
      setThinkingPhrase(phraseIdx);
    }, 1200);

    // Natural reading delay
    await new Promise(r => setTimeout(r, 700 + Math.random() * 500));

    const history: ConversationTurn[] = currentTurns.map(t => ({ role: t.role, content: t.content }));

    // Appel via CoordinatorCore si user disponible, sinon fallback legacy
    let data: CoordinatorReply;
    if (user) {
      try {
        const { legacyReply } = await processWithCoordinator({
          userId: user.id,
          needId,
          rawText,
          turns: history,
        });
        data = { ...legacyReply, message: legacyReply.reply };
      } catch {
        // Fallback sur l'appel direct si le Core échoue
        data = await generateCoordinatorReply({
          conversationHistory: history,
          currentMessage: currentTurns[currentTurns.length - 1]?.content ?? rawText,
          situationState: { rawText },
        });
      }
    } else {
      data = await generateCoordinatorReply({
        conversationHistory: history,
        currentMessage: currentTurns[currentTurns.length - 1]?.content ?? rawText,
        situationState: { rawText },
      });
    }

    clearInterval(thinkingRef.current);
    setThinking(false);

    const newTurn: Turn = {
      id: crypto.randomUUID(),
      role: 'coordinator',
      content: data.message,
    };

    const nextTurns = [...currentTurns, newTurn];
    setTurns(nextTurns);

    await supabase.from('clarification_turns').insert({
      need_id: needId,
      user_id: user!.id,
      role: 'coordinator',
      content: data.message,
      turn_index: nextTurns.length - 1,
    });

    if (data.is_final) {
      await finalize(data);
    }
  }

  async function handleUserSend() {
    const text = input.trim();
    if (!text || thinking || isDone) return;
    setInput('');

    const userTurn: Turn = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    };

    const nextTurns = [...turns, userTurn];
    setTurns(nextTurns);

    // Persist user turn
    await supabase.from('clarification_turns').insert({
      need_id: needId,
      user_id: user!.id,
      role: 'user',
      content: text,
      turn_index: nextTurns.length - 1,
    });

    // Send to coordinator
    await sendCoordinatorReply(need?.raw_text || '', nextTurns);
  }

  async function finalize(data: CoordinatorResponse) {
    // Save as a completed clarification record
    const existing = await supabase
      .from('clarifications')
      .select('id')
      .eq('need_id', needId)
      .maybeSingle();

    const payload = {
      need_id: needId,
      user_id: user!.id,
      summary: data.reformulated_objective || '',
      reformulated_objective: data.reformulated_objective || '',
      context_description: data.context_description || '',
      urgency_level: data.urgency_level || 'normal',
      missing_info: [],
      vigilance_points: data.vigilance_points || [],
      recommended_format: data.recommended_format || '',
      suggested_questions: [],
      answers: {},
      status: 'completed',
    };

    if (existing.data?.id) {
      await supabase.from('clarifications').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', existing.data.id);
    } else {
      await supabase.from('clarifications').insert(payload);
    }

    await supabase.from('needs').update({ status: 'clarifying' }).eq('id', needId);

    setFinalData(data);
    setIsDone(true);
  }

  /* ── Loading state ──────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-8 animate-fade-in">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-amber-200/30 animate-breathe" />
          <div className="absolute inset-3 rounded-full border border-amber-300/20 animate-breathe" style={{ animationDelay: '0.7s' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-pulse-dot" />
        </div>
        <p className="text-stone-400 text-sm">On prend connaissance de votre situation…</p>
      </div>
    );
  }

  /* ── Final result view ──────────────────────────────────────────── */
  if (isDone && finalData) {
    const isHighUrgency = ['high', 'urgent'].includes(finalData.urgency_level || '');
    const confidence = (finalData as CoordinatorResponse).situationConfidence ?? 0;
    const situationUnderstood = confidence >= 0.6;

    return (
      <div className="animate-fade-up">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse-dot ${situationUnderstood ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <p className="text-sm text-stone-600">
              {situationUnderstood ? 'La situation se précise.' : 'On commence à comprendre.'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-stone-300 hover:text-stone-600 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* The conversation — compact memory */}
        <div className="mb-8">
          <p className="text-xs text-stone-300 uppercase tracking-widest font-medium mb-4">L'échange</p>
          <div className="space-y-3">
            {turns.filter(t => t.content).map((t) => (
              <div key={t.id} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p className={`text-sm leading-relaxed max-w-[85%] ${
                  t.role === 'user' ? 'text-stone-600' : 'text-stone-500 italic'
                }`}>
                  {t.role === 'coordinator' && <span className="text-xs text-stone-300 not-italic mr-1.5">coordinateur</span>}
                  {t.content}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* "Ce qui devient clair" only when there is real understanding */}
        {situationUnderstood && finalData.reformulated_objective ? (
          <div className="mb-7">
            <p className="text-xs text-stone-300 uppercase tracking-widest font-medium mb-3">Ce qui devient clair</p>
            <p className="text-stone-900 text-base font-medium leading-relaxed mb-2">
              {finalData.reformulated_objective}
            </p>
            {finalData.context_description && (
              <p className="text-stone-500 text-sm leading-relaxed">{finalData.context_description}</p>
            )}
          </div>
        ) : (
          <div className="mb-7 py-4 border-y border-stone-100">
            <p className="text-stone-500 text-sm leading-relaxed">
              Pour l'instant, on commence juste à comprendre. Le réseau sera activé quand la situation sera plus claire.
            </p>
          </div>
        )}

        {isHighUrgency && (
          <div className="mb-6 flex items-center gap-2.5 py-3 border-y border-amber-100">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-dot flex-shrink-0" />
            <p className="text-xs text-amber-600 font-medium">Urgence prise en compte — réponse prioritaire.</p>
          </div>
        )}

        {/* Journey — gated on confidence */}
        <div className="mb-8">
          <p className="text-xs text-stone-300 uppercase tracking-widest font-medium mb-5">Ce qui s'est mis en mouvement</p>
          <div className="space-y-0 lifeline-track">
            {[
              {
                label: 'Situation exprimée',
                sub: need?.raw_text && need.raw_text.length > 80 ? need.raw_text.substring(0, 80) + '…' : need?.raw_text,
                done: true,
              },
              {
                label: situationUnderstood ? 'Ce qui devient clair' : 'Situation en cours de compréhension',
                sub: situationUnderstood ? finalData.reformulated_objective : 'On a besoin de plus de contexte pour orienter correctement.',
                done: situationUnderstood,
                active: !situationUnderstood,
              },
              {
                label: 'Des appuis humains émergent',
                sub: situationUnderstood ? "Des présences pertinentes s'organisent." : 'Disponible une fois la situation clarifiée.',
                active: situationUnderstood,
                future: !situationUnderstood,
              },
              {
                label: 'Un échange prend forme',
                sub: 'La situation avance dans la relation.',
                future: true,
              },
            ].map(({ label, sub, done, active, future }, i) => (
              <div key={i} className="flex gap-4 pb-5 last:pb-0 relative z-10">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border transition-all ${done ? 'bg-emerald-50 border-emerald-200' : active ? 'bg-amber-50 border-amber-300' : 'bg-white border-stone-100'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-emerald-400' : active ? 'bg-amber-400 animate-pulse-dot' : 'bg-stone-200'}`} />
                </div>
                <div className={`flex-1 ${future ? 'opacity-35' : ''}`}>
                  <p className={`text-sm font-medium ${done ? 'text-stone-800' : active ? 'text-amber-700' : 'text-stone-400'}`}>{label}</p>
                  {sub && <p className={`text-xs mt-0.5 leading-relaxed ${done ? 'text-stone-400' : active ? 'text-amber-600/70' : 'text-stone-300'}`}>{sub}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {finalData.vigilance_points && finalData.vigilance_points.length > 0 && (
          <div className="mb-7 flex items-start gap-3 py-4 border-y border-amber-100/60">
            <AlertTriangle size={11} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              {finalData.vigilance_points.map((p, i) => (
                <p key={i} className="text-sm text-stone-600">{p}</p>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onComplete}
          className="w-full py-4 bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-2xl transition-all flex items-center justify-center gap-2 group text-sm"
        >
          {situationUnderstood ? 'Voir les présences humaines autour de cette situation' : 'Continuer quand même'}
          <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    );
  }

  /* ── Live conversation ──────────────────────────────────────────── */
  return (
    <div className="flex flex-col" style={{ minHeight: '78vh' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-dot" />
          <p className="text-xs text-stone-400 font-medium">Coordinateur RENOVEC</p>
        </div>
        <button onClick={onClose} className="p-1.5 text-stone-300 hover:text-stone-600 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* The original expression — context anchor */}
      <div className="mb-5 pb-5 border-b border-stone-100 flex-shrink-0">
        <p className="text-xs text-stone-500 uppercase tracking-widest font-medium mb-2">Ce que vous avez exprimé</p>
        <p className="text-stone-500 text-sm leading-relaxed">{need?.raw_text}</p>
      </div>

      {/* Legal disclaimer */}
      <div className="mb-4 flex-shrink-0 px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-100">
        <p className="text-xs text-stone-400 leading-relaxed">
          Les réponses du coordinateur sont indicatives. Elles ne constituent pas un diagnostic médical, juridique ou financier.
        </p>
      </div>

      {/* Conversation thread */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-5 pb-4">
          {turns.map((t, idx) => (
            <ConversationBubble key={t.id} turn={t} isNew={idx === turns.length - 1} />
          ))}

          {/* Coordinator thinking */}
          {thinking && (
            <div className="animate-fade-in flex items-end gap-2">
              <div className="flex items-center gap-1.5 py-3">
                <div className="w-1 h-1 rounded-full bg-stone-300 animate-pulse-dot" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 rounded-full bg-stone-300 animate-pulse-dot" style={{ animationDelay: '200ms' }} />
                <div className="w-1 h-1 rounded-full bg-stone-300 animate-pulse-dot" style={{ animationDelay: '400ms' }} />
              </div>
              {THINKING[thinkingPhrase] && (
                <p className="text-xs text-stone-300 italic animate-fade-in">{THINKING[thinkingPhrase]}</p>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="flex-shrink-0 pt-4 border-t border-stone-100">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleUserSend();
              }
            }}
            disabled={thinking || isDone}
            placeholder="Répondez ici ou maintenez le micro…"
            rows={1}
            className="w-full pr-24 py-3.5 text-stone-900 placeholder-stone-300 text-sm resize-none focus:outline-none leading-relaxed bg-transparent border-b border-stone-200 focus:border-stone-500 transition-colors disabled:opacity-40"
          />
          <div className="absolute right-0 bottom-2 flex items-center gap-1">
            <VoiceInput
              onTranscript={text => {
                setInput(prev => prev ? `${prev} ${text}` : text);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              disabled={thinking || isDone}
            />
            <button
              onClick={handleUserSend}
              disabled={!input.trim() || thinking || isDone}
              className="p-2 text-stone-400 hover:text-stone-900 disabled:opacity-20 transition-colors"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
        <p className="text-xs text-stone-200 mt-1.5">Entrée pour envoyer · Maintenez le micro pour dicter</p>
      </div>
    </div>
  );
}

/* ── Conversation bubble ─────────────────────────────────────────── */
function ConversationBubble({ turn, isNew }: { turn: Turn; isNew: boolean }) {
  const isCoordinator = turn.role === 'coordinator';

  return (
    <div
      className={`animate-fade-up flex ${isCoordinator ? 'justify-start' : 'justify-end'}`}
      style={isNew ? { animationDuration: '0.4s' } : { animation: 'none', opacity: 1 }}
    >
      <div className={`max-w-[85%] ${isCoordinator ? '' : ''}`}>
        {isCoordinator && (
          <p className="text-xs text-stone-300 mb-1.5 ml-0.5">coordinateur</p>
        )}
        <p className={`text-sm leading-relaxed ${
          isCoordinator
            ? 'text-stone-700'
            : 'text-stone-600 text-right'
        }`}>
          {turn.content}
        </p>
      </div>
    </div>
  );
}
