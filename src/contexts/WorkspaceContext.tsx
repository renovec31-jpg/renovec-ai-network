import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type WorkspaceView =
  | 'neutral'
  | 'matching'
  | 'profile'
  | 'publication'
  | 'map'
  | 'feed';

export type MatchingProfile = {
  id: string;
  name: string;
  tagline: string;
  city: string;
  avatar_url?: string | null;
  capabilities: string[];
  score: number;
  availability: string;
};

export type ContextLine = {
  label: string;
  value: string;
};

export type WorkspaceState = {
  view: WorkspaceView;
  contextLines: ContextLine[];
  matchingProfiles: MatchingProfile[];
  selectedProfileId: string | null;
  publicationDraft: { title: string; description: string; tags: string[] } | null;
};

type WorkspaceContextValue = WorkspaceState & {
  setView: (v: WorkspaceView) => void;
  setContextLines: (lines: ContextLine[]) => void;
  pushMatches: (profiles: MatchingProfile[]) => void;
  selectProfile: (id: string | null) => void;
  setPublicationDraft: (draft: WorkspaceState['publicationDraft']) => void;
  reset: () => void;
};

const initial: WorkspaceState = {
  view: 'neutral',
  contextLines: [],
  matchingProfiles: [],
  selectedProfileId: null,
  publicationDraft: null,
};

const WorkspaceContext = createContext<WorkspaceContextValue>({
  ...initial,
  setView: () => {},
  setContextLines: () => {},
  pushMatches: () => {},
  selectProfile: () => {},
  setPublicationDraft: () => {},
  reset: () => {},
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(initial);

  const setView = useCallback((view: WorkspaceView) => {
    setState(s => ({ ...s, view }));
  }, []);

  const setContextLines = useCallback((contextLines: ContextLine[]) => {
    setState(s => ({ ...s, contextLines }));
  }, []);

  const pushMatches = useCallback((profiles: MatchingProfile[]) => {
    setState(s => ({ ...s, matchingProfiles: profiles, view: 'matching' }));
  }, []);

  const selectProfile = useCallback((id: string | null) => {
    setState(s => ({ ...s, selectedProfileId: id, view: id ? 'profile' : s.view }));
  }, []);

  const setPublicationDraft = useCallback((draft: WorkspaceState['publicationDraft']) => {
    setState(s => ({ ...s, publicationDraft: draft, view: draft ? 'publication' : s.view }));
  }, []);

  const reset = useCallback(() => {
    setState(initial);
  }, []);

  return (
    <WorkspaceContext.Provider value={{
      ...state, setView, setContextLines, pushMatches,
      selectProfile, setPublicationDraft, reset,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
