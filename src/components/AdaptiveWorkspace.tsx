import { useWorkspace } from '../contexts/WorkspaceContext';
import WorkspaceNeutral from './workspace/WorkspaceNeutral';
import WorkspaceMatching from './workspace/WorkspaceMatching';
import WorkspaceProfile from './workspace/WorkspaceProfile';
import WorkspacePublication from './workspace/WorkspacePublication';
import ContextBar from './workspace/ContextBar';

export default function AdaptiveWorkspace() {
  const { view, contextLines } = useWorkspace();

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-stone-950 via-stone-950 to-stone-900/50">
      {/* Context bar — visible when AI has understood something */}
      {contextLines.length > 0 && <ContextBar lines={contextLines} />}

      {/* Workspace content — keyed for animated transitions */}
      <div key={view} className="flex-1 overflow-hidden animate-fade-up">
        {view === 'neutral' && <WorkspaceNeutral />}
        {view === 'matching' && <WorkspaceMatching />}
        {view === 'profile' && <WorkspaceProfile />}
        {view === 'publication' && <WorkspacePublication />}
      </div>
    </div>
  );
}
