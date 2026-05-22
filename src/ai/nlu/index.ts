// ─── NLU Layer — Public API ───────────────────────────────────────────────────
// Single entry point for all language understanding needs.

export { normalizeText, isInformalSpeech, extractMainIntent } from './normalize';
export { detectIntent, detectIntentString, type Intent, type IntentResult } from './intentDetector';
export {
  inferSituation,
  buildIntelligentFallback,
  formatInferenceForPrompt,
  type InferredSituation,
} from './situationInference';

// ─── Combined NLU analysis ────────────────────────────────────────────────────

import { normalizeText } from './normalize';
import { detectIntent, type IntentResult } from './intentDetector';
import { inferSituation, buildIntelligentFallback, type InferredSituation } from './situationInference';

export type NLUResult = {
  originalText: string;
  normalizedText: string;
  intent: IntentResult;
  inference: InferredSituation | null;
  intelligentFallback: string;
  isSituational: boolean;
  isSocial: boolean;
};

export function analyzeMessage(
  rawInput: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): NLUResult {
  const normalizedText = normalizeText(rawInput);
  const intent = detectIntent(rawInput);
  const isSituational = intent.intent === 'situation_description' || intent.intent === 'clarification_answer';
  const isSocial = ['greeting', 'social_correction', 'confusion', 'robot_question', 'system_question', 'doubt', 'affirmation', 'negation', 'emotional_expression'].includes(intent.intent);

  // Try inference even on low-confidence intents — real situations hide in vague messages
  const inference = inferSituation(rawInput) || (intent.confidence < 0.6 ? inferSituation(normalizedText) : null);

  const intelligentFallback = buildIntelligentFallback(rawInput, conversationHistory);

  return {
    originalText: rawInput,
    normalizedText,
    intent,
    inference,
    intelligentFallback,
    isSituational: isSituational || (inference?.confidence ?? 0) >= 0.7,
    isSocial,
  };
}
