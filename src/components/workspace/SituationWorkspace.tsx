import { useState, useRef, useEffect } from 'react';
import { Send, Loader, MapPin, Star, ArrowRight, UserPlus } from 'lucide-react';
import { MOCK_PROFILES } from '../../data/mockOccitanie';
import type { MockProfile } from '../../data/mockOccitanie';

interface Props {
  isConnected: boolean;
  userName?: string;
  onJoinNetwork: () => void;
}

const AI_WELCOME_VISITOR = 'Décrivez votre situation librement. Je vais analyser votre besoin et chercher dans le réseau les personnes qui peuvent vous aider.';
const AI_WELCOME_CONNECTED = (name: string) =>
  `Bonjour ${name}. Décrivez ce dont vous avez besoin — je me souviens de votre contexte et je vais chercher les meilleures connexions.`;

const AI_RESPONSES: Record<string, string> = {
  comptable: 'Je comprends. Vous cherchez un accompagnement comptable. J\'ai identifié 3 profils pertinents dans votre zone — dont Thomas à Toulouse qui est spécialisé en micro-entreprise.',
  informatique: 'Compris. Problème informatique. Camille à Albi est disponible et très bien notée sur ce type d\'intervention. Voici aussi d\'autres options proches.',
  bricolage: 'Entendu. Pour du bricolage ou petits travaux, Léo à Montauban est souvent disponible. Il gère la plomberie de base et l\'électricité courante.',
  default: 'Je comprends votre situation. Laissez-moi chercher dans le réseau les profils les plus pertinents pour vous aider.',
};

function matchResponse(text: string): string {
  const lower = text.toLowerCase();
  if (/compt|fiscal|bilan|tva|entreprise/.test(lower)) return AI_RESPONSES.comptable;
  if (/inform|ordi|pc|mac|internet|wifi/.test(lower)) return AI_RESPONSES.informatique;
  if (/bricol|plomb|électr|travaux|réparer/.test(lower)) return AI_RESPONSES.bricolage;
  return AI_RESPONSES.default;
}

function matchProfiles(text: string): MockProfile[] {
  const lower = text.toLowerCase();
  if (/compt|fiscal|bilan|tva|entreprise/.test(lower)) return MOCK_PROFILES.filter(p => /compt|gestion|cv/i.test(p.capacite)).slice(0, 3);
  if (/inform|ordi|pc|mac|internet/.test(lower)) return MOCK_PROFILES.filter(p => /inform|web|excel/i.test(p.capacite)).slice(0, 3);
  if (/bricol|plomb|électr|travaux/.test(lower)) return MOCK_PROFILES.filter(p => /bricol|répara|vélo/i.test(p.capacite)).slice(0, 3);
  return MOCK_PROFILES.slice(0, 3);
}

export default function SituationWorkspace({ isConnected, userName, onJoinNetwork }: Props) {
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([
    { role: 'ai', text: isConnected ? AI_WELCOME_CONNECTED(userName || '') : AI_WELCOME_VISITOR },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [matchedProfiles, setMatchedProfiles] = useState<MockProfile[]>([]);
  const [showCta, setShowCta] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  function handleSend() {
    const msg = input.trim();
    if (!msg || thinking) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setThinking(true);

    setTimeout(() => {
      const response = matchResponse(msg);
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
      setMatchedProfiles(matchProfiles(msg));
      setThinking(false);
      if (!isConnected) {
        setTimeout(() => setShowCta(true), 2000);
      }
    }, 1200);
  }

  return (
    <div className="ws-situation">
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

      {matchedProfiles.length > 0 && (
        <div className="ws-matches">
          <p className="ws-matches-title">Profils identifiés dans votre zone</p>
          {matchedProfiles.map(p => (
            <div key={p.id} className="ws-match-card">
              <div className="ws-match-avatar" style={{ background: p.color }}>
                {p.prenom[0]}
              </div>
              <div className="ws-match-info">
                <span className="ws-match-name">{p.prenom}</span>
                <span className="ws-match-cap">{p.capacite}</span>
                <span className="ws-match-meta">
                  <MapPin size={9} /> {p.ville}
                  <Star size={9} /> {p.pts} pts
                </span>
              </div>
              <div className="ws-match-badge" data-status={p.disponibilite}>
                {p.disponibilite === 'disponible' ? 'Dispo' : 'Bientôt'}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCta && !isConnected && (
        <div className="ws-cta-banner">
          <UserPlus size={16} />
          <div>
            <p className="ws-cta-text">Rejoignez le réseau pour activer la mise en relation.</p>
            <p className="ws-cta-sub">Gratuit. Vos données restent les vôtres.</p>
          </div>
          <button className="ws-cta-btn" onClick={onJoinNetwork}>
            Rejoindre <ArrowRight size={12} />
          </button>
        </div>
      )}

      <div className="ws-input-bar">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Décrivez votre situation..."
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
