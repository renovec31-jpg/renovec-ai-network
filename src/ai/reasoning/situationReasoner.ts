// ─── Situation Reasoner ───────────────────────────────────────────────────────
// Le coordinateur RAISONNE avant de parler.
// 1. Il analyse la situation
// 2. Il construit une hypothèse
// 3. Il identifie les risques
// 4. Il priorise
// 5. Seulement ensuite il répond
//
// Ce module produit un ReasoningFrame : la pensée structurée du coordinator
// avant toute réponse. Ce frame est injecté dans le prompt de l'Edge Function.

import {
  findRelevantKnowledge,
  detectRisksInText,
  buildKnowledgeContext,
  type Risk,
  type SituationKnowledgeNode,
} from '../knowledge/situationKnowledge';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReasoningFrame = {
  // Ce que le coordinateur a compris de la situation
  situationType: string | null;
  situationLabel: string | null;
  domain: string | null;

  // Risques identifiés avant toute réponse
  identifiedRisks: Risk[];
  hasImmediateRisk: boolean;

  // Besoins implicites déduits
  implicitNeeds: string[];

  // Enjeux réels (ce que la personne n'a peut-être pas dit)
  hiddenStakes: string[];

  // Questions concrètes prioritaires
  priorityQuestions: string[];

  // Ce que le coordinateur doit organiser (pas juste répondre)
  orchestrationGoal: string;

  // Niveau d'urgence déduit
  urgencyLevel: 'critical' | 'high' | 'normal' | 'low';

  // Contexte humain probable
  likelyHumanContext: string[];

  // Instructions pour la réponse
  responseDirectives: ResponseDirectives;
};

export type ResponseDirectives = {
  tone: 'calm' | 'direct' | 'reassuring' | 'urgent' | 'exploratory';
  startWithRisk: boolean;        // Ouvrir sur le risque si présent
  askConcreteQuestion: boolean;  // Poser une question concrète (pas psychologique)
  avoidGenericOpeners: boolean;  // Interdire les ouvertures vagues
  requiredElements: string[];    // Éléments obligatoires dans la réponse
  forbiddenPhrases: string[];    // Phrases interdites dans ce contexte
};

// ─── Reasoner principal ───────────────────────────────────────────────────────

export function buildReasoningFrame(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
): ReasoningFrame {
  const t = userMessage.toLowerCase();
  const allText = [userMessage, ...conversationHistory.map(h => h.content)].join(' ').toLowerCase();

  // 1. Identifier le type de situation
  const relevantNodes = findRelevantKnowledge(userMessage);
  const primaryNode: SituationKnowledgeNode | null = relevantNodes[0] || null;

  // 2. Détecter les risques dans TOUT le contexte disponible
  const identifiedRisks = detectRisksInText(allText);
  const hasImmediateRisk = identifiedRisks.some(r => r.level === 'critical' || r.level === 'high');

  // 3. Besoins implicites
  const implicitNeeds: string[] = primaryNode?.implicitNeeds || [];

  // 4. Enjeux cachés — ce que la personne n'a probablement pas dit
  const hiddenStakes = deriveHiddenStakes(t, primaryNode);

  // 5. Questions prioritaires — concrètes, pas psychologiques
  const alreadyAskedQuestions = conversationHistory
    .filter(h => h.role === 'coordinator')
    .map(h => h.content);
  const priorityQuestions = primaryNode
    ? filterUnasked(primaryNode.intelligentQuestions, alreadyAskedQuestions)
    : deriveGenericConcreteQuestions(t);

  // 6. Objectif d'orchestration
  const orchestrationGoal = deriveOrchestrationGoal(primaryNode, identifiedRisks, t);

  // 7. Urgence déduite
  const urgencyLevel = computeUrgencyFromRisks(identifiedRisks, t);

  // 8. Contexte humain probable
  const likelyHumanContext = primaryNode?.emotionalContext || [];

  // 9. Directives de réponse
  const responseDirectives = buildResponseDirectives(
    primaryNode, identifiedRisks, hasImmediateRisk, urgencyLevel
  );

  return {
    situationType: primaryNode?.id || null,
    situationLabel: primaryNode?.label || null,
    domain: primaryNode?.domain || null,
    identifiedRisks,
    hasImmediateRisk,
    implicitNeeds,
    hiddenStakes,
    priorityQuestions,
    orchestrationGoal,
    urgencyLevel,
    likelyHumanContext,
    responseDirectives,
  };
}

