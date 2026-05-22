import { ReactNode, useState, useCallback } from 'react';
import { Users, User, ShieldCheck, Bell, Newspaper } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSituation, SituationPhase } from '../contexts/SituationContext';
import NeuralCanvas from './NeuralCanvas';
import ConversationCapsule from './ConversationCapsule';

type Tab = 'demander' | 'capacites' | 'discussions' | 'contributions' | 'espace' | 'notifications' | 'admin' | 'carte' | 'feed';

type Props = {
  children: ReactNode;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  notifCount?: number;
  isAdmin?: boolean;
  onGoLanding?: () => void;
  onOpenMyProfile?: () => void;
  onLogin?: () => void;
};

function phaseIndicator(phase: SituationPhase): { color: string; label: string } {
  switch (phase) {
    case 'idle':       return { color: 'bg-white/15', label: '' };
    case 'expressed':  return { color: 'bg-white/40', label: 'Situation posée' };
    case 'reading':    return { color: 'bg-blue-400', label: 'Lecture en cours' };
    case 'clarifying': return { color: 'bg-amber-400', label: 'Clarification' };
    case 'emerging':   return { color: 'bg-emerald-400', label: 'Présences identifiées' };
    case 'exchanging': return { color: 'bg-white/60', label: 'Échange actif' };
    case 'resolved':   return { color: 'bg-emerald-300', label: 'Résolu' };
    default:           return { color: 'bg-white/15', label: '' };
  }
}

export default function Layout({ children, activeTab, onTabChange, notifCount = 0, isAdmin = false, onGoLanding, onOpenMyProfile, onLogin }: Props) {
  const { profile } = useAuth();
  const { phase } = useSituation();
  const [activity, setActivity] = useState(0);
  const indicator = phaseIndicator(phase);

  const handleActivity = useCallback((level: number) => {
    setActivity(level);
  }, []);

  const showMainSurface = activeTab === 'demander';

  return (
    <div className="h-screen flex flex-col bg-stone-950 overflow-hidden">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 h-[48px] bg-stone-950/90 backdrop-blur-sm border-b border-white/[0.03] z-40">
        <div className="h-full px-4 md:px-6 flex items-center justify-between">
          {/* Left: brand */}
          <button onClick={onGoLanding} className="flex items-center gap-2.5 group">
            <div className="w-4.5 h-4.5 bg-[#F26522] rounded flex items-center justify-center flex-shrink-0" style={{ width: 18, height: 18 }}>
              <div className="w-[7px] h-[7px] rounded-sm bg-white opacity-90" />
            </div>
            <span className="text-[13px] font-semibold tracking-tight text-white/80">RENOVEC</span>
          </button>

          {/* Center nav */}
          <nav className="hidden md:flex items-center gap-7">
            <button
              onClick={() => onTabChange('feed')}
              className={`text-[11px] tracking-wide font-medium transition-colors ${activeTab === 'feed' ? 'text-white/60' : 'text-white/20 hover:text-white/45'}`}
            >
              Fil
            </button>
            <button
              onClick={() => onTabChange('capacites')}
              className={`text-[11px] tracking-wide font-medium transition-colors ${activeTab === 'capacites' ? 'text-white/60' : 'text-white/20 hover:text-white/45'}`}
            >
              Réseau
            </button>
            <button
              onClick={() => onTabChange('carte')}
              className={`text-[11px] tracking-wide font-medium transition-colors ${activeTab === 'carte' ? 'text-white/60' : 'text-white/20 hover:text-white/45'}`}
            >
              Carte
            </button>
          </nav>

          {/* Right */}
          <div className="flex items-center gap-1.5">
            {indicator.label && (
              <div className="hidden md:flex items-center gap-2 mr-2 px-2.5 py-1 rounded-full bg-white/[0.02] border border-white/[0.04]">
                <div className={`w-1.5 h-1.5 rounded-full ${indicator.color}`} />
                <span className="text-[9px] tracking-wide text-white/25">{indicator.label}</span>
              </div>
            )}

            {profile ? (
              <>
                {isAdmin && (
                  <button onClick={() => onTabChange('admin')} className={`p-2 rounded-lg transition-all ${activeTab === 'admin' ? 'text-red-400' : 'text-white/15 hover:text-white/40'}`}>
                    <ShieldCheck size={13} strokeWidth={1.5} />
                  </button>
                )}
                <button
                  onClick={() => onTabChange('notifications')}
                  className={`relative p-2 rounded-lg transition-all ${activeTab === 'notifications' ? 'text-white' : 'text-white/20 hover:text-white/45'}`}
                >
                  <Bell size={13} strokeWidth={1.5} />
                  {notifCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#F26522] text-white text-[7px] font-bold rounded-full flex items-center justify-center leading-none">
                      {notifCount > 9 ? '9' : notifCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => onOpenMyProfile ? onOpenMyProfile() : onTabChange('espace')}
                  className={`w-6 h-6 ml-1 rounded-full flex items-center justify-center overflow-hidden transition-all border ${
                    activeTab === 'espace' ? 'border-white/50' : 'border-white/[0.06] hover:border-white/25'
                  }`}
                >
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-[9px] font-semibold text-white/40">{profile.display_name?.[0]?.toUpperCase() || '?'}</span>}
                </button>
              </>
            ) : (
              <button
                onClick={onLogin}
                className="text-[10px] text-white/30 hover:text-white/65 transition-colors px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/15 hover:bg-white/[0.02]"
              >
                Entrer
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── Main surface ────────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        {showMainSurface ? (
          <>
            {/* Living neural background */}
            <NeuralCanvas activity={activity} />

            {/* Conversation capsule — centered, floating */}
            <div className="absolute inset-0 flex items-end md:items-center justify-center px-4 pb-8 md:pb-0 z-10">
              <ConversationCapsule onActivityChange={handleActivity} />
            </div>

            {/* Footer text */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center z-10 pointer-events-none">
              <p className="text-[9px] tracking-[0.2em] text-white/[0.08] uppercase font-medium">
                RENOVEC · Occitanie · Infrastructure relationnelle IA
              </p>
            </div>
          </>
        ) : (
          /* Legacy tab content */
          <div className="h-full overflow-y-auto">
            <div className="max-w-2xl mx-auto w-full px-4 py-7">
              {children}
            </div>
          </div>
        )}
      </div>

      {/* ─── Bottom nav (mobile) ─────────────────────────────────────────── */}
      <nav className="md:hidden flex-shrink-0 h-12 bg-stone-950/95 backdrop-blur-sm border-t border-white/[0.04] z-40">
        <div className="h-full max-w-md mx-auto px-3 flex">
          {([
            { id: 'demander' as Tab, label: 'Parler', icon: null },
            { id: 'feed' as Tab, label: 'Fil', icon: Newspaper },
            { id: 'capacites' as Tab, label: 'Réseau', icon: Users },
            { id: 'espace' as Tab, label: 'Moi', icon: User },
          ]).map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all"
              >
                {id === 'demander' ? (
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${active ? 'bg-emerald-400/20' : ''}`}>
                    <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-400' : 'bg-white/15'}`} />
                  </div>
                ) : Icon ? (
                  <Icon size={16} strokeWidth={1.5} className={`transition-colors ${active ? 'text-white/80' : 'text-white/20'}`} />
                ) : null}
                <span className={`text-[9px] tracking-wider uppercase transition-colors ${active ? 'text-white/70' : 'text-white/15'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
