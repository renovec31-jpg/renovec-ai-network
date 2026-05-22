import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.51.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface VitrineService {
  title: string;
  description: string;
  price_hint: string;
  format: string;
  highlight: boolean;
}

interface VitrinePortfolio {
  title: string;
  description: string;
  image_url: string;
  tags: string[];
}

interface VitrineFAQ {
  question: string;
  answer: string;
}

interface VitrineResult {
  vitrine_hero_title: string;
  vitrine_bio: string;
  vitrine_pitch: string;
  vitrine_services: VitrineService[];
  vitrine_portfolio: VitrinePortfolio[];
  vitrine_faq: VitrineFAQ[];
  vitrine_response_time: string;
  vitrine_badges: string[];
}

const PROFILE_TYPE_LABELS: Record<string, string> = {
  individual: "indépendant·e",
  artisan: "artisan",
  independant: "professionnel indépendant",
  formateur: "formateur·trice",
  entreprise: "entreprise",
  association: "association",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { profile_id } = await req.json();

    // Fetch profile — must belong to authenticated user
    const { data: profile, error: profileErr } = await supabase
      .from("capability_profiles")
      .select("*")
      .eq("id", profile_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileErr || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found or unauthorized" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch trust reviews for this user (for context)
    const { data: reviews } = await supabase
      .from("trust_reviews")
      .select("comment, score, context_category")
      .eq("reviewed_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const profileTypeLabel = PROFILE_TYPE_LABELS[profile.profile_type ?? "individual"] ?? "professionnel·le";
    const city = profile.city ?? "France";
    const capabilities = [
      ...(profile.explicit_capabilities ?? []),
      ...(profile.implicit_capabilities ?? []),
    ].slice(0, 10);
    const successContexts = (profile.success_contexts ?? []).slice(0, 5);
    const helpFormats = (profile.help_formats ?? []).slice(0, 5);
    const savPoints = profile.sav_points ?? 0;
    const reviewTexts = (reviews ?? [])
      .filter((r: { comment?: string }) => r.comment)
      .map((r: { comment?: string; score?: number; context_category?: string }) =>
        `Score ${r.score ?? "?"}/5 — "${r.comment}" (${r.context_category ?? ""})`
      );

    const prompt = `Tu es un expert en marketing de proximité et en copywriting commercial francophone.
Tu dois créer une vitrine de vente professionnelle et désirable pour ce membre de la plateforme RENOVEC.

DONNÉES DU PROFIL :
- Nom/Titre actuel : ${profile.title || "(non renseigné)"}
- Type d'activité : ${profileTypeLabel}
- Ville : ${city}
- Tagline actuelle : ${profile.tagline || "(non renseignée)"}
- Résumé actuel : ${profile.summary || "(non renseigné)"}
- Compétences déclarées : ${capabilities.join(", ") || "(non renseignées)"}
- Contextes de réussite : ${successContexts.join(", ") || "(non renseignés)"}
- Style relationnel : ${profile.relational_style || "(non renseigné)"}
- Formats d'aide proposés : ${helpFormats.join(", ") || "(non renseignés)"}
- Disponibilité : ${profile.availability || "disponible"}
- Points de confiance SAV : ${savPoints}
- Témoignages reçus : ${reviewTexts.length > 0 ? reviewTexts.join(" | ") : "(aucun encore)"}

MISSION :
Génère une vitrine commerciale premium complète. Sois concret, vendeur, humain et crédible.
Parle à la première personne pour la bio. Évite tout jargon corporate ou trop formel.
Si certaines données manquent, invente des éléments plausibles et cohérents avec le profil.

Réponds UNIQUEMENT en JSON valide avec cette structure exacte :
{
  "vitrine_hero_title": "Titre accrocheur et vendeur (max 10 mots) — ce que cette personne apporte vraiment",
  "vitrine_pitch": "Une phrase de promesse claire et désirable (max 20 mots)",
  "vitrine_bio": "Bio réécrite à la 1ère personne, chaleureuse et crédible (150-200 mots). Raconte qui tu es, ce que tu fais, pourquoi les gens font appel à toi, une touche personnelle.",
  "vitrine_services": [
    {
      "title": "Nom du service ou offre",
      "description": "Description vendeuse et concrète (2-3 phrases)",
      "price_hint": "Indication de tarif ou mode (ex: Sur devis, À partir de 50€/h, Gratuit, Échange de services)",
      "format": "Format de livraison (ex: En présentiel, En ligne, À domicile, Atelier groupe)",
      "highlight": true
    }
  ],
  "vitrine_portfolio": [
    {
      "title": "Intitulé de la réalisation ou cas concret",
      "description": "Résultat obtenu, contexte, impact réel (2-3 phrases)",
      "image_url": "",
      "tags": ["tag1", "tag2"]
    }
  ],
  "vitrine_faq": [
    {
      "question": "Question fréquente ou objection courante d'un client potentiel",
      "answer": "Réponse rassurante, directe et convaincante"
    }
  ],
  "vitrine_response_time": "Formulation du délai de réponse (ex: Répond généralement sous 24h)",
  "vitrine_badges": ["Badge 1", "Badge 2", "Badge 3"]
}

Génère 3 à 5 services pertinents, 2 à 3 réalisations concrètes, 4 à 5 FAQ pertinentes, et 3 à 4 badges de confiance adaptés au profil.`;

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON from response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON in AI response");
    }
    const result: VitrineResult = JSON.parse(jsonMatch[0]);

    // Persist to DB using service role to bypass RLS for the update
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: updateErr } = await serviceClient
      .from("capability_profiles")
      .update({
        vitrine_hero_title: result.vitrine_hero_title,
        vitrine_bio: result.vitrine_bio,
        vitrine_pitch: result.vitrine_pitch,
        vitrine_services: result.vitrine_services,
        vitrine_portfolio: result.vitrine_portfolio,
        vitrine_faq: result.vitrine_faq,
        vitrine_response_time: result.vitrine_response_time,
        vitrine_badges: result.vitrine_badges,
        vitrine_generated_at: new Date().toISOString(),
      })
      .eq("id", profile_id)
      .eq("user_id", user.id);

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ ok: true, vitrine: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-vitrine error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
