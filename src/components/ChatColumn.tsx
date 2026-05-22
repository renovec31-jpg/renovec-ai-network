import { useState, useRef, useEffect } from 'react';
import { ArrowUp, Mic, MicOff } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { MOCK_MATCHING_PROFILES, MOCK_CONTEXT_RENOVATION, MOCK_CONTEXT_PLOMBERIE, MOCK_PUBLICATION_DRAFT } from '../data/mockWorkspace';

type Message = {
  id: string;
  role: 'user' | 'coordinator';
  content: string;
  timestamp: Date;
};

const WELCOME_MSG: Message = {
  id: 'welcome',
  role: 'coordinator',
  content: 'Bonjour. Décrivez votre situation — rénovation, réparation, besoin d\'un artisan — je coordonne le réseau pour vous.',
  timestamp: new Date(),
};

const THINKING_PHRASES = [
  'Lecture de votre situation...',
  'Recherche dans le réseau...',
  'Coordination en cours...',
];

type Intent = 'matching' | 'publication' | 'neutral';

function detectIntent(text: string): Intent {
  const lower = text.toLowerCase();
  const matchingKeywords = [
    'artisan', 'plombier', 'électricien', 'maçon', 'menuisier', 'peintre',
    'rénovation', 'rénover', 'isoler', 'isolation', 'chauffage', 'chaudière',
    'fuite', 'panne', 'réparer', 'réparation', 'dépannage',
    'toiture', 'toit', 'façade', 'fenêtre', 'fenêtres',
    'quelqu\'un', 'professionnel', 'entreprise', 'devis',
    'thermique', 'énergétique', 'combles', 'pompe à chaleur',
  ];
  const publicationKeywords = [
    'publier', 'annonce', 'proposer', 'poster', 'diffuser',
    'je propose', 'je cherche à publier', 'mettre en ligne',
    'créer une annonce', 'faire connaître',
  ];

  if (publicationKeywords.some(k => lower.includes(k))) return 'publication';
  if (matchingKeywords.some(k => lower.includes(k))) return 'matching';
  return 'neutral';
}

function getResponse(intent: Intent, text: string): string {
  const lower = text.toLowerCase();

  if (intent === 'publication') {
    return 'Compris — je prépare un brouillon d\'annonce à partir de ce que vous décrivez. Vous pourrez le modifier avant publication. L\'aperçu est visible sur la surface à droite.';
  }

  if (intent === 'matching') {
    const isUrgent = lower.includes('fuite') || lower.includes('panne') || lower.includes('urgent');
    const isReno = lower.includes('rénov') || lower.includes('isol') || lower.includes('thermique') || lower.includes('combles');

    if (isUrgent) {
      return 'Situation d\'urgence identifiée. J\'ai trouvé 3 professionnels disponibles rapidement dans votre zone. Leurs profils sont affichés à droite — voulez-vous que je les contacte ?';
    }
    if (isReno) {
      return 'Rénovation énergétique — j\'identifie les artisans pertinents. 3 profils correspondent à votre situation sur Toulouse et environs. Consultez-les à droite. Précisez le type de logement si vous voulez affiner.';
    }
    return 'J\'ai identifié 3 présences dans le réseau qui correspondent. Leurs profils sont affichés sur la surface à droite. Dites-moi si vous voulez que je les contacte en votre nom.';
  }

  return 'D\'accord. Pouvez-vous préciser la situation ? Le lieu, le type de logement, ce qui vous préoccupe — tout m\'aide à coordonner les bons appuis dans le réseau.';
}

export default function ChatColumn() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingIdx, setThinkingIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { setContextLines, pushMatches, setView, setPublicationDraft } = useWorkspace();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    if (!isThinking) return;
    const iv = setInterval(() => {
      setThinkingIdx(i => (i + 1) % THINKING_PHRASES.length);
    }, 1800);
    return () => clearInterval(iv);
  }, [isThinking]);

  function handleSubmit() {
    const text = input.trim();
    if (!text || isThinking) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    simulateResponse(text);
  }

  function simulateResponse(userText: string) {
    const intent = detectIntent(userText);
    const lower = userText.toLowerCase();

    const delay = intent === 'neutral' ? 1400 : 2200;

    setTimeout(() => {
      setIsThinking(false);

      // Drive the workspace based on intent
      if (intent === 'matching') {
        const isPlomberie = lower.includes('fuite') || lower.includes('plomb') || lower.includes('eau') || lower.includes('chaud');
        setContextLines(isPlomberie ? MOCK_CONTEXT_PLOMBERIE : MOCK_CONTEXT_RENOVATION);
        pushMatches(MOCK_MATCHING_PROFILES);
      } else if (intent === 'publication') {
        setPublicationDraft(MOCK_PUBLICATION_DRAFT);
      } else {
        setView('neutral');
      }

      const reply: Message = {
        id: `c-${Date.now()}`,
        role: 'coordinator',
        content: getResponse(intent, userText),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, reply]);
    }, delay);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 140) + 'px';
    }
  }

  return (
    <div className="flex flex-col h-full bg-stone-950">
      {/* Chat header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-30" />
          </div>
          <span className="text-[13px] font-semibold text-white/75 tracking-tight">Parler à RENOVEC</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 scrollbar-hide">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] ${msg.role === 'user' ? '' : ''}`}>
              {msg.role === 'coordinator' && (
                <p className="text-[10px] tracking-widest uppercase text-white/15 font-medium mb-2 ml-0.5">
                  Coordinateur IA
                </p>
              )}
              <div className={`rounded-2xl px-4 py-3.5 text-[14px] leading-[1.7] ${
                msg.role === 'user'
                  ? 'bg-white/[0.08] text-white/90 rounded-br-lg'
                  : 'bg-white/[0.025] border border-white/[0.05] text-white/70 rounded-bl-lg'
              }`}>
                {msg.content}
              </div>
              <p className={`text-[10px] text-white/10 mt-1.5 ${msg.role === 'user' ? 'text-right mr-1' : 'ml-1'}`}>
                {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start">
            <div className="max-w-[90%]">
              <p className="text-[10px] tracking-widest uppercase text-white/15 font-medium mb-2 ml-0.5">
                Coordinateur IA
              </p>
              <div className="bg-white/[0.025] border border-white/[0.05] rounded-2xl rounded-bl-lg px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/25 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/25 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/25 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[12px] text-white/20">{THINKING_PHRASES[thinkingIdx]}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 p-4 border-t border-white/[0.04]">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Décrivez votre situation..."
            rows={1}
            className="w-full resize-none bg-white/[0.035] border border-white/[0.07] rounded-xl px-4 py-3.5 pr-20 text-[14px] text-white/85 placeholder-white/20 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.05] transition-all leading-relaxed"
            style={{ maxHeight: 140 }}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-0.5">
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`p-2 rounded-lg transition-all ${isRecording ? 'bg-red-500/20 text-red-400' : 'text-white/15 hover:text-white/40'}`}
            >
              {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isThinking}
              className="p-2 rounded-lg text-white/20 hover:text-white/60 disabled:opacity-20 transition-all hover:bg-white/[0.05]"
            >
              <ArrowUp size={15} />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-white/10 mt-2 text-center">
          Entrée pour envoyer · Shift+Entrée pour un retour à la ligne
        </p>
      </div>
    </div>
  );
}
