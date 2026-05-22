import { createContext } from 'react';

export const WorkspaceContext = createContext(null);

export default function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  return <WorkspaceContext.Provider value={null}>{children}</WorkspaceContext.Provider>;
}
