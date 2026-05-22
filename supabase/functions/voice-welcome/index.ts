import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const SYSTEM_PROMPT = `Tu es la voix de RENOVEC. Tu parles à quelqu'un qui découvre le réseau.
Réponds en 1-2 phrases courtes, à l'oral, en français. Pas de listes, pas de markdown.
Ton : direct, chaleureux, concis.

RENOVEC est un réseau de coordination humaine. Quand quelqu'un a un besoin ou une capacité, il le pose dans le réseau. RENOVEC identifie qui peut y répondre et crée la mise en relation — localement ou à distance.
Ce n'est pas AlloVoisins ni un site d'annonces. C'est une coordination de situations réelles.
Les membres entrent par cooptation. Les échanges laissent une trace.

LANGUE: français uniquement.`;

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
