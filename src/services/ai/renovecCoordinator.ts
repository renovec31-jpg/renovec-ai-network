const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export type ConversationTurn = {
  role: 'coordinator' | 'user';
  content: string;
};

export type Intent =
  | 'greeting'
  | 'social_correction'
  | 'confusion'
  | 'system_question'
  | 'doubt'
  | 'robot_question'
  | 'situation_description'
  | 'clarification_answer'
  | 'unknown';

export type SituationUpdate = {
  summary: string;
  category: string;
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  missingInfo: string[];
};

export type CoordinatorReply = {
  intent: Intent;
  reply: string;
  canProgressSituation: boolean;
  shouldAskClarification: boolean;
  nextQuestion: string | null;
  situationConfidence: number;
  situationUpdate: SituationUpdate;
  // Legacy fields for ClarificationFlow
  message: string;
  is_final: boolean;
  urgency_level: string;
  reformulated_objective: string;
  context_description: string;
  recommended_format: string;
  vigilance_points: string[];
};

// The only safe fallback — never pretends to understand
const SAFE_FALLBACK: CoordinatorReply = {
  intent: 'unknown',
  reply: 'Je suis là. Dites-moi simplement ce qui se passe, avec vos mots.',
  message: 'Je suis là. Dites-moi simplement ce qui se passe, avec vos mots.',
  canProgressSituation: false,
  shouldAskClarification: false,
  nextQuestion: null,
  situationConfidence: 0,
  situationUpdate: { summary: '', category: 'inconnu', urgency: 'normal', missingInfo: [] },
  is_final: false,
  urgency_level: 'normal',
  reformulated_objective: '',
  context_description: '',
  recommended_format: '',
  vigilance_points: [],
};

export async function generateCoordinatorReply({
  conversationHistory,
  currentMessage,
  situationState,
}: {
  conversationHistory: ConversationTurn[];
  currentMessage: string;
  situationState?: { rawText: string };
}): Promise<CoordinatorReply> {
  const rawText = situationState?.rawText ?? currentMessage;

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/coordinator-reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ rawText, turns: conversationHistory }),
    });

    if (!res.ok) return SAFE_FALLBACK;

    const data = await res.json();
    if (!data || data.error) return SAFE_FALLBACK;

    const confidence: number = data.situationConfidence ?? data.confidence ?? 0;

    return {
      intent: data.intent ?? 'unknown',
      reply: data.reply ?? data.message ?? SAFE_FALLBACK.reply,
      message: data.message ?? data.reply ?? SAFE_FALLBACK.message,
      canProgressSituation: data.canProgressSituation ?? confidence >= 0.6,
      shouldAskClarification: data.shouldAskClarification ?? false,
      nextQuestion: data.nextQuestion ?? null,
      situationConfidence: confidence,
      situationUpdate: data.situationUpdate ?? { summary: '', category: 'inconnu', urgency: 'normal', missingInfo: [] },
      is_final: (data.is_final === true) && confidence >= 0.6,
      urgency_level: data.urgency_level ?? data.situationUpdate?.urgency ?? 'normal',
      reformulated_objective: confidence >= 0.6 ? (data.reformulated_objective ?? '') : '',
      context_description: confidence >= 0.6 ? (data.context_description ?? '') : 'Pour l\'instant, on commence juste à comprendre.',
      recommended_format: confidence >= 0.6 ? (data.recommended_format ?? '') : '',
      vigilance_points: data.vigilance_points ?? [],
    };
  } catch {
    return SAFE_FALLBACK;
  }
}
