import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { needId, rawText } = await req.json();

    if (!rawText) {
      return new Response(JSON.stringify({ error: "rawText is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Tu es un coordinateur senior de RENOVEC, un réseau humain de résolution de situations. Tu n'es PAS un assistant IA généraliste — tu es une présence expérimentée, calme, attentive.

Quelqu'un vient d'exprimer la situation suivante :
"${rawText}"

Ta mission : comprendre réellement ce qui se passe, pas cataloguer un besoin.

TON RÔLE :
- Lire entre les lignes, détecter ce qui est dit et ce qui ne l'est pas encore
- Identifier l'émotion implicite (urgence, anxiété, doute, épuisement, espoir)
- Reformuler avec intelligence émotionnelle — pas juste paraphraser
- Poser exactement 2 à 3 questions contextuelles, pas génériques
- Chaque question doit montrer que tu as lu et compris la situation spécifique
- Les questions ne doivent jamais être interchangeables avec une autre situation
- Le ton est calme, professionnel, humain — ni chatbot, ni administratif

EXEMPLES DE MAUVAISES QUESTIONS (ne jamais faire) :
- "Quel est votre besoin ?"
- "Précisez votre demande."
- "Depuis combien de temps avez-vous ce problème ?"
- "Avez-vous déjà essayé des solutions ?"

EXEMPLES DE BONNES QUESTIONS (ce que tu dois produire) :
Pour "ma mère ne peut plus ouvrir sa porte" →
  "Est-ce que votre mère est actuellement bloquée à l'intérieur du logement, ou elle est sortie mais ne peut plus rentrer ?"

Pour "je dois choisir entre deux offres d'emploi et je n'arrive pas à décider" →
  "Ce qui semble bloquer — est-ce que c'est la peur de regretter, ou quelque chose dans l'une des offres qui n'est pas encore clair pour vous ?"

Pour "j'ai une fuite dans ma salle de bain depuis hier soir" →
  "L'eau coule encore activement, ou c'est une infiltration qui a l'air de s'être stabilisée ?"

Pour "je suis épuisé professionnellement et je ne sais plus quoi faire" →
  "Quand vous dites que vous ne savez plus quoi faire — vous cherchez à partir, à tenir, ou à comprendre ce qui s'est passé ?"

RÈGLES POUR LE summary :
- 1-2 phrases, première personne coordinateur
- Montre que tu as compris l'essentiel
- Commence par "On comprend que..." ou "Il y a ici..." ou "Ce qui se passe..."
- Soyez humain, pas analytique

RÈGLES POUR reformulated_objective :
- Ce que la personne a vraiment besoin d'accomplir
- Orienté mouvement, pas description
- Ex: "Retrouver de la clarté pour prendre une décision qui tienne dans le temps" et non "Décider entre deux options"

RÈGLES POUR les questions :
- Maximum 3 questions
- Chaque question est spécifique à CE QUI A ÉTÉ ÉCRIT
- Référence aux détails concrets mentionnés
- Ne jamais demander ce qui est déjà dit
- Ordre : d'abord l'essentiel immédiat, puis le contexte, puis les contraintes si nécessaire
- Une question à la fois — pas de double question dans une même phrase

Produis UNIQUEMENT ce JSON (pas de texte avant ou après) :

{
  "summary": "Ce que tu as compris en 1-2 phrases naturelles",
  "reformulated_objective": "L'objectif profond formulé en 1 phrase orientée action",
  "context_description": "Le contexte en 1-2 phrases, empathique et précis",
  "urgency_level": "low|normal|high|urgent",
  "missing_info": ["ce qui manque pour orienter correctement"],
  "vigilance_points": ["si quelque chose mérite attention particulière, sinon tableau vide"],
  "recommended_format": "Échange oral|Diagnostic écrit|Accompagnement sur plusieurs échanges|Mission courte",
  "suggested_questions": [
    {"id": "q1", "question": "Ta première question — la plus importante, la plus contextuelle"},
    {"id": "q2", "question": "Ta deuxième question si vraiment nécessaire"},
    {"id": "q3", "question": "Ta troisième question uniquement si les deux premières ne suffisent pas"}
  ]
}`;

    const openAIKey = Deno.env.get("OPENAI_API_KEY");

    if (!openAIKey) {
      const fallback = buildSmartFallback(rawText);
      return new Response(JSON.stringify(fallback), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Tu es un coordinateur humain expérimenté. Tu lis les situations avec attention. Tu poses des questions contextuelles, jamais génériques. Ton ton est calme, professionnel, humain. Tu réponds UNIQUEMENT en JSON valide.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 900,
      }),
    });

    if (!response.ok) {
      const fallback = buildSmartFallback(rawText);
      return new Response(JSON.stringify(fallback), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "{}";

    // Strip markdown code fences if present
    const cleaned = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = buildSmartFallback(rawText);
    }

    // Ensure at most 3 questions
    if (parsed.suggested_questions?.length > 3) {
      parsed.suggested_questions = parsed.suggested_questions.slice(0, 3);
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Smart contextual fallback — reads the raw text and generates situated questions
function buildSmartFallback(rawText: string) {
  const text = rawText.toLowerCase();

  // Detect emotional/contextual signals
  const isUrgent = /urgent|immédiat|asap|vite|rapidement|ce soir|ce matin|maintenant|tout de suite/.test(text);
  const isBlocked = /bloqué|coincé|bloque|coincée|ne peut plus|plus capable|plus possible/.test(text);
  const isDecision = /décision|choisir|hésit|option|ou bien|ou plutôt|entre les deux|deux possibilités/.test(text);
  const isTechnical = /technique|panne|bug|problème|marche plus|fonctionne pas|répar|cassé/.test(text);
  const isLeak = /fuite|eau|coule|infiltr|humidité/.test(text);
  const isProfessional = /travail|emploi|poste|mission|reconversion|carrière|chef|collègue|entreprise|démission|licenci/.test(text);
  const isExhausted = /épuisé|épuisement|burnout|plus la force|fatigue|n'en peux plus|à bout/.test(text);
  const isRelational = /conflit|tension|relation|plus se parle|mésentente|association|associé|rupture|séparation/.test(text);
  const isFinancial = /argent|finance|comptabilité|bilan|trésorerie|dette|banque|investissement/.test(text);
  const isPerson = /mère|père|enfant|fils|fille|mari|femme|parent|proche|personne âgée/.test(text);
  const isSelf = /je ne sais plus|je ne comprends plus|je n'arrive pas|j'ai du mal|je me sens/.test(text);

  // Build contextual summary
  let summary: string;
  if (isPerson && isBlocked) {
    const who = text.includes('mère') ? 'votre mère' : text.includes('père') ? 'votre père' : text.includes('enfant') ? 'votre enfant' : 'un proche';
    summary = `On comprend que ${who} se retrouve dans une situation de blocage et que vous cherchez à l'aider rapidement.`;
  } else if (isLeak) {
    summary = `Il y a ici une situation d'urgence pratique — une fuite qui mérite une réponse rapide pour éviter que la situation s'aggrave.`;
  } else if (isDecision && isProfessional) {
    summary = `Ce qui se passe, c'est une décision professionnelle importante à prendre — avec probablement des enjeux qui dépassent la simple comparaison d'options.`;
  } else if (isExhausted) {
    summary = `On perçoit ici un épuisement réel. Avant d'aller vers une solution, il y a peut-être besoin de nommer ce qui s'est passé.`;
  } else if (isRelational) {
    summary = `Il y a une tension relationnelle ici — une conversation qui n'a pas pu avoir lieu, ou un désaccord qui a durci avec le temps.`;
  } else if (isTechnical) {
    summary = `On comprend qu'il y a un problème technique récurrent ou bloquant. La priorité est d'identifier ce qui n'a pas encore été regardé au bon endroit.`;
  } else if (isDecision) {
    summary = `Ce qui se passe c'est une décision difficile à prendre — pas parce que les options sont floues, mais parce que quelque chose d'important n'est pas encore clair.`;
  } else if (isSelf) {
    summary = `On entend une forme de perte de repères — quelque chose s'est déplacé et il est difficile de nommer exactement quoi.`;
  } else {
    const short = rawText.length > 80 ? rawText.substring(0, 80) + "…" : rawText;
    summary = `On comprend la situation : ${short}. On va essayer de mieux cerner ce qui est vraiment en jeu.`;
  }

  // Build contextual objective
  let objective: string;
  if (isDecision) {
    objective = isProfessional
      ? "Retrouver de la clarté pour prendre une décision professionnelle qui tienne dans le temps."
      : "Voir assez clair pour choisir sans regretter.";
  } else if (isLeak || (isTechnical && isUrgent)) {
    objective = "Stabiliser la situation et trouver rapidement la bonne intervention.";
  } else if (isExhausted) {
    objective = "Retrouver un espace pour comprendre ce qui s'est passé et envisager ce qui peut bouger.";
  } else if (isRelational) {
    objective = "Rendre possible une conversation ou une résolution qui semblait bloquée.";
  } else if (isTechnical) {
    objective = "Identifier la vraie cause du problème et trouver une approche de résolution adaptée.";
  } else if (isFinancial) {
    objective = "Comprendre la situation financière pour pouvoir décider ou agir avec clarté.";
  } else {
    objective = "Clarifier ce qui est vraiment en jeu et trouver l'appui humain le plus pertinent pour avancer.";
  }

  // Build contextual questions — always anchored in what was said
  const questions: Array<{ id: string; question: string }> = [];

  if (isLeak) {
    questions.push({ id: "q1", question: "L'eau coule encore activement en ce moment, ou c'est une infiltration qui semble s'être stabilisée ?" });
    questions.push({ id: "q2", question: "Est-ce qu'il y a un risque d'atteindre les pièces ou les murs voisins si ça continue ?" });
  } else if (isPerson && isBlocked) {
    const who = text.includes('mère') ? 'votre mère' : text.includes('père') ? 'votre père' : 'la personne';
    questions.push({ id: "q1", question: `${who.charAt(0).toUpperCase() + who.slice(1)} est actuellement bloquée à l'intérieur, ou elle n'arrive pas à rentrer depuis l'extérieur ?` });
    questions.push({ id: "q2", question: `Est-ce que vous êtes sur place, ou vous essayez de gérer ça à distance ?` });
  } else if (isDecision && isProfessional) {
    questions.push({ id: "q1", question: "Ce qui bloque la décision — c'est la peur de regretter, ou il y a quelque chose dans l'une des options qui n'est pas encore clair ?" });
    questions.push({ id: "q2", question: "Est-ce qu'il y a une date limite ou une pression externe qui pousse à décider maintenant ?" });
  } else if (isExhausted) {
    questions.push({ id: "q1", question: "Quand vous dites que vous n'en pouvez plus — vous cherchez à partir, à tenir encore un moment, ou à comprendre ce qui a mené là ?" });
    questions.push({ id: "q2", question: "Est-ce qu'il y a quelqu'un autour de vous qui est au courant de ce que vous traversez en ce moment ?" });
  } else if (isRelational) {
    questions.push({ id: "q1", question: "Est-ce que les deux parties sont encore en contact, ou il y a eu une rupture de communication ?" });
    questions.push({ id: "q2", question: "Ce que vous cherchez — plutôt un terrain d'entente, ou une façon de sortir proprement de cette relation ?" });
  } else if (isTechnical) {
    questions.push({ id: "q1", question: "Ce problème — c'est la première fois qu'il arrive, ou il revient de manière récurrente malgré des tentatives de correction ?" });
    questions.push({ id: "q2", question: "Est-ce qu'il y a eu des changements récents dans l'environnement juste avant que le problème apparaisse ?" });
  } else if (isDecision) {
    questions.push({ id: "q1", question: "Ce qui rend la décision difficile — c'est un manque d'information, ou vous avez toutes les informations mais quelque chose d'autre bloque ?" });
    questions.push({ id: "q2", question: "Il y a une contrainte de temps sur cette décision ?" });
  } else if (isFinancial) {
    questions.push({ id: "q1", question: "Est-ce que vous cherchez à comprendre votre situation pour la première fois, ou vous avez déjà des éléments mais quelque chose ne colle pas ?" });
    questions.push({ id: "q2", question: "Il y a une échéance proche — banque, bilan, déclaration — qui donne une urgence à la situation ?" });
  } else if (isProfessional) {
    questions.push({ id: "q1", question: "Ce qui vous a amené à exprimer ça maintenant — quelque chose vient de se passer, ou c'est une situation qui dure depuis un moment ?" });
    questions.push({ id: "q2", question: "Vous cherchez à changer quelque chose dans ce travail, ou vous explorez l'idée d'une transition vers autre chose ?" });
  } else {
    // Generic but still contextual
    const firstWords = rawText.split(/\s+/).slice(0, 8).join(" ");
    questions.push({ id: "q1", question: `Quand vous dites "${firstWords}…" — qu'est-ce qui vous a amené à l'exprimer maintenant plutôt qu'avant ?` });
    questions.push({ id: "q2", question: "Est-ce qu'il y a une contrainte de temps ou une pression qui rend cette situation plus urgente en ce moment ?" });
  }

  // Always a third question about what has already been tried — but contextual
  if (questions.length < 3) {
    if (isTechnical || isLeak) {
      questions.push({ id: "q3", question: "Quelqu'un a déjà regardé le problème avant vous, ou c'est la première intervention ?" });
    } else if (isDecision || isProfessional || isExhausted) {
      questions.push({ id: "q3", question: "Y a-t-il quelqu'un dans votre entourage à qui vous en avez parlé, ou vous gérez ça seul pour l'instant ?" });
    }
  }

  return {
    summary,
    reformulated_objective: objective,
    context_description: isUrgent
      ? "La situation a une dimension d'urgence. Le réseau va s'organiser pour éviter qu'elle s'aggrave."
      : "Une situation qui mérite d'être explorée avec soin avant d'orienter vers les capacités humaines les plus pertinentes.",
    urgency_level: isUrgent || isLeak ? "high" : isPerson && isBlocked ? "high" : isDecision && isUrgent ? "high" : "normal",
    missing_info: ["Contexte précis de la situation", "Contraintes temporelles ou externes"],
    vigilance_points: isUrgent || isLeak ? ["Situation potentiellement urgente — réponse rapide prioritaire"] : [],
    recommended_format: isDecision || isExhausted || isRelational
      ? "Échange oral"
      : isTechnical
      ? "Diagnostic écrit"
      : "Échange oral",
    suggested_questions: questions.slice(0, 3),
  };
}
