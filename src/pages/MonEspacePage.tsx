import { useState, useEffect } from 'react';
import { User, FileText, LogOut, Clock, Award, Star, TrendingUp, MapPin, ArrowLeft, Bell, Trash2, Download, Shield, ShoppingBag, Box, Package, Search, Tag, Layers, Plus } from 'lucide-react';
import { supabase, ProfileListing } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Section = 'overview' | 'parcours' | 'capital' | 'settings' | 'privacy' | 'annonces';
type Props = { onStartProviderOnboarding?: () => void };

type ContribEvent = {
  id: string;
  event_type: string;
  description: string;
  context_category: string;
  points: number;
  created_at: string;
};

type TrustReview = {
  id: string;
  clarity_score: number | null;
  usefulness_score: number | null;
  reliability_score: number | null;
  pedagogy_score: number | null;
  reassurance_score: number | null;
  follow_through_score: number | null;
  qualitative_summary: string | null;
  created_at: string;
};

type ContextEntry = { label: string; pct: number };

const EVENT_LABELS: Record<string, string> = {
  trust_review_received: 'Reconnaissance reçue',
  session_completed:     'Session accomplie',
  need_resolved:         'Situation résolue',
  contribution_made:     'Contribution apportée',
  onboarding_complete:   'Intégration réseau',
};

const DOMAIN_BADGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'Logement':       { label: 'Logement',       color: '#fef3c7', bg: 'rgba(146,64,14,0.25)' },
  'Administratif':  { label: 'Administratif',  color: '#dbeafe', bg: 'rgba(30,58,95,0.25)' },
  'Emploi':         { label: 'Emploi',          color: '#dcfce7', bg: 'rgba(20,83,45,0.25)' },
  'Santé':          { label: 'Santé',           color: '#fee2e2', bg: 'rgba(127,29,29,0.25)' },
  'Éducation':      { label: 'Éducation',       color: '#fef9c3', bg: 'rgba(113,63,18,0.25)' },
  'Social':         { label: 'Social',          color: '#eff6ff', bg: 'rgba(30,64,175,0.25)' },
  'Technique':      { label: 'Technique',       color: '#d1fae5', bg: 'rgba(6,78,59,0.25)' },
  'Accompagnement': { label: 'Accompagnement',  color: '#f3f4f6', bg: 'rgba(55,65,81,0.25)' },
  'Orientation':    { label: 'Orientation',     color: '#ede9fe', bg: 'rgba(49,46,129,0.25)' },
};

function avgScores(reviews: TrustReview[]): Record<string, number> {
  if (!reviews.length) return {};
  const fields = ['clarity_score','usefulness_score','reliability_score','pedagogy_score','reassurance_score','follow_through_score'] as const;
  const result: Record<string, number> = {};
  for (const f of fields) {
    const vals = reviews.map(r => r[f]).filter((v): v is number => v !== null);
    if (vals.length) result[f] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }
  return result;
}

function scoreLabel(field: string): string {
  const map: Record<string, string> = {
    clarity_score: 'Clarté', usefulness_score: 'Utilité', reliability_score: 'Fiabilité',
    pedagogy_score: 'Pédagogie', reassurance_score: 'Rassurance', follow_through_score: 'Suivi',
  };
  return map[field] || field;
}

function getTrustLevel(points: number): { level: number; label: string; threshold: number } {
  if (points >= 500) return { level: 6, label: 'Référent réseau', threshold: 500 };
  if (points >= 300) return { level: 5, label: 'Contributeur confirmé', threshold: 300 };
  if (points >= 150) return { level: 4, label: 'Acteur reconnu', threshold: 150 };
  if (points >= 75)  return { level: 3, label: 'Présence active', threshold: 75 };
  if (points >= 25)  return { level: 2, label: 'Premiers pas', threshold: 25 };
  return { level: 1, label: 'Nouveau', threshold: 0 };
}

function getNextThreshold(points: number): number {
  return [25, 75, 150, 300, 500].find(t => t > points) ?? 500;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] tracking-widest uppercase text-white/25 font-medium mb-4">{children}</p>;
}

