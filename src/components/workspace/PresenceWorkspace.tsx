import { useState, useRef, useEffect } from 'react';
import { Send, Loader, ArrowRight, UserPlus, Sparkles, Check } from 'lucide-react';

interface Props {
  isConnected: boolean;
  userName?: string;
  onJoinNetwork: () => void;
}

const AI_WELCOME = 'Décrivez ce que vous savez faire, ce que vous aimez partager. Je vais générer votre fiche de présence dans le réseau.';
const AI_WELCOME_CONNECTED = (name: string) =>
  `${name}, que souhaitez-vous proposer au réseau ? Je peux enrichir votre profil existant ou ajouter une nouvelle capacité.`;

interface GeneratedCard {
  titre: string;
  capacites: string[];
  tags: string[];
  disponibilite: string;
}

function generateCard(text: string): GeneratedCard {
  const lower = text.toLowerCase();
  let titre = 'Membre du réseau';
  let capacites: string[] = [];
  let tags: string[] = [];

  if (/cuisine|cook|pâtiss|gâteau/.test(lower)) {
    titre = 'Passionné de cuisine';
    capacites = ['Cours de cuisine à domicile', 'Pâtisserie créative', 'Conseil nutrition'];
    tags = ['cuisine', 'pâtisserie', 'fait-maison'];
  } else if (/jardin|plant|potager|fleur/.test(lower)) {
    titre = 'Main verte';
    capacites = ['Conseil jardinage urbain', 'Entretien de jardin', 'Échange de plants'];
    tags = ['jardinage', 'permaculture', 'potager'];
  } else if (/inform|code|web|développ/.test(lower)) {
    titre = 'Expert numérique';
    capacites = ['Dépannage informatique', 'Formation aux outils numériques', 'Création de sites'];
    tags = ['informatique', 'web', 'formation'];
  } else if (/écoute|soutien|accompagn|aide/.test(lower)) {
    titre = 'Personne ressource';
    capacites = ['Écoute active', 'Accompagnement administratif', 'Soutien moral'];
    tags = ['écoute', 'entraide', 'disponibilité'];
  } else {
    titre = 'Contributeur polyvalent';
    capacites = ['Partage de savoir-faire', 'Entraide ponctuelle', 'Échange de services'];
    tags = ['polyvalence', 'entraide', 'partage'];
  }

  return { titre, capacites, tags, disponibilite: 'Disponible' };
}

export default function PresenceWorkspace({ isConnected, userName, onJoinNetwork }: Props) {
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([
    { role: 'ai', text: isConnected ? AI_WELCOME_CONNECTED(userName || '') : AI_WELCOME },
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [card, setCard] = useState<GeneratedCard | null>(null);
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
      const generated = generateCard(msg);
      setCard(generated);
      setMessages(prev => [...prev, {
        role: 'ai',
        text: `Voici la fiche que je propose pour vous : "${generated.titre}". Elle met en avant ${generated.capacites.length} capacités. Vous pouvez la modifier ou la valider.`,
      }]);
      setThinking(false);
      if (!isConnected) {
        setTimeout(() => setShowCta(true), 1500);
      }
    }, 1400);
  }

  return (
    <div className="ws-presence">
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

      {card && (
        <div className="ws-card-preview">
          <div className="ws-card-header">
            <Sparkles size={14} className="text-orange-400" />
            <span>Aperçu de votre fiche</span>
          </div>
          <div className="ws-card-body">
            <h4 className="ws-card-titre">{card.titre}</h4>
            <ul className="ws-card-caps">
              {card.capacites.map((c, i) => (
                <li key={i}><Check size={10} /> {c}</li>
              ))}
            </ul>
            <div className="ws-card-tags">
              {card.tags.map(t => <span key={t} className="ws-tag">{t}</span>)}
            </div>
            <div className="ws-card-status">{card.disponibilite}</div>
          </div>
        </div>
      )}

      {showCta && !isConnected && (
        <div className="ws-cta-banner">
          <UserPlus size={16} />
          <div>
            <p className="ws-cta-text">Créez votre compte pour publier votre fiche.</p>
            <p className="ws-cta-sub">Visible par le réseau. Modifiable à tout moment.</p>
          </div>
          <button className="ws-cta-btn" onClick={onJoinNetwork}>
            Créer mon compte <ArrowRight size={12} />
          </button>
        </div>
      )}

      <div className="ws-input-bar">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Décrivez ce que vous pouvez apporter..."
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
