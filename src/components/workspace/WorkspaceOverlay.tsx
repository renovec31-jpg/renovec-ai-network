/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef, useEffect } from 'react';
import { X, Mic, MicOff, Send, Loader, Volume2, VolumeX, MapPin, Star, Check, Sparkles } from 'lucide-react';
import { useUserMode } from '../../hooks/useUserMode';
import { useVisitorProfile } from '../../hooks/useVisitorProfile';
import { useKnownUserContext } from '../../hooks/useKnownUserContext';
import { useInitialHypotheses } from '../../hooks/useInitialHypotheses';
import {
  generateVisitorGreeting,
  generateKnownUserGreeting,
  buildContextHintsFromConversation,
} from '../../services/welcome/orchestrator';
import type { ContextHint } from '../../services/welcome/types';
import { MOCK_PROFILES, MOCK_FEED } from '../../data/mockOccitanie';
import type { MockProfile } from '../../data/mockOccitanie';
import ConversationViz from './ConversationViz';
import type { UnderstandingState } from './ConversationViz';

// ── Supabase edge function endpoints ──────────────────────────────────
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const CHAT_URL = `${SUPABASE_URL}/functions/v1/voice-welcome`;
const TTS_URL  = `${SUPABASE_URL}/functions/v1/tts-elevenlabs`;
const API_HEADERS = {
  'Authorization': `Bearer ${SUPABASE_ANON}`,
  'Apikey': SUPABASE_ANON,
};

const SILENCE_THRESHOLD = 0.015;

function getSpeechRecognitionCtor(): (new () => any) | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface Props {
  onClose: () => void;
  onJoinNetwork: () => void;
}

type AIPhase = 'greeting' | 'listening' | 'analyzing' | 'resolved';
type VoiceState = 'idle' | 'listening' | 'user_speaking' | 'processing' | 'speaking' | 'paused';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

