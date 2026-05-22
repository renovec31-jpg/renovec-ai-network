import { Mic } from 'lucide-react';

export default function WelcomeView() {
  return (
    <div className="aib-view aib-welcome">
      <div className="aib-welcome-glow" />
      <div className="aib-welcome-content">
        <div className="aib-welcome-icon">
          <Mic size={18} />
        </div>
        <h3>Parlez-moi de votre situation</h3>
        <p>Un besoin, une competence a partager, une question. Je comprends et j'oriente.</p>
        <div className="aib-welcome-hints">
          <span>J'ai besoin d'aide pour...</span>
          <span>Je sais faire...</span>
          <span>C'est quoi RENOVEC ?</span>
        </div>
      </div>
    </div>
  );
}
