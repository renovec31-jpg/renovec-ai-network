import { ArrowRight } from 'lucide-react';

type Props = {
  onSeeker: () => void;
  onPresence: () => void;
};

const STORAGE_KEY = 'renovec_welcome_done';

export function shouldShowWelcome(): boolean {
  return !localStorage.getItem(STORAGE_KEY);
}

export function markWelcomeDone() {
  localStorage.setItem(STORAGE_KEY, '1');
}

export default function WelcomeScreen({ onSeeker, onPresence }: Props) {
  function handleSeeker() {
    markWelcomeDone();
    onSeeker();
  }
  function handlePresence() {
    markWelcomeDone();
    onPresence();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-5" style={{ background: '#f9f9f9' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div style={{ width: 20, height: 20, background: '#F26522', borderRadius: 3 }} />
          <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.02em', color: '#111' }}>RENOVEC</span>
        </div>

        {/* Heading */}
        <h1 style={{ fontSize: 26, fontWeight: 600, color: '#111', marginBottom: 6, lineHeight: 1.25 }}>
          Bienvenue dans le réseau.
        </h1>
        <p style={{ fontSize: 13, color: '#aaa', marginBottom: 8, lineHeight: 1.5 }}>
          Orchestré par IA — pas de formulaire, pas de case à cocher.
        </p>
        <p style={{ fontSize: 14, color: '#888', marginBottom: 32, lineHeight: 1.5 }}>
          Comment voulez-vous commencer ?
        </p>

        {/* Intent blocks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={handleSeeker}
            style={{
              width: '100%', padding: '20px',
              background: '#fff', border: '1px solid #eee',
              borderRadius: 6, cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#ccc')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#eee')}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 4 }}>
                J'ai une situation à exprimer
              </div>
              <div style={{ fontSize: 12, color: '#999' }}>
                Dites-le en langage libre. L'IA interprète et coordonne.
              </div>
            </div>
            <ArrowRight size={16} color="#999" style={{ flexShrink: 0, marginLeft: 12 }} />
          </button>

          <button
            onClick={handlePresence}
            style={{
              width: '100%', padding: '20px',
              background: '#fff', border: '1px solid #eee',
              borderRadius: 6, cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#ccc')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#eee')}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 4 }}>
                Je veux partager ce que je sais faire
              </div>
              <div style={{ fontSize: 12, color: '#999' }}>
                L'IA sait quand vous activer — au bon moment, dans le bon contexte.
              </div>
            </div>
            <ArrowRight size={16} color="#999" style={{ flexShrink: 0, marginLeft: 12 }} />
          </button>
        </div>

        <p style={{ marginTop: 24, fontSize: 12, color: '#bbb', textAlign: 'center' }}>
          Vous pourrez changer à tout moment.
        </p>
      </div>
    </div>
  );
}