const STOP_WORDS = new Set(['je', 'tu', 'il', 'nous', 'vous', 'ils', 'un', 'une', 'le', 'la', 'les', 'de', 'du', 'des', 'à', 'au', 'aux', 'en', 'et', 'ou', 'mais', 'donc', 'car', 'que', 'qui', 'quoi', 'mon', 'ma', 'mes', 'son', 'sa', 'ses', 'ce', 'cette', 'ces', 'pour', 'par', 'sur', 'dans', 'avec', 'est', 'suis', 'ai', 'pas', 'plus', 'très', 'bien', 'fait', 'être', 'avoir', 'faire']);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,;:!?'"()\-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 5);
}

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

  // ── AI Canvas state ─────────────────────────────────────────────────
  const [phase, setPhase] = useState<AIPhase>('greeting');
  const [, setGreeting] = useState<any>(null);
  const [, setContextHints] = useState<ContextHint[]>([]);
  const [results, setResults] = useState<MockProfile[]>([]);
  const [presenceCard, setPresenceCard] = useState<{ titre: string; caps: string[]; tags: string[] } | null>(null);
  const [feedVisible, setFeedVisible] = useState(false);
  const [latestAiMessage, setLatestAiMessage] = useState('');
  const [understanding, setUnderstanding] = useState<UnderstandingState>({
    phase: 'idle',
    intent: null,
    intentConfidence: 0,
    keywords: [],
    territory: null,
    urgency: 0,
    isOffer: false,
    turnCount: 0,
    matchedProfiles: [],
    draftSummary: null,
    draftTitle: null,
  });

  // ── Voice panel state (from V192 VoicePresence) ─────────────────────
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [history, setHistory] = useState<Turn[]>([]);
  const [textInput, setTextInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [micBlocked, setMicBlocked] = useState(false);
  const [, setTick] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<AudioBufferSourceNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const monitorCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const silenceStart = useRef<number>(0);
  const speechStart = useRef<number>(0);
  const isListening = useRef(false);
  const recognitionRef = useRef<any>(null);
  const processingRef = useRef(false);
  const historyRef = useRef<Turn[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => { historyRef.current = history; }, [history]);

  // Animate waveform tick
  useEffect(() => {
    let id: number;
    function frame() { setTick(t => t + 1); id = requestAnimationFrame(frame); }
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    try { audioRef.current?.stop(); } catch {}
    try { recognitionRef.current?.abort(); } catch {}
    if (audioCtxRef.current?.state !== 'closed') audioCtxRef.current?.close();
    if (monitorCtxRef.current?.state !== 'closed') monitorCtxRef.current?.close();
    cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Voice helpers ───────────────────────────────────────────────────
  const addTurn = useCallback((role: 'user' | 'assistant', content: string) => {
    setHistory(h => [...h, { role, content, id: `${role}_${Date.now()}_${Math.random()}` }]);
    if (role === 'assistant') setLatestAiMessage(content);
  }, []);

  const playTTS = useCallback(async (text: string): Promise<void> => {
    if (muted) return;
    try {
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state === 'closed') return;
      if (ctx.state === 'suspended') await ctx.resume();
      const res = await fetch(TTS_URL, {
        method: 'POST',
        headers: { ...API_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice_id: "3xmA3rwGMRsLGbkC7E3u" }),
      });
      if (!res.ok) return;
      const arrayBuf = await res.arrayBuffer();
      if (arrayBuf.byteLength === 0) return;
      const audioBuffer = await ctx.decodeAudioData(arrayBuf);
      await new Promise<void>((resolve) => {
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        audioRef.current = source;
        source.onended = () => { audioRef.current = null; resolve(); };
        source.start(0);
      });
    } catch {}
  }, [muted]);

  const sendTranscript = useCallback(async (text: string) => {
    if (!text.trim() || processingRef.current) return;
    processingRef.current = true;
    setVoiceState('processing');

    // Also process for AI canvas
    processUserInput(text.trim());

    addTurn('user', text.trim());
    try {
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { ...API_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: historyRef.current.slice(-8).map(t => ({ role: t.role, content: t.content })),
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const data = await res.json() as { reply?: string };
      const reply = data.reply || 'Je suis là.';
      addTurn('assistant', reply);
      setVoiceState('speaking');
      await playTTS(reply);
    } catch {
      addTurn('assistant', 'Je suis là. Dis-moi.');
    } finally {
      processingRef.current = false;
    }
  }, [addTurn, playTTS]);

  const beginListening = useCallback(() => {
    if (processingRef.current) return;
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) { setVoiceState('paused'); return; }

    const recognition = new Ctor();
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const transcript = e.results[i][0].transcript.trim();
          if (transcript.length > 1) {
            isListening.current = false;
            try { recognition.stop(); } catch {}
            sendTranscript(transcript).then(() => {
              if (streamRef.current && !processingRef.current) beginListening();
            });
          }
        }
      }
    };

    recognition.onend = () => {
      if (isListening.current && !processingRef.current && streamRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    recognition.onerror = (e: any) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      isListening.current = false;
      recognitionRef.current = null;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') {
        setMicBlocked(true);
        setVoiceState('paused');
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };

    recognitionRef.current = recognition;
    isListening.current = true;
    silenceStart.current = Date.now();
    speechStart.current = 0;
    setVoiceState('listening');
    try { recognition.start(); } catch {}
  }, [sendTranscript]);

  const startMonitoring = useCallback(() => {
    if (!streamRef.current) return;
    if (monitorCtxRef.current?.state !== 'closed') {
      try { monitorCtxRef.current?.close(); } catch {}
    }
    monitorCtxRef.current = new AudioContext();
    const ctx = monitorCtxRef.current;
    const source = ctx.createMediaStreamSource(streamRef.current);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.7;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    function tick() {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
      setAmplitude(Math.sqrt(sum / data.length));
      rafRef.current = requestAnimationFrame(tick);
    }
    tick();
  }, []);

  // Start voice on mount
  useEffect(() => {
    (async () => {
      let stream: MediaStream | null = null;
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
        } catch {
          try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { stream = null; }
        }
      }

      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext();
      }
      audioCtxRef.current.resume().catch(() => {});

      if (!stream) {
        setMicBlocked(true);
        setVoiceState('paused');
        setTimeout(() => inputRef.current?.focus(), 200);
        return;
      }

      streamRef.current = stream;
      startMonitoring();

      // Generate greeting
      let greetText: string;
      if (isConnected && knownUser) {
        const g = generateKnownUserGreeting(knownUser);
        setGreeting(g);
        setContextHints(g.contextHints);
        greetText = g.message;
      } else if (visitorProfile) {
        const g = generateVisitorGreeting(visitorProfile);
        setGreeting(g);
        setContextHints(g.contextHints);
        greetText = g.message;
      } else {
        greetText = 'Bonjour. Je suis RENOVEC. Parlez-moi de votre situation, je peux déjà comprendre et vous orienter.';
      }

      setLatestAiMessage(greetText);
      addTurn('assistant', greetText);
      setVoiceState('speaking');
      setPhase('listening');
      await playTTS(greetText);
      beginListening();
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const interruptAndListen = useCallback(() => {
    try { audioRef.current?.stop(); } catch {}
    audioRef.current = null;
    processingRef.current = false;
    beginListening();
  }, [beginListening]);

  const togglePause = useCallback(() => {
    if (voiceState === 'paused') {
      beginListening();
    } else if (voiceState === 'listening' || voiceState === 'user_speaking') {
      isListening.current = false;
      try { recognitionRef.current?.abort(); } catch {}
      recognitionRef.current = null;
      setVoiceState('paused');
    }
  }, [voiceState, beginListening]);

  const handleMute = useCallback(() => {
    setMuted(m => {
      if (!m) { try { audioRef.current?.stop(); } catch {}; audioRef.current = null; }
      return !m;
    });
  }, []);

  // ── AI Canvas processing ────────────────────────────────────────────
  const processUserInput = useCallback((text: string) => {
    recordTextInput(text);
    recordInteraction();
    setPhase('analyzing');
    setResults([]);
    setPresenceCard(null);
    setFeedVisible(false);

    const hypotheses = computeFromText(text, visitorProfile);

    const newHints = buildContextHintsFromConversation(
      [...(visitorProfile?.signals.textInputs || []), text],
      hypotheses,
      visitorProfile
    );
    setContextHints(prev => {
      const existing = prev.map(h => h.label);
      const unique = newHints.filter(h => !existing.includes(h.label));
      return [...prev, ...unique];
    });

    // Extract keywords from text
    const kws = extractKeywords(text);
    // Extract territory mention
    const territoryMatch = text.match(/(?:à|de|près de|sur|zone|secteur|quartier)\s+([A-ZÀ-Ú][a-zà-ü]+(?:[\s-][A-ZÀ-Ú]?[a-zà-ü]+)*)/);
    const territory = territoryMatch?.[1] || hypotheses.territorialNeed || null;

    // Phase 1: immediately show "building" understanding
    setUnderstanding(prev => ({
      ...prev,
      phase: 'building',
      intent: hypotheses.probableIntent,
      intentConfidence: hypotheses.intentConfidence,
      keywords: [...new Set([...prev.keywords, ...kws])].slice(-8),
      territory,
      urgency: hypotheses.urgencyLevel,
      isOffer: hypotheses.probableIntent === 'offer',
      turnCount: prev.turnCount + 1,
      matchedProfiles: [],
      draftSummary: null,
      draftTitle: null,
    }));

    // Phase 2: after delay, resolve with profiles/drafts
    setTimeout(() => {
      let profiles: MockProfile[] = [];
      let draftTitle: string | null = null;
      let draftSummary: string | null = null;

      if (hypotheses.probableIntent === 'offer') {
        const card = generatePresenceCard(text);
        setPresenceCard(card);
        draftTitle = card.titre;
        draftSummary = card.caps.join(' · ');
      } else if (hypotheses.probableIntent === 'discovery' || hypotheses.probableIntent === 'hesitation') {
        setFeedVisible(true);
      } else {
        profiles = matchProfiles(text);
        setResults(profiles);
        draftTitle = `Recherche : ${kws.slice(0, 3).join(', ') || text.slice(0, 40)}`;
        draftSummary = territory ? `Zone ${territory}` : null;
      }

      setUnderstanding(prev => ({
        ...prev,
        phase: 'complete',
        matchedProfiles: profiles,
        draftTitle,
        draftSummary,
      }));
      setPhase('resolved');
    }, 1200);
  }, [computeFromText, visitorProfile, recordTextInput, recordInteraction]);

  // Text submit fallback
  const handleTextSubmit = useCallback(async () => {
    const msg = textInput.trim();
    if (!msg || thinking) return;
    setTextInput('');
    setThinking(true);

    isListening.current = false;
    try { recognitionRef.current?.abort(); } catch {};
    recognitionRef.current = null;

    processUserInput(msg);
    addTurn('user', msg);

    try {
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { ...API_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: historyRef.current.slice(-8).map(t => ({ role: t.role, content: t.content })),
        }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      const reply = (data.reply as string) || 'Je suis là.';
      addTurn('assistant', reply);
      setVoiceState('speaking');
      await playTTS(reply);
    } catch {
      addTurn('assistant', 'Dis-moi.');
    } finally {
      setThinking(false);
      if (streamRef.current) beginListening();
    }
  }, [textInput, thinking, addTurn, playTTS, beginListening, processUserInput]);

  // Amplitude → visual voice state
  useEffect(() => {
    if (voiceState === 'listening' && amplitude > SILENCE_THRESHOLD * 2.5) {
      setVoiceState('user_speaking');
    } else if (voiceState === 'user_speaking' && amplitude <= SILENCE_THRESHOLD * 0.8) {
      setVoiceState('listening');
    }
  }, [amplitude, voiceState]);

  const isActive = voiceState === 'listening' || voiceState === 'user_speaking';
  const isSpeaking = voiceState === 'speaking';
  const isProcessing = voiceState === 'processing';
  const isPaused = voiceState === 'paused';

  // Waveform bars
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const bars = 7;
  const barHeights = Array.from({ length: bars }, (_, i) => {
    const wave = Math.sin(now / 250 + i * 0.9) * 0.3 + 0.5;
    const amp = Math.min(1, amplitude * 10);
    if (voiceState === 'user_speaking') return 6 + amp * 22 + wave * 4;
    if (isSpeaking) return 5 + Math.sin(now / 180 + i * 0.7) * 9 + 7;
    if (isProcessing) return 4 + Math.sin(now / 400 + i) * 3 + 3;
    if (isActive) return 3 + wave * 3;
    return 3;
  });

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
      {latestAiMessage && (
        <div className="ai-status-bar">
          <div className="ai-status-dot" />
          <span className="ai-status-text">{latestAiMessage}</span>
        </div>
      )}

      {/* Main canvas */}
      <div className="ai-canvas" ref={canvasRef}>
        {/* Progressive understanding visualization */}
        {understanding.phase !== 'idle' && (
          <ConversationViz state={understanding} />
        )}

        {/* Greeting / waiting */}
        {phase === 'greeting' && understanding.phase === 'idle' && (
          <div className="ai-canvas-empty">
            <div className="ai-loader"><span /><span /><span /></div>
          </div>
        )}

        {phase === 'listening' && understanding.phase === 'idle' && (
          <div className="ai-canvas-empty">
            <p className="ai-canvas-prompt">
              {isConnected && knownUser
                ? `${knownUser.prenom}, qu'est-ce qui vous amène ?`
                : 'Décrivez votre situation librement.'}
            </p>
            <p className="ai-canvas-sub">Pas de formulaire. Juste du langage libre.</p>
          </div>
        )}

        {phase === 'analyzing' && understanding.phase === 'idle' && (
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

      {/* ═══ VOICE BUBBLE — real vocal panel from V192 ═══ */}
      <div className="ai-voice-bubble">
        <div className="ai-bubble-header">
          <div className="ai-bubble-status">
            <div className={`ai-bubble-dot ${
              voiceState === 'user_speaking' ? 'ai-bubble-dot--rec'
              : isSpeaking ? 'ai-bubble-dot--play'
              : isProcessing ? 'ai-bubble-dot--proc'
              : ''
            }`} />
            <span>RENOVEC</span>
            <span className="ai-bubble-state">
              {voiceState === 'user_speaking' ? 'écoute…'
                : isSpeaking ? 'parle…'
                : isProcessing ? 'réfléchit…'
                : isPaused ? 'en pause'
                : isActive ? 'à l\'écoute' : ''}
            </span>
          </div>
          <div className="ai-bubble-actions">
            <button className="ai-bubble-icon-btn" onClick={handleMute} title={muted ? 'Réactiver' : 'Couper le son'}>
              {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            </button>
          </div>
        </div>

        {/* Live waveform */}
        <div className="ai-waveform">
          {barHeights.map((h, i) => (
            <div
              key={i}
              className="ai-wave-bar"
              style={{
                height: h,
                background: voiceState === 'user_speaking'
                  ? `rgba(242,101,34,${Math.min(1, 0.5 + amplitude * 3)})`
                  : isSpeaking
                  ? 'rgba(90,180,120,0.65)'
                  : isProcessing
                  ? 'rgba(200,168,90,0.4)'
                  : isActive
                  ? 'rgba(242,101,34,0.4)'
                  : 'rgba(255,255,255,0.08)',
                transition: 'background 0.2s',
              }}
            />
          ))}
        </div>

        {/* Voice controls */}
        <div className="ai-voice-controls">
          {micBlocked ? (
            <div className="ai-ptt ai-ptt--disabled">
              <MicOff size={14} />
              <span>Mode texte</span>
            </div>
          ) : isSpeaking ? (
            <button className="ai-ptt ai-ptt--playing" onClick={interruptAndListen}>
              <Mic size={14} />
              <span>Interrompre</span>
            </button>
          ) : (
            <button
              className={`ai-ptt ${isActive ? 'ai-ptt--recording' : isPaused ? '' : 'ai-ptt--processing'}`}
              onClick={togglePause}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader size={14} className="ai-spin" /> : isPaused ? <MicOff size={14} /> : <Mic size={14} />}
              <span>
                {isProcessing ? 'Traitement…' : isPaused ? 'Reprendre' : 'À l\'écoute'}
              </span>
            </button>
          )}
        </div>

        {/* Text input */}
        <div className="ai-bubble-controls">
          <input
            ref={inputRef}
            type="text"
            className="ai-text-input"
            placeholder="Ou écrivez…"
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
            disabled={thinking}
            autoComplete="off"
          />
          <button
            className="ai-send-btn"
            onClick={handleTextSubmit}
            disabled={!textInput.trim() || thinking}
          >
            {thinking ? <Loader size={14} className="ai-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
