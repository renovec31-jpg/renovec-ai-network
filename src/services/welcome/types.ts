export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type IntentHypothesis = 'need' | 'offer' | 'discovery' | 'urgency' | 'hesitation';

export interface SessionSignals {
  language: string;
  timezone: string;
  deviceType: DeviceType;
  os: string;
  browser: string;
  screenWidth: number;
  screenHeight: number;
  referrer: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  approximateRegion: string | null;
  pagesViewed: number;
  timeOnSiteMs: number;
  interactionCount: number;
  textInputs: string[];
}

export interface VisitorProfile {
  sessionId: string;
  signals: SessionSignals;
  hypotheses: InitialHypotheses;
  conversationTurns: number;
  enrichedFields: string[];
  createdAt: number;
}

export interface InitialHypotheses {
  probableIntent: IntentHypothesis;
  intentConfidence: number;
  urgencyLevel: number;
  territorialNeed: string | null;
  needVsOffer: number;
  explorationLikelihood: number;
  hesitationSignals: number;
}

export interface KnownUserContext {
  userId: string;
  prenom: string;
  displayName: string;
  memberSince: string;
  zone: string | null;
  lastSeen: string | null;
  recentNeeds: PastInteraction[];
  recentOffers: PastInteraction[];
  activeRelations: number;
  trustScore: number;
  conversationMemory: ConversationMemoryItem[];
}

export interface PastInteraction {
  id: string;
  text: string;
  type: 'need' | 'offer';
  date: string;
  resolved: boolean;
}

export interface ConversationMemoryItem {
  date: string;
  summary: string;
  intent: IntentHypothesis;
}

export type GreetingTone = 'warm' | 'direct' | 'curious' | 'supportive';

export interface GreetingState {
  message: string;
  tone: GreetingTone;
  followUp: string | null;
  contextHints: ContextHint[];
  phase: 'greeting' | 'intake' | 'orienting' | 'acting';
}

export interface ContextHint {
  label: string;
  source: 'session' | 'conversation' | 'history';
  confidence: number;
}
