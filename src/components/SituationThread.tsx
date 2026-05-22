import { useState, useEffect } from 'react';
import { MessageCircle, ArrowRight, Clock } from 'lucide-react';
import { supabase, Conversation, Message } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Props = {
  needId: string;
  onOpenConversation?: (conv: Conversation) => void;
};

type ConvWithPreview = Conversation & {
  other_name: string;
  last_message: string;
  unread: boolean;
};

export default function SituationThread({ needId, onOpenConversation }: Props) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConvWithPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!needId || !user) return;
    load();
  }, [needId, user]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('need_id', needId)
        .order('last_message_at', { ascending: false });

      if (!data) { setLoading(false); return; }

      const enriched = await Promise.all(data.map(async (conv) => {
        const otherId = conv.seeker_id === user!.id ? conv.provider_id : conv.seeker_id;
        const [{ data: profile }, { data: lastMsg }] = await Promise.all([
          supabase.from('user_profiles').select('display_name').eq('id', otherId).maybeSingle(),
          supabase.from('messages').select('content, sender_id').eq('conversation_id', conv.id)
            .order('created_at', { ascending: false }).limit(1).maybeSingle(),
        ]);
        return {
          ...conv,
          other_name: profile?.display_name || 'Présence du réseau',
          last_message: lastMsg?.content || '',
          unread: lastMsg ? lastMsg.sender_id !== user!.id : false,
        };
      }));

      setConversations(enriched);
    } catch {
      // silent — thread is optional
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="py-6 flex justify-center">
        <div className="w-5 h-5 border border-stone-200 border-t-stone-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="py-6">
        <div className="flex items-start gap-3">
          <div className="w-1 h-1 rounded-full bg-stone-200 mt-2 flex-shrink-0" />
          <p style={{ fontSize: 13, color: '#bbb', lineHeight: 1.6 }}>
            Aucun échange lié à cette situation pour l'instant.
            Le réseau s'organise — les premiers contacts apparaîtront ici.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={{
        fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
        color: '#999', fontWeight: 400, marginBottom: 14,
      }}>
        Échanges liés à cette situation
      </p>
      <div>
        {conversations.map((conv, i) => {
          const diff = Math.floor((Date.now() - new Date(conv.last_message_at).getTime()) / 60000);
          const timeLabel = diff < 1 ? 'maintenant'
            : diff < 60 ? `il y a ${diff} min`
            : diff < 1440 ? `il y a ${Math.floor(diff / 60)}h`
            : new Date(conv.last_message_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

          return (
            <button
              key={conv.id}
              onClick={() => onOpenConversation?.(conv)}
              className="w-full text-left py-4 border-b border-stone-100 last:border-0 hover:pl-1 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
                    <MessageCircle size={13} className="text-stone-400" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <p style={{ fontSize: 13, fontWeight: 600, color: conv.unread ? '#111' : '#555' }}>
                      {conv.other_name}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {conv.unread && (
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      )}
                      <span style={{ fontSize: 11, color: '#bbb' }}>
                        <Clock size={9} className="inline mr-1" />
                        {timeLabel}
                      </span>
                    </div>
                  </div>
                  {conv.last_message ? (
                    <p style={{ fontSize: 12, color: '#999', lineHeight: 1.5 }} className="truncate">
                      {conv.last_message}
                    </p>
                  ) : (
                    <p style={{ fontSize: 12, color: '#ccc', lineHeight: 1.5 }}>
                      Échange démarré — contexte partagé
                    </p>
                  )}
                </div>
                <ArrowRight size={12} className="text-stone-200 group-hover:text-stone-400 transition-colors flex-shrink-0 mt-1" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