function ProgressBar({ pct, color = '#F26522' }: { pct: number; color?: string }) {
  return (
    <div className="h-px bg-white/8 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(2, pct)}%`, background: color }} />
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className="relative flex-shrink-0 transition-colors"
      style={{ width: 40, height: 22, borderRadius: 11, background: on ? '#F26522' : 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer' }}>
      <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
        style={{ left: on ? 21 : 3, boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }} />
    </button>
  );
}

export default function MonEspacePage({ onStartProviderOnboarding: _ }: Props) {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [needsCount, setNeedsCount] = useState(0);
  const [savPoints, setSavPoints] = useState(0);
  const [memberSince, setMemberSince] = useState('');
  const [contribEvents, setContribEvents] = useState<ContribEvent[]>([]);
  const [trustReviews, setTrustReviews] = useState<TrustReview[]>([]);
  const [contextEntries, setContextEntries] = useState<ContextEntry[]>([]);
  const [capabilityTitle, setCapabilityTitle] = useState('');
  const [capabilityCity, setCapabilityCity] = useState('');
  const [capabilityProfileId, setCapabilityProfileId] = useState<string | null>(null);
  const [section, setSection] = useState<Section>('overview');
  const [editingProfile, setEditingProfile] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [notifEmail, setNotifEmail] = useState(true);
  const [profileVisible, setProfileVisible] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [privacyAction, setPrivacyAction] = useState<'idle' | 'exporting' | 'done'>('idle');

  useEffect(() => { if (user?.id) loadStats(); }, [user?.id]);

  async function loadStats() {
    if (!user?.id) return;
    const [needsRes, savRes, eventsRes, reviewsRes, capRes] = await Promise.all([
      supabase.from('needs').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('sav_ledger').select('balance, contexts_summary').eq('user_id', user.id).maybeSingle(),
      supabase.from('contribution_events').select('id, event_type, description, context_category, points, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('trust_reviews').select('id, clarity_score, usefulness_score, reliability_score, pedagogy_score, reassurance_score, follow_through_score, qualitative_summary, created_at').eq('reviewed_id', user.id).eq('is_public', true).order('created_at', { ascending: false }).limit(10),
      supabase.from('capability_profiles').select('id, title, city').eq('user_id', user.id).eq('is_published', true).maybeSingle(),
    ]);
    setNeedsCount(needsRes.count || 0);
    setSavPoints(savRes.data?.balance ?? 0);
    setContribEvents(eventsRes.data || []);
    setTrustReviews(reviewsRes.data || []);
    setCapabilityTitle(capRes.data?.title || '');
    setCapabilityCity(capRes.data?.city || '');
    setCapabilityProfileId((capRes.data as { id?: string } | null)?.id ?? null);

    const raw = savRes.data?.contexts_summary;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const entries = Object.entries(raw as Record<string, number>);
      const total = entries.reduce((acc, [, v]) => acc + v, 0);
      if (total > 0) { setContextEntries(entries.sort(([,a],[,b])=>b-a).slice(0,5).map(([label,count])=>({label,pct:Math.round((count/total)*100)}))); return; }
    }
    const events = eventsRes.data || [];
    if (events.length > 0) {
      const counts: Record<string, number> = {};
      for (const e of events) { if (e.context_category) counts[e.context_category] = (counts[e.context_category]||0)+1; }
      const total = Object.values(counts).reduce((a,b)=>a+b,0);
      if (total > 0) setContextEntries(Object.entries(counts).sort(([,a],[,b])=>b-a).slice(0,5).map(([label,count])=>({label,pct:Math.round((count/total)*100)})));
    }
    if (profile?.created_at) {
      const d = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000);
      if (d===0) setMemberSince("aujourd'hui");
      else if (d===1) setMemberSince('hier');
      else if (d<30) setMemberSince(`${d} jours`);
      else if (d<365) setMemberSince(`${Math.floor(d/30)} mois`);
      else setMemberSince(`${Math.floor(d/365)} an${Math.floor(d/365)>1?'s':''}`);
    }
  }

  async function saveProfile() {
    if (!user?.id) return;
    setSaving(true); setSaveError('');
    try {
      const { error } = await supabase.from('user_profiles').update({ display_name: displayName.trim(), bio: bio.trim(), updated_at: new Date().toISOString() }).eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      setEditingProfile(false);
    } catch { setSaveError('La mise à jour a échoué. Réessayez.'); }
    finally { setSaving(false); }
  }

  const initials = profile?.display_name ? profile.display_name.split(' ').map((n:string)=>n[0]).join('').toUpperCase().substring(0,2) : '?';
  const trustInfo = getTrustLevel(savPoints);
  const nextThreshold = getNextThreshold(savPoints);
  const progressPct = trustInfo.level >= 6 ? 100 : Math.round(((savPoints-trustInfo.threshold)/(nextThreshold-trustInfo.threshold))*100);
  const avgScoresData = avgScores(trustReviews);
  const qualitativeSummaries = trustReviews.filter(r=>r.qualitative_summary?.trim()).slice(0,3).map(r=>r.qualitative_summary as string);
  const earnedBadges = Object.entries(DOMAIN_BADGE_CONFIG).filter(([domain]) => {
    const t = capabilityTitle.toLowerCase();
    const c = contextEntries.map(e=>e.label.toLowerCase()).join(' ');
    return t.includes(domain.toLowerCase()) || c.includes(domain.toLowerCase());
  });
  const SECTIONS: Array<{id:Section;label:string}> = [
    {id:'overview',label:'Aperçu'},{id:'parcours',label:'Parcours'},{id:'capital',label:'Capital'},{id:'annonces',label:'Annonces'},{id:'settings',label:'Paramètres'},
  ];

  return (
    <div className="animate-fade-up">

      {/* Identity */}
      <div className="mb-8">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-white/8">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              : <span className="text-base font-semibold text-white/50">{initials}</span>}
          </div>
          <div className="flex-1 pt-1 min-w-0">
            <h1 className="text-xl font-semibold text-white">{profile?.display_name || 'Mon espace'}</h1>
            <p className="text-xs text-white/30 mt-1">{user?.email}</p>
            {capabilityCity && (
              <p className="text-xs text-white/20 mt-1 flex items-center gap-1"><MapPin size={10}/> {capabilityCity}</p>
            )}
            {profile?.bio && <p className="text-sm text-white/45 mt-1.5 leading-relaxed">{profile.bio}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-white/90">{savPoints} pts</span>
          <span className="text-white/15">·</span>
          <span className="text-sm text-white/45">{trustInfo.label}</span>
          <span className="text-white/15">·</span>
          <span className="text-xs text-white/30">{memberSince ? `Membre depuis ${memberSince}` : 'Nouveau membre'}</span>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex items-center gap-5 mb-7 pb-3 border-b border-white/8">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`text-sm font-medium pb-0.5 transition-all ${section===s.id ? 'text-white border-b border-white' : 'text-white/30 hover:text-white/60'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {section === 'overview' && (
        <div className="animate-fade-in">
          <div className="mb-7">
            {[
              { label: needsCount>0 ? `${needsCount} situation${needsCount>1?'s':''} exprimée${needsCount>1?'s':''}` : 'Aucune situation encore exprimée', sub: 'Les fils actifs dans le réseau.' },
              { label: savPoints>0 ? `${savPoints} points de contribution` : 'Aucun point encore', sub: 'Un capital construit par des actes utiles et reconnus.' },
              ...(trustReviews.length>0 ? [{ label: `${trustReviews.length} reconnaissance${trustReviews.length>1?'s':''} reçue${trustReviews.length>1?'s':''}`, sub: 'Témoignages de personnes que vous avez aidées.' }] : []),
            ].map(({label,sub},i) => (
              <div key={i} className="flex items-start gap-4 py-4 border-b border-white/8 last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-white/15 flex-shrink-0 mt-1.5" />
                <div>
                  <p className="text-sm font-semibold text-white/80 mb-0.5">{label}</p>
                  <p className="text-xs text-white/35 leading-relaxed">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {qualitativeSummaries.length > 0 && (
            <div className="mb-7">
              <SectionLabel>Ce que les gens disent</SectionLabel>
              <div className="border-l-2 border-white/8 pl-4 space-y-3">
                {qualitativeSummaries.map((r,i) => <p key={i} className="text-sm text-white/45 leading-relaxed">{r}</p>)}
              </div>
            </div>
          )}

          {earnedBadges.length > 0 && (
            <div>
              <SectionLabel>Domaines reconnus</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {earnedBadges.map(([domain,cfg]) => (
                  <div key={domain} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
                    style={{ background: cfg.bg, color: cfg.color }}>
                    <Award size={10}/> {cfg.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {qualitativeSummaries.length === 0 && (
            <div>
              <SectionLabel>Votre capacité</SectionLabel>
              <div className="border-l-2 border-white/8 pl-4">
                <p className="text-sm text-white/20 leading-relaxed py-2">Les reconnaissances que vous recevrez apparaîtront ici.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PARCOURS ── */}
      {section === 'parcours' && (
        <div className="animate-fade-in">
          <SectionLabel>Ce qui s'est construit, dans l'ordre</SectionLabel>
          {contribEvents.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-white/25">Aucune contribution enregistrée pour l'instant.</p>
              <p className="text-xs text-white/15 mt-1.5">Chaque aide apportée apparaîtra ici.</p>
            </div>
          ) : (
            <div>
              {contribEvents.map((event,i) => (
                <div key={event.id} className="flex gap-4 animate-fade-up pb-5 border-b border-white/8 last:border-0" style={{ animationDelay: `${i*40}ms` }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-white/15 flex-shrink-0 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-white/80">{EVENT_LABELS[event.event_type]||event.event_type}</p>
                      {event.points>0 && <span className="text-xs font-semibold text-emerald-400 flex-shrink-0">+{event.points}</span>}
                    </div>
                    {event.context_category && <p className="text-[10px] tracking-wider uppercase text-white/20 mb-1.5">{event.context_category}</p>}
                    <p className="text-xs text-white/40 leading-relaxed">{event.description}</p>
                    <p className="text-[10px] text-white/20 mt-1.5 flex items-center gap-1">
                      <Clock size={9} className="flex-shrink-0"/>
                      {new Date(event.created_at).toLocaleDateString('fr-FR', {day:'numeric',month:'short',year:'numeric'})}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CAPITAL ── */}
      {section === 'capital' && (
        <div className="animate-fade-in">
          <div className="text-center py-8 mb-6 border-b border-white/8">
            <SectionLabel>Capital de contribution humaine</SectionLabel>
            <div className="flex items-end justify-center gap-2 mb-3">
              <span className="text-6xl font-bold text-white leading-none tabular-nums">{savPoints}</span>
              <span className="text-sm text-white/35 mb-1.5">points</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/8 text-xs font-medium text-white/60 mb-4">
              <Star size={10} style={{ color: '#F26522' }}/> Niveau {trustInfo.level} — {trustInfo.label}
            </div>
            <p className="text-xs text-white/30 max-w-xs mx-auto leading-relaxed mb-4">
              Non achetable. Construit uniquement par des contributions humaines utiles et reconnues.
            </p>
            {trustInfo.level < 6 && (
              <>
                <div className="max-w-[240px] mx-auto mb-2"><ProgressBar pct={progressPct}/></div>
                <p className="text-[10px] text-white/20">{savPoints} / {nextThreshold} pts · Prochain niveau à {nextThreshold-savPoints} pts</p>
              </>
            )}
          </div>

          {Object.keys(avgScoresData).length > 0 && (
            <div className="mb-6">
              <SectionLabel>Scores de reconnaissance · {trustReviews.length} avis</SectionLabel>
              <div className="space-y-3.5">
                {Object.entries(avgScoresData).map(([field,avg]) => (
                  <div key={field}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs text-white/50">{scoreLabel(field)}</span>
                      <span className="text-xs text-white/30 font-semibold">{avg}/5</span>
                    </div>
                    <ProgressBar pct={(avg/5)*100}/>
                  </div>
                ))}
              </div>
            </div>
          )}

          {contextEntries.length > 0 && (
            <div className="mb-6">
              <SectionLabel>Là où vous apportez le plus</SectionLabel>
              <div className="space-y-3.5">
                {contextEntries.map(ctx => (
                  <div key={ctx.label}>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-xs text-white/50">{ctx.label}</span>
                      <span className="text-xs text-white/30">{ctx.pct}%</span>
                    </div>
                    <ProgressBar pct={ctx.pct} color="rgba(255,255,255,0.2)"/>
                  </div>
                ))}
              </div>
            </div>
          )}

          {contribEvents.length > 0 && (
            <div>
              <SectionLabel>Dernières contributions</SectionLabel>
              {contribEvents.slice(0,3).map((e,i) => (
                <div key={e.id} className={`flex items-center justify-between gap-3 py-3 ${i<2?'border-b border-white/8':''}`}>
                  <div>
                    <p className="text-xs font-medium text-white/70">{EVENT_LABELS[e.event_type]||e.event_type}</p>
                    <p className="text-[10px] text-white/25 mt-0.5">{e.context_category} · {new Date(e.created_at).toLocaleDateString('fr-FR',{day:'numeric',month:'short'})}</p>
                  </div>
                  {e.points>0 && <span className="text-xs font-semibold text-emerald-400 flex-shrink-0">+{e.points}</span>}
                </div>
              ))}
              <button onClick={() => setSection('parcours')} className="text-xs text-[#F26522] mt-3 hover:opacity-80 transition-opacity">
                Voir tout le parcours →
              </button>
            </div>
          )}

          {savPoints === 0 && (
            <div className="p-4 bg-white/5 rounded-xl border border-white/8">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} style={{ color: '#F26522' }}/>
                <p className="text-xs font-semibold text-white/60">Comment construire votre capital</p>
              </div>
              <p className="text-xs text-white/35 leading-relaxed">
                Répondez à des situations dans le réseau, complétez des échanges, recevez des reconnaissances. Chaque action utile est comptabilisée.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── PRIVACY ── */}
      {section === 'privacy' && (
        <div className="animate-fade-in">
          <button onClick={() => setSection('settings')}
            className="flex items-center gap-2 text-white/30 hover:text-white/70 text-sm mb-7 transition-all group">
            <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform"/> Retour aux paramètres
          </button>
          <div className="flex items-center gap-2.5 mb-7">
            <Shield size={14} className="text-white/30"/>
            <h2 className="text-sm font-semibold text-white/80">Confidentialité et données</h2>
          </div>

          <div className="mb-7">
            <SectionLabel>Notifications</SectionLabel>
            <div className="flex items-center justify-between py-3.5 border-b border-white/8">
              <div className="flex items-center gap-3">
                <Bell size={13} className="text-white/20"/>
                <div>
                  <p className="text-sm font-medium text-white/70">Notifications par e-mail</p>
                  <p className="text-xs text-white/30 mt-0.5">Signaux et correspondances du réseau</p>
                </div>
              </div>
              <Toggle on={notifEmail} onChange={() => setNotifEmail(v=>!v)}/>
            </div>
          </div>

          <div className="mb-7">
            <SectionLabel>Visibilité du profil</SectionLabel>
            <div className="flex items-center justify-between py-3.5 border-b border-white/8">
              <div>
                <p className="text-sm font-medium text-white/70">Profil visible dans le réseau</p>
                <p className="text-xs text-white/30 mt-0.5">Apparaît dans les résultats de matching</p>
              </div>
              <Toggle on={profileVisible} onChange={() => setProfileVisible(v=>!v)}/>
            </div>
          </div>

          <div className="mb-7">
            <SectionLabel>Mes données (RGPD)</SectionLabel>
            <div className="py-4 border-b border-white/8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white/70 mb-1">Exporter mes données</p>
                  <p className="text-xs text-white/35 leading-relaxed">Toutes vos contributions, situations et échanges au format JSON.</p>
                </div>
                <button
                  onClick={async () => {
                    setPrivacyAction('exporting');
                    const [needsRes,contribRes,convRes] = await Promise.all([
                      supabase.from('needs').select('*').eq('user_id',user!.id),
                      supabase.from('contribution_events').select('*').eq('user_id',user!.id),
                      supabase.from('conversations').select('id,created_at,status').or(`seeker_id.eq.${user!.id},provider_id.eq.${user!.id}`),
                    ]);
                    const blob = new Blob([JSON.stringify({exported_at:new Date().toISOString(),user_id:user!.id,email:user!.email,needs:needsRes.data||[],contributions:contribRes.data||[],conversations:convRes.data||[]},null,2)],{type:'application/json'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href=url; a.download=`renovec-export-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
                    setPrivacyAction('done');
                  }}
                  disabled={privacyAction==='exporting'}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-white/50 hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  <Download size={11}/> {privacyAction==='exporting'?'Export…':privacyAction==='done'?'Exporté':'Exporter'}
                </button>
              </div>
            </div>
            <div className="py-4">
              {!deleteConfirm ? (
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white/70 mb-1">Supprimer mon compte</p>
                    <p className="text-xs text-white/35 leading-relaxed">Suppression définitive de vos données. Irréversible.</p>
                  </div>
                  <button onClick={() => setDeleteConfirm(true)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-xs text-red-400 hover:bg-red-500/20 transition-all">
                    <Trash2 size={11}/> Supprimer
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/25">
                  <p className="text-sm font-semibold text-red-400 mb-1.5">Confirmer la suppression ?</p>
                  <p className="text-xs text-red-400/70 leading-relaxed mb-4">Toutes vos données seront supprimées définitivement. Cette action est irréversible.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs text-white/50 hover:bg-white/8 transition-all">Annuler</button>
                    <button onClick={async () => { await supabase.auth.admin?.deleteUser?.(user!.id); await supabase.auth.signOut(); }}
                      className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-xs text-white font-semibold transition-all">Confirmer la suppression</button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="text-xs text-white/15 text-center leading-relaxed pt-2">Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données.</p>
        </div>
      )}

      {/* ── ANNONCES ── */}
      {section === 'annonces' && (
        <MyListingsSection profileId={capabilityProfileId} />
      )}

      {/* ── SETTINGS ── */}
      {section === 'settings' && (
        <div className="animate-fade-in">
          {editingProfile ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-white/80">Modifier mon profil</h3>
                <button onClick={() => { setEditingProfile(false); setSaveError(''); }} className="text-xs text-white/30 hover:text-white/60 transition-colors">Annuler</button>
              </div>
              <div>
                <label className="text-[11px] tracking-widest uppercase text-white/30 font-medium block mb-2">Nom affiché</label>
                <input type="text" value={displayName} onChange={e=>setDisplayName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white/80 placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"/>
              </div>
              <div>
                <label className="text-[11px] tracking-widest uppercase text-white/30 font-medium block mb-2">Quelques mots sur vous</label>
                <textarea value={bio} onChange={e=>setBio(e.target.value)} rows={3}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white/80 placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none transition-all"/>
              </div>
              {saveError && <p className="text-xs text-red-400">{saveError}</p>}
              <div className="flex gap-3">
                <button onClick={() => { setEditingProfile(false); setSaveError(''); }} className="flex-1 py-3 border border-white/10 text-white/40 text-sm hover:bg-white/5 transition-all rounded-xl">Annuler</button>
                <button onClick={saveProfile} disabled={saving||!displayName.trim()} className="flex-1 py-3 bg-white text-stone-950 text-sm font-medium hover:bg-white/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 rounded-xl">
                  {saving ? <span className="w-4 h-4 border-2 border-stone-900/30 border-t-stone-900 rounded-full animate-spin"/> : 'Enregistrer'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {[
                { icon: User, label: 'Modifier mon profil', sub: 'Nom, bio, préférences', danger: false, action: () => { setDisplayName(profile?.display_name||''); setBio(profile?.bio||''); setEditingProfile(true); } },
                { icon: FileText, label: 'Confidentialité', sub: 'Gestion de vos données RGPD', danger: false, action: () => setSection('privacy') },
                { icon: LogOut, label: 'Se déconnecter', sub: '', danger: true, action: signOut },
              ].map(({ icon: Icon, label, sub, action, danger }) => (
                <button key={label} onClick={action} className="w-full flex items-center gap-3 py-4 border-b border-white/8 last:border-0 hover:pl-1 transition-all text-left group">
                  <Icon size={14} className={`flex-shrink-0 transition-colors ${danger ? 'text-red-400' : 'text-white/20 group-hover:text-white/50'}`}/>
                  <div>
                    <p className={`text-sm font-medium ${danger ? 'text-red-400' : 'text-white/70'}`}>{label}</p>
                    {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-white/15 text-center leading-relaxed pt-6">Vos données sont stockées de manière sécurisée, jamais vendues.</p>
        </div>
      )}
    </div>
  );
}

// ─── My Listings Section ────────────────────────────────────────────────────

const MY_TYPE_META: Record<ProfileListing['listing_type'], { label: string; color: string; bg: string; border: string; icon: typeof ShoppingBag }> = {
  service:     { label: 'Service',    color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.18)',  icon: ShoppingBag },
  object_new:  { label: 'Neuf',       color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.18)',   icon: Box },
  object_used: { label: "D'occasion", color: '#f97316', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.18)',  icon: Package },
  resource:    { label: 'Ressource',  color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.18)', icon: Layers },
  demand:      { label: 'Recherche',  color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.18)',  icon: Search },
};

const COND_LABELS: Record<string, string> = { new: 'Neuf', like_new: 'Comme neuf', good: 'Bon état', fair: 'État correct' };

function MyListingsSection({ profileId }: { profileId: string | null }) {
  const [listings, setListings] = useState<ProfileListing[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!profileId) { setLoading(false); return; }
    let cancelled = false;
    async function load() {
      const { data } = await supabase
        .from('profile_listings')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });
      if (!cancelled) { setListings(data ?? []); setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [profileId]);

  async function toggleAvailability(id: string, current: boolean) {
    await supabase.from('profile_listings').update({ is_available: !current }).eq('id', id);
    setListings(prev => prev.map(l => l.id === id ? { ...l, is_available: !current } : l));
  }

  if (loading) {
    return <div className="py-12 flex justify-center"><div className="w-5 h-5 border border-white/15 border-t-white/50 rounded-full animate-spin" /></div>;
  }

  if (!profileId) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-white/28 mb-3">Créez d'abord votre présence réseau pour ajouter des annonces.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] uppercase tracking-widest text-white/25 font-medium">
          {listings.length > 0 ? `${listings.length} annonce${listings.length > 1 ? 's' : ''}` : 'Mes annonces'}
        </p>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-tab', { detail: { tab: 'capacites' } }))}
          className="flex items-center gap-1.5 text-[11px] text-[#F26522] border border-[#F26522]/25 bg-[#F26522]/8 px-2.5 py-1 rounded-lg hover:bg-[#F26522]/15 transition-all"
        >
          <Plus size={10} /> Ajouter via vitrine
        </button>
      </div>

      {listings.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-white/10 rounded-xl">
          <ShoppingBag size={22} className="text-white/15 mx-auto mb-3" />
          <p className="text-sm text-white/25">Vous n'avez pas encore d'annonces.</p>
          <p className="text-xs text-white/15 mt-1.5 leading-relaxed">Ajoutez vos services, objets ou ressources depuis votre vitrine.</p>
        </div>
      ) : (
        listings.map(l => {
          const meta = MY_TYPE_META[l.listing_type];
          const Icon = meta.icon;
          const img  = l.image_urls?.[0];
          return (
            <div
              key={l.id}
              className="flex items-start gap-3 p-3.5 rounded-xl border transition-all"
              style={{ borderColor: l.is_available ? meta.border : 'rgba(255,255,255,0.06)', background: l.is_available ? meta.bg : 'rgba(255,255,255,0.02)', opacity: l.is_available ? 1 : 0.55 }}
            >
              {/* Thumbnail */}
              {img ? (
                <img src={img} alt={l.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" loading="lazy" />
              ) : (
                <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: meta.bg }}>
                  <Icon size={18} style={{ color: meta.color, opacity: 0.5 }} />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <p className="text-[13px] font-semibold text-white/80 leading-snug line-clamp-1">{l.title}</p>
                  <span className="flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0" style={{ color: meta.color, borderColor: meta.border }}>
                    <Icon size={8} /> {meta.label}
                  </span>
                </div>
                <p className="text-[11px] text-white/35 line-clamp-1 mb-1.5">{l.description}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {l.price_hint && (
                    <span className="text-[10px] font-semibold flex items-center gap-0.5"
                      style={{ color: l.price_hint.toLowerCase().includes('gratuit') ? '#22c55e' : 'rgba(255,255,255,0.35)' }}>
                      <Tag size={8} />{l.price_hint}
                    </span>
                  )}
                  {l.condition && <span className="text-[10px] text-white/25">{COND_LABELS[l.condition]}</span>}
                  <button
                    onClick={() => toggleAvailability(l.id, l.is_available)}
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border transition-all ml-auto ${
                      l.is_available
                        ? 'text-emerald-400 border-emerald-500/25 bg-emerald-500/10 hover:bg-emerald-500/20'
                        : 'text-white/28 border-white/10 hover:border-white/20 hover:text-white/50'
                    }`}
                  >
                    {l.is_available ? 'Disponible' : 'Indisponible'}
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
