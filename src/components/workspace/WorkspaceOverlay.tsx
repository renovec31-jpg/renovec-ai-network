/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback, useRef, useEffect } from 'react';
import { X, Mic, MicOff, Send, Loader, Volume2, VolumeX } from 'lucide-react';
import { useUserMode } from '../../hooks/useUserMode';
import { useVisitorProfile } from '../../hooks/useVisitorProfile';
import { useKnownUserContext } from '../../hooks/useKnownUserContext';
import { useInitialHypotheses } from '../../hooks/useInitialHypotheses';
import {
  generateVisitorGreeting,
  generateKnownUserGreeting,
  buildContextHintsFromConversation,
} from '../../services/welcome/orchestrator';
// buildContextHintsFromConversation types from welcome/types
import { MOCK_PROFILES } from '../../data/mockOccitanie';
import type { MockProfile } from '../../data/mockOccitanie';
import ConversationRail from './ConversationRail';
import AIBrowserSurface from './AIBrowserSurface';
import ContextBar from './ContextBar';
import type { AIBrowserState, AIView, ContextSummary, PresenceDraft, SituationDraft, SuggestedAction } from './types';
import { intentToLabel, clarityFromConfidence } from './types';

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

type VoiceState = 'idle' | 'listening' | 'user_speaking' | 'processing' | 'speaking' | 'paused';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

// ── Helpers ───────────────────────────────────────────────────────────

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

function generatePresenceDraft(text: string): PresenceDraft {
  const lower = text.toLowerCase();
  if (/cuisine|cook|pâtiss/.test(lower)) return { title: 'Passionne de cuisine', capabilities: ['Cours de cuisine', 'Patisserie creative', 'Conseil nutrition'], tags: ['cuisine', 'patisserie', 'fait-maison'] };
  if (/jardin|plant|potager/.test(lower)) return { title: 'Main verte', capabilities: ['Conseil jardinage urbain', 'Entretien de jardin', 'Echange de plants'], tags: ['jardinage', 'permaculture', 'potager'] };
  if (/inform|code|web|développ/.test(lower)) return { title: 'Expert numerique', capabilities: ['Depannage informatique', 'Formation outils numeriques', 'Creation de sites'], tags: ['informatique', 'web', 'formation'] };
  if (/plomb|électr|bricol|travaux/.test(lower)) return { title: 'Artisan de confiance', capabilities: ['Depannage plomberie', 'Petits travaux', 'Conseil renovation'], tags: ['plomberie', 'bricolage', 'depannage'] };
  return { title: 'Contributeur polyvalent', capabilities: ['Partage de savoir-faire', 'Entraide ponctuelle', 'Echange de services'], tags: ['polyvalence', 'entraide', 'partage'] };
}

function computeNextStep(intent: string | null, turnCount: number, isConnected: boolean): string {
  if (turnCount === 0) return 'En attente';
  if (!intent) return 'Ecoute active';
  switch (intent) {
    case 'need':
    case 'urgency':
      return turnCount > 1 ? 'Recherche de profils' : 'Clarification de la zone';
    case 'offer':
      return 'Construction de votre fiche';
    case 'discovery':
      return 'Exploration du reseau';
    case 'hesitation':
      return 'Accompagnement en douceur';
    default:
      return isConnected ? 'A votre service' : 'Comprehension en cours';
  }
}

function computeSuggestedAction(intent: string | null, turnCount: number, hasProfiles: boolean): SuggestedAction | null {
  if (turnCount === 0) return null;
  if (intent === 'offer') return { type: 'build_presence' };
  if (intent === 'need' || intent === 'urgency') {
    if (hasProfiles) return { type: 'show_profiles', count: 4 };
    return { type: 'ask', question: 'Zone geographique ?' };
  }
  if (intent === 'discovery') return { type: 'explore_feed' };
  return null;
}

// ── View selection logic ──────────────────────────────────────────────

