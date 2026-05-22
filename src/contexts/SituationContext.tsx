// ─── SituationContext ─────────────────────────────────────────────────────────
// La situation n'est plus réactive à la DB — elle est pilotée par le coordinator.
// Le coordinator émet des signaux. Le contexte les consomme et adapte l'expérience.

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase, Need } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { consumeSignals } from '../services/coordinator/OrchestrationLayer';
import type { CoordinatorSignal, SituationUrgency } from '../services/coordinator/types';

export type SituationPhase =
  | 'idle'
  | 'expressed'
  | 'reading'
  | 'clarifying'
  | 'emerging'
  | 'exchanging'
  | 'resolved';

export type PhaseTheme = {
  phase: SituationPhase;
  bgClass: string;
  accentClass: string;
  dotClass: string;
  glow: string;
  navHint: string;
  bodyTone: string;
  ambientOpacity: number;
};

export const PHASE_THEMES: Record<SituationPhase, PhaseTheme> = {
  idle: {
    phase: 'idle', bgClass: 'bg-stone-50', accentClass: 'text-stone-400',
    dotClass: 'bg-stone-200', glow: '', navHint: '', bodyTone: 'text-stone-500', ambientOpacity: 0,
  },
  expressed: {
    phase: 'expressed', bgClass: 'bg-stone-50', accentClass: 'text-stone-700',
    dotClass: 'bg-stone-400', glow: '', navHint: 'Quelque chose a été posé.',
    bodyTone: 'text-stone-600', ambientOpacity: 0.15,
  },
  reading: {
    phase: 'reading', bgClass: 'bg-stone-50', accentClass: 'text-blue-500',
    dotClass: 'bg-blue-400', glow: 'rgba(59,130,246,0.04)', navHint: 'Le coordinateur lit la situation.',
    bodyTone: 'text-stone-600', ambientOpacity: 0.25,
  },
  clarifying: {
    phase: 'clarifying', bgClass: 'bg-stone-50', accentClass: 'text-amber-600',
    dotClass: 'bg-amber-400', glow: 'rgba(245,158,11,0.06)', navHint: 'La situation se précise.',
    bodyTone: 'text-stone-700', ambientOpacity: 0.35,
  },
  emerging: {
    phase: 'emerging', bgClass: 'bg-stone-50', accentClass: 'text-emerald-600',
    dotClass: 'bg-emerald-400', glow: 'rgba(16,185,129,0.05)', navHint: 'Des présences humaines émergent.',
    bodyTone: 'text-stone-700', ambientOpacity: 0.3,
  },
  exchanging: {
    phase: 'exchanging', bgClass: 'bg-stone-50', accentClass: 'text-stone-800',
    dotClass: 'bg-stone-600', glow: 'rgba(28,25,23,0.03)', navHint: 'Un échange est en cours.',
    bodyTone: 'text-stone-800', ambientOpacity: 0.2,
  },
  resolved: {
    phase: 'resolved', bgClass: 'bg-stone-50', accentClass: 'text-emerald-500',
    dotClass: 'bg-emerald-300', glow: 'rgba(16,185,129,0.04)', navHint: 'Quelque chose a bougé.',
    bodyTone: 'text-stone-500', ambientOpacity: 0.15,
  },
};

export type JourneyStep = {
  id: string;
  phase: SituationPhase;
  label: string;
  sub: string;
  timestamp?: string;
};

export const JOURNEY_STEPS: JourneyStep[] = [
  { id: 'expressed',  phase: 'expressed',  label: 'Situation exprimée',       sub: 'Quelque chose a été posé dans le réseau.' },
  { id: 'reading',    phase: 'reading',    label: 'Le coordinateur en lecture', sub: 'La situation est analysée en profondeur.' },
  { id: 'clarifying', phase: 'clarifying', label: 'La situation se précise',   sub: 'Ce qui est vraiment en jeu devient visible.' },
  { id: 'emerging',   phase: 'emerging',   label: 'Des présences humaines',    sub: 'Des appuis pertinents s\'organisent autour de la situation.' },
  { id: 'exchanging', phase: 'exchanging', label: 'Un échange prend forme',    sub: 'La situation avance dans la relation.' },
  { id: 'resolved',   phase: 'resolved',   label: 'Quelque chose s\'est déplacé', sub: 'Un mouvement a eu lieu.' },
];

// ─── État d'orchestration visible ────────────────────────────────────────────

export type OrchestrationStatus = {
  urgencyLevel: SituationUrgency | null;
  humanPresenceDetected: boolean;
  pendingSignals: CoordinatorSignal[];
  lastSignalAt: string | null;
  escalationLevel: number;
};

type SituationContextValue = {
  phase: SituationPhase;
  theme: PhaseTheme;
  activeNeed: Need | null;
  journeySteps: JourneyStep[];
  currentStepIndex: number;
  orchestration: OrchestrationStatus;
  setLocalPhase: (p: SituationPhase) => void;
  refreshPhase: () => void;
  notifyCoordinatorSignal: (signal: CoordinatorSignal) => void;
};

