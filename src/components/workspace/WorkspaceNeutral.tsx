import { MessageSquare, Users, MapPin, Zap } from 'lucide-react';

export default function WorkspaceNeutral() {
  return (
    <div className="h-full flex flex-col items-center justify-center px-8 py-12">
      {/* Ambient visual */}
      <div className="relative mb-10">
        <div className="w-24 h-24 rounded-full border border-white/[0.06] flex items-center justify-center">
          <div className="w-14 h-14 rounded-full border border-white/[0.08] flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-white/10 animate-pulse" />
          </div>
        </div>
        <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400/50 animate-ping" style={{ animationDuration: '3s' }} />
      </div>

      <h2 className="text-lg font-medium text-white/60 mb-2 text-center">
        Surface adaptative
      </h2>
      <p className="text-[13px] text-white/30 leading-relaxed text-center max-w-sm mb-12">
        Cet espace s'adapte a votre conversation. Il affichera les profils,
        les propositions, et les informations pertinentes au fil de l'echange.
      </p>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {[
          { icon: MessageSquare, label: 'Nouvelle situation', sub: 'Decrivez votre besoin' },
          { icon: Users, label: 'Reseau actif', sub: '147 presences proches' },
          { icon: MapPin, label: 'Votre zone', sub: 'Lyon et peripherie' },
          { icon: Zap, label: 'Temps de reponse', sub: 'Moy. 2h sur le reseau' },
        ].map(({ icon: Icon, label, sub }) => (
          <div
            key={label}
            className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all group cursor-default"
          >
            <Icon size={16} className="text-white/20 group-hover:text-white/40 transition-colors mb-2" />
            <p className="text-[12px] font-medium text-white/50 mb-0.5">{label}</p>
            <p className="text-[11px] text-white/20">{sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
