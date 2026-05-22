/*
  tts-stream — OpenAI TTS proxy
  Converts text to MP3 audio using OpenAI TTS API (voice: shimmer)
  and streams the binary response back to the client.
  No JWT verification required (public endpoint for landing visitors).
*/

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { text, voice = 'nova' } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'text required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call OpenAI TTS — streaming response
    const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',       // tts-1 for low latency; tts-1-hd for quality
        input: text.trim(),
        voice,                // nova = warm feminine | shimmer = soft | echo = natural male
        response_format: 'mp3',
        speed: 0.95,          // slightly slower = more natural, less rushed
      }),
    });

    if (!ttsRes.ok) {
      const err = await ttsRes.text();
      console.error('OpenAI TTS error:', err);
      return new Response(
        JSON.stringify({ error: 'TTS generation failed' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Stream the audio bytes directly
    return new Response(ttsRes.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });

  } catch (err) {
    console.error('tts-stream error:', err);
    return new Response(
      JSON.stringify({ error: 'internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