function selectView(
  intent: string | null,
  turnCount: number,
  hasProfiles: boolean,
  hasPresence: boolean,
  hasSituation: boolean,
  isConnected: boolean,
  knownUser: boolean,
  isBuilding: boolean,
): AIView {
  if (turnCount === 0) {
    if (isConnected && knownUser) return 'memory-resume';
    return 'welcome';
  }
  if (isBuilding) return 'understanding';
  if (hasPresence) return 'presence-preview';
  if (hasSituation && hasProfiles) return 'matching';
  if (hasSituation) return 'situation-preview';
  if (hasProfiles) return 'matching';
  if (intent === 'discovery' || intent === 'hesitation') return 'feed-explore';
  return 'understanding';
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════

export default function WorkspaceOverlay({ onClose, onJoinNetwork }: Props) {
  const { isConnected } = useUserMode();
  const { profile: visitorProfile, recordTextInput, recordInteraction } = useVisitorProfile();
  const knownUser = useKnownUserContext();
  const { computeFromText } = useInitialHypotheses();

  // ── AI Browser state ────────────────────────────────────────────────
  const [browserState, setBrowserState] = useState<AIBrowserState>({
    activeView: (isConnected && knownUser) ? 'memory-resume' : 'welcome',
    contextSummary: {
      intent: null,
      intentLabel: '',
      territory: null,
      keywords: [],
      urgency: 0,
      clarityLevel: 'low',
      nextStep: 'En attente',
    },
    matchedProfiles: [],
    presenceDraft: null,
    situationDraft: null,
    suggestedAction: null,
    confidence: 0,
    turnCount: 0,
  });
  const [isBuilding, setIsBuilding] = useState(false);

  // ── Voice panel state ───────────────────────────────────────────────
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
  const sendTranscriptRef = useRef<(text: string) => Promise<void>>(async () => {});
  const startRetriesRef = useRef(0);

  useEffect(() => { historyRef.current = history; }, [history]);

  // Animate waveform
  useEffect(() => {
    let id: number;
    function frame() { setTick(t => t + 1); id = requestAnimationFrame(frame); }
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, []);

  // Cleanup is handled in the voice init effect's return function

  // ── Voice helpers ───────────────────────────────────────────────────
  const addTurn = useCallback((role: 'user' | 'assistant', content: string) => {
    setHistory(h => [...h, { role, content, id: `${role}_${Date.now()}_${Math.random()}` }]);
  }, []);

  const playTTS = useCallback(async (text: string): Promise<void> => {
    if (muted) return;
    try {
      const ctx = audioCtxRef.current;
      if (!ctx || ctx.state === 'closed') return;
      if (ctx.state === 'suspended') {
        await ctx.resume();
        if (ctx.state !== 'running') return;
      }
      const res = await fetch(TTS_URL, {
        method: 'POST',
        headers: { ...API_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice_id: "3xmA3rwGMRsLGbkC7E3u" }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return;
      const arrayBuf = await res.arrayBuffer();
      if (arrayBuf.byteLength === 0) return;
      const audioBuffer = await ctx.decodeAudioData(arrayBuf);
      const maxDuration = Math.min((audioBuffer.duration + 2) * 1000, 30000);
      await new Promise<void>((resolve) => {
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        audioRef.current = source;
        const timeout = setTimeout(() => {
          try { source.stop(); } catch {}
          audioRef.current = null;
          resolve();
        }, maxDuration);
        source.onended = () => {
          clearTimeout(timeout);
          audioRef.current = null;
          resolve();
        };
        source.start(0);
      });
    } catch {}
  }, [muted]);

  // ── AI Browser processing ──────────────────────────────────────────
  const processUserInput = useCallback((text: string) => {
    recordTextInput(text);
    recordInteraction();
    setIsBuilding(true);

    const hypotheses = computeFromText(text, visitorProfile);
    const kws = extractKeywords(text);
    const territoryMatch = text.match(/(?:à|de|près de|sur|zone|secteur|quartier)\s+([A-ZÀ-Ú][a-zà-ü]+(?:[\s-][A-ZÀ-Ú]?[a-zà-ü]+)*)/);
    const territory = territoryMatch?.[1] || hypotheses.territorialNeed || null;

    buildContextHintsFromConversation(
      [...(visitorProfile?.signals.textInputs || []), text],
      hypotheses,
      visitorProfile
    );

    const newTurnCount = browserState.turnCount + 1;
    const intent = hypotheses.probableIntent;
    const confidence = hypotheses.intentConfidence;

    // Immediately update understanding view
    const contextSummary: ContextSummary = {
      intent,
      intentLabel: intentToLabel(intent),
      territory,
      keywords: [...new Set([...browserState.contextSummary.keywords, ...kws])].slice(-8),
      urgency: hypotheses.urgencyLevel,
      clarityLevel: clarityFromConfidence(confidence),
      nextStep: computeNextStep(intent, newTurnCount, isConnected),
    };

    setBrowserState(prev => ({
      ...prev,
      activeView: 'understanding',
      contextSummary,
      confidence,
      turnCount: newTurnCount,
      matchedProfiles: [],
      presenceDraft: null,
      situationDraft: null,
      suggestedAction: null,
    }));

    // After delay, resolve to final view
    setTimeout(() => {
      let profiles: MockProfile[] = [];
      let presenceDraft: PresenceDraft | null = null;
      let situationDraft: SituationDraft | null = null;

      if (intent === 'offer') {
        presenceDraft = generatePresenceDraft(text);
        if (territory) presenceDraft.territory = territory;
      } else if (intent === 'discovery' || intent === 'hesitation') {
        // No specific draft
      } else {
        profiles = matchProfiles(text);
        situationDraft = {
          title: `Recherche : ${kws.slice(0, 3).join(', ') || text.slice(0, 40)}`,
          summary: territory ? `Zone ${territory}` : 'Zone a preciser',
          territory: territory || undefined,
          urgency: hypotheses.urgencyLevel,
          keywords: kws,
        };
      }

      const hasProfiles = profiles.length > 0;
      const hasPresence = presenceDraft !== null;
      const hasSituation = situationDraft !== null;

      const activeView = selectView(
        intent, newTurnCount, hasProfiles, hasPresence, hasSituation,
        isConnected, !!knownUser, false
      );

      const suggestedAction = computeSuggestedAction(intent, newTurnCount, hasProfiles);

      setBrowserState(prev => ({
        ...prev,
        activeView,
        matchedProfiles: profiles,
        presenceDraft,
        situationDraft,
        suggestedAction,
      }));

      setIsBuilding(false);
    }, 1200);
  }, [computeFromText, visitorProfile, recordTextInput, recordInteraction, browserState.turnCount, browserState.contextSummary.keywords, isConnected, knownUser]);

  // ── Send transcript (voice or text) ────────────────────────────────
  const sendToAPI = useCallback(async (text: string) => {
    addTurn('user', text);
    processUserInput(text);

    try {
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { ...API_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyRef.current.slice(-8).map(t => ({ role: t.role, content: t.content })),
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const data = await res.json() as { reply?: string };
      const reply = data.reply || 'Je suis la.';
      addTurn('assistant', reply);
      setVoiceState('speaking');
      await playTTS(reply);
    } catch {
      addTurn('assistant', 'Je suis la. Dis-moi.');
    } finally {
      setVoiceState('idle');
    }
  }, [addTurn, playTTS, processUserInput]);

  const sendTranscript = useCallback(async (text: string) => {
    if (!text.trim() || processingRef.current) return;
    processingRef.current = true;
    setVoiceState('processing');
    try {
      await sendToAPI(text.trim());
    } finally {
      processingRef.current = false;
    }
  }, [sendToAPI]);

  // Keep ref in sync so recognition handler always uses latest
  sendTranscriptRef.current = sendTranscript;

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

    let handledFinal = false;

    recognition.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal && !handledFinal) {
          const transcript = e.results[i][0].transcript.trim();
          if (transcript.length > 1) {
            handledFinal = true;
            isListening.current = false;
            try { recognition.stop(); } catch {}
            recognitionRef.current = null;
            sendTranscriptRef.current(transcript).then(() => {
              if (streamRef.current && !processingRef.current) beginListening();
            });
          }
        }
      }
    };

    recognition.onend = () => {
      if (handledFinal) return;
      if (isListening.current && !processingRef.current && streamRef.current) {
        recognitionRef.current = null;
        setTimeout(() => beginListening(), 100);
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
      } else {
        setTimeout(() => {
          if (streamRef.current && !processingRef.current) beginListening();
        }, 500);
      }
    };

    recognitionRef.current = recognition;
    isListening.current = true;
    silenceStart.current = Date.now();
    speechStart.current = 0;
    setVoiceState('listening');
    try {
      recognition.start();
      startRetriesRef.current = 0;
    } catch {
      isListening.current = false;
      recognitionRef.current = null;
      startRetriesRef.current++;
      if (streamRef.current && startRetriesRef.current < 5) {
        setTimeout(() => {
          if (streamRef.current && !processingRef.current) beginListening();
        }, 800);
      } else {
        setVoiceState('paused');
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, []);

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
    let cancelled = false;

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

      if (cancelled) {
        stream?.getTracks().forEach(t => t.stop());
        return;
      }

      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext();
      }
      audioCtxRef.current.resume().catch(() => {});

      if (!stream) {
        setMicBlocked(true);
        setVoiceState('paused');
        setTimeout(() => inputRef.current?.focus(), 200);
      } else {
        streamRef.current = stream;
        startMonitoring();
      }

      if (cancelled) return;

      // Generate greeting
      let greetText: string;
      if (isConnected && knownUser) {
        const g = generateKnownUserGreeting(knownUser);
        greetText = g.message;
      } else if (visitorProfile) {
        const g = generateVisitorGreeting(visitorProfile);
        greetText = g.message;
      } else {
        greetText = 'Bonjour. Je suis Ali, l\'assistant virtuel de Renovec. Parlez-moi de votre situation, je peux deja comprendre et vous orienter.';
      }

      addTurn('assistant', greetText);
      setVoiceState('speaking');
      await playTTS(greetText);
      if (cancelled) return;
      if (streamRef.current) {
        beginListening();
      } else {
        setVoiceState('paused');
        setTimeout(() => inputRef.current?.focus(), 200);
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      try { audioRef.current?.stop(); } catch {}
      audioRef.current = null;
      try { recognitionRef.current?.abort(); } catch {}
      recognitionRef.current = null;
      isListening.current = false;
      if (audioCtxRef.current?.state !== 'closed') audioCtxRef.current?.close();
      audioCtxRef.current = null;
      if (monitorCtxRef.current?.state !== 'closed') monitorCtxRef.current?.close();
      monitorCtxRef.current = null;
      cancelAnimationFrame(rafRef.current);
    };
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

  // Text submit
  const handleTextSubmit = useCallback(async () => {
    const msg = textInput.trim();
    if (!msg || thinking) return;
    setTextInput('');
    setThinking(true);

    isListening.current = false;
    try { recognitionRef.current?.abort(); } catch {};
    recognitionRef.current = null;

    await sendToAPI(msg);
    setThinking(false);
    if (streamRef.current) beginListening();
  }, [textInput, thinking, sendToAPI, beginListening]);

  // Amplitude visual
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

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════

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

      {/* Context bar */}
      {browserState.turnCount > 0 && (
        <ContextBar context={browserState.contextSummary} />
      )}

      {/* Main workspace: Rail + Browser */}
      <div className="ai-workspace">
        {/* Conversation rail */}
        <ConversationRail history={history} />

        {/* AI Browser surface */}
        <AIBrowserSurface
          state={browserState}
          isConnected={isConnected}
          isBuilding={isBuilding}
          userName={knownUser?.prenom}
          onJoinNetwork={onJoinNetwork}
        />
      </div>

      {/* Voice controls */}
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
              {voiceState === 'user_speaking' ? 'ecoute...'
                : isSpeaking ? 'parle...'
                : isProcessing ? 'reflechit...'
                : isPaused ? 'en pause'
                : isActive ? 'a l\'ecoute' : ''}
            </span>
          </div>
          <div className="ai-bubble-actions">
            <button className="ai-bubble-icon-btn" onClick={handleMute} title={muted ? 'Reactiver' : 'Couper le son'}>
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
                {isProcessing ? 'Traitement...' : isPaused ? 'Reprendre' : 'A l\'ecoute'}
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
            placeholder="Ou ecrivez..."
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