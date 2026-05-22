/**
 * discover-signals — External discovery + AI qualification engine
 *
 * POST { situationText: string, domain?: string, location?: string, needId?: string }
 *
 * Requires: Authorization: Bearer <user JWT>
 * userId is extracted from the verified JWT — never from the request body.
 */

import Anthropic from 'npm:@anthropic-ai/sdk@0.51.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
}

interface ExternalSignal {
  id?: string;
  signal_type: 'person' | 'structure' | 'resource' | 'offer';
  source_platform: string;
  source_url?: string;
  display_name: string;
  tagline: string;
  summary: string;
  capabilities: string[];
  domains: string[];
  location_hint?: string;
  is_local: boolean;
  confidence_score: number;
  freshness_score: number;
  relevance_tags: string[];
  source_status: string;
  conversion_status: string;
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
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    const tavilyKey    = Deno.env.get('TAVILY_API_KEY');
    const supabaseUrl  = Deno.env.get('SUPABASE_URL')!;
    const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey      = Deno.env.get('SUPABASE_ANON_KEY')!;

    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured');

    // ── Auth: extract userId from JWT ────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');

    if (!jwt) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify JWT by calling Supabase auth with user-scoped client
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    const body = await req.json() as {
      situationText: string;
      domain?: string;
      location?: string;
      needId?: string;
    };