const SituationContext = createContext<SituationContextValue>({
  phase: 'idle',
  theme: PHASE_THEMES.idle,
  activeNeed: null,
  journeySteps: JOURNEY_STEPS,
  currentStepIndex: -1,
  orchestration: {
    urgencyLevel: null,
    humanPresenceDetected: false,
    pendingSignals: [],
    lastSignalAt: null,
    escalationLevel: 0,
  },
  setLocalPhase: () => {},
  refreshPhase: () => {},
  notifyCoordinatorSignal: () => {},
});

export function SituationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<SituationPhase>('idle');
  const [activeNeed, setActiveNeed] = useState<Need | null>(null);
  const [orchestration, setOrchestration] = useState<OrchestrationStatus>({
    urgencyLevel: null,
    humanPresenceDetected: false,
    pendingSignals: [],
    lastSignalAt: null,
    escalationLevel: 0,
  });

  const refreshPhase = useCallback(async () => {
    if (!user) return;

    // Charger la situation active
    const { data } = await supabase
      .from('needs')
      .select('*')
      .eq('user_id', user.id)
      .not('status', 'eq', 'closed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setActiveNeed(data);
      setPhase(needStatusToPhase(data.status));
    } else {
      const { data: closed } = await supabase
        .from('needs')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'closed')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (closed && new Date(closed.updated_at || closed.created_at).getTime() > Date.now() - 7 * 24 * 3600 * 1000) {
        setActiveNeed(closed);
        setPhase('resolved');
      } else {
        setActiveNeed(null);
        setPhase('idle');
      }
    }

    // Consommer les signaux du coordinator
    if (user) {
      const signals = await consumeSignals(user.id).catch(() => []);
      if (signals.length > 0) {
        processSignals(signals);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refreshPhase();

    // Real-time : écouter les needs ET les signaux du coordinator
    const needsSub = supabase
      .channel(`situation-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'needs',
        filter: `user_id=eq.${user.id}`,
      }, () => refreshPhase())
      .subscribe();

    // Écouter les nouveaux signaux coordinator (INSERT uniquement)
    const signalsSub = supabase
      .channel(`coordinator-signals-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'coordinator_signals',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const signal = payload.new as Record<string, unknown>;
        if (signal && signal.status === 'pending') {
          processSignals([{
            id: signal.id as string,
            userId: signal.user_id as string,
            needId: signal.need_id as string | null,
            signalType: signal.signal_type as CoordinatorSignal['signalType'],
            priority: signal.priority as CoordinatorSignal['priority'],
            payload: signal.payload as CoordinatorSignal['payload'],
            status: 'pending',
            expiresAt: signal.expires_at as string,
            createdAt: signal.created_at as string,
          }]);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(needsSub);
      supabase.removeChannel(signalsSub);
    };
  }, [user, refreshPhase]);

  function processSignals(signals: CoordinatorSignal[]) {
    setOrchestration(prev => {
      const updated = { ...prev };
      updated.pendingSignals = [...signals, ...prev.pendingSignals].slice(0, 10);
      updated.lastSignalAt = new Date().toISOString();

      for (const signal of signals) {
        switch (signal.signalType) {
          case 'urgency_detected': {
            const payload = signal.payload as { urgencyLevel?: SituationUrgency };
            updated.urgencyLevel = payload.urgencyLevel || null;
            updated.escalationLevel = signal.priority <= 2 ? 3 : 2;
            break;
          }
          case 'human_recommended':
            updated.humanPresenceDetected = true;
            break;
          case 'phase_shift': {
            const payload = signal.payload as { to?: string };
            if (payload.to) {
              const mapped = needStatusToPhase(payload.to);
              if (mapped !== 'idle') setPhase(mapped);
            }
            break;
          }
          case 'escalation_required':
            updated.escalationLevel = Math.max(updated.escalationLevel, 2);
            break;
        }
      }

      return updated;
    });
  }

  function notifyCoordinatorSignal(signal: CoordinatorSignal) {
    processSignals([signal]);
  }

  function setLocalPhase(p: SituationPhase) {
    setPhase(p);
  }

  const theme = PHASE_THEMES[phase];
  const currentStepIndex = JOURNEY_STEPS.findIndex(s => s.phase === phase);

  return (
    <SituationContext.Provider value={{
      phase, theme, activeNeed, journeySteps: JOURNEY_STEPS,
      currentStepIndex, orchestration, setLocalPhase, refreshPhase,
      notifyCoordinatorSignal,
    }}>
      {children}
    </SituationContext.Provider>
  );
}

export function useSituation() {
  return useContext(SituationContext);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function needStatusToPhase(status: string): SituationPhase {
  const map: Record<string, SituationPhase> = {
    draft: 'expressed', pending: 'expressed',
    submitted: 'reading', reading: 'reading',
    clarifying: 'clarifying',
    emerging: 'emerging', matched: 'emerging',
    active: 'exchanging', exchanging: 'exchanging',
    closed: 'resolved', resolved: 'resolved',
  };
  return map[status] || 'idle';
}