// ─── Formatage pour injection dans le prompt ──────────────────────────────────

export function formatReasoningFrameForPrompt(frame: ReasoningFrame): string {
  const parts: string[] = [];

  parts.push('━━━ RAISONNEMENT SITUATIONNEL ━━━');
  parts.push('(Ce que le coordinateur a analysé AVANT de répondre)');
  parts.push('');

  if (frame.situationLabel) {
    parts.push(`TYPE DE SITUATION : ${frame.situationLabel}`);
  }

  parts.push(`URGENCE DÉTECTÉE : ${frame.urgencyLevel.toUpperCase()}`);

  if (frame.identifiedRisks.length > 0) {
    const top = frame.identifiedRisks.slice(0, 2);
    parts.push(`RISQUES RÉELS : ${top.map(r => `[${r.level.toUpperCase()}] ${r.description}`).join(' | ')}`);
  }

  if (frame.implicitNeeds.length > 0) {
    parts.push(`BESOINS IMPLICITES : ${frame.implicitNeeds.slice(0, 2).join(' / ')}`);
  }

  if (frame.hiddenStakes.length > 0) {
    parts.push(`ENJEUX NON DITS PROBABLES : ${frame.hiddenStakes.join(' / ')}`);
  }

  if (frame.priorityQuestions.length > 0) {
    parts.push(`QUESTION CONCRÈTE PRIORITAIRE : "${frame.priorityQuestions[0]}"`);
  }

  parts.push(`OBJECTIF D'ORCHESTRATION : ${frame.orchestrationGoal}`);
  parts.push('');

  parts.push('DIRECTIVES DE RÉPONSE :');
  parts.push(`- Ton : ${frame.responseDirectives.tone}`);
  if (frame.responseDirectives.startWithRisk) {
    parts.push('- OUVRIR sur le risque identifié, pas sur une question générale');
  }
  if (frame.responseDirectives.askConcreteQuestion) {
    parts.push('- Poser une question CONCRÈTE sur la situation réelle (pas psychologique)');
  }
  parts.push(`- Éléments obligatoires : ${frame.responseDirectives.requiredElements.join(', ')}`);

  if (frame.responseDirectives.forbiddenPhrases.length > 0) {
    parts.push(`- INTERDIT dans cette réponse : ${frame.responseDirectives.forbiddenPhrases.join(' / ')}`);
  }

  parts.push('━━━ FIN RAISONNEMENT ━━━');

  return parts.join('\n');
}