    if (!body.situationText?.trim()) {
      return new Response(JSON.stringify({ error: 'situationText required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify needId belongs to authenticated user (if provided)
    const supabase = createClient(supabaseUrl, serviceKey);

    if (body.needId) {
      const { data: need } = await supabase
        .from('needs')
        .select('id')
        .eq('id', body.needId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!need) {
        return new Response(JSON.stringify({ error: 'need_not_found' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    // ── Step 1: Claude generates targeted search queries ─────────────────────
    const queryGenRes = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Tu es un moteur de découverte pour RENOVEC, un réseau de coordination humaine.

Une personne a exprimé cette situation :
"${body.situationText}"

${body.domain ? `Domaine détecté : ${body.domain}` : ''}
${body.location ? `Localisation : ${body.location}` : ''}

Génère 3 requêtes de recherche web en français pour trouver :
- Des personnes, professionnels, bénévoles qui aident dans ce contexte
- Des structures, associations, organisations pertinentes
- Des ressources, guides, offres utiles pour cette situation

Réponds UNIQUEMENT avec un JSON valide de cette forme exacte :
{
  "queries": ["requête 1", "requête 2", "requête 3"],
  "intent_summary": "courte phrase décrivant ce qu'on cherche"
}`,
      }],
    });

    let queries: string[] = [];
    let intentSummary = body.situationText.substring(0, 60);

    try {
      const raw = queryGenRes.content[0]?.type === 'text' ? queryGenRes.content[0].text : '{}';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        queries = parsed.queries || [];
        intentSummary = parsed.intent_summary || intentSummary;
      }
    } catch { /* use defaults */ }

    if (queries.length === 0) {
      queries = [body.situationText.substring(0, 100)];
    }

    // ── Step 2: Web search via Tavily ─────────────────────────────────────────
    let searchResults: SearchResult[] = [];

    if (tavilyKey) {
      const searchPromises = queries.slice(0, 3).map(async (query) => {
        try {
          const res = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: tavilyKey,
              query,
              search_depth: 'basic',
              max_results: 4,
              include_answer: false,
              include_raw_content: false,
            }),
          });
          if (!res.ok) return [];
          const data = await res.json() as { results?: SearchResult[] };
          return data.results || [];
        } catch { return []; }
      });

      const allResults = await Promise.all(searchPromises);
      const seen = new Set<string>();
      for (const batch of allResults) {
        for (const r of batch) {
          if (!seen.has(r.url)) {
            seen.add(r.url);
            searchResults.push(r);
          }
        }
      }
    }

    // ── Step 3: Claude qualifies results ─────────────────────────────────────
    let signals: ExternalSignal[] = [];

    if (searchResults.length > 0) {
      const qualifyRes = await anthropic.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 1800,
        messages: [{
          role: 'user',
          content: `Tu qualifies des résultats de recherche pour RENOVEC, un réseau de coordination humaine.

Situation de l'utilisateur : "${body.situationText}"

Résultats web à analyser :
${searchResults.slice(0, 8).map((r, i) => `[${i+1}] ${r.title}\nURL: ${r.url}\nContenu: ${r.content?.substring(0, 300)}`).join('\n\n')}

Pour chaque résultat pertinent, crée un signal externe qualifié. Ignore les résultats hors-sujet ou les articles génériques.

RÈGLES :
- signal_type: 'person' | 'structure' | 'resource' | 'offer'
- confidence_score: 0.0-1.0
- freshness_score: 0.0-1.0
- Ne jamais inventer de coordonnées personnelles

Réponds UNIQUEMENT avec un JSON valide :
{
  "signals": [
    {
      "signal_type": "structure",
      "source_platform": "web",
      "source_url": "https://...",
      "display_name": "Nom",
      "tagline": "Ce qu'ils font",
      "summary": "Description complète",
      "capabilities": ["cap1", "cap2"],
      "domains": ["domaine1"],
      "location_hint": null,
      "is_local": false,
      "confidence_score": 0.75,
      "freshness_score": 0.6,
      "relevance_tags": ["tag1"]
    }
  ]
}`,
        }],
      });

      try {
        const raw = qualifyRes.content[0]?.type === 'text' ? qualifyRes.content[0].text : '{}';
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          signals = (parsed.signals || []).filter((s: ExternalSignal) => s.confidence_score >= 0.4);
        }
      } catch { /* continue */ }
    }

    // ── Step 4: Synthetic signals fallback ───────────────────────────────────
    if (signals.length === 0) {
      const syntheticRes = await anthropic.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 1800,
        messages: [{
          role: 'user',
          content: `Tu génères des signaux de capacités réalistes pour RENOVEC.

Situation : "${body.situationText}"
${body.domain ? `Domaine : ${body.domain}` : ''}

Génère 4-6 signaux externes plausibles — des types de structures, ressources ou profils qui existent vraiment en France pour ce type de situation.

Réponds UNIQUEMENT avec un JSON valide :
{
  "signals": [
    {
      "signal_type": "structure",
      "source_platform": "annuaire",
      "source_url": null,
      "display_name": "Nom réaliste",
      "tagline": "Ce qu'ils apportent concrètement",
      "summary": "Description précise",
      "capabilities": ["cap1", "cap2"],
      "domains": ["domaine"],
      "location_hint": null,
      "is_local": false,
      "confidence_score": 0.65,
      "freshness_score": 0.5,
      "relevance_tags": ["tag"]
    }
  ]
}`,
        }],
      });

      try {
        const raw = syntheticRes.content[0]?.type === 'text' ? syntheticRes.content[0].text : '{}';
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          signals = (parsed.signals || []).filter((s: ExternalSignal) => s.confidence_score >= 0.4);
        }
      } catch { /* empty */ }
    }

    // ── Step 5: Persist signals ───────────────────────────────────────────────
    const persistedSignals: ExternalSignal[] = [];

    for (const signal of signals) {
      const payload = {
        signal_type:      signal.signal_type || 'structure',
        source_platform:  signal.source_platform || 'web',
        source_url:       signal.source_url || null,
        display_name:     signal.display_name || 'Source externe',
        tagline:          signal.tagline || '',
        summary:          signal.summary || '',
        capabilities:     signal.capabilities || [],
        domains:          signal.domains || [],
        location_hint:    signal.location_hint || null,
        is_local:         signal.is_local || false,
        confidence_score: Math.min(1, Math.max(0, signal.confidence_score || 0.5)),
        freshness_score:  Math.min(1, Math.max(0, signal.freshness_score || 0.5)),
        relevance_tags:   signal.relevance_tags || [],
        raw_signal:       { queries, intentSummary, source: signal.source_url || null },
        source_status:    'qualified',
        conversion_status: 'none',
        updated_at:       new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('external_signals')
        .insert(payload)
        .select('id')
        .maybeSingle();

      if (!error && data) {
        persistedSignals.push({ ...payload, id: data.id } as ExternalSignal);
      }
    }

    // ── Step 6: Log discovery run ─────────────────────────────────────────────
    let discoveryRunId: string | null = null;

    if (body.needId) {
      const { data: run } = await supabase
        .from('signal_discovery_runs')
        .insert({
          need_id:       body.needId,
          user_id:       userId,
          query_text:    body.situationText.substring(0, 500),
          signals_found: persistedSignals.length,
        })
        .select('id')
        .maybeSingle();

      discoveryRunId = run?.id || null;
    }

    return new Response(JSON.stringify({
      signals: persistedSignals,
      discoveryRunId,
      intentSummary,
      queriesUsed: queries,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('discover-signals error:', err);
    return new Response(JSON.stringify({ error: 'discovery_error', detail: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
