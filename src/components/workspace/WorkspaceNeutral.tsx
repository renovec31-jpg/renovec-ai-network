import { Users, MapPin, Clock, TrendingUp, Wrench, Home, Droplets, Zap } from 'lucide-react';
import { avatarBg, initials } from '../../lib/ui';

const ACTIVE_PROFILES = [
  { name: 'Laurent Esquié', role: 'Plombier-chauffagiste', city: 'Merville', available: true },
  { name: 'Claire Fontan', role: 'Architecte DPLG', city: 'Toulouse', available: true },
  { name: 'Atelier Bascou', role: 'Menuiserie bois massif', city: 'Blagnac', available: false },
  { name: 'Sophie Cazenave', role: 'Electricienne', city: 'Colomiers', available: true },
  { name: 'Rémi Delcros', role: 'Maçon pierre & brique', city: 'L\'Isle-Jourdain', available: true },
];

const RECENT_SITUATIONS = [
  { text: 'Isolation combles maison 1960', city: 'Merville', time: 'il y a 25 min' },
  { text: 'Fuite chauffe-eau collectif', city: 'Toulouse', time: 'il y a 1h' },
  { text: 'Rénovation salle de bain PMR', city: 'Muret', time: 'il y a 3h' },
];

const STATS = [
  { icon: Users, value: '83', label: 'artisans actifs', sub: 'Haute-Garonne' },
  { icon: Clock, value: '1h40', label: 'réponse moyenne', sub: 'cette semaine' },
  { icon: TrendingUp, value: '12', label: 'situations résolues', sub: '7 derniers jours' },
  { icon: MapPin, value: '31', label: 'communes couvertes', sub: 'Occitanie' },
];

const CAPABILITIES = [
  { icon: Wrench, label: 'Plomberie', count: 14 },
  { icon: Home, label: 'Rénovation', count: 23 },
  { icon: Droplets, label: 'Isolation', count: 11 },
  { icon: Zap, label: 'Électricité', count: 9 },
];

export default function WorkspaceNeutral() {
  return (
    <div className="h-full overflow-y-auto px-6 py-8 space-y-8 scrollbar-hide">
      {/* Header */}
      <div>
        <p className="text-[11px] tracking-widest uppercase text-white/20 font-medium mb-2">
          Réseau RENOVEC · Occitanie
        </p>
        <h2 className="text-xl font-semibold text-white/75 leading-snug mb-1.5">
          Ce qui se passe autour de vous.
        </h2>
        <p className="text-[13px] text-white/30 leading-relaxed">
          Parlez dans la colonne de gauche — cette surface s'adaptera a votre situation.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {STATS.map(({ icon: Icon, value, label, sub }) => (
          <div
            key={label}
            className="p-4 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent hover:from-white/[0.05] transition-all"
          >
            <Icon size={15} className="text-white/20 mb-3" strokeWidth={1.5} />
            <p className="text-xl font-semibold text-white/80 leading-none mb-1">{value}</p>
            <p className="text-[12px] text-white/45 font-medium">{label}</p>
            <p className="text-[10px] text-white/20 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Capabilities */}
      <div>
        <p className="text-[11px] tracking-widest uppercase text-white/20 font-medium mb-3">
          Métiers présents
        </p>
        <div className="flex gap-2 flex-wrap">
          {CAPABILITIES.map(({ icon: Icon, label, count }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all"
            >
              <Icon size={13} className="text-white/30" strokeWidth={1.5} />
              <span className="text-[12px] text-white/50 font-medium">{label}</span>
              <span className="text-[10px] text-white/20 bg-white/[0.05] px-1.5 py-0.5 rounded-full">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Active profiles */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] tracking-widest uppercase text-white/20 font-medium">
            Présences actives
          </p>
          <span className="text-[10px] text-white/15">{ACTIVE_PROFILES.filter(p => p.available).length} disponibles</span>
        </div>
        <div className="space-y-2">
          {ACTIVE_PROFILES.map((p) => (
            <div
              key={p.name}
              className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.04] transition-all group cursor-default"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0"
                style={{ background: avatarBg(p.name) }}
              >
                {initials(p.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-white/65 truncate group-hover:text-white/80 transition-colors">{p.name}</p>
                <p className="text-[11px] text-white/30 truncate">{p.role} · {p.city}</p>
              </div>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.available ? 'bg-emerald-400/80' : 'bg-white/10'}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Recent situations */}
      <div>
        <p className="text-[11px] tracking-widest uppercase text-white/20 font-medium mb-3">
          Situations récentes dans la zone
        </p>
        <div className="space-y-2">
          {RECENT_SITUATIONS.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-xl border border-white/[0.05] bg-white/[0.015]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400/60 flex-shrink-0" />
                <p className="text-[12px] text-white/50 truncate">{s.text}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <span className="text-[10px] text-white/20">{s.city}</span>
                <span className="text-[10px] text-white/15">{s.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
