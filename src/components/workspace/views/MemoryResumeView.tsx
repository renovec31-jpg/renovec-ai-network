import { Clock, ArrowRight } from 'lucide-react';

interface Props {
  userName: string;
  lastContext?: string;
}

export default function MemoryResumeView({ userName, lastContext }: Props) {
  return (
    <div className="aib-view aib-memory">
      <span className="aib-match-label">Reprise de contexte</span>

      <div className="aib-memory-card">
        <h4>Bonjour {userName}</h4>
        {lastContext ? (
          <>
            <p className="aib-memory-text">
              La derniere fois, on travaillait sur : <strong>{lastContext}</strong>
            </p>
            <div className="aib-memory-action">
              <ArrowRight size={11} />
              <span>On reprend la ou on en etait ?</span>
            </div>
          </>
        ) : (
          <p className="aib-memory-text">
            Content de vous revoir. Qu'est-ce qui vous amene aujourd'hui ?
          </p>
        )}

        <div className="aib-memory-footer">
          <Clock size={10} />
          <span>RENOVEC se souvient de vos echanges precedents</span>
        </div>
      </div>
    </div>
  );
}
