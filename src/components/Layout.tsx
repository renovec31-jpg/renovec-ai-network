import { ReactNode, useState } from 'react';
import { MessageSquare, Users, User, ShieldCheck, Bell, Newspaper, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSituation, SituationPhase } from '../contexts/SituationContext';
import ChatColumn from './ChatColumn';
import AdaptiveWorkspace from './AdaptiveWorkspace';

type Tab = 'demander' | 'capacites' | 'discussions' | 'contributions' | 'espace' | 'notifications' | 'admin' | 'carte' | 'feed';

type Props = {
  children: ReactNode;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  notifCount?: number;
  isAdmin?: boolean;
  onShowHowItWorks?: () => void;
  onGoLanding?: () => void;
  onOpenMyProfile?: () => void;
  onLogin?: () => void;
};

const NAV: Array<{ id: Tab; label: string; icon: typeof MessageSquare }> = [
  { id: 'demander',    label: 'SITUATION', icon: MessageSquare },
  { id: 'feed',        label: 'FIL',       icon: Newspaper },
  { id: 'capacites',   label: 'RÉSEAU',    icon: Users },
  { id: 'espace',      label: 'MOI',       icon: User },
];

function phaseIndicator(phase: SituationPhase): { color: string; label: string } {
  switch (phase) {
    case 'idle':       return { color: 'bg-white/15', label: '' };
    case 'expressed':  return { color: 'bg-white/40', label: 'Situation posee' };
    case 'reading':    return { color: 'bg-blue-400', label: 'Lecture en cours' };
    case 'clarifying': return { color: 'bg-amber-400', label: 'Clarification' };
    case 'emerging':   return { color: 'bg-emerald-400', label: 'Presences identifiees' };
    case 'exchanging': return { color: 'bg-white/60', label: 'Echange actif' };
    case 'resolved':   return { color: 'bg-emerald-300', label: 'Resolu' };
    default:           return { color: 'bg-white/15', label: '' };
  }
}

