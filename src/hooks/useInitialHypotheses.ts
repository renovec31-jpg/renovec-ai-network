import { useCallback } from 'react';
import type { InitialHypotheses, VisitorProfile, IntentHypothesis } from '../services/welcome/types';

const NEED_PATTERNS = [
  /besoin|cherch|trouv|aide|problème|situation|bloqu|perdu|pann|quelqu'un pour/i,
  /qui peut|il me faut|je ne sais pas|comment faire/i,
];

const OFFER_PATTERNS = [
  /propos|offr|partag|donner|aider|compétence|savoir.?faire|disponib/i,
  /je peux|je sais|je propose|j'offre|mettre à dispo/i,
];

const URGENCY_PATTERNS = [
  /urgent|vite|immédiat|aujourd'hui|maintenant|SOS|help|au secours|tout de suite/i,
];

const HESITATION_PATTERNS = [
  /je sais pas|pas sûr|peut-être|je me demande|c'est quoi|juste voir|curiosité/i,
];

export function useInitialHypotheses() {
  const computeFromText = useCallback((text: string, existingProfile?: VisitorProfile | null): InitialHypotheses => {
    let probableIntent: IntentHypothesis = 'discovery';
    let intentConfidence = 0.3;
    let urgencyLevel = 0;
    let needVsOffer = 0.5;
    let explorationLikelihood = 0.5;
    let hesitationSignals = 0;

    if (URGENCY_PATTERNS.some(p => p.test(text))) {
      probableIntent = 'urgency';
      intentConfidence = 0.9;
      urgencyLevel = 0.9;
      needVsOffer = 0.9;
      explorationLikelihood = 0.1;
    } else if (NEED_PATTERNS.some(p => p.test(text))) {
      probableIntent = 'need';
      intentConfidence = 0.8;
      needVsOffer = 0.8;
      explorationLikelihood = 0.2;
    } else if (OFFER_PATTERNS.some(p => p.test(text))) {
      probableIntent = 'offer';
      intentConfidence = 0.75;
      needVsOffer = 0.2;
      explorationLikelihood = 0.2;
    } else if (HESITATION_PATTERNS.some(p => p.test(text))) {
      probableIntent = 'hesitation';
      intentConfidence = 0.6;
      hesitationSignals = 0.7;
      explorationLikelihood = 0.7;
    }

    const timeOnSite = existingProfile?.signals.timeOnSiteMs || 0;
    if (timeOnSite > 30000 && probableIntent === 'discovery') {
      explorationLikelihood = Math.min(explorationLikelihood + 0.15, 1);
    }

    const interactions = existingProfile?.signals.interactionCount || 0;
    if (interactions > 5 && intentConfidence < 0.6) {
      intentConfidence = Math.min(intentConfidence + 0.1, 1);
    }

    return {
      probableIntent,
      intentConfidence,
      urgencyLevel,
      territorialNeed: existingProfile?.signals.approximateRegion || null,
      needVsOffer,
      explorationLikelihood,
      hesitationSignals,
    };
  }, []);

  const computeFromSignals = useCallback((profile: VisitorProfile): InitialHypotheses => {
    const { signals } = profile;
    let probableIntent: IntentHypothesis = 'discovery';
    let intentConfidence = 0.25;
    let urgencyLevel = 0;

    if (signals.referrer.includes('google') && signals.utmCampaign?.includes('aide')) {
      probableIntent = 'need';
      intentConfidence = 0.5;
    }

    if (signals.utmSource === 'urgence' || signals.utmCampaign?.includes('urgent')) {
      probableIntent = 'urgency';
      intentConfidence = 0.6;
      urgencyLevel = 0.6;
    }

    if (signals.timeOnSiteMs < 5000 && signals.interactionCount === 0) {
      probableIntent = 'discovery';
      intentConfidence = 0.2;
    }

    return {
      probableIntent,
      intentConfidence,
      urgencyLevel,
      territorialNeed: signals.approximateRegion,
      needVsOffer: probableIntent === 'offer' ? 0.2 : 0.5,
      explorationLikelihood: probableIntent === 'discovery' ? 0.8 : 0.3,
      hesitationSignals: 0,
    };
  }, []);

  return { computeFromText, computeFromSignals };
}
