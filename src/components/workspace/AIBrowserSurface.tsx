import type { AIBrowserState } from './types';
import WelcomeView from './views/WelcomeView';
import UnderstandingView from './views/UnderstandingView';
import MatchingView from './views/MatchingView';
import SituationPreviewView from './views/SituationPreviewView';
import PresencePreviewView from './views/PresencePreviewView';
import FeedExploreView from './views/FeedExploreView';
import MemoryResumeView from './views/MemoryResumeView';

interface Props {
  state: AIBrowserState;
  isConnected: boolean;
  isBuilding: boolean;
  userName?: string;
  onJoinNetwork: () => void;
}

export default function AIBrowserSurface({ state, isConnected, isBuilding, userName, onJoinNetwork }: Props) {
  const { activeView, contextSummary, matchedProfiles, presenceDraft, situationDraft } = state;

  return (
    <div className="aib-surface" data-view={activeView}>
      <div className="aib-surface-inner">
        {activeView === 'welcome' && (
          <WelcomeView />
        )}

        {activeView === 'understanding' && (
          <UnderstandingView context={contextSummary} isBuilding={isBuilding} />
        )}

        {activeView === 'matching' && (
          <MatchingView
            profiles={matchedProfiles}
            isConnected={isConnected}
            onJoinNetwork={onJoinNetwork}
          />
        )}

        {activeView === 'situation-preview' && situationDraft && (
          <SituationPreviewView draft={situationDraft} />
        )}

        {activeView === 'presence-preview' && presenceDraft && (
          <PresencePreviewView
            draft={presenceDraft}
            isConnected={isConnected}
            onJoinNetwork={onJoinNetwork}
          />
        )}

        {activeView === 'feed-explore' && (
          <FeedExploreView />
        )}

        {activeView === 'memory-resume' && (
          <MemoryResumeView userName={userName || ''} />
        )}
      </div>
    </div>
  );
}
