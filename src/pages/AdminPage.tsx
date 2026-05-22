import { useState, useEffect } from 'react';
import { Users, FileText, Activity, ShieldCheck, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type AdminStats = {
  totalUsers: number;
  totalNeeds: number;
  totalCapabilities: number;
  totalConversations: number;
  totalSessions: number;
  totalContributions: number;
  needsByStatus: Record<string, number>;
};

type UserRow = {
  id: string;
  display_name: string;
  roles: string[];
  created_at: string;
};

type NeedRow = {
  id: string;
  raw_text: string;
  status: string;
  created_at: string;
  user_id: string;
};

type Section = 'overview' | 'users' | 'needs' | 'contributions';

export default function AdminPage() {
  const { profile } = useAuth();
  const [section, setSection] = useState<Section>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [needs, setNeeds] = useState<NeedRow[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { if (section === 'users') loadUsers(); if (section === 'needs') loadNeeds(); }, [section]);

  async function loadStats() {
    setLoadingStats(true);
    const [usersR, needsR, capsR, convsR, sessR, contsR] = await Promise.all([
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('needs').select('id', { count: 'exact', head: true }),
      supabase.from('capability_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('conversations').select('id', { count: 'exact', head: true }),
      supabase.from('sessions').select('id', { count: 'exact', head: true }),
      supabase.from('contributions').select('id', { count: 'exact', head: true }),
    ]);
    const { data: needStatuses } = await supabase.from('needs').select('status');
    const byStatus: Record<string, number> = {};
    needStatuses?.forEach(n => { byStatus[n.status] = (byStatus[n.status] || 0) + 1; });
    setStats({
      totalUsers: usersR.count || 0,
      totalNeeds: needsR.count || 0,
      totalCapabilities: capsR.count || 0,
      totalConversations: convsR.count || 0,
      totalSessions: sessR.count || 0,
      totalContributions: contsR.count || 0,
      needsByStatus: byStatus,
    });
    setLoadingStats(false);
  }

  async function loadUsers() {
    setLoadingList(true);
    const { data } = await supabase.from('user_profiles').select('id, display_name, roles, created_at')
      .order('created_at', { ascending: false }).limit(50);
    setUsers(data || []);
    setLoadingList(false);
  }

  async function loadNeeds() {
    setLoadingList(true);
    const { data } = await supabase.from('needs').select('id, raw_text, status, created_at, user_id')
      .order('created_at', { ascending: false }).limit(50);
    setNeeds(data || []);
    setLoadingList(false);
  }

  const SECTIONS: Array<{ id: Section; label: string; icon: typeof Users }> = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: TrendingUp },
    { id: 'users', label: 'Utilisateurs', icon: Users },
    { id: 'needs', label: 'Situations', icon: FileText },
    { id: 'contributions', label: 'Contributions', icon: Activity },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
          <ShieldCheck size={16} className="text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Administration</h1>
          <p className="text-xs text-stone-400">{profile?.display_name} · Accès {profile?.roles?.join(', ')}</p>
        </div>
        <button onClick={loadStats} className="ml-auto p-2 rounded-xl text-stone-400 hover:bg-stone-100 transition-all">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Warning */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
        <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-700 leading-relaxed">
          Zone d'administration. Les actions ici ont un impact sur le réseau. Agissez avec discernement.
        </p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 overflow-x-auto">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`flex-1 py-2 px-2.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${section === s.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            <s.icon size={12} />
            {s.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {section === 'overview' && (
        loadingStats ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-7 h-7 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Utilisateurs', value: stats.totalUsers, icon: Users, color: 'bg-blue-50 text-blue-600' },
                { label: 'Situations', value: stats.totalNeeds, icon: FileText, color: 'bg-amber-50 text-amber-600' },
                { label: 'Capacités', value: stats.totalCapabilities, icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600' },
                { label: 'Échanges', value: stats.totalConversations, icon: Activity, color: 'bg-stone-50 text-stone-600' },
                { label: 'Sessions', value: stats.totalSessions, icon: ShieldCheck, color: 'bg-rose-50 text-rose-600' },
                { label: 'Contributions', value: stats.totalContributions, icon: Activity, color: 'bg-orange-50 text-orange-600' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white rounded-2xl border border-stone-100 p-4">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${color}`}>
                    <Icon size={14} />
                  </div>
                  <p className="text-2xl font-bold text-stone-900">{value}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {Object.keys(stats.needsByStatus).length > 0 && (
              <div className="bg-white rounded-2xl border border-stone-100 p-5">
                <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-4">Situations par statut</p>
                <div className="space-y-2.5">
                  {Object.entries(stats.needsByStatus).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-stone-700 capitalize">{status}</span>
                      <div className="flex items-center gap-2 flex-1">
                        <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${(count / stats.totalNeeds) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-stone-500 w-6 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* USERS */}
      {section === 'users' && (
        loadingList ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-7 h-7 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="bg-white rounded-2xl border border-stone-100 px-5 py-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate">{u.display_name || '—'}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {new Date(u.created_at).toLocaleDateString('fr-FR')} · {u.roles?.join(', ') || 'seeker'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  {u.roles?.map(r => (
                    <span key={r} className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      r === 'admin' ? 'bg-red-50 text-red-600' :
                      r === 'provider' ? 'bg-emerald-50 text-emerald-600' :
                      'bg-stone-100 text-stone-500'
                    }`}>{r}</span>
                  ))}
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-center text-stone-400 py-8 text-sm">Aucun utilisateur trouvé.</p>
            )}
          </div>
        )
      )}

      {/* NEEDS */}
      {section === 'needs' && (
        loadingList ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-7 h-7 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {needs.map(n => (
              <div key={n.id} className="bg-white rounded-2xl border border-stone-100 p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    n.status === 'matched' ? 'bg-emerald-50 text-emerald-600' :
                    n.status === 'clarifying' ? 'bg-amber-50 text-amber-600' :
                    n.status === 'submitted' ? 'bg-blue-50 text-blue-600' :
                    'bg-stone-100 text-stone-500'
                  }`}>{n.status}</span>
                  <span className="text-xs text-stone-400">
                    {new Date(n.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <p className="text-sm text-stone-700 leading-relaxed line-clamp-2">{n.raw_text}</p>
              </div>
            ))}
            {needs.length === 0 && (
              <p className="text-center text-stone-400 py-8 text-sm">Aucune situation trouvée.</p>
            )}
          </div>
        )
      )}

      {/* CONTRIBUTIONS */}
      {section === 'contributions' && (
        <div className="text-center py-10 text-stone-400">
          <Activity size={24} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Supervision des contributions — disponible prochainement.</p>
        </div>
      )}
    </div>
  );
}
