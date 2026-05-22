import { useState, useCallback, useRef, useEffect } from 'react';
import { X, Mic, MicOff, Send, Loader, MapPin, Star, Check, Sparkles, Eye } from 'lucide-react';
import { useUserMode } from '../../hooks/useUserMode';
import { useVisitorProfile } from '../../hooks/useVisitorProfile';
import { useKnownUserContext } from '../../hooks/useKnownUserContext';
import { useInitialHypotheses } from '../../hooks/useInitialHypotheses';
import {
  generateVisitorGreeting,
  generateKnownUserGreeting,
  generateFollowUp,
  buildContextHintsFromConversation,
} from '../../services/welcome/orchestrator';
import type { GreetingState, ContextHint, InitialHypotheses } from '../../services/welcome/types';
import { MOCK_PROFILES, MOCK_FEED } from '../../data/mockOccitanie';
import type { MockProfile } from '../../data/mockOccitanie';

interface Props {
  onClose: () => void;
  onJoinNetwork: () => void;
}

type AIPhase = 'greeting' | 'listening' | 'analyzing' | 'resolved';

function matchProfiles(text: string): MockProfile[] {
  const lower = text.toLowerCase();
  if (/compt|fiscal|bilan|tva|entreprise/.test(lower)) return MOCK_PROFILES.filter(p => /compt|gestion|cv/i.test(p.capacite)).slice(0, 4);
  if (/inform|ordi|pc|mac|internet/.test(lower)) return MOCK_PROFILES.filter(p => /inform|web|excel/i.test(p.capacite)).slice(0, 4);
  if (/bricol|plomb|électr|travaux|réparer/.test(lower)) return MOCK_PROFILES.filter(p => /bricol|répara|vélo/i.test(p.capacite)).slice(0, 4);
  if (/cuisine|jardin|yoga|sport|musique|guitare/.test(lower)) return MOCK_PROFILES.filter(p => /yoga|guitare|couture/i.test(p.capacite)).slice(0, 4);
  return MOCK_PROFILES.slice(0, 4);
}

function generatePresenceCard(text: string) {
  const lower = text.toLowerCase();
  if (/cuisine|cook|pâtiss/.test(lower)) return { titre: 'Passionné de cuisine', caps: ['Cours de cuisine', 'Pâtisserie créative', 'Conseil nutrition'], tags: ['cuisine', 'pâtisserie', 'fait-maison'] };
  if (/jardin|plant|potager/.test(lower)) return { titre: 'Main verte', caps: ['Conseil jardinage urbain', 'Entretien de jardin', 'Échange de plants'], tags: ['jardinage', 'permaculture', 'potager'] };
  if (/inform|code|web|développ/.test(lower)) return { titre: 'Expert numérique', caps: ['Dépannage informatique', 'Formation outils numériques', 'Création de sites'], tags: ['informatique', 'web', 'formation'] };
  return { titre: 'Contributeur polyvalent', caps: ['Partage de savoir-faire', 'Entraide ponctuelle', 'Échange de services'], tags: ['polyvalence', 'entraide', 'partage'] };
}

