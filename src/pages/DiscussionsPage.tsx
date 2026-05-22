import { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, CalendarPlus, Star } from 'lucide-react';
import { supabase, Conversation, Message } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import SessionFlow from '../components/SessionFlow';
import TrustReviewForm from '../components/TrustReviewForm';

type EnrichedConversation = Conversation & {
  other_name: string;
  other_avatar: string | null;
  last_message?: string;
};

type Props = { onNavigateSituation?: () => void };

export default function DiscussionsPage({ onNavigateSituation }: Props) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<EnrichedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EnrichedConversation | null>(null);

  useEffect(() => { loadConversations(); }, []);

  async function loadConversations() {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .or(`seeker_id.eq.${user!.id},provider_id.eq.${user!.id}`)
      .order('last_message_at', { ascending: false });

    if (data) {
      const enriched = await Promise.all(data.map(async (conv) => {
        const otherId = conv.seeker_id === user!.id ? conv.provider_id : conv.seeker_id;
        const { data: otherProfile } = await supabase
          .from('user_profiles').select('display_name, avatar_url').eq('id', otherId).maybeSingle();
        const { data: lastMsg } = await supabase
          .from('messages').select('content').eq('conversation_id', conv.id)
          .order('created_at', { ascending: false }).limit(1).maybeSingle();
        return {
          ...conv,
          other_name: otherProfile?.display_name || 'Utilisateur',
          other_avatar: otherProfile?.avatar_url || null,
          last_message: lastMsg?.content || '',
        };
      }));
      setConversations(enriched);
    }
    setLoading(false);
  }

  if (selected) {
    return (
      <ConversationView
        conversation={selected}
        currentUserId={user!.id}
        onBack={() => { setSelected(null); loadConversations(); }}
      />
    );
  }

  return (
    <div className="animate-fade-up">

      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-white leading-snug mb-1.5">
          Des échanges liés à votre situation.
        </h1>
        <p className="text-white/40 text-sm leading-relaxed">
          Chaque échange porte la mémoire de la situation qui l'a fait naître.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="relative w-10 h-10">
            <div className="w-10 h-10 border border-amber-400/20 rounded-full animate-breathe" />
            <div className="absolute inset-2 border border-amber-400/15 rounded-full animate-breathe" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      ) : conversations.length === 0 ? (
        <div className="py-20">
          <p className="text-sm text-white/35 leading-relaxed">
            Aucun échange actif. Exprimez une situation pour que le réseau commence à se coordonner.
          </p>
        </div>
      ) : (
        <div className="animate-stagger space-y-0.5">
          {conversations.map(conv => {
            const timeAgo = getTimeLabel(conv.last_message_at);
            return (
              <button
                key={conv.id}
                onClick={() => setSelected(conv)}
                className="w-full py-5 px-1 text-left border-b border-white/8 last:border-0 hover:bg-white/5 -mx-1 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-white/8 flex items-center justify-center overflow-hidden">
                      {conv.other_avatar
                        ? <img src={conv.other_avatar} alt="" className="w-full h-full object-cover" />
                        : <span className="text-sm font-semibold text-white/50">{conv.other_name[0]}</span>}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-white/15 rounded-full border-2 border-stone-950" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <p className="font-semibold text-white text-sm">{conv.other_name}</p>
                      <span className="text-xs text-white/25 flex-shrink-0">{timeAgo}</span>
                    </div>
                    <p className="text-xs text-white/35 truncate leading-relaxed">
                      {conv.last_message || 'Coordination démarrée — contexte partagé'}
                    </p>
                  </div>
                  <span className="text-white/15 group-hover:text-white/50 transition-colors text-sm flex-shrink-0">→</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getTimeLabel(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMin = Math.floor((now - then) / 60000);
  if (diffMin < 1) return 'maintenant';
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function ConversationView({
  conversation,
  currentUserId,
  onBack,
}: {
  conversation: EnrichedConversation;
  currentUserId: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showSession, setShowSession] = useState(false);
  const [showTrust, setShowTrust] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadMessages();
    const sub = supabase
      .channel(`conv-${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`,
      }, payload => setMessages(prev => [...prev, payload.new as Message]))
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [conversation.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function loadMessages() {
    const { data } = await supabase
      .from('messages').select('*').eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });
    setMessages(data || []);
  }

  async function sendMessage() {
    if (!text.trim() || sending) return;
    setSending(true);
    const content = text.trim();
    setText('');
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }
    try {
      const { error } = await supabase.from('messages').insert({
        conversation_id: conversation.id,
        sender_id: currentUserId,
        content,
      });
      if (error) throw error;
      await supabase.from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation.id);
    } catch {
      setText(content);
    } finally {
      setSending(false);
    }
  }

  if (showSession) {
    return (
      <SessionFlow
        conversation={conversation}
        onClose={() => setShowSession(false)}
        onComplete={() => setShowSession(false)}
      />
    );
  }

  if (showTrust) {
    return (
      <TrustReviewForm
        sessionId={conversation.id}
        reviewedId={currentUserId === conversation.seeker_id ? conversation.provider_id : conversation.seeker_id}
        reviewedName={conversation.other_name}
        onComplete={() => setShowTrust(false)}
        onClose={() => setShowTrust(false)}
      />
    );
  }

  return (
    <div className="animate-slide-in flex flex-col" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 mb-2">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl text-white/25 hover:text-white/70 hover:bg-white/8 transition-all">
          <ArrowLeft size={16} />
        </button>
        <div className="relative flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center overflow-hidden">
            {conversation.other_avatar
              ? <img src={conversation.other_avatar} alt="" className="w-full h-full object-cover" />
              : <span className="text-sm font-semibold text-white/50">{conversation.other_name[0]}</span>}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm">{conversation.other_name}</p>
          <p className="text-xs text-white/25">Échange contextuel · contexte partagé</p>
        </div>
        <div className="flex gap-0.5">
          <button
            onClick={() => setShowSession(true)}
            className="p-2 rounded-xl text-white/25 hover:text-amber-400 hover:bg-amber-400/10 transition-all"
            title="Proposer une session formelle"
          >
            <CalendarPlus size={14} />
          </button>
          <button
            onClick={() => setShowTrust(true)}
            className="p-2 rounded-xl text-white/25 hover:text-amber-400 hover:bg-amber-400/10 transition-all"
            title="Laisser un retour sur cette personne"
          >
            <Star size={14} />
          </button>
        </div>
      </div>

      {/* Context memory strip */}
      <div className="mb-4 px-4 py-3 rounded-2xl bg-white/5 border border-white/8">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
          <p className="text-xs text-white/35 leading-relaxed">
            Cet échange porte le contexte de la situation qui l'a fait naître.
            <span className="text-white/20"> Les deux parties savent pourquoi elles parlent.</span>
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full bg-white/5 animate-breathe" />
              <div className="absolute inset-3 rounded-full bg-white/8 animate-breathe" style={{ animationDelay: '0.5s' }} />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-white/35">Commencez là où vous en êtes.</p>
              <p className="text-xs text-white/20">Pas besoin de tout réexpliquer — le contexte est déjà là.</p>
            </div>
          </div>
        )}
        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === currentUserId;
          const prevMsg = messages[idx - 1];
          const showTime = !prevMsg || new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 5 * 60 * 1000;
          return (
            <div key={msg.id}>
              {showTime && (
                <div className="text-center py-2">
                  <span className="text-[10px] text-white/20">
                    {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-up`}>
                <div className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
                  isMe
                    ? 'bg-white text-stone-950 rounded-2xl rounded-br-sm'
                    : 'bg-white/8 border border-white/8 text-white/80 rounded-2xl rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composition area */}
      <div className="pt-3 border-t border-white/8">
        <div className="flex items-end gap-2.5">
          <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl overflow-hidden focus-within:ring-1 focus-within:ring-white/20 focus-within:border-white/20 transition-all">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => {
                setText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ce que vous voulez dire…"
              rows={1}
              className="w-full px-4 py-3 text-sm text-white/80 placeholder-white/20 resize-none focus:outline-none leading-relaxed bg-transparent"
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!text.trim() || sending}
            className="p-3.5 bg-white hover:bg-white/90 text-stone-950 rounded-2xl transition-all disabled:opacity-30 flex-shrink-0"
          >
            {sending
              ? <span className="w-4 h-4 border-2 border-stone-900/30 border-t-stone-900 rounded-full animate-spin block" />
              : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
