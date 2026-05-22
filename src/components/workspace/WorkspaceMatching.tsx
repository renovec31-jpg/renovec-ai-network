import { MapPin, Star, Clock, ChevronRight, MessageSquare } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { avatarBg, initials } from '../../lib/ui';

export default function WorkspaceMatching() {
  const { matchingProfiles, selectProfile } = useWorkspace();

  return (
    <div className="h-full overflow-y-auto px-6 py-8 scrollbar-hide animate-fade-up">
      <div className="mb-8">
        <p className="text-[11px] tracking-widest uppercase text-white/20 font-medium mb-2">
          Présences identifiées
        </p>
        <h2 className="text-xl font-semibold text-white/80 leading-snug mb-1.5">
          {matchingProfiles.length} appuis pertinents dans votre zone
        </h2>
        <p className="text-[13px] text-white/30 leading-relaxed">
          Évalués par le réseau selon votre situation. Score de pertinence calculé en temps réel.
        </p>
      </div>

      <div className="space-y-3">
        {matchingProfiles.map((profile, idx) => (
          <button
            key={profile.id}
            onClick={() => selectProfile(profile.id)}
            className="w-full text-left p-5 rounded-2xl border border-white/[0.05] bg-gradient-to-br from-white/[0.025] to-transparent hover:from-white/[0.05] hover:border-white/[0.1] transition-all duration-300 group"
          >
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg"
                style={{ background: avatarBg(profile.name) }}
              >
                {initials(profile.name)}
              </div>

              <div className="flex-1 min-w-0">
                {/* Top row */}
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-[15px] font-semibold text-white/85 truncate">{profile.name}</h3>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                    <span className="text-[12px] font-bold text-emerald-400">{profile.score}%</span>
                    <ChevronRight size={13} className="text-white/10 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>

                {/* Tagline */}
                <p className="text-[12px] text-white/35 mb-3">{profile.tagline}</p>

                {/* Capabilities */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {profile.capabilities.map(cap => (
                    <span
                      key={cap}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/40 font-medium"
                    >
                      {cap}
                    </span>
                  ))}
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 text-[11px] text-white/25">
                  <span className="flex items-center gap-1.5">
                    <MapPin size={10} /> {profile.city}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={10} /> {profile.availability}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer: badge + contact */}
            <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between">
              {idx === 0 ? (
                <div className="flex items-center gap-2">
                  <Star size={11} className="text-amber-400/80" />
                  <span className="text-[11px] text-amber-400/60 font-medium">Meilleure correspondance</span>
                </div>
              ) : <div />}
              <span
                className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors font-medium"
                onClick={(e) => { e.stopPropagation(); }}
              >
                <MessageSquare size={11} />
                Contacter
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Action hint */}
      <div className="mt-8 p-5 rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.01]">
        <p className="text-[12px] text-white/35 leading-relaxed text-center">
          Dites "contacte-les" dans la conversation pour lancer une mise en relation.
        </p>
      </div>
    </div>
  );
}
