// ─── Semantic Normalization ────────────────────────────────────────────────────
// Converts real human language (SMS, oral, typos, slang) into normalized text.
// Must run BEFORE any intent detection or situation inference.

// ─── Typo / abbrev corrections ────────────────────────────────────────────────

const CORRECTIONS: Array<[RegExp, string]> = [
  // Greetings variants
  [/\baloo\b/gi, 'allo'],
  [/\ball[oô]+\b/gi, 'allo'],
  [/\bbjr\b/gi, 'bonjour'],
  [/\bbsr\b/gi, 'bonsoir'],
  [/\bslt\b/gi, 'salut'],
  [/\bcc\b/gi, 'coucou'],
  [/\bwech\b/gi, 'wesh'],

  // Common typos / SMS
  [/\bprblm?\b/gi, 'problème'],
  [/\bproblem\b/gi, 'problème'],
  [/\bpb\b/gi, 'problème'],
  [/\bpbs\b/gi, 'problèmes'],
  [/\bqq\b/gi, 'quelque'],
  [/\bqqch\b/gi, 'quelque chose'],
  [/\bquelque1\b/gi, 'quelqu\'un'],
  [/\bkk\b/gi, 'quelque'],
  [/\bkan\b/gi, 'quand'],
  [/\bkoi\b/gi, 'quoi'],
  [/\bkeski\b/gi, 'qu\'est-ce qui'],
  [/\bkeskeC\b/gi, 'qu\'est-ce que c\'est'],
  [/\bkessé\b/gi, 'qu\'est-ce que'],
  [/\bt[ée]\b/gi, 'tu es'],
  [/\bv[ée]\b/gi, 'vous êtes'],
  [/\bchui\b/gi, 'je suis'],
  [/\bchu\b/gi, 'je suis'],
  [/\bms\b/gi, 'mais'],
  [/\bpk\b/gi, 'pourquoi'],
  [/\bpck\b/gi, 'parce que'],
  [/\bpce que\b/gi, 'parce que'],
  [/\bc est\b/gi, 'c\'est'],
  [/\bc'est\b/gi, 'c\'est'],
  [/\bca\b/gi, 'ça'],
  [/\bav\b/gi, 'avec'],
  [/\btlm\b/gi, 'tout le monde'],
  [/\bsvp\b/gi, 's\'il vous plaît'],
  [/\bstp\b/gi, 's\'il te plaît'],
  [/\bpls\b/gi, 's\'il vous plaît'],
  [/\bjsp\b/gi, 'je sais pas'],
  [/\bjtm\b/gi, 'je t\'aime'],
  [/\bvazy\b/gi, 'vas-y'],
  [/\bvazyyy\b/gi, 'vas-y'],
  [/\boué\b/gi, 'oui'],
  [/\bouai\b/gi, 'oui'],
  [/\bnon\b/gi, 'non'],
  [/\bnope\b/gi, 'non'],

  // Repeated letters (stress signals)
  [/([a-z])\1{3,}/gi, '$1$1'],

  // Accents often missed
  [/\bproblem(e)?\b/gi, 'problème'],
  [/\bete\b/gi, 'été'],
  [/\bfenetre\b/gi, 'fenêtre'],
  [/\bserrure\b/gi, 'serrure'],
  [/\belectr/gi, 'électr'],
];

export function normalizeText(input: string): string {
  let t = input.trim();
  for (const [pattern, replacement] of CORRECTIONS) {
    t = t.replace(pattern, replacement);
  }
  return t;
}

// ─── Detect informal / oral speech markers ────────────────────────────────────

export function isInformalSpeech(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /\b(wesh|ouais|ouai|genre|truc|machin|bidule|chelou|relou|grave|trop|carrément|kiffer|bah|ben|hein|quoi\b)/
      .test(t) ||
    /[a-z]{4,}\s+(lol|mdr|xd|ptdr)/i.test(t) ||
    t.split(' ').length < 3
  );
}

// ─── Split multi-sentence messages ───────────────────────────────────────────

export function extractMainIntent(text: string): string {
  // Return first substantive sentence
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 2);
  if (sentences.length <= 1) return text;
  // Prefer the longest sentence as the "main" content
  return sentences.reduce((a, b) => (b.length > a.length ? b : a));
}
