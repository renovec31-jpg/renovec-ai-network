import { useState, useCallback, useRef, useEffect } from 'react';
import { X, Mic, MicOff, Send, Loader, MapPin, Star, Check, Sparkles } from 'lucide-react';
import { useUserMode } from '../../hooks/useUserMode';
import { useIntentDetection } from '../../hooks/useIntentDetection';
import type { Intent } from '../../hooks/useIntentDetection';
import { MOCK_PROFILES, MOCK_FEED } from '../../data/mockOccitanie';
import type { MockProfile } from '../../data/mockOccitanie';

interface Props {
  onClose: () => void;
  onJoinNetwork: () => void;
}

type AIPhase = 'listening' | 'analyzing' | 'resolved';

function matchProfiles(text: string): MockProfile[] {
  const lower = text.toLowerCase();
  if (/compt|fiscal|bilan|tva|entreprise/.test(lower)) return MOCK_PROFILES.filter(p => /compt|gestion|cv/i.test(p.capacite)).slice(0, 4);
  if (/inform|ordi|pc|mac|internet/.test(lower)) return MOCK_PROFILES.filter(p => /inform|web|excel/i.test(p.capacite)).slice(0, 4);
  if (/bricol|plomb|électr|travaux|réparer/.test(lower)) return MOCK_PROFILES.filter(p => /bricol|répara|vélo/i.test(p.capacite)).slice(0, 4);
  if (/cuisine|jardin|yoga|sport|musique|guitare/.test(lower)) return MOCK_PROFILES.filter(p => /yoga|guitare|couture/i.test(p.capacite)).slice(0, 4);
  return MOCK_PROFILES.slice(0, 4);
}

function intentLabel(intent: Intent): string {
  switch (intent) {
    case 'situation': return 'besoin identifié';
    case 'presence': return 'offre de capacité';
    case 'urgency': return 'besoin urgent';
    case 'discovery': return 'exploration';
    default: return 'analyse en cours';
  }
}

function generatePresenceCard(text: string) {
  const lower = text.toLowerCase();
  if (/cuisine|cook|pâtiss/.test(lower)) return { titre: 'Passionné de cuisine', caps: ['Cours de cuisine', 'Pâtisserie créative', 'Conseil nutrition'], tags: ['cuisine', 'pâtisserie', 'fait-maison'] };
  if (/jardin|plant|potager/.test(lower)) return { titre: 'Main verte', caps: ['Conseil jardinage urbain', 'Entretien de jardin', 'Échange de plants'], tags: ['jardinage', 'permaculture', 'potager'] };
  if (/inform|code|web|développ/.test(lower)) return { titre: 'Expert numérique', caps: ['Dépannage informatique', 'Formation outils numériques', 'Création de sites'], tags: ['informatique', 'web', 'formation'] };
  return { titre: 'Contributeur polyvalent', caps: ['Partage de savoir-faire', 'Entraide ponctuelle', 'Échange de services'], tags: ['polyvalence', 'entraide', 'partage'] };
}

