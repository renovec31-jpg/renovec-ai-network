import { MapPin, Star, Clock, ChevronRight } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { avatarBg, initials } from '../../lib/ui';

export default function WorkspaceMatching() {
  const { matchingProfiles, selectProfile } = useWorkspace();

  return (
    <div className="px-5 py-6 animate-fade-up">
      <div className="mb-6">
        <p className="text-[11px] tracking-widest uppercase text-white/20 font-medium mb-1.5">
          Presences identifiees
        </p>
        <h2 className="text-lg font-medium text-white/80 mb-1">
          {matchingProfiles.length} appuis pertinents
        </h2>
        <p className="text-[13px] text-white/35 leading-relaxed">
          Evalues par le reseau. Pertinence calculee selon votre situation.
        </p>
      </div>

      <div className="space-y-3">
        {matchingProfiles.map((profile, idx) => (
          <button
            key={profile.id}
            onClick={() => selectProfile(profile.id)}
            className="w-full text-left p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all group"
          >
            <div className="flex items-start gap-3.5">
              {/* Avatar */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: avatarBg(profile.name) }}
              >
                {initials(profile.name)}
              </div>

              <div className="flex-1 min-w-0">
                {/* Top row */}
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[14px] font-semibold text-white/85 truncate">{profile.name}</h3>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <span className="text-[11px] font-bold text-emerald-400">{profile.score}%</span>
                    <ChevronRight size={12} className="text-white/15 group-hover:text-white/40 transition-colors" />
                  </div>
                </div>

                {/* Tagline */}
                <p className="text-[12px] text-white/40 mb-2 truncate">{profile.tagline}</p>

                {/* Capabilities */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {profile.capabilities.slice(0, 3).map(cap => (
                    <span
                      key={cap}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/40"
                    >
                      {cap}
                    </span>
                  ))}
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 text-[11px] text-white/25">
                  <span className="flex items-center gap-1">
                    <MapPin size={9} /> {profile.city}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={9} /> {profile.availability}
                  </span>
                </div>
              </div>
            </div>

            {/* Rank indicator */}
            {idx === 0 && (
              <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center gap-2">
                <Star size={10} className="text-amber-400/70" />
                <span className="text-[10px] text-amber-400/60 font-medium">Meilleure correspondance pour votre situation</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Action */}
      <div className="mt-6 p-4 rounded-xl border border-dashed border-white/[0.08] text-center">
        <p className="text-[12px] text-white/30 mb-2">
          Vous pouvez demander au coordinateur de les contacter en votre nom.
        </p>
        <p className="text-[11px] text-white/15">
          Dites simplement "contacte-les" dans la conversation.
        </p>
      </div>
    </div>
  );
}
