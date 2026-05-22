import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { KnownUserContext, PastInteraction, ConversationMemoryItem } from '../services/welcome/types';

const MOCK_NEEDS: PastInteraction[] = [
  { id: 'n1', text: 'un comptable pour ma micro-entreprise', type: 'need', date: '2026-05-15', resolved: false },
  { id: 'n2', text: 'aide pour déménagement ce week-end', type: 'need', date: '2026-05-08', resolved: true },
  { id: 'n3', text: 'quelqu\'un pour garder mon chat', type: 'need', date: '2026-04-22', resolved: true },
];

const MOCK_OFFERS: PastInteraction[] = [
  { id: 'o1', text: 'cours de yoga le mardi matin', type: 'offer', date: '2026-05-10', resolved: false },
  { id: 'o2', text: 'aide administrative et courriers', type: 'offer', date: '2026-04-18', resolved: false },
];

const MOCK_MEMORY: ConversationMemoryItem[] = [
  { date: '2026-05-15', summary: 'Cherche un comptable spécialisé micro-entreprise, zone Toulouse sud', intent: 'need' },
  { date: '2026-05-10', summary: 'A proposé ses cours de yoga, disponible le mardi', intent: 'offer' },
  { date: '2026-05-08', summary: 'Déménagement résolu grâce à Léo de Montauban', intent: 'need' },
];

export function useKnownUserContext(): KnownUserContext | null {
  const { user, profile } = useAuth();
  const [context, setContext] = useState<KnownUserContext | null>(null);

  useEffect(() => {
    if (!user || !profile) {
      setContext(null);
      return;
    }

    setContext({
      userId: user.id,
      prenom: profile.display_name?.split(' ')[0] || 'Utilisateur',
      displayName: profile.display_name || '',
      memberSince: profile.created_at?.slice(0, 7) || '2025-11',
      zone: profile.zone || profile.location || 'Toulouse',
      lastSeen: profile.last_seen || null,
      recentNeeds: MOCK_NEEDS,
      recentOffers: MOCK_OFFERS,
      activeRelations: 4,
      trustScore: 72,
      conversationMemory: MOCK_MEMORY,
    });
  }, [user, profile]);

  return context;
}
