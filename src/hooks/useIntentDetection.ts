import { useState, useCallback } from 'react';

export type Intent = 'situation' | 'presence' | 'discovery' | 'urgency' | null;

const SITUATION_PATTERNS = [
  /besoin|cherch|trouv|aide|problème|situation|urgent|bloqu|perdu|pann/i,
  /j'ai besoin|il me faut|qui peut|quelqu'un pour|je cherche/i,
];

const PRESENCE_PATTERNS = [
  /propos|offr|partag|donner|aider|compétence|savoir.?faire|disponib/i,
  /je peux|je sais|je propose|j'offre|je donne|mettre à dispo/i,
];

const URGENCY_PATTERNS = [
  /urgent|vite|immédiat|aujourd'hui|maintenant|SOS|help|au secours/i,
];

const DISCOVERY_PATTERNS = [
  /comment|c'est quoi|fonctionn|expliq|découvr|comprendre|voir|parcourir/i,
];

export function useIntentDetection() {
  const [intent, setIntent] = useState<Intent>(null);
  const [confidence, setConfidence] = useState(0);

  const detect = useCallback((text: string): Intent => {
    if (!text || text.length < 3) {
      setIntent(null);
      setConfidence(0);
      return null;
    }

    if (URGENCY_PATTERNS.some(p => p.test(text))) {
      setIntent('urgency');
      setConfidence(0.9);
      return 'urgency';
    }
    if (SITUATION_PATTERNS.some(p => p.test(text))) {
      setIntent('situation');
      setConfidence(0.85);
      return 'situation';
    }
    if (PRESENCE_PATTERNS.some(p => p.test(text))) {
      setIntent('presence');
      setConfidence(0.8);
      return 'presence';
    }
    if (DISCOVERY_PATTERNS.some(p => p.test(text))) {
      setIntent('discovery');
      setConfidence(0.7);
      return 'discovery';
    }

    setIntent('situation');
    setConfidence(0.5);
    return 'situation';
  }, []);

  const reset = useCallback(() => {
    setIntent(null);
    setConfidence(0);
  }, []);

  return { intent, confidence, detect, reset };
}
