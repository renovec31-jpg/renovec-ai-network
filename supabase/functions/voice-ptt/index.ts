/**
 * voice-ptt — Push-to-Talk pipeline
 *
 * POST application/json
 *   { audio: string (base64), mimeType: string, history: [{role, content}] }
 *
 * Pipeline:
 *   1. Whisper-1  — base64 audio → transcript
 *   2. Claude     — transcript + history → short reply text
 *   3. OpenAI TTS — reply text → mp3 base64
 *
 * Returns JSON: { transcript, reply, audio: base64 mp3 }
 */

import Anthropic from 'npm:@anthropic-ai/sdk@0.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const SYSTEM_PROMPT = `Tu connais bien RENOVEC et tu parles à quelqu'un qui le découvre.
Tu parles simplement, comme dans une vraie conversation.

CE QU'EST RENOVEC — CADRAGE EXACT
RENOVEC est un réseau de coordination de situations humaines.
Quand quelqu'un a un besoin, une capacité, un service, un objet à proposer ou un problème à résoudre, il le pose dans le réseau.
RENOVEC identifie qui peut y répondre et crée la mise en relation.
Parfois c'est une personne. Parfois c'est une structure, une association, une entreprise locale, un collectif.
Parfois c'est proche géographiquement. Parfois c'est à distance. Ça dépend de ce que la situation demande.

CE QUE RENOVEC N'EST PAS
Ce n'est pas un site d'annonces. Pas un réseau de voisinage. Pas AlloVoisins.
RENOVEC part d'une situation humaine et cherche la bonne coordination, qu'elle soit locale ou pas.

QUI PEUT FAIRE PARTIE DU RÉSEAU
Des personnes, mais aussi des structures : associations, entreprises locales, collectifs, organisations de terrain, petites sociétés, professionnels indépendants.
On apparaît quand on a quelque chose d'utile dans une situation réelle — pas pour se faire connaître.

CONFIANCE ET SÉCURITÉ
Les gens entrent par cooptation, donc il y a presque toujours quelqu'un de connu en commun.
Les échanges laissent une trace, donc les comportements se régulent.

GRATUIT OU PAYANT
Ça dépend de ce qui est échangé. Certaines aides sont gratuites, certaines sont rémunérées, certaines fonctionnent en échange.

RÈGLES DE LANGAGE — NON NÉGOCIABLES
1. Maximum 2 phrases courtes par réponse. Une seule si c'est suffisant.
2. Jamais de listes, jamais de tirets, jamais de structure écrite.
3. Jamais : "Bien sûr", "Absolument", "Je comprends parfaitement", "C'est une excellente question".
4. Jamais : "tissu humain", "les bonnes présences", "dans ton quartier", "entre voisins", "à deux rues".
5. Tu (deuxième personne du singulier). Ton calme, direct, intelligent.
6. Si tu ne sais pas, dis-le. Rien d'exagéré, rien de promis qui ne peut pas être tenu.

LANGUE: français uniquement.`;

// Base64 → Uint8Array (Deno-compatible)
function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ArrayBuffer → base64 string
function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary  = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST required' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const openaiKey    = Deno.env.get('OPENAI_API_KEY');
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!openaiKey)    throw new Error('OPENAI_API_KEY not configured');
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const body = await req.json() as {
      audio?:           string;
      mimeType?:        string;
      transcript?:      string;
      transcribe_only?: boolean;
      history?:         { role: string; content: string }[];
    };

    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];

    let transcript: string;

    if (body.transcript) {
      // ── Web Speech fallback: transcript provided directly, skip Whisper ──
      transcript = body.transcript.trim();
    } else if (body.audio) {
      // ── 1. Whisper STT ────────────────────────────────────────────────────
      const mimeType = body.mimeType || 'audio/webm';
      const audioBytes = base64ToUint8Array(body.audio);
      const audioBlob  = new Blob([audioBytes], { type: mimeType });

      const extMap: Record<string, string> = {
        'audio/webm':  'webm',
        'audio/ogg':   'ogg',
        'audio/mp4':   'mp4',
        'audio/mpeg':  'mp3',
        'audio/wav':   'wav',
        'audio/x-m4a': 'm4a',
      };
      const mimeBase = mimeType.split(';')[0].trim();
      const ext      = extMap[mimeBase] ?? 'webm';

      const whisperForm = new FormData();
      whisperForm.append('file', new File([audioBlob], `audio.${ext}`, { type: mimeBase }));
      whisperForm.append('model', 'whisper-1');
      whisperForm.append('language', 'fr');
      whisperForm.append('response_format', 'json');

      let whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiKey}` },
        body: whisperForm,
      });

      if (whisperRes.status === 429) {
        await new Promise(r => setTimeout(r, 1500));
        const whisperForm2 = new FormData();
        whisperForm2.append('file', new File([audioBlob], `audio.${ext}`, { type: mimeBase }));
        whisperForm2.append('model', 'whisper-1');
        whisperForm2.append('language', 'fr');
        whisperForm2.append('response_format', 'json');
        whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openaiKey}` },
          body: whisperForm2,
        });
      }

      if (!whisperRes.ok) {
        const errText = await whisperRes.text();
        console.error('Whisper error:', whisperRes.status, errText);
        if (whisperRes.status === 429) {
          return new Response(JSON.stringify({ error: 'rate_limited' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`whisper_${whisperRes.status}`);
      }

      const { text: whisperText } = await whisperRes.json() as { text: string };
      transcript = whisperText?.trim() ?? '';
    } else {
      return new Response(JSON.stringify({ error: 'audio or transcript field required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Silence ou inaudible
    if (!transcript) {
      if (body.transcribe_only) {
        return new Response(JSON.stringify({ transcript: '' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const silenceReply = 'Je ne t\'ai pas bien entendu. Tu peux répéter ?';
      const silenceAudio = await textToSpeech(silenceReply, openaiKey);
      return new Response(JSON.stringify({
        transcript: '',
        reply: silenceReply,
        audio: arrayBufferToBase64(silenceAudio),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Transcribe-only mode: return transcript without Claude reply or TTS
    if (body.transcribe_only) {
      return new Response(JSON.stringify({ transcript: transcript.trim() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Claude reply ─────────────────────────────────────────────────────
    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const messages: Anthropic.MessageParam[] = [
      ...history.map(t => ({
        role: t.role as 'user' | 'assistant',
        content: t.content,
      })),
      { role: 'user', content: transcript.trim() },
    ];

    const claudeRes = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 100,
      system: SYSTEM_PROMPT,
      messages,
    });

    const reply = claudeRes.content[0]?.type === 'text'
      ? claudeRes.content[0].text.trim()
      : 'Je suis là.';

    // ── 3. OpenAI TTS ───────────────────────────────────────────────────────
    const mp3 = await textToSpeech(reply, openaiKey);

    return new Response(JSON.stringify({
      transcript: transcript.trim(),
      reply,
      audio: arrayBufferToBase64(mp3),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('voice-ptt error:', err);
    return new Response(JSON.stringify({ error: 'pipeline_error', detail: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function textToSpeech(text: string, apiKey: string): Promise<ArrayBuffer> {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'tts-1', voice: 'alloy', input: text, speed: 0.95, response_format: 'mp3' }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('TTS error:', res.status, err);
    throw new Error(`tts_${res.status}`);
  }
  return res.arrayBuffer();
}
