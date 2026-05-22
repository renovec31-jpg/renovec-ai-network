import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const SYSTEM_PROMPT = `Tu es Ali, l'assistant virtuel de Renovec. Tu représentes le réseau Renovec — une présence active qui comprend les situations humaines et qui oriente vers les bonnes personnes.

Tu parles à quelqu'un qui vient d'arriver. Tu ne sais pas encore ce qu'il cherche. Ton rôle : accueillir, comprendre, rassurer, orienter.

IDENTITE :
- Tu t'appelles Ali. Si on te demande ton nom, tu dis "Je suis Ali, l'assistant virtuel de Renovec."
- Tu parles au nom du réseau Renovec. Tu es sa voix, son premier contact humain.

POSTURE :
- Tu es chaleureux, clair, crédible. Tu parles comme quelqu'un qui peut vraiment aider.
- Tu ne commences JAMAIS par tes limites. Tu ne parles pas de cooptation. Tu ne dis pas "je ne suis pas l'équipe". Tu ne te retires pas de la relation.
- Tu pars du visiteur. Tu t'intéresses à sa situation. Tu montres que tu comprends.
- Tu peux dire : "je peux t'aider à clarifier", "je comprends déjà ta situation", "je peux te montrer ce qui pourrait s'activer", "on part de toi".
- Tu ne promets pas une mise en relation automatique, mais tu ne fermes jamais la porte.

CE QUE TU FAIS :
- Tu comprends les situations humaines : besoin, coup de main, compétence à partager, urgence du quotidien
- Tu clarifies ce qui est flou
- Tu identifies qui pourrait correspondre dans le réseau
- Tu accompagnes, tu ne renvoies pas

CE QUE TU NE FAIS PAS :
- Tu ne dis JAMAIS "je suis juste la voix de" ou "je ne suis pas en mesure de"
- Tu ne parles pas de "cooptation" au premier contact
- Tu ne casses jamais l'élan du visiteur
- Tu ne fais pas de marketing, pas d'administration
- Tu ne poses pas 10 questions d'affilée
- Tu ne dis pas "Super !", "Avec plaisir !", "Je comprends tout à fait"

FORMAT : 1-2 phrases courtes, ton oral, en français. Pas de listes, pas de markdown.
LANGUE : français uniquement.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const rawHistory = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'message required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

    // Strict validation: keep only last 6 turns with valid role+content
    const validated = rawHistory
      .filter((m: unknown): m is { role: string; content: string } =>
        typeof m === 'object' && m !== null &&
        (('role' in m) && (m as { role: unknown }).role === 'user' || (m as { role: unknown }).role === 'assistant') &&
        (('content' in m) && typeof (m as { content: unknown }).content === 'string' && (m as { content: string }).content.length > 0)
      )
      .slice(-6)
      .map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content.slice(0, 500),
      }));

    // Build messages array, append new user message
    const allMessages = [...validated, { role: 'user' as const, content: message.slice(0, 500) }];

    // Deduplicate consecutive same-role (API requirement: alternating roles)
    const cleanMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    for (const m of allMessages) {
      if (cleanMessages.length === 0 || cleanMessages[cleanMessages.length - 1].role !== m.role) {
        cleanMessages.push(m);
      }
    }

    // Ensure first message is from user (API requirement)
    if (cleanMessages.length > 0 && cleanMessages[0].role !== 'user') {
      cleanMessages.shift();
    }

    // Fallback if somehow empty
    if (cleanMessages.length === 0) {
      cleanMessages.push({ role: 'user', content: message.slice(0, 500) });
    }

    const payload = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      system: SYSTEM_PROMPT,
      messages: cleanMessages,
    };

    const totalChars = SYSTEM_PROMPT.length + cleanMessages.reduce((s, m) => s + m.content.length, 0);
    console.log(`voice-welcome: ${cleanMessages.length} msgs, ${totalChars} chars total, roles: [${cleanMessages.map(m => m.role[0]).join(',')}]`);

    // Retry logic for transient errors (429, 529)
    const MAX_RETRIES = 3;
    let rawBody = '';
    let apiStatus = 0;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(payload),
      });

      apiStatus = apiResponse.status;
      rawBody = await apiResponse.text();
      console.log(`voice-welcome: attempt ${attempt + 1}, status=${apiStatus}, body_len=${rawBody.length}`);

      if (apiStatus === 429 || apiStatus === 529) {
        const delay = (attempt + 1) * 1000;
        console.log(`voice-welcome: retrying in ${delay}ms (${apiStatus} overloaded/rate-limited)`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      break;
    }

    if (apiStatus !== 200) {
      console.error('voice-welcome Anthropic final error:', apiStatus, rawBody.slice(0, 300));
      console.error('voice-welcome sent messages:', JSON.stringify(cleanMessages));
      return new Response(
        JSON.stringify({ reply: 'Un souci technique. Réessaie dans un instant.', debug: `${apiStatus}: ${rawBody.slice(0, 300)}` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let data;
    try {
      data = JSON.parse(rawBody);
    } catch {
      console.error('voice-welcome: failed to parse response JSON:', rawBody.slice(0, 200));
      return new Response(
        JSON.stringify({ reply: 'Je suis là.', debug: 'json_parse_fail' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const reply = data.content?.[0]?.type === 'text'
      ? data.content[0].text.trim()
      : 'Je suis là.';

    console.log(`voice-welcome: reply="${reply.slice(0, 60)}..."`);

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('voice-welcome catch error:', errorMsg);

    return new Response(
      JSON.stringify({ reply: 'Un souci technique. Réessaie dans un instant.', debug: errorMsg }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
