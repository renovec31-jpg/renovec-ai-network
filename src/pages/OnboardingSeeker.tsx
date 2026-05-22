import { useState, useRef, useEffect } from 'react';
import { ArrowRight, ArrowLeft, MapPin, Sparkles, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Props = { onComplete: () => void };

const CAPABILITY_EXAMPLES = [
  'Cuisine et pâtisserie maison',
  'Aide administrative et démarches',
  'Soutien scolaire et tutorat',
  'Jardinage et espaces verts',
  'Réparations bricolage',
  'Informatique et dépannage tech',
  'Comptabilité et gestion',
  'Écoute et soutien moral',
  'Transport et accompagnement',
  'Traduction et langues',
];

const NEED_EXAMPLES = [
  'Je dois prendre une décision professionnelle importante.',
  'J\'ai besoin d\'aide pour des démarches administratives.',
  'Je cherche quelqu\'un pour m\'apprendre quelque chose.',
  'J\'ai un problème technique que je n\'arrive pas à résoudre.',
  'Je traverse une période difficile et cherche un soutien.',
];

const ZONE_OPTIONS = [
  { value: 'local', label: 'Proximité', sub: 'Dans mon quartier, ma ville' },
  { value: 'distance', label: 'À distance', sub: 'Peu importe la localisation' },
  { value: 'both', label: 'Les deux', sub: 'Flexible selon les situations' },
];

// Progress bar
function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex gap-1.5 mb-10">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="flex-1 h-0.5 rounded-full transition-all duration-500"
          style={{ background: i < step ? '#f59e0b' : 'rgba(255,255,255,0.1)' }}
        />
      ))}
    </div>
  );
}