export default function WorkspaceOverlay({ onClose, onJoinNetwork }: Props) {
  const { isConnected, user } = useUserMode();
  const { detect } = useIntentDetection();

  const [textInput, setTextInput] = useState('');
  const [phase, setPhase] = useState<AIPhase>('listening');
  const [currentIntent, setCurrentIntent] = useState<Intent>(null);
  const [statusText, setStatusText] = useState('');
  const [results, setResults] = useState<MockProfile[]>([]);
  const [presenceCard, setPresenceCard] = useState<{ titre: string; caps: string[]; tags: string[] } | null>(null);
  const [feedVisible, setFeedVisible] = useState(false);
  const [micActive, setMicActive] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Waveform bars
  const [bars] = useState(() => Array.from({ length: 24 }, () => 4 + Math.random() * 8));
  const [barHeights, setBarHeights] = useState(bars);

  useEffect(() => {
    let raf: number;
    function animate() {
      setBarHeights(prev => prev.map((h, i) => {
        const base = 4;
        const max = micActive && phase === 'listening' ? 18 : 8;
        const target = base + Math.sin(Date.now() * 0.003 + i * 0.5) * (max - base) * 0.5 + (max - base) * 0.3;
        return h + (target - h) * 0.08;
      }));
      raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [micActive, phase]);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const handleSubmit = useCallback(() => {
    const msg = textInput.trim();
    if (!msg) return;
    setTextInput('');
    setPhase('analyzing');
    setStatusText('RENOVEC analyse...');
    setResults([]);
    setPresenceCard(null);
    setFeedVisible(false);

    const intent = detect(msg);
    setCurrentIntent(intent);

    setTimeout(() => {
      setStatusText(`RENOVEC a compris : ${intentLabel(intent)}`);
      setPhase('resolved');

      if (intent === 'presence') {
        setPresenceCard(generatePresenceCard(msg));
      } else if (intent === 'discovery') {
        setFeedVisible(true);
      } else {
        setResults(matchProfiles(msg));
      }
    }, 1400);
  }, [textInput, detect]);

  return (
    <div className="ai-page">
      {/* Fixed header */}
      <header className="ai-page-header">
        <div className="ai-page-header-left">
          <div className="ai-page-dot" />
          <span className="ai-page-brand">RENOVEC</span>
          {isConnected && user && (
            <span className="ai-page-user">{user.prenom}</span>
          )}
        </div>
        <button className="ai-page-close" onClick={onClose} aria-label="Fermer">
          <X size={16} />
        </button>
      </header>

      {/* AI context status */}
      {statusText && (
        <div className="ai-status-bar">
          <div className="ai-status-dot" />
          <span>{statusText}</span>
        </div>
      )}

      {/* Main canvas — full space between header and voice bubble */}
      <div className="ai-canvas" ref={canvasRef}>
        {phase === 'listening' && (
          <div className="ai-canvas-empty">
            <p className="ai-canvas-prompt">
              {isConnected && user
                ? `${user.prenom}, décrivez votre situation librement.`
                : 'Décrivez votre situation librement.'}
            </p>
            <p className="ai-canvas-sub">L'IA va analyser et vous orienter dans le réseau.</p>
          </div>
        )}

        {phase === 'analyzing' && (
          <div className="ai-canvas-loading">
            <div className="ai-loader">
              <span /><span /><span />
            </div>
          </div>
        )}

        {/* Situation / Urgency results */}
        {phase === 'resolved' && results.length > 0 && (
          <div className="ai-results">
            <p className="ai-results-title">Profils identifiés dans votre zone</p>
            <div className="ai-results-grid">
              {results.map(p => (
                <div key={p.id} className="ai-profile-card">
                  <div className="ai-profile-avatar" style={{ background: p.color }}>
                    {p.prenom[0]}
                  </div>
                  <div className="ai-profile-info">
                    <span className="ai-profile-name">{p.prenom}</span>
                    <span className="ai-profile-cap">{p.capacite}</span>
                    <div className="ai-profile-meta">
                      <MapPin size={9} /> {p.ville}
                      <Star size={9} /> {p.pts} pts
                    </div>
                    <div className="ai-profile-tags">
                      {p.tags.slice(0, 3).map(t => <span key={t}>{t}</span>)}
                    </div>
                  </div>
                  <div className="ai-profile-badge" data-status={p.disponibilite}>
                    {p.disponibilite === 'disponible' ? 'Disponible' : 'Bientôt'}
                  </div>
                </div>
              ))}
            </div>
            {!isConnected && (
              <div className="ai-join-banner">
                <p>Rejoignez le réseau pour activer la mise en relation.</p>
                <button onClick={onJoinNetwork}>Rejoindre le réseau</button>
              </div>
            )}
          </div>
        )}

        {/* Presence card preview */}
        {phase === 'resolved' && presenceCard && (
          <div className="ai-results">
            <p className="ai-results-title">Votre fiche de présence</p>
            <div className="ai-presence-card">
              <div className="ai-presence-header">
                <Sparkles size={14} />
                <span>Aperçu généré par l'IA</span>
              </div>
              <h4 className="ai-presence-titre">{presenceCard.titre}</h4>
              <ul className="ai-presence-caps">
                {presenceCard.caps.map((c, i) => (
                  <li key={i}><Check size={10} /> {c}</li>
                ))}
              </ul>
              <div className="ai-presence-tags">
                {presenceCard.tags.map(t => <span key={t}>{t}</span>)}
              </div>
              {!isConnected && (
                <div className="ai-join-banner">
                  <p>Créez votre compte pour publier cette fiche.</p>
                  <button onClick={onJoinNetwork}>Créer mon compte</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Feed / discovery */}
        {phase === 'resolved' && feedVisible && (
          <div className="ai-results">
            <p className="ai-results-title">Ce qui circule dans le réseau</p>
            <div className="ai-feed-list">
              {MOCK_FEED.slice(0, 8).map(item => (
                <div key={item.id} className="ai-feed-item">
                  <div className="ai-feed-dot" style={{ background: item.color }} />
                  <div className="ai-feed-body">
                    <span className="ai-feed-title">{item.title}</span>
                    <span className="ai-feed-meta">{item.author} · {item.city} · {item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Fixed voice bubble at bottom */}
      <div className="ai-voice-bubble">
        <div className="ai-bubble-header">
          <div className="ai-bubble-status">
            <div className={`ai-bubble-dot ${phase === 'analyzing' ? 'ai-bubble-dot--proc' : ''}`} />
            <span>RENOVEC</span>
            <span className="ai-bubble-state">
              {phase === 'listening' ? 'à l\'écoute' : phase === 'analyzing' ? 'réfléchit…' : 'prêt'}
            </span>
          </div>
        </div>

        {/* Waveform */}
        <div className="ai-waveform">
          {barHeights.map((h, i) => (
            <div
              key={i}
              className="ai-wave-bar"
              style={{
                height: h,
                background: micActive
                  ? 'rgba(242,101,34,0.55)'
                  : 'rgba(255,255,255,0.08)',
              }}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="ai-bubble-controls">
          <button
            className={`ai-mic-btn ${micActive ? 'ai-mic-btn--active' : ''}`}
            onClick={() => setMicActive(!micActive)}
          >
            {micActive ? <Mic size={15} /> : <MicOff size={15} />}
          </button>
          <input
            ref={inputRef}
            type="text"
            className="ai-text-input"
            placeholder="Ou écrivez…"
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            disabled={phase === 'analyzing'}
          />
          <button
            className="ai-send-btn"
            onClick={handleSubmit}
            disabled={!textInput.trim() || phase === 'analyzing'}
          >
            {phase === 'analyzing' ? <Loader size={14} className="ai-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
