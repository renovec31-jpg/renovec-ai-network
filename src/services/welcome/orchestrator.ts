import type {
  VisitorProfile,
  KnownUserContext,
  InitialHypotheses,
  GreetingState,
  GreetingTone,
  ContextHint,
  IntentHypothesis,
} from './types';

function pickTone(hypotheses: InitialHypotheses): GreetingTone {
  if (hypotheses.urgencyLevel > 0.6) return 'supportive';
  if (hypotheses.probableIntent === 'need') return 'warm';
  if (hypotheses.probableIntent === 'offer') return 'curious';
  return 'warm';
}

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Bonsoir';
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bonjour';
  return 'Bonsoir';
}

export function generateVisitorGreeting(profile: VisitorProfile): GreetingState {
  const { signals, hypotheses } = profile;
  const greeting = timeGreeting();
  const tone = pickTone(hypotheses);

  let message: string;
  let followUp: string | null = null;
  const contextHints: ContextHint[] = [];

  if (signals.approximateRegion) {
    contextHints.push({
      label: signals.approximateRegion,
      source: 'session',
      confidence: 0.6,
    });
  }

  if (signals.deviceType === 'mobile') {
    contextHints.push({
      label: 'sur mobile',
      source: 'session',
      confidence: 0.95,
    });
  }

  if (hypotheses.urgencyLevel > 0.5) {
    message = `${greeting}. Je suis RENOVEC, le coordinateur du réseau. Vous semblez avoir besoin d'aide rapidement — dites-moi ce qu'il se passe, je vais vous orienter.`;
    followUp = null;
  } else if (signals.referrer && signals.referrer.includes('google')) {
    message = `${greeting}. Bienvenue sur RENOVEC. Vous êtes au bon endroit — ici, l'IA comprend votre situation en langage libre et vous relie aux bonnes personnes, près de chez vous.`;
    followUp = 'Qu\'est-ce qui vous amène ?';
  } else if (signals.timeOnSiteMs > 20000) {
    message = `${greeting}. Je vois que vous explorez le réseau depuis un moment. RENOVEC est un espace où chaque personne peut exprimer un besoin ou partager ce qu'elle sait faire. Envie de tester ?`;
    followUp = null;
  } else {
    message = `${greeting}. Je suis RENOVEC, l'intelligence qui coordonne ce réseau. Ici, pas de formulaire — décrivez simplement ce qui vous amène, un besoin, une envie de partager, ou juste de la curiosité.`;
    followUp = 'Je vous écoute.';
  }

  return {
    message,
    tone,
    followUp,
    contextHints,
    phase: 'greeting',
  };
}

export function generateKnownUserGreeting(ctx: KnownUserContext): GreetingState {
  const greeting = timeGreeting();
  const contextHints: ContextHint[] = [];

  if (ctx.zone) {
    contextHints.push({ label: ctx.zone, source: 'history', confidence: 0.9 });
  }

  const unresolvedNeed = ctx.recentNeeds.find(n => !n.resolved);
  if (unresolvedNeed) {
    contextHints.push({
      label: `besoin en cours : ${unresolvedNeed.text.slice(0, 40)}`,
      source: 'history',
      confidence: 0.85,
    });
  }

  if (ctx.recentOffers.length > 0) {
    contextHints.push({
      label: `${ctx.recentOffers.length} offre(s) actives`,
      source: 'history',
      confidence: 0.9,
    });
  }

  let message: string;
  let followUp: string | null = null;

  if (unresolvedNeed) {
    message = `${greeting} ${ctx.prenom}. La dernière fois, vous cherchiez ${unresolvedNeed.text}. Souhaitez-vous reprendre, ou c'est autre chose aujourd'hui ?`;
  } else if (ctx.conversationMemory.length > 0) {
    const lastMemory = ctx.conversationMemory[0];
    message = `${greeting} ${ctx.prenom}. Content de vous retrouver. Depuis votre dernière visite, le réseau a évolué dans votre zone. Comment puis-je vous aider ?`;
    contextHints.push({
      label: `dernier échange : ${lastMemory.summary.slice(0, 50)}`,
      source: 'history',
      confidence: 0.8,
    });
  } else {
    message = `${greeting} ${ctx.prenom}. Bienvenue dans votre espace. Que puis-je faire pour vous ?`;
  }

  return {
    message,
    tone: 'warm',
    followUp,
    contextHints,
    phase: 'greeting',
  };
}

export function generateFollowUp(
  intent: IntentHypothesis,
  turnCount: number,
  isConnected: boolean
): string {
  if (turnCount === 1) {
    switch (intent) {
      case 'need':
      case 'urgency':
        return 'Je cherche dans le réseau les profils qui correspondent. Pouvez-vous préciser votre zone géographique si c\'est important ?';
      case 'offer':
        return 'Intéressant. Pour créer votre fiche, dites-m\'en un peu plus : quand êtes-vous disponible, et dans quelle zone ?';
      case 'hesitation':
        return 'Prenez votre temps. Vous pouvez simplement me dire ce qui vous passe par la tête. Je ne suis pas un formulaire.';
      case 'discovery':
        return 'RENOVEC relie des personnes qui s\'entraident localement. Vous pouvez exprimer un besoin ou proposer un savoir-faire. Qu\'est-ce qui vous intrigue ?';
    }
  }

  if (turnCount === 2 && !isConnected) {
    return 'Très bien. Je vais vous montrer ce que le réseau peut faire pour vous.';
  }

  return '';
}

export function buildContextHintsFromConversation(
  texts: string[],
  hypotheses: InitialHypotheses,
  profile: VisitorProfile | null
): ContextHint[] {
  const hints: ContextHint[] = [];

  if (hypotheses.intentConfidence > 0.5) {
    const intentLabels: Record<IntentHypothesis, string> = {
      need: 'besoin détecté',
      offer: 'offre de compétence',
      urgency: 'besoin urgent',
      discovery: 'exploration',
      hesitation: 'hésitation perçue',
    };
    hints.push({
      label: intentLabels[hypotheses.probableIntent],
      source: 'conversation',
      confidence: hypotheses.intentConfidence,
    });
  }

  if (hypotheses.territorialNeed) {
    hints.push({
      label: `zone : ${hypotheses.territorialNeed}`,
      source: profile ? 'session' : 'conversation',
      confidence: 0.6,
    });
  }

  if (texts.length > 0) {
    const lastText = texts[texts.length - 1];
    const locationMatch = lastText.match(/(?:à|de|près de|zone|secteur)\s+([A-ZÀ-Ú][a-zà-ü]+(?:\s[A-ZÀ-Ú][a-zà-ü]+)?)/);
    if (locationMatch) {
      hints.push({
        label: `lieu mentionné : ${locationMatch[1]}`,
        source: 'conversation',
        confidence: 0.75,
      });
    }
  }

  return hints;
}
