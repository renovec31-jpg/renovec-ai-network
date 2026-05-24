import { ReactNode, useEffect, useState } from 'react';
import { MessageSquare, Users, User, ShieldCheck, Bell, Map, Newspaper } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSituation, SituationPhase } from '../contexts/SituationContext';
import LiveFeedSidebar from './LiveFeedSidebar';
import ChatRain from './ChatRain';
import MessageBubbles from './MessageBubbles';
import AutoScroll from './AutoScroll';

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
  fullHeight?: boolean;
};

const NAV: Array<{ id: Tab; label: string; icon: typeof MessageSquare }> = [
  { id: 'demander',    label: 'SITUATION', icon: MessageSquare },
  { id: 'feed',        label: 'FIL',       icon: Newspaper },
  { id: 'capacites',   label: 'RÉSEAU',    icon: Users },
  { id: 'discussions', label: 'ÉCHANGES',  icon: MessageSquare },
  { id: 'espace',      label: 'MOI',       icon: User },
];

function coordinatorLabel(phase: SituationPhase, presenceCount: number): string {
  if (phase === 'idle') return 'Coordinateur IA · En attente';
  if (phase === 'reading' || phase === 'expressed') return 'IA · Lecture de la situation en cours';
  if (phase === 'clarifying') return 'IA · Interprétation et clarification';
  if (phase === 'emerging') return `IA · ${presenceCount} présences identifiées · Coordination active`;
  if (phase === 'exchanging') return 'IA · Échange en cours · Contexte transmis';
  if (phase === 'resolved') return 'IA · Situation coordonnée';
  return 'Coordinateur IA · En attente';
}

export default function Layout({ children, activeTab, onTabChange, notifCount = 0, isAdmin = false, onShowHowItWorks, onGoLanding, onOpenMyProfile, fullHeight = false }: Props) {
  const { profile } = useAuth();
  const { phase, activeNeed } = useSituation();
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!activeNeed || phase === 'idle') { setElapsed(''); return; }
    function calc() {
      const diff = Math.floor((Date.now() - new Date(activeNeed!.created_at).getTime()) / 60000);
      if (diff < 1) setElapsed('à l\'instant');
      else if (diff < 60) setElapsed(`il y a ${diff} min`);
      else if (diff < 1440) setElapsed(`il y a ${Math.floor(diff / 60)}h`);
      else setElapsed(`il y a ${Math.floor(diff / 1440)}j`);
    }
    calc();
    const id = setInterval(calc, 60000);
    return () => clearInterval(id);
  }, [activeNeed, phase]);

  const coordLabel = coordinatorLabel(phase, 0);

  return (    <div
      className="min-h-screen bg-stone-950 flex flex-col"
      style={{ paddingRight: 'clamp(0px, calc(100vw - 1100px), 300px)' }}
    >
        <ChatRain />       <MessageBubbles />
          <AutoScroll />
      <LiveFeedSidebar
        onCta={() => onTabChange('feed')}
        onViewAll={() => onTabChange('feed')}
        isAuthenticated
      />

      {/* Header */}
      <header role="banner" className="sticky top-0 z-40 bg-stone-950 border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 flex items-center justify-between" style={{ height: 52 }}>
          <button
            onClick={onGoLanding}
            className="flex items-center gap-2 group"
            aria-label="RENOVEC — Accueil"
            title="Accueil"
          >
            <div className="w-5 h-5 bg-[#F26522] rounded flex items-center justify-center flex-shrink-0">
              <div className="w-2 h-2 rounded-sm bg-white opacity-90" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">RENOVEC</span>
          </button>

          <div className="flex items-center gap-0.5">
            {onShowHowItWorks && (
              <button
                onClick={onShowHowItWorks}
                className="hidden sm:block text-xs text-white/30 hover:text-white/70 transition-colors px-2 py-1 rounded-lg hover:bg-white/5 mr-1"
              >
                Comment ça marche
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => onTabChange('admin')}
                className={`p-2 rounded-xl transition-all ${activeTab === 'admin' ? 'text-red-400' : 'text-white/20 hover:text-white/60'}`}
              >
                <ShieldCheck size={15} strokeWidth={1.5} />
              </button>
            )}
            <button
              onClick={() => onTabChange('notifications')}
              className={`relative p-2 rounded-xl transition-all ${activeTab === 'notifications' ? 'text-white' : 'text-white/25 hover:text-white/60'}`}
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
              title="Mon profil"
            >
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : <span className="text-xs font-semibold text-white/50">{profile?.display_name?.[0]?.toUpperCase() || '?'}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* Coordinator status bar */}
      <div className="sticky top-[52px] z-30 bg-stone-950 border-b border-white/5" style={{ height: 36 }}>
        <div className="max-w-2xl mx-auto px-4 h-full flex items-center justify-between">
          <span className="text-[11px] tracking-widest uppercase text-white/20 font-normal">
            {coordLabel}
          </span>
          {elapsed && (
            <span className="text-[11px] text-white/15 tracking-wide">
              {elapsed}
            </span>
          )}
        </div>
      </div>

      {/* Main content */}
      <main id="contenu-principal" role="main" className={fullHeight ? 'flex-1 overflow-hidden flex flex-col' : 'flex-1 max-w-2xl mx-auto w-full px-4 py-7'}>
        {children}
      </main>

      {/* Bottom nav */}
      <nav aria-label="Navigation principale" className="sticky bottom-0 z-40 bg-stone-950 border-t border-white/5 pb-safe" style={{ height: 56 }}>
        <div className="max-w-2xl mx-auto px-1 h-full flex">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className="flex-1 flex flex-col items-center justify-center gap-1 transition-all"
              >
                <Icon
                  size={18}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className={`transition-colors ${active ? 'text-white' : 'text-white/20 hover:text-white/50'}`}
                />
                <span className="text-[10px] tracking-wider uppercase font-normal transition-colors"
                  style={{ color: active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)' }}>
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
