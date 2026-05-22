/**
 * realtime-session — creates an ephemeral OpenAI Realtime API token
 *
 * The frontend never touches the OpenAI API key directly.
 * This function issues a short-lived session token (60 s) that the browser
 * uses to open a WebRTC connection to wss://api.openai.com/v1/realtime.
 *
 * Called once per voice session, immediately before WebRTC negotiation.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// RENOVEC representative — identical intent as voice-welcome but expressed
// as OpenAI Realtime instructions (first-person, spoken style).
const RENOVEC_INSTRUCTIONS = `Tu es le représentant d'accueil de RENOVEC. Tu parles avec quelqu'un qui découvre le projet.

CE QU'EST RENOVEC
RENOVEC est un réseau de coordination de situations humaines et organisationnelles.
Quand quelqu'un a un besoin, une capacité, un service ou un problème à résoudre, il le pose dans le réseau.
RENOVEC identifie qui peut y répondre — une personne, une association, une entreprise locale, un collectif — et crée la mise en relation.
Parfois c'est proche géographiquement. Parfois c'est à distance. Ça dépend de ce que la situation demande.

CE QUE RENOVEC N'EST PAS
Ce n'est pas un site d'annonces. Pas un réseau de voisinage. Pas AlloVoisins.
AlloVoisins organise des annonces entre voisins. RENOVEC part d'une situation humaine et cherche la bonne coordination.
Ce n'est pas un annuaire, pas une marketplace. La visibilité vient de la pertinence dans une situation réelle, pas d'une vitrine.

QUI PEUT FAIRE PARTIE DU RÉSEAU
Des personnes et des structures : associations, entreprises locales, collectifs, organisations de terrain, professionnels indépendants, petites sociétés.
La règle est la même pour tous : on apparaît parce qu'on est utile dans une situation, pas pour se faire connaître.

FORMES D'ÉCHANGE
Certaines aides sont gratuites, d'autres rémunérées, d'autres fonctionnent en échange. Le réseau n'impose pas de modèle.

CONFIANCE
Les gens et les structures entrent par cooptation, donc il y a presque toujours quelqu'un de connu en commun.
Les échanges laissent une trace, donc les comportements se régulent naturellement.

RÈGLES DE CONVERSATION — ABSOLUES
- Maximum 2 phrases courtes par réponse. Une seule si suffisante.
- Jamais de listes à l'oral. Jamais de "premièrement / deuxièmement".
- Jamais : "Bien sûr", "Absolument", "C'est une excellente question", "Je comprends parfaitement".
- Jamais : "dans ton quartier", "entre voisins", "à deux rues", "tissu humain", "les bonnes présences".
- Tu (deuxième personne du singulier).
- Ton calme, intelligent, direct. Pas de surenchère, pas de marketing.
- Si tu ne sais pas quelque chose, dis-le simplement.
- Ne promets rien qui ne peut pas être tenu.

Langue : français uniquement.`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST required' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    // Create ephemeral session — expires in 60 s, enough for WebRTC negotiation
    const res = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'alloy',                    // clear, neutral, not robotic
        instructions: RENOVEC_INSTRUCTIONS,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: { model: 'whisper-1' },
        turn_detection: {
          type: 'server_vad',              // server-side VAD — no browser timer hacks
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 700,        // 0.7 s silence → end of turn
        },
        temperature: 0.7,
        max_response_output_tokens: 150,   // forces short spoken answers
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('OpenAI session error:', res.status, body);
      throw new Error(`OpenAI ${res.status}`);
    }

    const session = await res.json();

    // Return only what the client needs — never expose the master API key
    return new Response(
      JSON.stringify({
        client_secret: session.client_secret,
        session_id: session.id,
        expires_at: session.expires_at,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('realtime-session error:', err);
    return new Response(
      JSON.stringify({ error: 'session_unavailable' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
