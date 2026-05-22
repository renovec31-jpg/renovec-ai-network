import { useRef, useEffect } from 'react';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

interface Props {
  history: Turn[];
}

export default function ConversationRail({ history }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [history.length]);

  if (history.length === 0) return null;

  return (
    <div className="aib-rail">
      <div className="aib-rail-header">
        <div className="aib-rail-dot" />
        <span>Conversation</span>
      </div>
      <div className="aib-rail-messages">
        {history.map(turn => (
          <div key={turn.id} className={`aib-rail-msg aib-rail-msg--${turn.role}`}>
            <span className="aib-rail-role">
              {turn.role === 'assistant' ? 'RENOVEC' : 'Vous'}
            </span>
            <p>{turn.content}</p>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