export function buildFullCoordinatorContext(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  memoryContext: string,
  situationSummary: string | null,
  adaptationHints: string,
): string {
  const frame = buildReasoningFrame(userMessage, conversationHistory);
  const knowledgeContext = buildKnowledgeContext(userMessage);
  const reasoning = formatReasoningFrameForPrompt(frame);

  const parts: string[] = [];

  if (memoryContext) parts.push(memoryContext);
  if (situationSummary) parts.push(`[SITUATION EN COURS]\n${situationSummary}`);
  if (adaptationHints) parts.push(`[ADAPTATION UTILISATEUR]\n${adaptationHints}`);
  if (knowledgeContext) parts.push(knowledgeContext);
  parts.push(reasoning);

  return parts.join('\n\n');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveHiddenStakes(text: string, node: SituationKnowledgeNode | null): string[] {
  const stakes: string[] = [];

  // Signaux universels
  if (/enfant|bébé|mineur/.test(text)) stakes.push('présence d\'un enfant à protéger');
  if (/personne âgée|maman|papa|parent|retraité/.test(text)) stakes.push('personne vulnérable impliquée');
  if (/seul|sans aide|personne pour/.test(text)) stakes.push('isolement social');
  if (/depuis longtemps|des semaines|des mois/.test(text)) stakes.push('situation ancienne non résolue');
  if (/honte|gêné|dérangé|désolé/.test(text)) stakes.push('barrier à demander de l\'aide');
  if (/loyer|argent|pas les moyens/.test(text)) stakes.push('contrainte financière non dite');

  // Signaux du domaine
  if (node?.id.includes('logement') && /locataire/.test(text)) {
    stakes.push('droits du locataire à clarifier');
  }

  return stakes.slice(0, 3);
}

function filterUnasked(questions: string[], alreadyAsked: string[]): string[] {
  return questions.filter(q => {
    const qStart = q.toLowerCase().slice(0, 25);
    return !alreadyAsked.some(a => a.toLowerCase().includes(qStart));
  });
}

function deriveGenericConcreteQuestions(text: string): string[] {
  const questions: string[] = [];

  if (/problème|souci|truc|chose/.test(text) && text.split(' ').length < 8) {
    questions.push('C\'est un problème technique, administratif, ou autre chose ?');
    questions.push('C\'est récent ou ça dure depuis un moment ?');
  }

  if (/chez moi|maison|appartement|logement/.test(text)) {
    questions.push('C\'est dans votre logement — vous êtes locataire ou propriétaire ?');
  }

  return questions;
}

function deriveOrchestrationGoal(
  node: SituationKnowledgeNode | null,
  risks: Risk[],
  text: string,
): string {
  if (risks.some(r => r.level === 'critical')) {
    return 'Évaluer l\'urgence immédiate et orienter vers ressource d\'urgence si nécessaire';
  }
  if (node?.domain.includes('urgent')) {
    return `Qualifier la situation ${node.label} et identifier la ressource humaine adaptée`;
  }
  if (node) {
    return `Clarifier la situation "${node.label}" pour orienter vers : ${node.typicalResources.slice(0, 2).join(', ')}`;
  }
  if (/aide|besoin|problème/.test(text)) {
    return 'Identifier le domaine et l\'urgence avant toute orientation';
  }
  return 'Comprendre la situation réelle avant de répondre';
}

function computeUrgencyFromRisks(risks: Risk[], text: string): 'critical' | 'high' | 'normal' | 'low' {
  if (risks.some(r => r.level === 'critical')) return 'critical';
  if (risks.some(r => r.level === 'high')) return 'high';
  if (/urgent|maintenant|immédiatement|vite|rapidement/.test(text)) return 'high';
  if (risks.some(r => r.level === 'medium')) return 'normal';
  return 'normal';
}

function buildResponseDirectives(
  node: SituationKnowledgeNode | null,
  risks: Risk[],
  hasImmediateRisk: boolean,
  urgency: 'critical' | 'high' | 'normal' | 'low',
): ResponseDirectives {
  const forbiddenPhrases: string[] = [
    "qu'est-ce qui vous a amené à en parler maintenant",
    "comment vous sentez-vous",
    "je suis là pour vous",
    "prenez le temps",
  ];

  if (node?.commonMistakes) {
    forbiddenPhrases.push(...node.commonMistakes.slice(0, 2));
  }

  const requiredElements: string[] = [];

  if (hasImmediateRisk) {
    requiredElements.push('mentionner le risque identifié');
  }
  if (node?.priorityQuestions?.[0]) {
    requiredElements.push('poser une question concrète sur la situation réelle');
  }
  requiredElements.push('rester court et direct');

  return {
    tone: urgency === 'critical' ? 'urgent'
      : urgency === 'high' ? 'direct'
      : hasImmediateRisk ? 'reassuring'
      : 'exploratory',
    startWithRisk: hasImmediateRisk,
    askConcreteQuestion: true,
    avoidGenericOpeners: true,
    requiredElements,
    forbiddenPhrases,
  };
}
