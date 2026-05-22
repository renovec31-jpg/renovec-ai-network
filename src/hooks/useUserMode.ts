import { useAuth } from '../contexts/AuthContext';

export interface MockUser {
  id: string;
  prenom: string;
  email: string;
  avatar?: string;
  memberSince: string;
  lastSearch?: string;
}

const MOCK_CONNECTED_USER: MockUser = {
  id: 'mock-user-1',
  prenom: 'Léa',
  email: 'lea@exemple.fr',
  memberSince: '2025-11',
  lastSearch: 'un comptable pour ma micro-entreprise',
};

export function useUserMode() {
  const { user, profile } = useAuth();

  const isConnected = !!user;
  const mockUser: MockUser | null = isConnected ? {
    id: user!.id,
    prenom: profile?.display_name?.split(' ')[0] || MOCK_CONNECTED_USER.prenom,
    email: user!.email || MOCK_CONNECTED_USER.email,
    memberSince: MOCK_CONNECTED_USER.memberSince,
    lastSearch: MOCK_CONNECTED_USER.lastSearch,
  } : null;

  return { isConnected, user: mockUser };
}