export default function WorkspaceOverlay({ onClose, onJoinNetwork }: Props) {
  const { isConnected } = useUserMode();
  const { profile: visitorProfile, recordTextInput, recordInteraction } = useVisitorProfile();
  const knownUser = useKnownUserContext();
  const { computeFromText } = useInitialHypotheses();

  const [textInput, setTextInput] = useState('');
  const [phase, setPhase] = useState<AIPhase>('greeting');
  const [greeting, setGreeting] = useState<GreetingState | null>(null);
  const [aiMessages, setAiMessages] = useState<string[]>([]);
  const [currentHypotheses, setCurrentHypotheses] = useState<InitialHypotheses | null>(null);
  const [contextHints, setContextHints] = useState<ContextHint[]>([]);
  const [results, setResults] = useState<MockProfile[]>([]);
  const [presenceCard, setPresenceCard] = useState<{ titre: string; caps: string[]; tags: string[] } | null>(null);
  const [feedVisible, setFeedVisible] = useState(false);
  const [micActive, setMicActive] = useState(true);
  const [turnCount, setTurnCount] = useState(0);
  const [showContextBlock, setShowContextBlock] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Waveform
  const [barHeights, setBarHeights] = useState(() => Array.from({ length: 24 }, () => 4));

  useEffect(() => {
    let raf: number;
    function animate() {
      setBarHeights(prev => prev.map((h, i) => {
        const base = 3;
        const max = micActive && (phase === 'greeting' || phase === 'listening') ? 16 : 7;
        const target = base + Math.sin(Date.now() * 0.003 + i * 0.5) * (max - base) * 0.5 + (max - base) * 0.25;
        return h + (target - h) * 0.07;
      }));
      raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [micActive, phase]);

  // Generate greeting on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      let greetState: GreetingState;
      if (isConnected && knownUser) {
        greetState = generateKnownUserGreeting(knownUser);
      } else if (visitorProfile) {
        greetState = generateVisitorGreeting(visitorProfile);
      } else {
        greetState = {
          message: 'Bonjour. Je suis RENOVEC. Décrivez librement ce qui vous amène.',
          tone: 'warm',
          followUp: 'Je vous écoute.',
          contextHints: [],
          phase: 'greeting',
        };
      }
      setGreeting(greetState);
      setAiMessages([greetState.message]);
      setContextHints(greetState.contextHints);
      if (greetState.contextHints.length > 0) {
        setTimeout(() => setShowContextBlock(true), 1200);
      }

      setTimeout(() => {
        if (greetState.followUp) {
          setAiMessages(prev => [...prev, greetState.followUp!]);
        }
        setPhase('listening');
        inputRef.current?.focus();
      }, 1500);
    }, 400);
    return () => clearTimeout(timer);
  }, [isConnected, knownUser, visitorProfile]);

  const handleSubmit = useCallback(() => {
    const msg = textInput.trim();
    if (!msg) return;
    setTextInput('');
    recordTextInput(msg);
    recordInteraction();
    setTurnCount(prev => prev + 1);
    setPhase('analyzing');
    setResults([]);
    setPresenceCard(null);
    setFeedVisible(false);

    const hypotheses = computeFromText(msg, visitorProfile);
    setCurrentHypotheses(hypotheses);

    const newHints = buildContextHintsFromConversation(
      [...(visitorProfile?.signals.textInputs || []), msg],
      hypotheses,
      visitorProfile
    );
    setContextHints(prev => {
      const existing = prev.map(h => h.label);
      const unique = newHints.filter(h => !existing.includes(h.label));
      return [...prev, ...unique];
    });
    setShowContextBlock(true);

    setTimeout(() => {
      const followUp = generateFollowUp(hypotheses.probableIntent, turnCount + 1, isConnected);

      if (hypotheses.probableIntent === 'offer') {
        setPresenceCard(generatePresenceCard(msg));
        if (followUp) setAiMessages(prev => [...prev, followUp]);
      } else if (hypotheses.probableIntent === 'discovery' || hypotheses.probableIntent === 'hesitation') {
        setFeedVisible(true);
        if (followUp) setAiMessages(prev => [...prev, followUp]);
      } else {
        setResults(matchProfiles(msg));
        if (followUp) setAiMessages(prev => [...prev, followUp]);
      }
      setPhase('resolved');
    }, 1400);
  }, [textInput, computeFromText, visitorProfile, recordTextInput, recordInteraction, turnCount, isConnected]);

  const latestMessage = aiMessages[aiMessages.length - 1] || '';

  return (
    <div className="ai-page">
      {/* Fixed header */}
      <header className="ai-page-header">
        <div className="ai-page-header-left">
          <div className="ai-page-dot" />
          <span className="ai-page-brand">RENOVEC</span>
          {isConnected && knownUser && (
            <span className="ai-page-user">{knownUser.prenom}</span>
          )}
        </div>
        <button className="ai-page-close" onClick={onClose} aria-label="Fermer">
          <X size={16} />
        </button>
      </header>

      {/* AI status / latest message */}
      {latestMessage && (
        <div className="ai-status-bar">
          <div className="ai-status-dot" />
          <span className="ai-status-text">{latestMessage}</span>
        </div>
      )}

      {/* Main canvas */}
      <div className="ai-canvas" ref={canvasRef}>
        {/* Context perception block */}
        {showContextBlock && contextHints.length > 0 && (
          <div className="ai-context-block">
            <div className="ai-context-header">
              <Eye size={11} />
              <span>Ce que RENOVEC perçoit pour mieux orienter</span>
            </div>
            <div className="ai-context-hints">
              {contextHints.map((hint, i) => (
                <div key={i} className="ai-context-hint" data-source={hint.source}>
                  <span className="ai-hint-label">{hint.label}</span>
                  <span className="ai-hint-source">
                    {hint.source === 'session' ? 'session' : hint.source === 'history' ? 'historique' : 'échange'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Greeting / waiting state */}
        {phase === 'greeting' && (
          <div className="ai-canvas-empty">
            <div className="ai-loader"><span /><span /><span /></div>
          </div>
        )}

        {phase === 'listening' && results.length === 0 && !presenceCard && !feedVisible && (
          <div className="ai-canvas-empty">
            <p className="ai-canvas-prompt">
              {isConnected && knownUser
                ? `${knownUser.prenom}, qu'est-ce qui vous amène ?`
                : 'Décrivez votre situation librement.'}
            </p>
            <p className="ai-canvas-sub">Pas de formulaire. Juste du langage libre.</p>
          </div>
        )}

        {phase === 'analyzing' && (
          <div className="ai-canvas-loading">
            <div className="ai-loader"><span /><span /><span /></div>
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
                <div className="ai-join-banner" style={{ marginTop: 14 }}>
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
              {phase === 'greeting' ? 'initialise…'
                : phase === 'analyzing' ? 'réfléchit…'
                : 'à l\'écoute'}
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
            disabled={phase === 'analyzing' || phase === 'greeting'}
          />
          <button
            className="ai-send-btn"
            onClick={handleSubmit}
            disabled={!textInput.trim() || phase === 'analyzing' || phase === 'greeting'}
          >
            {phase === 'analyzing' ? <Loader size={14} className="ai-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
