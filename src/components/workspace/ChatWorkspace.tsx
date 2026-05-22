import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader, Mic } from 'lucide-react';
import { useIntentDetection } from '../../hooks/useIntentDetection';
import type { Intent } from '../../hooks/useIntentDetection';

interface Props {
  isConnected: boolean;
  userName?: string;
  onSwitchMode: (mode: 'situation' | 'presence') => void;
}

const AI_WELCOME_VISITOR = 'Bonjour. Je suis le coordinateur RENOVEC. Dites-moi ce qui vous amène — un besoin, une envie de partager, ou simplement de la curiosité.';
const AI_WELCOME_CONNECTED = (name: string, lastSearch?: string) => {
  let msg = `Bonjour ${name}. Je suis là.`;
  if (lastSearch) msg += ` Je vois que vous cherchiez ${lastSearch} la semaine dernière. Souhaitez-vous reprendre ?`;
  return msg;
};

function aiReply(_text: string, intent: Intent): string {
  switch (intent) {
    case 'urgency':
      return 'Je comprends l\'urgence. Laissez-moi vous orienter immédiatement vers le workspace de mise en relation pour trouver quelqu\'un rapidement.';
    case 'situation':
      return 'Compris. Vous avez un besoin. Je vous oriente vers l\'espace situation pour approfondir et trouver les bons profils.';
    case 'presence':
      return 'Vous souhaitez proposer quelque chose au réseau. Je vous oriente vers l\'espace présence pour créer votre fiche.';
    case 'discovery':
      return 'RENOVEC est un réseau humain orchestré par IA. Les membres partagent leurs capacités et s\'entraident localement. Vous pouvez exprimer un besoin ou proposer vos compétences.';
    default:
      return 'Dites-moi en quoi je peux vous aider. Je peux vous orienter vers une mise en relation, ou vous aider à publier votre profil.';
  }
}

export default function ChatWorkspace({ isConnected, userName, onSwitchMode }: Props) {
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([
    { role: 'ai', text: isConnected ? AI_WELCOME_CONNECTED(userName || '') : AI_WELCOME_VISITOR },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const { detect } = useIntentDetection();

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const handleSend = useCallback(() => {
    const msg = input.trim();
    if (!msg || thinking) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setThinking(true);

    const intent = detect(msg);

    setTimeout(() => {
      const reply = aiReply(msg, intent);
      setMessages(prev => [...prev, { role: 'ai', text: reply }]);
      setThinking(false);

      if (intent === 'situation' || intent === 'urgency') {
        setTimeout(() => onSwitchMode('situation'), 2200);
      } else if (intent === 'presence') {
        setTimeout(() => onSwitchMode('presence'), 2200);
      }
    }, 1000);
  }, [input, thinking, detect, onSwitchMode]);

  return (
    <div className="ws-chat">
      <div className="ws-chat-header">
        <div className="ws-chat-status">
          <div className="ws-chat-dot" />
          <span>RENOVEC</span>
          <span className="ws-chat-status-label">coordinateur actif</span>
        </div>
      </div>

      <div className="ws-situation-chat" ref={chatRef}>
        {messages.map((m, i) => (
          <div key={i} className={`ws-bubble ws-bubble--${m.role}`}>
            {m.role === 'ai' && <div className="ws-bubble-dot" />}
            <p>{m.text}</p>
          </div>
        ))}
        {thinking && (
          <div className="ws-bubble ws-bubble--ai">
            <div className="ws-bubble-dot" />
            <div className="ws-thinking">
              <span /><span /><span />
            </div>
          </div>
        )}
      </div>

      <div className="ws-input-bar">
        <button className="ws-mic-btn" aria-label="Parler">
          <Mic size={15} />
        </button>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Parlez ou écrivez..."
          className="ws-input"
          disabled={thinking}
        />
        <button className="ws-send" onClick={handleSend} disabled={!input.trim() || thinking}>
          {thinking ? <Loader size={14} className="ws-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );
}
