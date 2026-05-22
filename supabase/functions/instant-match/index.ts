import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.51.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PublicProfile {
  id: string;
  initial: string;
  title: string;
  profile_type: string;
  city: string;
  availability: string;
  explicit_capabilities: string[];
  implicit_capabilities: string[];
  success_contexts: string[];
  help_formats: string[];
  sav_points: number;
  vitrine_hero_title: string;
  vitrine_pitch: string;
  vitrine_services: Array<{ title: string; description: string; price_hint: string; format: string; highlight: boolean }>;
  vitrine_badges: string[];
  vitrine_response_time: string;
}

interface ScoredProfile extends PublicProfile {
  match_score: number;
  match_reasons: string[];
  match_summary: string;
}

interface AIMatchResult {
  need_reformulation: string;
  need_category: string;
  top_ids: Array<{
    id: string;
    score: number;
    reasons: string[];
    summary: string;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { need_text, city_hint } = await req.json();

    if (!need_text || typeof need_text !== "string" || need_text.trim().length < 5) {
      return new Response(JSON.stringify({ error: "need_text required (min 5 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use anon client — no auth header needed, public data only
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    // Fetch a broad candidate pool from public view (no PII)
    let query = supabase
      .from("public_matching_profiles")
      .select("*")
      .order("sav_points", { ascending: false })
      .limit(60);

    // If city hint provided, prefer local profiles
    if (city_hint) {
      query = supabase
        .from("public_matching_profiles")
        .select("*")
        .ilike("city", `%${city_hint}%`)
        .order("sav_points", { ascending: false })
        .limit(30);
    }

    const { data: candidates } = await query;
    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ profiles: [], need_reformulation: need_text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If no local results, fill with global
    let pool = candidates as PublicProfile[];
    if (city_hint && pool.length < 20) {
      const { data: global } = await supabase
        .from("public_matching_profiles")
        .select("*")
        .order("sav_points", { ascending: false })
        .limit(40);
      const existing = new Set(pool.map((p) => p.id));
      const extras = (global as PublicProfile[]).filter((p) => !existing.has(p.id));
      pool = [...pool, ...extras].slice(0, 60);
    }

    // Build a compact profile summary for AI (no PII)
    const profileSummaries = pool.map((p) => ({
      id: p.id,
      title: p.title,
      city: p.city,
      avail: p.availability,
      caps: [...(p.explicit_capabilities ?? []), ...(p.implicit_capabilities ?? [])].slice(0, 6),
      contexts: (p.success_contexts ?? []).slice(0, 3),
      formats: (p.help_formats ?? []).slice(0, 3),
      sav: p.sav_points,
      pitch: p.vitrine_pitch || p.vitrine_hero_title || "",
    }));

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const prompt = `Tu es un moteur de matching pour la plateforme RENOVEC.
Un visiteur a exprimé ce besoin : "${need_text.trim()}"
${city_hint ? `Zone géographique mentionnée : ${city_hint}` : ""}

Voici ${profileSummaries.length} profils disponibles (données anonymisées) :
${JSON.stringify(profileSummaries, null, 2)}

Analyse ce besoin et sélectionne les 6 profils les plus pertinents.
Pour chaque profil sélectionné, calcule un score de matching de 0 à 100 basé sur :
1. Adéquation compétences/besoin (50%)
2. Disponibilité (20%)
3. Proximité géographique si connue (15%)
4. Score de confiance réseau SAV (15%)

Réponds UNIQUEMENT en JSON valide avec cette structure :
{
  "need_reformulation": "Reformulation claire et vendeuse du besoin en 1-2 phrases",
  "need_category": "catégorie courte du besoin (ex: Accompagnement professionnel, Aide technique, Formation...)",
  "top_ids": [
    {
      "id": "uuid du profil",
      "score": 87,
      "reasons": ["Raison 1 courte", "Raison 2 courte", "Raison 3 courte"],
      "summary": "Phrase ultra-courte expliquant pourquoi ce profil matche (max 15 mots)"
    }
  ]
}

Sélectionne exactement 6 profils ou moins si pas assez de bons candidats. Score minimum : 40.`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in AI response");

    const aiResult: AIMatchResult = JSON.parse(jsonMatch[0]);

    // Merge AI scores back onto profiles
    const profileMap = new Map(pool.map((p) => [p.id, p]));
    const scored: ScoredProfile[] = (aiResult.top_ids ?? [])
      .filter((r) => profileMap.has(r.id) && r.score >= 40)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((r) => ({
        ...profileMap.get(r.id)!,
        match_score: r.score,
        match_reasons: r.reasons ?? [],
        match_summary: r.summary ?? "",
      }));

    return new Response(
      JSON.stringify({
        profiles: scored,
        need_reformulation: aiResult.need_reformulation ?? need_text,
        need_category: aiResult.need_category ?? "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("instant-match error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