export default function Layout({ children, activeTab, onTabChange, notifCount = 0, isAdmin = false, onGoLanding, onOpenMyProfile, onLogin }: Props) {
  const { profile } = useAuth();
  const { phase } = useSituation();
  const [mobileView, setMobileView] = useState<'chat' | 'workspace'>('chat');
  const indicator = phaseIndicator(phase);

  const showWorkspace = activeTab === 'demander';

  return (
    <div className="h-screen flex flex-col bg-stone-950 overflow-hidden">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 h-[52px] bg-stone-950 border-b border-white/[0.04] z-40">
        <div className="h-full px-4 md:px-6 flex items-center justify-between">
          {/* Left: brand */}
          <button onClick={onGoLanding} className="flex items-center gap-2.5 group">
            <div className="w-5 h-5 bg-[#F26522] rounded flex items-center justify-center flex-shrink-0">
              <div className="w-2 h-2 rounded-sm bg-white opacity-90" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">RENOVEC</span>
          </button>

          {/* Center: navigation links */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => onTabChange('feed')}
              className={`text-[12px] font-medium transition-colors ${activeTab === 'feed' ? 'text-white/70' : 'text-white/25 hover:text-white/50'}`}
            >
              Fil
            </button>
            <button
              onClick={() => onTabChange('capacites')}
              className={`text-[12px] font-medium transition-colors ${activeTab === 'capacites' ? 'text-white/70' : 'text-white/25 hover:text-white/50'}`}
            >
              Réseau
            </button>
            <button
              onClick={() => onTabChange('carte')}
              className={`text-[12px] font-medium transition-colors ${activeTab === 'carte' ? 'text-white/70' : 'text-white/25 hover:text-white/50'}`}
            >
              À propos
            </button>
          </nav>

          {/* Right: actions */}
          <div className="flex items-center gap-1.5">
            {/* Phase indicator pill */}
            {indicator.label && (
              <div className="hidden md:flex items-center gap-2 mr-3 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.05]">
                <div className={`w-1.5 h-1.5 rounded-full ${indicator.color}`} />
                <span className="text-[10px] tracking-wide text-white/30">{indicator.label}</span>
              </div>
            )}

            {profile ? (
              <>
                {isAdmin && (
                  <button
                    onClick={() => onTabChange('admin')}
                    className={`p-2 rounded-xl transition-all ${activeTab === 'admin' ? 'text-red-400' : 'text-white/20 hover:text-white/50'}`}
                  >
                    <ShieldCheck size={14} strokeWidth={1.5} />
                  </button>
                )}
                <button
                  onClick={() => onTabChange('notifications')}
                  className={`relative p-2 rounded-xl transition-all ${activeTab === 'notifications' ? 'text-white' : 'text-white/25 hover:text-white/50'}`}
                >
                  <Bell size={14} strokeWidth={1.5} />
                  {notifCount > 0 && (
                    <span className="absolute top-1 right-1 w-3 h-3 bg-[#F26522] text-white text-[7px] font-bold rounded-full flex items-center justify-center leading-none">
                      {notifCount > 9 ? '9' : notifCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => onOpenMyProfile ? onOpenMyProfile() : onTabChange('espace')}
                  className={`w-7 h-7 ml-1 rounded-full flex items-center justify-center overflow-hidden transition-all border ${
                    activeTab === 'espace' ? 'border-white/60' : 'border-white/[0.08] hover:border-white/30'
                  }`}
                >
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-[11px] font-semibold text-white/50">{profile.display_name?.[0]?.toUpperCase() || '?'}</span>}
                </button>
              </>
            ) : (
              <button
                onClick={onLogin}
                className="text-[11px] text-white/35 hover:text-white/75 transition-colors px-3.5 py-1.5 rounded-lg border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.03]"
              >
                Entrer
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── Main area ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* === DESKTOP (>768px): both columns visible === */}
        <div className="hidden md:flex w-[40%] min-w-[340px] max-w-[480px] border-r border-white/[0.04] flex-col">
          <ChatColumn />
        </div>

        <div className="hidden md:flex flex-1 flex-col overflow-hidden">
          {showWorkspace ? (
            <AdaptiveWorkspace />
          ) : activeTab === 'carte' ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              {children}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto w-full px-4 py-7">
                {children}
              </div>
            </div>
          )}
        </div>

        {/* === MOBILE (<768px): toggle === */}
        <div className="md:hidden flex-1 flex flex-col">
          <div className="flex-shrink-0 h-10 border-b border-white/[0.04] flex items-center px-4 gap-2">
            <button
              onClick={() => setMobileView('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                mobileView === 'chat' ? 'bg-white/[0.08] text-white/80' : 'text-white/30 hover:text-white/50'
              }`}
            >
              <MessageSquare size={11} /> Parler
            </button>
            <button
              onClick={() => setMobileView('workspace')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                mobileView === 'workspace' ? 'bg-white/[0.08] text-white/80' : 'text-white/30 hover:text-white/50'
              }`}
            >
              {mobileView === 'workspace' ? <PanelRightClose size={11} /> : <PanelRightOpen size={11} />}
              Surface
            </button>
            {indicator.label && (
              <div className="ml-auto flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${indicator.color}`} />
                <span className="text-[10px] text-white/20">{indicator.label}</span>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            {mobileView === 'chat' ? (
              <ChatColumn />
            ) : showWorkspace ? (
              <AdaptiveWorkspace />
            ) : (
              <div className="h-full overflow-y-auto">
                <div className="max-w-2xl mx-auto w-full px-4 py-7">
                  {children}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Footer ──────────────────────────────────────────────────────── */}
      <footer className="flex-shrink-0 h-8 bg-stone-950 border-t border-white/[0.03] flex items-center justify-center z-40">
        <p className="text-[10px] tracking-widest text-white/12 font-medium uppercase">
          RENOVEC · Occitanie · Infrastructure relationnelle IA
        </p>
      </footer>

      {/* ─── Bottom nav (mobile) ─────────────────────────────────────────── */}
      <nav className="md:hidden flex-shrink-0 h-14 bg-stone-950 border-t border-white/[0.05] z-40">
        <div className="h-full max-w-lg mx-auto px-2 flex">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className="flex-1 flex flex-col items-center justify-center gap-1 transition-all"
              >
                <div className="relative">
                  <Icon
                    size={18}
                    strokeWidth={1.5}
                    className={`transition-colors ${active ? 'text-white' : 'text-white/20 hover:text-white/45'}`}
                  />
                  {id === 'demander' && phase !== 'idle' && (
                    <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${indicator.color}`} />
                  )}
                </div>
                <span
                  className="text-[10px] tracking-wider uppercase font-normal transition-colors"
                  style={{ color: active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)' }}
                >
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
