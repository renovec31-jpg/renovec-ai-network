import { useState, useRef, useEffect } from 'react';
import { ArrowUp, Mic, MicOff } from 'lucide-react';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useSituation } from '../contexts/SituationContext';
import { MOCK_MATCHING_PROFILES, MOCK_CONTEXT_ISOLATION, MOCK_CONTEXT_PLOMBERIE } from '../data/mockWorkspace';

type Message = {
  id: string;
  role: 'user' | 'coordinator';
  content: string;
  timestamp: Date;
};

const WELCOME_MSG: Message = {
  id: 'welcome',
  role: 'coordinator',
  content: 'Bonjour. Decrivez-moi votre situation — renovation, reparation, besoin d\'un artisan — et je coordonne le reseau pour vous.',
  timestamp: new Date(),
};

const THINKING_PHRASES = [
  'Lecture de votre situation...',
  'Identification des appuis pertinents...',
  'Coordination du reseau...',
];

export default function ChatColumn() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingIdx, setThinkingIdx] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { setContextLines, pushMatches, setView } = useWorkspace();
  const { setLocalPhase } = useSituation();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    if (!isThinking) return;
    const iv = setInterval(() => {
      setThinkingIdx(i => (i + 1) % THINKING_PHRASES.length);
    }, 2000);
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
    setLocalPhase('reading');

    // Resize textarea back
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // Simulate coordinator response with workspace side effects
    simulateResponse(text);
  }

  function simulateResponse(userText: string) {
    const lower = userText.toLowerCase();
    const isReno = lower.includes('renov') || lower.includes('isol') || lower.includes('thermique') || lower.includes('chauff');
    const isPlomberie = lower.includes('fuite') || lower.includes('plomb') || lower.includes('eau') || lower.includes('tuyau');
    const isArtisan = lower.includes('artisan') || lower.includes('professionnel') || lower.includes('quelqu\'un');

    setTimeout(() => {
      setIsThinking(false);

      if (isReno || isPlomberie) {
        const context = isReno ? MOCK_CONTEXT_ISOLATION : MOCK_CONTEXT_PLOMBERIE;
        setContextLines(context);
        setLocalPhase('clarifying');

        const reply: Message = {
          id: `c-${Date.now()}`,
          role: 'coordinator',
          content: isReno
            ? 'Je comprends — une renovation thermique. Quelques precisions me permettront de mieux coordonner : quel type de logement (maison, appartement) ? Avez-vous deja un diagnostic energetique ?'
            : 'Situation d\'urgence eau — je priorise. Le logement est-il occupe en ce moment ? Et etes-vous proprietaire ou locataire ?',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, reply]);
      } else if (isArtisan) {
        setContextLines(MOCK_CONTEXT_ISOLATION);
        pushMatches(MOCK_MATCHING_PROFILES);
        setLocalPhase('emerging');

        const reply: Message = {
          id: `c-${Date.now()}`,
          role: 'coordinator',
          content: 'J\'ai identifie 4 presences pertinentes dans votre zone. Leurs profils sont affiches a droite — chacun a ete evalue par le reseau. Voulez-vous que je les contacte de votre part ?',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, reply]);
      } else {
        setView('neutral');
        setLocalPhase('expressed');

        const reply: Message = {
          id: `c-${Date.now()}`,
          role: 'coordinator',
          content: 'D\'accord. Pouvez-vous me decrire plus concretement la situation ? Le lieu, l\'urgence, ce que vous avez deja tente — tout m\'aide a coordonner les bons appuis.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, reply]);
      }
    }, 2200);
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
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 160) + 'px';
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[13px] font-medium text-white/70">Parler a RENOVEC</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5 scrollbar-hide">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] ${msg.role === 'user' ? 'order-last' : ''}`}>
              {msg.role === 'coordinator' && (
                <p className="text-[10px] tracking-widest uppercase text-white/20 font-medium mb-1.5 ml-0.5">
                  Coordinateur
                </p>
              )}
              <div className={`rounded-2xl px-4 py-3 text-[14px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-white/10 text-white/90 rounded-br-md'
                  : 'bg-white/[0.03] border border-white/[0.06] text-white/75 rounded-bl-md'
              }`}>
                {msg.content}
              </div>
              <p className={`text-[10px] text-white/15 mt-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start">
            <div className="max-w-[88%]">
              <p className="text-[10px] tracking-widest uppercase text-white/20 font-medium mb-1.5 ml-0.5">
                Coordinateur
              </p>
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[12px] text-white/25 italic">{THINKING_PHRASES[thinkingIdx]}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-white/5">
        <div className="relative flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Decrivez votre situation..."
            rows={1}
            className="flex-1 resize-none bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 pr-10 text-[14px] text-white/85 placeholder-white/20 focus:outline-none focus:border-white/15 transition-colors leading-relaxed"
            style={{ maxHeight: 160 }}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`p-2 rounded-lg transition-all ${isRecording ? 'bg-red-500/20 text-red-400' : 'text-white/20 hover:text-white/50'}`}
            >
              {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isThinking}
          className="mt-2 w-full py-2.5 bg-white/[0.08] hover:bg-white/[0.12] disabled:opacity-30 rounded-xl text-[13px] font-medium text-white/70 transition-all flex items-center justify-center gap-2"
        >
          <ArrowUp size={14} />
          Envoyer
        </button>
      </div>
    </div>
  );
}
