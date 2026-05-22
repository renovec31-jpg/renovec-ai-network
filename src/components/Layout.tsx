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

export default function Layout({ children, activeTab, onTabChange, notifCount = 0, isAdmin = false, onShowHowItWorks, onGoLanding, onOpenMyProfile }: Props) {
  const { profile } = useAuth();
  const { phase } = useSituation();
  const [mobileView, setMobileView] = useState<'chat' | 'workspace'>('chat');
  const indicator = phaseIndicator(phase);

  // On "demander" tab, show the split layout (chat + workspace)
  // On other tabs, show legacy content in full workspace area
  const isChatMode = activeTab === 'demander';

  return (
    <div className="h-screen flex flex-col bg-stone-950 overflow-hidden">
      {/* ─── Top bar ─────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 h-[52px] bg-stone-950 border-b border-white/5 z-40">
        <div className="h-full px-4 lg:px-6 flex items-center justify-between">
          {/* Left: brand */}
          <button onClick={onGoLanding} className="flex items-center gap-2 group">
            <div className="w-5 h-5 bg-[#F26522] rounded flex items-center justify-center flex-shrink-0">
              <div className="w-2 h-2 rounded-sm bg-white opacity-90" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">RENOVEC</span>
          </button>

          {/* Center: phase indicator (desktop) */}
          {indicator.label && (
            <div className="hidden lg:flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${indicator.color}`} />
              <span className="text-[11px] tracking-wide text-white/30">{indicator.label}</span>
            </div>
          )}

          {/* Right: actions */}
          <div className="flex items-center gap-1">
            {onShowHowItWorks && (
              <button
                onClick={onShowHowItWorks}
                className="hidden lg:block text-[11px] text-white/25 hover:text-white/60 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
              >
                Comment ca marche
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => onTabChange('admin')}
                className={`p-2 rounded-xl transition-all ${activeTab === 'admin' ? 'text-red-400' : 'text-white/20 hover:text-white/50'}`}
              >
                <ShieldCheck size={15} strokeWidth={1.5} />
              </button>
            )}
            <button
              onClick={() => onTabChange('notifications')}
              className={`relative p-2 rounded-xl transition-all ${activeTab === 'notifications' ? 'text-white' : 'text-white/25 hover:text-white/50'}`}
            >
              <Bell size={15} strokeWidth={1.5} />
              {notifCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-[#F26522] text-white text-[8px] font-bold rounded-full flex items-center justify-center leading-none">
                  {notifCount > 9 ? '9' : notifCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onOpenMyProfile ? onOpenMyProfile() : onTabChange('espace')}
              className={`w-7 h-7 ml-1 rounded-full flex items-center justify-center overflow-hidden transition-all border ${
                activeTab === 'espace' ? 'border-white/60' : 'border-white/10 hover:border-white/30'
              }`}
            >
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : <span className="text-[11px] font-semibold text-white/50">{profile?.display_name?.[0]?.toUpperCase() || '?'}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main area ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {isChatMode ? (
          <>
            {/* === DESKTOP: split layout === */}
            {/* Chat column (40%) */}
            <div className="hidden lg:flex w-[40%] min-w-[360px] max-w-[520px] border-r border-white/5 flex-col">
              <ChatColumn />
            </div>

            {/* Adaptive workspace (60%) */}
            <div className="hidden lg:flex flex-1 flex-col">
              <AdaptiveWorkspace />
            </div>

            {/* === MOBILE: togglable view === */}
            <div className="lg:hidden flex-1 flex flex-col">
              {/* Mobile toggle */}
              <div className="flex-shrink-0 h-10 border-b border-white/5 flex items-center px-4 gap-2">
                <button
                  onClick={() => setMobileView('chat')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    mobileView === 'chat' ? 'bg-white/10 text-white/80' : 'text-white/30'
                  }`}
                >
                  <MessageSquare size={11} /> Conversation
                </button>
                <button
                  onClick={() => setMobileView('workspace')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                    mobileView === 'workspace' ? 'bg-white/10 text-white/80' : 'text-white/30'
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

              {/* Content */}
              <div className="flex-1 overflow-hidden">
                {mobileView === 'chat' ? <ChatColumn /> : <AdaptiveWorkspace />}
              </div>
            </div>
          </>
        ) : (
          /* Non-chat tabs: full-width legacy content */
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto w-full px-4 py-7">
              {children}
            </div>
          </div>
        )}
      </div>

      {/* ─── Bottom nav ──────────────────────────────────────────────────── */}
      <nav className="flex-shrink-0 h-14 bg-stone-950 border-t border-white/5 z-40">
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
