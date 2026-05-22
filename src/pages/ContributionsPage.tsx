import { useState, useEffect } from 'react';
import { Plus, CheckCircle2 } from 'lucide-react';
import { supabase, Contribution } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type ViewFilter = 'all' | 'mine';

const CONTRIBUTION_TYPE_LABELS: Record<string, string> = {
  clarification:    'Clarté apportée',
  diagnostic:       'Diagnostic utile',
  transmission:     'Transmission',
  resolution:       'Situation débloquée',
  rassurance:       'Rassurance',
  decision_support: 'Soutien à la décision',
};

type NetworkEntry = {
  id: string;
  date: string;
  author: string;
  type: string;
  context: string;
  text: string;
};

function EntryRow({ date, author, type, context, text, last }: {
  date: string; author: string; type: string; context: string; text: string; last: boolean;
}) {
  return (
    <div className={`flex items-start gap-4 py-4 ${!last ? 'border-b border-white/8' : ''}`}>
      <span className="text-xs text-white/20 flex-shrink-0 w-12 font-mono pt-0.5">{date}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-semibold text-white/70">{author}</span>
          <span className="text-white/15">·</span>
          <span className="text-[10px] tracking-wider uppercase text-white/25">{type}</span>
        </div>
        {context && (
          <p className="text-[10px] tracking-wider uppercase text-white/15 mb-1.5">{context}</p>
        )}
        <p className="text-xs text-white/45 leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

export default function ContributionsPage() {
  const { user } = useAuth();
  const [myContributions, setMyContributions] = useState<Contribution[]>([]);
  const [networkEntries, setNetworkEntries] = useState<NetworkEntry[]>([]);
  const [loadingNetwork, setLoadingNetwork] = useState(false);
  const [filter, setFilter] = useState<ViewFilter>('all');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', context_label: '', summary: '', impact_label: '', contribution_type: 'clarification' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadMyContributions(); loadNetworkContributions(); }, []);

  async function loadMyContributions() {
    const { data } = await supabase.from('contributions')
      .select('*').eq('author_id', user!.id)
      .order('created_at', { ascending: false });
    setMyContributions(data || []);
  }

  async function loadNetworkContributions() {
    setLoadingNetwork(true);
    try {
      const { data } = await supabase
        .from('contributions')
        .select('id, title, context_label, summary, contribution_type, created_at, author_id')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(40);

      if (data && data.length > 0) {
        const authorIds = [...new Set(data.map(c => c.author_id))];
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, display_name')
          .in('id', authorIds);
        const profileMap = new Map((profiles || []).map(p => [p.id, p.display_name]));

        setNetworkEntries(data.map(c => ({
          id: c.id,
          date: new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          author: profileMap.get(c.author_id) || 'Membre du réseau',
          type: CONTRIBUTION_TYPE_LABELS[c.contribution_type] || c.contribution_type,
          context: c.context_label || '',
          text: c.summary || c.title,
        })));
      }
    } finally {
      setLoadingNetwork(false);
    }
  }

  async function saveContribution() {
    if (!form.title.trim()) return;
    setSaving(true);
    await supabase.from('contributions').insert({ author_id: user!.id, ...form, is_public: true });
    await loadMyContributions();
    setSaving(false);
    setAdding(false);
    setForm({ title: '', context_label: '', summary: '', impact_label: '', contribution_type: 'clarification' });
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-white leading-snug mb-1.5">
          Ce que le réseau a produit.
        </h1>
        <p className="text-white/40 text-sm leading-relaxed">
          Des coordinations réelles. Des mouvements documentés.
        </p>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`text-sm font-medium pb-0.5 transition-all ${filter === 'all' ? 'text-white border-b border-white' : 'text-white/30 hover:text-white/60'}`}
          >
            Tout le réseau
          </button>
          <button
            onClick={() => setFilter('mine')}
            className={`text-sm font-medium pb-0.5 transition-all ${filter === 'mine' ? 'text-white border-b border-white' : 'text-white/30 hover:text-white/60'}`}
          >
            Les miennes
          </button>
        </div>
        <button
          onClick={() => setAdding(!adding)}
          className="text-xs text-white/40 hover:text-white/80 transition-all flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/8 rounded-lg"
        >
          <Plus size={12} /> Partager
        </button>
      </div>

      {adding && (
        <div className="animate-fade-up mb-6 border border-white/8 rounded-xl p-5 bg-white/5">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-semibold text-white/90">Partager une contribution</p>
            <button onClick={() => setAdding(false)} className="text-xs text-white/30 hover:text-white/60 transition-colors">Annuler</button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] tracking-widest uppercase text-white/30 font-medium block mb-2">Type</label>
              <select
                value={form.contribution_type}
                onChange={e => setForm(f => ({ ...f, contribution_type: e.target.value }))}
                className="w-full px-3 py-2.5 bg-white/8 border border-white/10 rounded-xl text-sm text-white/80 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
              >
                {Object.entries(CONTRIBUTION_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            {[
              { key: 'title', label: 'Ce que vous avez aidé à résoudre', placeholder: 'Une phrase précise' },
              { key: 'context_label', label: 'Dans quel contexte', placeholder: 'Domaine ou situation' },
              { key: 'summary', label: 'Ce que vous avez fait concrètement', placeholder: 'Racontez avec précision...', multiline: true },
              { key: 'impact_label', label: 'Ce que ça a changé', placeholder: 'L\'impact observé' },
            ].map(({ key, label, placeholder, multiline }) => (
              <div key={key}>
                <label className="text-[11px] tracking-widest uppercase text-white/30 font-medium block mb-2">{label}</label>
                {multiline ? (
                  <textarea
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    rows={3}
                    className="w-full px-3 py-2.5 bg-white/8 border border-white/10 rounded-xl text-sm text-white/80 placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none transition-all"
                  />
                ) : (
                  <input
                    type="text"
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 bg-white/8 border border-white/10 rounded-xl text-sm text-white/80 placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                  />
                )}
              </div>
            ))}
            <button
              onClick={saveContribution}
              disabled={saving || !form.title.trim()}
              className="w-full py-3 bg-white text-stone-950 text-sm font-medium hover:bg-white/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2 rounded-xl"
            >
              {saving
                ? <span className="w-4 h-4 border-2 border-stone-900/30 border-t-stone-900 rounded-full animate-spin" />
                : <><CheckCircle2 size={13} /> Partager cette contribution</>}
            </button>
          </div>
        </div>
      )}

      {filter === 'all' ? (
        <div>
          {loadingNetwork && networkEntries.length === 0 && (
            <div className="py-16 flex items-center justify-center">
              <span className="w-6 h-6 border border-white/10 border-t-white/40 rounded-full animate-spin" />
            </div>
          )}
          {!loadingNetwork && networkEntries.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-sm text-white/30">Aucune contribution visible pour l'instant.</p>
              <p className="text-xs text-white/20 mt-1.5">Le réseau s'anime à mesure que des aides sont partagées.</p>
            </div>
          )}
          {networkEntries.map((entry, i) => (
            <EntryRow key={entry.id} {...entry} last={i === networkEntries.length - 1} />
          ))}
        </div>
      ) : (
        myContributions.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-white/30">Aucune contribution partagée encore.</p>
            <p className="text-xs text-white/20 mt-1.5">Chaque aide apportée peut devenir une trace utile pour le réseau.</p>
          </div>
        ) : (
          <div>
            {myContributions.map((c, i) => (
              <EntryRow
                key={c.id}
                date={new Date(c.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                author="Vous"
                type={CONTRIBUTION_TYPE_LABELS[c.contribution_type] || c.contribution_type}
                context={c.context_label || ''}
                text={c.summary || c.title}
                last={i === myContributions.length - 1}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}
