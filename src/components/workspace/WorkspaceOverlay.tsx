import { useState, useCallback } from 'react';
import { X, MessageCircle, Compass, Radio, Newspaper } from 'lucide-react';
import SituationWorkspace from './SituationWorkspace';
import PresenceWorkspace from './PresenceWorkspace';
import ChatWorkspace from './ChatWorkspace';
import FeedOverlay from './FeedOverlay';
import { useUserMode } from '../../hooks/useUserMode';

export type WorkspaceMode = 'situation' | 'presence' | 'chat' | 'feed';

interface Props {
  initialMode: WorkspaceMode;
  onClose: () => void;
  onJoinNetwork: () => void;
}

const MODE_LABELS: Record<WorkspaceMode, { label: string; icon: typeof MessageCircle }> = {
  situation: { label: 'Situation', icon: Compass },
  presence:  { label: 'Présence', icon: Radio },
  chat:      { label: 'Chat IA', icon: MessageCircle },
  feed:      { label: 'Fil', icon: Newspaper },
};

export default function WorkspaceOverlay({ initialMode, onClose, onJoinNetwork }: Props) {
  const [mode, setMode] = useState<WorkspaceMode>(initialMode);
  const { isConnected, user } = useUserMode();

  const handleSwitchMode = useCallback((newMode: 'situation' | 'presence') => {
    setMode(newMode);
  }, []);

  return (
    <div className="ws-overlay">
      <div className="ws-backdrop" onClick={onClose} />

      <div className="ws-container">
        <header className="ws-header">
          <nav className="ws-nav">
            {(Object.keys(MODE_LABELS) as WorkspaceMode[]).map(m => {
              const { label, icon: Icon } = MODE_LABELS[m];
              return (
                <button
                  key={m}
                  className={`ws-nav-btn ${mode === m ? 'ws-nav-btn--active' : ''}`}
                  onClick={() => setMode(m)}
                >
                  <Icon size={13} />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>

          <div className="ws-header-right">
            {isConnected && (
              <span className="ws-user-badge">{user?.prenom}</span>
            )}
            <button className="ws-close" onClick={onClose} aria-label="Fermer">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="ws-body">
          {mode === 'situation' && (
            <SituationWorkspace
              isConnected={isConnected}
              userName={user?.prenom}
              onJoinNetwork={onJoinNetwork}
            />
          )}
          {mode === 'presence' && (
            <PresenceWorkspace
              isConnected={isConnected}
              userName={user?.prenom}
              onJoinNetwork={onJoinNetwork}
            />
          )}
          {mode === 'chat' && (
            <ChatWorkspace
              isConnected={isConnected}
              userName={user?.prenom}
              onSwitchMode={handleSwitchMode}
            />
          )}
          {mode === 'feed' && <FeedOverlay />}
        </div>
      </div>
    </div>
  );
}
