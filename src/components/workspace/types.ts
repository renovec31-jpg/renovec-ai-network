// ══════════════════════════════════════════════════════════════════════════════
// AI Browser — Types for the internal navigation surface
// ══════════════════════════════════════════════════════════════════════════════

import type { MockProfile } from '../../data/mockOccitanie';
import type { IntentHypothesis } from '../../services/welcome/types';

export type AIView =
  | 'welcome'
  | 'understanding'
  | 'matching'
  | 'situation-preview'
  | 'presence-preview'
  | 'publish-assist'
  | 'feed-explore'
  | 'memory-resume';

export interface AIBrowserState {
  activeView: AIView;
  contextSummary: ContextSummary;
  matchedProfiles: MockProfile[];
  presenceDraft: PresenceDraft | null;
  situationDraft: SituationDraft | null;
  suggestedAction: SuggestedAction | null;
  confidence: number;
  turnCount: number;
}

export interface ContextSummary {
  intent: IntentHypothesis | null;
  intentLabel: string;
  territory: string | null;
  keywords: string[];
  urgency: number;
  clarityLevel: 'low' | 'medium' | 'high';
  nextStep: string;
}

export interface PresenceDraft {
  title: string;
  capabilities: string[];
  tags: string[];
  territory?: string;
  availability?: string;
}

export interface SituationDraft {
  title: string;
  summary: string;
  territory?: string;
  urgency: number;
  keywords: string[];
}

export type SuggestedAction =
  | { type: 'ask'; question: string }
  | { type: 'show_profiles'; count: number }
  | { type: 'build_presence' }
  | { type: 'build_situation' }
  | { type: 'explore_feed' }
  | { type: 'join_network' };

export function intentToLabel(intent: IntentHypothesis | null): string {
  switch (intent) {
    case 'need': return 'Besoin identifie';
    case 'offer': return 'Offre de competence';
    case 'urgency': return 'Besoin urgent';
    case 'discovery': return 'Exploration';
    case 'hesitation': return 'Reflexion en cours';
    default: return 'Ecoute';
  }
}

export function clarityFromConfidence(confidence: number): 'low' | 'medium' | 'high' {
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.4) return 'medium';
  return 'low';
}

export function clarityLabel(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'high': return 'Situation claire';
    case 'medium': return 'En cours de clarification';
    case 'low': return 'Ecoute active';
  }
}
