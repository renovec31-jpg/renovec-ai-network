import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Send, Loader, MessageSquare } from 'lucide-react';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const API_HEADERS   = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SUPABASE_ANON}`,
  'Apikey': SUPABASE_ANON,
};
const CHAT_URL = `${SUPABASE_URL}/functions/v1/voice-welcome`;

const OPENING = 'Bonjour. Je connais bien RENOVEC. Posez-moi vos questions.';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

export default function TextPresence() {
  const [open,      setOpen]      = useState(false);
  const [history,   setHistory]   = useState<Turn[]>([]);
  const [input,     setInput]     = useState('');
  const [thinking,  setThinking]  = useState(false);

  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, thinking]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setHistory([{ role: 'assistant', content: OPENING, id: 'open' }]);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setHistory([]);
    setInput('');
  }, []);

  const handleSubmit = useCallback(async () => {
    const msg = input.trim();
    if (!msg || thinking) return;
    setInput('');
    setThinking(true);
    setHistory(h => [...h, { role: 'user', content: msg, id: `u_${Date.now()}` }]);

    try {
      const recent = history.slice(-6).map(t => ({ role: t.role, content: t.content }));
      const res  = await fetch(CHAT_URL, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({ message: msg, history: recent }),
        signal: AbortSignal.timeout(15000),
      });
      const data  = await res.json();
      const reply = (data.reply as string) || 'Je suis là.';
      setHistory(h => [...h, { role: 'assistant', content: reply, id: `a_${Date.now()}` }]);
    } catch {
      setHistory(h => [...h, { role: 'assistant', content: 'Posez-moi votre question.', id: `a_${Date.now()}` }]);
    } finally {
      setThinking(false);
    }
  }, [input, thinking, history]);

  return (
    <>
      {!open && (
        <button className="tp-trigger" onClick={handleOpen} aria-label="Parler avec Ali">
          <div className="tp-trigger-pulse" />
          <div className="tp-trigger-icon"><MessageSquare size={14} /></div>
          <span className="tp-trigger-label">Une question sur RENOVEC ?</span>
        </button>
      )}

      {open && (
        <div className="tp-panel" role="dialog" aria-label="Représentant RENOVEC">

          <div className="tp-header">
            <div className="tp-header-left">
              <div className="tp-header-dot" />
              <span className="tp-header-name">RENOVEC</span>
            </div>
            <button className="tp-close" onClick={handleClose} aria-label="Fermer"><X size={14} /></button>
          </div>

          <div className="tp-chat">
            {history.map(turn => (
              <div key={turn.id} className={`tp-bubble tp-bubble--${turn.role}`}>
                {turn.content}
              </div>
            ))}

            {thinking && (
              <div className="tp-bubble tp-bubble--assistant tp-bubble--thinking">
                <span className="tp-dot" style={{ animationDelay: '0s'    }} />
                <span className="tp-dot" style={{ animationDelay: '0.18s' }} />
                <span className="tp-dot" style={{ animationDelay: '0.36s' }} />
              </div>
            )}

            <div ref={endRef} />
          </div>

          <div className="tp-controls">
            <input
              ref={inputRef}
              className="tp-input"
              type="text"
              placeholder="Votre question…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              disabled={thinking}
              autoComplete="off"
            />
            <button
              className="tp-send"
              onClick={handleSubmit}
              disabled={!input.trim() || thinking}
              aria-label="Envoyer"
            >
              {thinking ? <Loader size={14} className="tp-spin" /> : <Send size={14} />}
            </button>
          </div>

          <div className="tp-footer">Présence d'accueil · RENOVEC</div>
        </div>
      )}
    </>
  );
}