export default function OnboardingSeeker({ onComplete }: Props) {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 0 — Welcome
  // Step 1 — Name + City
  // Step 2 — What I can help with
  // Step 3 — What I'm looking for now
  // Step 4 — Zone of action

  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('');
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [capInput, setCapInput] = useState('');
  const [needs, setNeeds] = useState('');
  const [zone, setZone] = useState<'local' | 'distance' | 'both'>('both');

  const nameRef = useRef<HTMLInputElement>(null);
  const capRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 1) setTimeout(() => nameRef.current?.focus(), 100);
    if (step === 2) setTimeout(() => capRef.current?.focus(), 100);
  }, [step]);

  // Pre-fill name from profile
  useEffect(() => {
    async function loadName() {
      const { data } = await supabase.from('user_profiles').select('display_name').eq('id', user!.id).maybeSingle();
      if (data?.display_name) setDisplayName(data.display_name);
    }
    loadName();
  }, []);

  function addCap(cap: string) {
    const trimmed = cap.trim();
    if (trimmed && !capabilities.includes(trimmed)) {
      setCapabilities(c => [...c, trimmed]);
    }
    setCapInput('');
  }

  function removeCap(cap: string) {
    setCapabilities(c => c.filter(x => x !== cap));
  }

  async function handleComplete() {
    setLoading(true);
    try {
      // Update user profile with name and city
      await supabase.from('user_profiles').update({
        display_name: displayName.trim() || undefined,
        location: city.trim() || undefined,
        onboarding_seeker_done: true,
        updated_at: new Date().toISOString(),
      }).eq('id', user!.id);

      // Create capability profile if they have something to offer
      if (capabilities.length > 0) {
        const { data: existing } = await supabase
          .from('capability_profiles').select('id').eq('user_id', user!.id).maybeSingle();

        const profilePayload = {
          user_id: user!.id,
          title: capabilities[0],
          explicit_capabilities: capabilities,
          city: city.trim() || null,
          availability: 'disponible',
          is_published: true,
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          await supabase.from('capability_profiles').update(profilePayload).eq('id', existing.id);
        } else {
          await supabase.from('capability_profiles').insert(profilePayload);
        }
      }

      // Save first need as a draft
      if (needs.trim()) {
        await supabase.from('needs').insert({
          user_id: user!.id,
          raw_text: needs.trim(),
          status: 'draft',
        });
      }

      await refreshProfile();
      onComplete();
    } catch {
      // non-fatal — proceed anyway
      await refreshProfile();
      onComplete();
    } finally {
      setLoading(false);
    }
  }

  const TOTAL_STEPS = 5;

  /* ── Step 0: Welcome ───────────────────────────────────────── */
  if (step === 0) return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4 overflow-hidden">
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-3xl animate-breathe" />
        <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-emerald-500/4 rounded-full blur-3xl animate-breathe" style={{ animationDelay: '2s' }} />
      </div>
      <div className="max-w-md w-full relative z-10 animate-fade-up">
        <div className="flex items-center justify-center gap-2.5 mb-12">
          <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center">
            <Sparkles size={14} className="text-stone-950" />
          </div>
          <span className="text-base font-semibold tracking-tight text-white">RENOVEC</span>
        </div>
        <div className="text-center mb-10 space-y-4">
          <h1 className="text-3xl font-semibold text-white leading-snug">Bienvenue.</h1>
          <p className="text-stone-400 text-sm leading-relaxed max-w-sm mx-auto">
            RENOVEC est un réseau de capacités humaines — pas un outil. Un espace où des situations rencontrent des personnes capables d'aider, et où l'aide laisse une trace.
          </p>
        </div>
        <div className="space-y-5 mb-10">
          {[
            { label: 'Vous exprimez', text: 'Librement, avec vos mots. L\'IA lit, comprend, structure.', dot: 'bg-amber-400' },
            { label: 'Le réseau s\'organise', text: 'Des présences humaines pertinentes émergent. Pas un annuaire — une intelligence silencieuse.', dot: 'bg-stone-500' },
            { label: 'Quelque chose se déplace', text: 'Un échange naît, une aide laisse une trace. Rien ne disparaît dans le vide.', dot: 'bg-emerald-500' },
          ].map(({ label, text, dot }) => (
            <div key={label} className="flex gap-4">
              <div className="flex-shrink-0 pt-1.5"><div className={`w-2 h-2 rounded-full ${dot}`} /></div>
              <div>
                <p className="text-sm font-medium text-white mb-0.5">{label}</p>
                <p className="text-xs text-stone-500 leading-relaxed">{text}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setStep(1)}
          className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 group text-sm"
        >
          Personnaliser mon espace
          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
        <p className="text-center text-xs text-stone-700 mt-4">2 minutes · Modifiable à tout moment</p>
      </div>
    </div>
  );

  /* ── Step 1: Name + City ───────────────────────────────────── */
  if (step === 1) return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full animate-slide-in">
        <ProgressBar step={1} total={TOTAL_STEPS} />
        <p className="text-xs text-stone-600 uppercase tracking-widest font-medium mb-3">Étape 1 sur 4</p>
        <h1 className="text-2xl font-semibold text-white mb-2 leading-snug">Comment vous appelle-t-on ?</h1>
        <p className="text-stone-500 text-sm leading-relaxed mb-8">Ces informations personnalisent votre espace et permettent au réseau de vous situer.</p>

        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-xs text-stone-500 uppercase tracking-widest mb-2">Votre prénom ou nom affiché</label>
            <input
              ref={nameRef}
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Comment souhaitez-vous être connu·e ?"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-stone-700 text-sm focus:outline-none focus:border-amber-500/40 transition-colors"
              onKeyDown={e => e.key === 'Enter' && city.trim() && setStep(2)}
            />
          </div>
          <div>
            <label className="block text-xs text-stone-500 uppercase tracking-widest mb-2">
              <MapPin size={10} className="inline mr-1" />
              Votre ville ou zone
            </label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="Ex : Lyon, Bordeaux, Paris 11e…"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-stone-700 text-sm focus:outline-none focus:border-amber-500/40 transition-colors"
              onKeyDown={e => e.key === 'Enter' && setStep(2)}
            />
            <p className="text-xs text-stone-700 mt-1.5">Zone approximative — jamais votre adresse exacte.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setStep(0)} className="p-3.5 rounded-xl border border-white/10 text-stone-400 hover:text-white transition-colors">
            <ArrowLeft size={14} />
          </button>
          <button
            onClick={() => setStep(2)}
            disabled={!displayName.trim()}
            className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-30 group text-sm"
          >
            Continuer <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
        <button onClick={() => setStep(2)} className="w-full text-center text-xs text-stone-700 mt-3 py-2 hover:text-stone-500 transition-colors">
          Passer cette étape
        </button>
      </div>
    </div>
  );

  /* ── Step 2: What I can help with ─────────────────────────── */
  if (step === 2) return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full animate-slide-in">
        <ProgressBar step={2} total={TOTAL_STEPS} />
        <p className="text-xs text-stone-600 uppercase tracking-widest font-medium mb-3">Étape 2 sur 4</p>
        <h1 className="text-2xl font-semibold text-white mb-2 leading-snug">Ce que vous pouvez apporter</h1>
        <p className="text-stone-500 text-sm leading-relaxed mb-6">En quelques mots — vos savoir-faire, compétences, ou simplement ce qui vous vient naturellement.</p>

        {/* Tag input */}
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              ref={capRef}
              type="text"
              value={capInput}
              onChange={e => setCapInput(e.target.value)}
              placeholder="Ex : cuisine, comptabilité, écoute…"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-stone-700 text-sm focus:outline-none focus:border-amber-500/40 transition-colors"
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addCap(capInput); } }}
            />
            <button
              onClick={() => addCap(capInput)}
              disabled={!capInput.trim()}
              className="px-4 py-3 bg-amber-500/15 border border-amber-500/20 text-amber-400 rounded-xl text-sm font-medium hover:bg-amber-500/25 transition-colors disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>

        {/* Selected tags */}
        {capabilities.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {capabilities.map(cap => (
              <span key={cap} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs text-amber-300">
                {cap}
                <button onClick={() => removeCap(cap)} className="text-amber-500/60 hover:text-amber-400 transition-colors">×</button>
              </span>
            ))}
          </div>
        )}

        {/* Suggestions */}
        <div className="mb-8">
          <p className="text-xs text-stone-700 uppercase tracking-widest mb-2">Suggestions</p>
          <div className="flex flex-wrap gap-2">
            {CAPABILITY_EXAMPLES.filter(e => !capabilities.includes(e)).map(e => (
              <button
                key={e}
                onClick={() => addCap(e)}
                className="px-3 py-1.5 bg-white/4 border border-white/8 rounded-full text-xs text-stone-500 hover:text-stone-300 hover:border-white/15 transition-all"
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setStep(1)} className="p-3.5 rounded-xl border border-white/10 text-stone-400 hover:text-white transition-colors">
            <ArrowLeft size={14} />
          </button>
          <button
            onClick={() => setStep(3)}
            className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 group text-sm"
          >
            {capabilities.length > 0 ? `Continuer (${capabilities.length} ajouté${capabilities.length > 1 ? 's' : ''})` : 'Continuer'}
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
        <button onClick={() => setStep(3)} className="w-full text-center text-xs text-stone-700 mt-3 py-2 hover:text-stone-500 transition-colors">
          Passer — je complèterai plus tard
        </button>
      </div>
    </div>
  );

  /* ── Step 3: What I'm looking for ─────────────────────────── */
  if (step === 3) return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full animate-slide-in">
        <ProgressBar step={3} total={TOTAL_STEPS} />
        <p className="text-xs text-stone-600 uppercase tracking-widest font-medium mb-3">Étape 3 sur 4</p>
        <h1 className="text-2xl font-semibold text-white mb-2 leading-snug">Ce que vous cherchez en ce moment</h1>
        <p className="text-stone-500 text-sm leading-relaxed mb-6">Facultatif. Une phrase suffit — le réseau s'organise autour de ce que vous vivez vraiment.</p>

        <div className="relative mb-4">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-amber-500/8 via-transparent to-transparent pointer-events-none" />
          <textarea
            value={needs}
            onChange={e => setNeeds(e.target.value)}
            placeholder="Décrivez ce que vous vivez, ce dont vous avez besoin…"
            rows={4}
            className="w-full bg-white/3 border border-white/8 rounded-2xl px-5 py-4 text-white placeholder-stone-700 text-sm resize-none focus:outline-none focus:border-amber-500/25 leading-relaxed transition-colors"
          />
        </div>

        {/* Quick examples */}
        <div className="mb-8">
          <p className="text-xs text-stone-700 uppercase tracking-widest mb-2">Exemples</p>
          <div className="space-y-1.5">
            {NEED_EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => setNeeds(ex)}
                className="w-full text-left px-4 py-2.5 text-xs text-stone-600 hover:text-stone-300 bg-white/2 hover:bg-white/4 border border-white/5 hover:border-white/10 rounded-xl transition-all leading-relaxed"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setStep(2)} className="p-3.5 rounded-xl border border-white/10 text-stone-400 hover:text-white transition-colors">
            <ArrowLeft size={14} />
          </button>
          <button
            onClick={() => setStep(4)}
            className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 group text-sm"
          >
            Continuer
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
        <button onClick={() => setStep(4)} className="w-full text-center text-xs text-stone-700 mt-3 py-2 hover:text-stone-500 transition-colors">
          Passer
        </button>
      </div>
    </div>
  );

  /* ── Step 4: Zone of action ────────────────────────────────── */
  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full animate-slide-in">
        <ProgressBar step={4} total={TOTAL_STEPS} />
        <p className="text-xs text-stone-600 uppercase tracking-widest font-medium mb-3">Étape 4 sur 4</p>
        <h1 className="text-2xl font-semibold text-white mb-2 leading-snug">Votre zone d'action</h1>
        <p className="text-stone-500 text-sm leading-relaxed mb-8">RENOVEC fonctionne aussi bien localement qu'à distance. Où préférez-vous agir ?</p>

        <div className="space-y-3 mb-10">
          {ZONE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setZone(opt.value as typeof zone)}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border transition-all text-left ${
                zone === opt.value
                  ? 'border-amber-500/40 bg-amber-500/8 text-white'
                  : 'border-white/8 bg-white/3 text-stone-400 hover:border-white/15 hover:bg-white/5'
              }`}
            >
              <div>
                <p className="text-sm font-semibold mb-0.5">{opt.label}</p>
                <p className="text-xs text-stone-600">{opt.sub}</p>
              </div>
              {zone === opt.value && (
                <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                  <Check size={10} className="text-stone-950" />
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={() => setStep(3)} className="p-3.5 rounded-xl border border-white/10 text-stone-400 hover:text-white transition-colors">
            <ArrowLeft size={14} />
          </button>
          <button
            onClick={handleComplete}
            disabled={loading}
            className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 group text-sm"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-stone-950/30 border-t-stone-950 rounded-full animate-spin" />
            ) : (
              <>
                Entrer dans RENOVEC
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
