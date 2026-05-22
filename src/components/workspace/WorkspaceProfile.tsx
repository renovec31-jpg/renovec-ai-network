import { ArrowLeft, MapPin, Clock, Star, MessageSquare } from 'lucide-react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { MOCK_PROFILE_DETAIL } from '../../data/mockWorkspace';
import { avatarBg, initials } from '../../lib/ui';

export default function WorkspaceProfile() {
  const { selectProfile, setView } = useWorkspace();
  const profile = MOCK_PROFILE_DETAIL;

  return (
    <div className="h-full overflow-y-auto px-6 py-8 scrollbar-hide animate-fade-up">
      {/* Back */}
      <button
        onClick={() => { selectProfile(null); setView('matching'); }}
        className="flex items-center gap-1.5 text-[12px] text-white/25 hover:text-white/60 transition-colors mb-8 group"
      >
        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
        Retour aux résultats
      </button>

      {/* Profile header */}
      <div className="flex items-start gap-4 mb-8">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-xl"
          style={{ background: avatarBg(profile.name) }}
        >
          {initials(profile.name)}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-white/90 mb-1">{profile.name}</h2>
          <p className="text-[13px] text-white/40 mb-3 leading-relaxed">{profile.tagline}</p>
          <div className="flex items-center gap-4 text-[11px] text-white/30">
            <span className="flex items-center gap-1.5"><MapPin size={10} /> {profile.city}</span>
            <span className="flex items-center gap-1.5"><Star size={10} className="text-amber-400" /> {profile.trustScore} ({profile.reviewCount} avis)</span>
            <span className="flex items-center gap-1.5"><Clock size={10} /> {profile.responseTime}</span>
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="mb-8">
        <p className="text-[11px] tracking-widest uppercase text-white/20 font-medium mb-3">À propos</p>
        <p className="text-[13px] text-white/55 leading-[1.8]">{profile.bio}</p>
      </div>

      {/* Capabilities */}
      <div className="mb-8">
        <p className="text-[11px] tracking-widest uppercase text-white/20 font-medium mb-3">Compétences</p>
        <div className="flex flex-wrap gap-2">
          {profile.capabilities.map(cap => (
            <span
              key={cap}
              className="text-[11px] px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/50 font-medium"
            >
              {cap}
            </span>
          ))}
        </div>
      </div>

      {/* Services */}
      <div className="mb-8">
        <p className="text-[11px] tracking-widest uppercase text-white/20 font-medium mb-3">Services</p>
        <div className="space-y-2.5">
          {profile.services.map(svc => (
            <div key={svc.title} className="p-4 rounded-xl border border-white/[0.05] bg-gradient-to-br from-white/[0.02] to-transparent">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13px] font-medium text-white/70">{svc.title}</span>
                <span className="text-[12px] text-white/45 font-semibold">{svc.price}</span>
              </div>
              <p className="text-[11px] text-white/25">{svc.format}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div className="p-4 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] mb-8">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[13px] font-medium text-emerald-400/80">{profile.availability}</span>
        </div>
        <p className="text-[11px] text-white/30 ml-[18px]">{profile.responseTime}</p>
      </div>

      {/* CTA */}
      <button className="w-full py-3.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.06] hover:border-white/[0.12] text-[13px] font-medium text-white/70 hover:text-white/90 transition-all flex items-center justify-center gap-2.5">
        <MessageSquare size={14} />
        Demander une mise en relation
      </button>
    </div>
  );
}
