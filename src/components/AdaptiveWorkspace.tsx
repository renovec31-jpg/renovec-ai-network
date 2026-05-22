import { useWorkspace } from '../contexts/WorkspaceContext';
import WorkspaceNeutral from './workspace/WorkspaceNeutral';
import WorkspaceMatching from './workspace/WorkspaceMatching';
import WorkspaceProfile from './workspace/WorkspaceProfile';
import WorkspacePublication from './workspace/WorkspacePublication';
import ContextBar from './workspace/ContextBar';

export default function AdaptiveWorkspace() {
  const { view, contextLines } = useWorkspace();

  return (
    <div className="flex flex-col h-full bg-stone-950/50">
      {/* Context bar — always visible when context exists */}
      {contextLines.length > 0 && <ContextBar lines={contextLines} />}

      {/* Workspace content */}
      <div className="flex-1 overflow-y-auto">
        <div className="transition-all duration-500 ease-out">
          {view === 'neutral' && <WorkspaceNeutral />}
          {view === 'matching' && <WorkspaceMatching />}
          {view === 'profile' && <WorkspaceProfile />}
          {view === 'publication' && <WorkspacePublication />}
        </div>
      </div>
    </div>
  );
}
