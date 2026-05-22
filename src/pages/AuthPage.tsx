import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowRight, Eye, EyeOff, Sparkles, ArrowLeft, Check } from 'lucide-react';

type Mode = 'signin' | 'signup' | 'reset';
type Props = { onBack?: () => void };

export default function AuthPage({ onBack }: Props) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  function switchMode(m: Mode) {
    setMode(m);
    setError('');
    setResetSent(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (mode === 'reset') {
      if (!email.trim()) { setError('Entrez votre adresse email.'); return; }
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setResetSent(true);
      } catch {
        setError('Impossible d\'envoyer l\'email. Vérifiez votre adresse.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          setError('Email ou mot de passe incorrect. Vérifiez vos identifiants.');
        }
      } else {
        if (!displayName.trim()) { setError('Comment vous appelez-vous ?'); return; }
        if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return; }
        const { error } = await signUp(email.trim(), password, displayName.trim());
        if (error) {
          if (error.message.includes('already')) setError('Cet email est déjà dans le réseau. Connectez-vous.');
          else if (error.message.includes('password')) setError('Mot de passe trop court — 8 caractères minimum.');
          else setError('Une erreur est survenue. Réessayez dans un instant.');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const title = mode === 'signin' ? 'Bon retour dans le réseau.'
    : mode === 'signup' ? 'Rejoindre le réseau.'
    : 'Réinitialiser votre mot de passe.';

  const subtitle = mode === 'signin'
    ? 'Vos situations, vos échanges et votre contribution vous attendent.'
    : mode === 'signup'
    ? 'Partagez ce que vous savez faire. Trouvez ce dont vous avez besoin.'
    : 'Entrez votre email — nous vous enverrons un lien pour créer un nouveau mot de passe.';

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center px-4 py-16">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/3 rounded-full blur-3xl animate-breathe" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-stone-700/20 rounded-full blur-3xl animate-breathe" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-up">
        {/* Logo + back */}
        <div className="text-center mb-12">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors mb-6 mx-auto"
            >
              <ArrowLeft size={11} /> Retour à l'accueil
            </button>
          )}
          <div className="inline-flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center">
              <Sparkles size={14} className="text-stone-950" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-white">RENOVEC</span>
          </div>
          <h1 className="text-2xl font-semibold text-white mb-3 leading-snug">{title}</h1>
          <p className="text-stone-500 text-sm leading-relaxed max-w-xs mx-auto">{subtitle}</p>
        </div>

        {/* Reset sent confirmation */}
        {resetSent ? (
          <div className="text-center space-y-6 animate-fade-up">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <Check size={22} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-medium mb-2">Email envoyé.</p>
              <p className="text-stone-500 text-sm leading-relaxed">
                Vérifiez votre boîte mail — le lien de réinitialisation expire dans 1 heure.
              </p>
            </div>
            <button
              onClick={() => { setResetSent(false); switchMode('signin'); }}
              className="text-sm text-amber-500 hover:text-amber-400 transition-colors"
            >
              Retour à la connexion
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div className="animate-fade-up">
                <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-widest">Votre prénom</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Comment vous appelez-vous ?"
                  autoComplete="given-name"
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/8 text-white placeholder-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/30 transition-all text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5 uppercase tracking-widest">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                autoComplete={mode === 'signup' ? 'email' : 'username'}
                className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/8 text-white placeholder-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/30 transition-all text-sm"
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-stone-600 uppercase tracking-widest">Mot de passe</label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="text-xs text-stone-600 hover:text-stone-400 transition-colors"
                    >
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? '8 caractères minimum' : '••••••••'}
                    required
                    minLength={mode === 'signup' ? 8 : 6}
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    className="w-full px-4 py-3.5 pr-12 rounded-xl bg-white/5 border border-white/8 text-white placeholder-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/30 transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-400 transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {mode === 'signup' && password.length > 0 && password.length < 8 && (
                  <p className="text-xs text-stone-600 mt-1.5 pl-1">
                    {8 - password.length} caractères manquants
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="animate-fade-up px-4 py-3 bg-red-500/8 border border-red-500/15 rounded-xl text-sm text-red-400 leading-relaxed">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-xl transition-all disabled:opacity-50 mt-2 text-sm group"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-stone-950/30 border-t-stone-950 rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'signin' ? 'Accéder' : mode === 'signup' ? 'Rejoindre' : 'Envoyer le lien'}
                  </span>
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>
        )}

        {!resetSent && (
          <div className="mt-7 text-center space-y-2">
            {mode === 'signin' && (
              <p className="text-sm text-stone-600">
                Pas encore dans le réseau ?{' '}
                <button onClick={() => switchMode('signup')} className="text-amber-500 hover:text-amber-400 font-medium transition-colors">
                  Rejoindre RENOVEC
                </button>
              </p>
            )}
            {mode === 'signup' && (
              <p className="text-sm text-stone-600">
                Déjà membre ?{' '}
                <button onClick={() => switchMode('signin')} className="text-amber-500 hover:text-amber-400 font-medium transition-colors">
                  Me connecter
                </button>
              </p>
            )}
            {mode === 'reset' && (
              <button onClick={() => switchMode('signin')} className="text-sm text-stone-600 hover:text-stone-400 transition-colors flex items-center gap-1.5 mx-auto">
                <ArrowLeft size={11} /> Retour à la connexion
              </button>
            )}
          </div>
        )}

        {mode === 'signup' && !resetSent && (
          <div className="mt-10 pt-7 border-t border-white/5 animate-fade-in">
            <p className="text-xs text-stone-600 uppercase tracking-widest font-medium text-center mb-5">Ce que vous rejoignez</p>
            <div className="space-y-3">
              {[
                'Un réseau de capacités humaines, pas un outil.',
                'Vos situations s\'orientent vers les bonnes présences.',
                'Votre aide laisse une trace utile et reconnue.',
              ].map((line, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-1 h-1 rounded-full bg-amber-500/50 flex-shrink-0" />
                  <p className="text-xs text-stone-500 leading-relaxed">{line}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
