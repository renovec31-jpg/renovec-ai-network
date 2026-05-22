import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, X, Send, Loader, Radio, Volume2, VolumeX, MicOff, Settings, RotateCcw, ChevronRight } from 'lucide-react';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const CHAT_URL = `${SUPABASE_URL}/functions/v1/voice-welcome`;
const TTS_URL  = `${SUPABASE_URL}/functions/v1/tts-elevenlabs`;
const API_HEADERS = {
  'Authorization': `Bearer ${SUPABASE_ANON}`,
  'Apikey': SUPABASE_ANON,
};

type UIState =
  | 'closed'
  | 'opening'
  | 'listening'
  | 'user_speaking'
  | 'processing'
  | 'speaking'
  | 'paused';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

const SILENCE_THRESHOLD = 0.015;
const SILENCE_DURATION_MS = 1400;

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function VoicePresence() {
  const [panelOpen, setPanelOpen]       = useState(false);
  const [uiState, setUiState]           = useState<UIState>('closed');
  const [history, setHistory]           = useState<Turn[]>([]);
  const [textInput, setTextInput]       = useState('');
  const [thinking, setThinking]         = useState(false);
  const [muted, setMuted]               = useState(false);
  const [amplitude, setAmplitude]       = useState(0);
  const [micBlocked, setMicBlocked]     = useState(false);
  const [showSafariHelp, setShowSafariHelp] = useState(false);
  const [, setTick]                     = useState(0);

  const streamRef      = useRef<MediaStream | null>(null);
  const audioRef       = useRef<AudioBufferSourceNode | null>(null);
  const chatEndRef     = useRef<HTMLDivElement | null>(null);
  const inputRef       = useRef<HTMLInputElement | null>(null);
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const monitorCtxRef  = useRef<AudioContext | null>(null);
  const rafRef         = useRef<number>(0);
  const silenceStart   = useRef<number>(0);
  const speechStart    = useRef<number>(0);
  const isListening    = useRef(false);
  const abortRef       = useRef<AbortController | null>(null);
  const historyRef     = useRef<Turn[]>([]);
  const processingRef  = useRef(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => { historyRef.current = history; }, [history]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, uiState]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    try { audioRef.current?.stop(); } catch {}
    try { recognitionRef.current?.abort(); } catch {}
    if (audioCtxRef.current?.state !== 'closed') audioCtxRef.current?.close();
    if (monitorCtxRef.current?.state !== 'closed') monitorCtxRef.current?.close();
    cancelAnimationFrame(rafRef.current);
  }, []);

  // Animation frame for waveform
  useEffect(() => {
    if (!panelOpen) return;
    let id: number;
    function frame() { setTick(t => t + 1); id = requestAnimationFrame(frame); }
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [panelOpen]);

  const addTurn = useCallback((role: 'user' | 'assistant', content: string) => {
    setHistory(h => [...h, { role, content, id: `${role}_${Date.now()}_${Math.random()}` }]);
  }, []);

  // Play TTS audio via AudioContext (bypasses Android/iOS autoplay block on HTMLAudioElement)
  const playTTS = useCallback(async (text: string): Promise<void> => {
    if (muted) return;
    try {
      // Ensure AudioContext is running (may have been suspended on iOS between interactions)
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

      // decodeAudioData works on all mobile browsers without autoplay restrictions
      const audioBuffer = await ctx.decodeAudioData(arrayBuf);

      await new Promise<void>((resolve) => {
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        audioRef.current = source;
        source.onended = () => {
          audioRef.current = null;
          resolve();
        };
        source.start(0);
      });
    } catch {
      // TTS failure is non-fatal
    }
  }, [muted]);

  // --- Send transcript text to get Claude reply ---
  const sendTranscript = useCallback(async (text: string) => {
    if (!text.trim() || processingRef.current) return;
    processingRef.current = true;
    setUiState('processing');
    addTurn('user', text.trim());

    try {
      abortRef.current = new AbortController();
      const res = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { ...API_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: historyRef.current.slice(-8).map(t => ({ role: t.role, content: t.content })),
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`http_${res.status}`);
      const data = await res.json() as { reply?: string };
      const reply = data.reply || 'Je suis là.';

      addTurn('assistant', reply);
      setUiState('speaking');
      await playTTS(reply);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    } finally {
      processingRef.current = false;
    }
  }, [addTurn, playTTS]);

  // --- Begin continuous listening via Web Speech API ---
  const beginListening = useCallback(() => {
    if (processingRef.current) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setUiState('paused');
      return;
    }

    const recognition = new Ctor();
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (e) => {
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

    recognition.onerror = (e) => {
      if (e.error === 'no-speech') return;
      if (e.error === 'aborted') return;
      isListening.current = false;
      recognitionRef.current = null;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setMicBlocked(true);
        setUiState('paused');
        addTurn('assistant', 'Micro non autorisé. Écris ta question ci-dessous.');
        setTimeout(() => inputRef.current?.focus(), 100);
      } else if (e.error === 'audio-capture') {
        setMicBlocked(true);
        setUiState('paused');
        addTurn('assistant', 'Micro indisponible. Écris ta question ci-dessous.');
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };

    recognitionRef.current = recognition;
    isListening.current = true;
    silenceStart.current = Date.now();
    speechStart.current = 0;
    setUiState('listening');

    try { recognition.start(); } catch {}
  }, [sendTranscript, addTurn]);

  // --- Audio level monitoring (visual waveform only) ---
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
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      setAmplitude(rms);

      if (isListening.current) {
        const now = Date.now();
        if (rms > SILENCE_THRESHOLD) {
          silenceStart.current = now;
          if (!speechStart.current) speechStart.current = now;
        } else if (speechStart.current && now - silenceStart.current > SILENCE_DURATION_MS) {
          speechStart.current = 0;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }
    tick();
  }, []);

  // --- Open voice chat ---
  const handleOpen = useCallback(async () => {
    const isSafariBrowser = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    // getUserMedia MUST be the very first async call inside a user gesture.
    // Safari invalidates the gesture token after any state update or await.
    let stream: MediaStream | null = null;

    if (navigator.mediaDevices?.getUserMedia) {
      try {
        // Call synchronously before any setState / AudioContext
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch (err) {
        const name = (err as Error).name;
        console.error('[VoicePresence] getUserMedia error:', name, (err as Error).message);
        if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch {
            stream = null;
          }
        }
      }
    }

    // Now safe to update UI state
    setPanelOpen(true);
    setUiState('opening');
    setHistory([]);

    // Unlock AudioContext (safe here, still within the gesture call stack on most browsers)
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext();
    }
    audioCtxRef.current.resume().catch(() => {});

    if (!stream) {
      isListening.current = false;
      setMicBlocked(true);
      setUiState('paused');
      if (isSafariBrowser) {
        setShowSafariHelp(true);
      } else {
        addTurn('assistant', 'Micro non autorisé. Autorise-le dans les réglages de ton navigateur ou écris ci-dessous.');
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      return;
    }

    streamRef.current = stream;
    startMonitoring();

    const greeting = 'Salut. Dis-moi ce qui t\'amène.';
    addTurn('assistant', greeting);
    setUiState('speaking');
    await playTTS(greeting);
    beginListening();
  }, [startMonitoring, addTurn, playTTS, beginListening]);

  // --- Close ---
  const handleClose = useCallback(() => {
    isListening.current = false;
    processingRef.current = false;
    try { recognitionRef.current?.abort(); } catch {}
    recognitionRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    try { audioRef.current?.stop(); } catch {}
    audioRef.current = null;
    cancelAnimationFrame(rafRef.current);
    if (audioCtxRef.current?.state !== 'closed') audioCtxRef.current?.close();
    audioCtxRef.current = null;
    if (monitorCtxRef.current?.state !== 'closed') monitorCtxRef.current?.close();
    monitorCtxRef.current = null;
    abortRef.current?.abort();
    setPanelOpen(false);
    setUiState('closed');
    setHistory([]);
    setTextInput('');
    setAmplitude(0);
    setMicBlocked(false);
  }, []);

  // --- Interrupt TTS and resume listening ---
  const interruptAndListen = useCallback(() => {
    try { audioRef.current?.stop(); } catch {}
    audioRef.current = null;
    processingRef.current = false;
    beginListening();
  }, [beginListening]);

  // --- Pause / Resume ---
  const togglePause = useCallback(() => {
    if (uiState === 'paused') {
      beginListening();
    } else if (uiState === 'listening' || uiState === 'user_speaking') {
      isListening.current = false;
      try { recognitionRef.current?.abort(); } catch {}
      recognitionRef.current = null;
      setUiState('paused');
    }
  }, [uiState, beginListening]);

  // --- Mute ---
  const handleMute = useCallback(() => {
    setMuted(m => {
      const next = !m;
      if (next) {
        try { audioRef.current?.stop(); } catch {}
        audioRef.current = null;
      }
      return next;
    });
  }, []);

  // --- Text fallback ---
  const handleTextSubmit = useCallback(async () => {
    const msg = textInput.trim();
    if (!msg || thinking) return;
    setTextInput('');
    setThinking(true);
    addTurn('user', msg);

    isListening.current = false;
    try { recognitionRef.current?.abort(); } catch {}
    recognitionRef.current = null;

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
      setUiState('speaking');
      await playTTS(reply);
    } catch {
      addTurn('assistant', 'Dis-moi.');
    } finally {
      setThinking(false);
      if (streamRef.current) beginListening();
    }
  }, [textInput, thinking, addTurn, playTTS, beginListening]);

  // --- Amplitude → visual state ---
  useEffect(() => {
    if (uiState === 'listening' && amplitude > SILENCE_THRESHOLD * 2.5) {
      setUiState('user_speaking');
    } else if (uiState === 'user_speaking' && amplitude <= SILENCE_THRESHOLD * 0.8) {
      setUiState('listening');
    }
  }, [amplitude, uiState]);

  const isActive     = uiState === 'listening' || uiState === 'user_speaking';
  const isSpeaking   = uiState === 'speaking';
  const isProcessing = uiState === 'processing';
  const isPaused     = uiState === 'paused';

  // Waveform
  const bars = 7;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const barHeights = Array.from({ length: bars }, (_, i) => {
    const wave = Math.sin(now / 250 + i * 0.9) * 0.3 + 0.5;
    const amp = Math.min(1, amplitude * 10);
    if (uiState === 'user_speaking') return 6 + amp * 22 + wave * 4;
    if (isSpeaking) return 5 + Math.sin(now / 180 + i * 0.7) * 9 + 7;
    if (isProcessing) return 4 + Math.sin(now / 400 + i) * 3 + 3;
    if (isActive) return 3 + wave * 3;
    return 3;
  });

  return (
    <>
      {/* Safari mic permission guide */}
      {showSafariHelp && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: '0 0 env(safe-area-inset-bottom,0) 0',
          }}
          onClick={() => setShowSafariHelp(false)}
        >
          <div
            style={{
              background: '#111', borderRadius: '20px 20px 0 0',
              padding: '28px 24px 36px', width: '100%', maxWidth: 480,
              boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', margin: '0 auto 22px' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <MicOff size={20} style={{ color: '#F26522', flexShrink: 0 }} />
              <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 700, margin: 0 }}>
                Micro bloqué dans Safari
              </h2>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 26, lineHeight: 1.5 }}>
              Safari désactive le micro par défaut. Suis ces 3 étapes pour l'activer, puis reviens ici.
            </p>

            {/* Steps */}
            {[
              {
                num: 1,
                icon: <Settings size={16} />,
                title: 'Ouvre les Réglages iPhone',
                desc: "L'application grise avec roue crantée",
              },
              {
                num: 2,
                icon: <ChevronRight size={16} />,
                title: 'Apps → Safari → Microphone',
                desc: 'Cherche "Safari" dans la liste des apps, puis tape "Microphone"',
              },
              {
                num: 3,
                icon: <Mic size={16} />,
                title: 'Sélectionne "Demander" ou "Autoriser"',
                desc: 'Choisis "Demander" — Safari te demandera la prochaine fois',
              },
            ].map(step => (
              <div
                key={step.num}
                style={{
                  display: 'flex', gap: 14, marginBottom: 18,
                  padding: '14px 16px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'rgba(242,101,34,0.15)', border: '1px solid rgba(242,101,34,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#F26522', flexShrink: 0, fontSize: 13, fontWeight: 700,
                }}>
                  {step.num}
                </div>
                <div>
                  <div style={{ color: '#fff', fontSize: 14, fontWeight: 600, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>{step.icon}</span>
                    {step.title}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 1.45 }}>{step.desc}</div>
                </div>
              </div>
            ))}

            {/* Retry button */}
            <button
              onClick={() => { setShowSafariHelp(false); setMicBlocked(false); handleOpen(); }}
              style={{
                width: '100%', marginTop: 4, padding: '14px 0',
                borderRadius: 12, border: 'none', cursor: 'pointer',
                background: '#F26522', color: '#fff',
                fontSize: 15, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <RotateCcw size={15} />
              J'ai activé le micro — Réessayer
            </button>

            <button
              onClick={() => { setShowSafariHelp(false); setTimeout(() => inputRef.current?.focus(), 100); }}
              style={{
                width: '100%', marginTop: 10, padding: '12px 0',
                borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)',
                cursor: 'pointer', background: 'transparent',
                color: 'rgba(255,255,255,0.5)', fontSize: 14,
              }}
            >
              Utiliser le mode texte
            </button>
          </div>
        </div>
      )}

      {!panelOpen && (
        <button className="vp-trigger" onClick={handleOpen} aria-label="Parler avec RENOVEC">
          <div className="vp-trigger-ripple" />
          <div className="vp-trigger-icon"><Radio size={15} /></div>
          <span className="vp-trigger-label">Parler à RENOVEC</span>
        </button>
      )}

      {panelOpen && (
        <div className="vp-panel" role="dialog" aria-label="Conversation vocale RENOVEC">

          <div className="vp-header">
            <div className="vp-header-left">
              <div className={`vp-dot ${
                uiState === 'user_speaking' ? 'vp-dot--rec'
                : isSpeaking ? 'vp-dot--play'
                : isProcessing ? 'vp-dot--proc'
                : 'vp-dot--idle'
              }`} />
              <span className="vp-header-name">RENOVEC</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginLeft: 4, fontWeight: 400 }}>
                {uiState === 'user_speaking' ? 'écoute…'
                  : isSpeaking ? 'parle…'
                  : isProcessing ? 'réfléchit…'
                  : isPaused ? 'en pause'
                  : isActive ? 'à l\'écoute' : ''}
              </span>
            </div>
            <div className="vp-header-right">
              <button className={`vp-icon-btn ${muted ? 'vp-icon-btn--muted' : ''}`} onClick={handleMute} title={muted ? 'Réactiver' : 'Couper le son'}>
                {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <button className="vp-icon-btn" onClick={handleClose} title="Fermer"><X size={14} /></button>
            </div>
          </div>

          {/* Live waveform */}
          <div style={{ padding: '12px 14px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, height: 44, flexShrink: 0 }}>
            {barHeights.map((h, i) => (
              <div
                key={i}
                style={{
                  width: 3.5,
                  height: h,
                  borderRadius: 2,
                  background: uiState === 'user_speaking'
                    ? `rgba(242,101,34,${Math.min(1, 0.5 + amplitude * 3)})`
                    : isSpeaking
                    ? 'rgba(90,180,120,0.65)'
                    : isProcessing
                    ? 'rgba(200,168,90,0.4)'
                    : 'rgba(255,255,255,0.08)',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>

          {/* Conversation */}
          <div className="vp-chat">
            {history.map(turn => (
              <div key={turn.id} className={`vp-bubble vp-bubble--${turn.role}`}>
                {turn.content}
              </div>
            ))}
            {isProcessing && (
              <div className="vp-bubble vp-bubble--assistant vp-bubble--thinking">
                <span className="vp-dot-anim" style={{ animationDelay: '0s' }} />
                <span className="vp-dot-anim" style={{ animationDelay: '0.18s' }} />
                <span className="vp-dot-anim" style={{ animationDelay: '0.36s' }} />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Voice controls */}
          <div className="vp-voice-controls">
            {micBlocked ? (
              <div className="vp-ptt" style={{ cursor: 'default', opacity: 0.5 }}>
                <MicOff size={15} />
                <span>Mode texte</span>
              </div>
            ) : isSpeaking ? (
              <button className="vp-ptt vp-ptt--playing" onClick={interruptAndListen}>
                <Mic size={15} />
                <span>Interrompre</span>
              </button>
            ) : (
              <button
                className={`vp-ptt ${isActive ? 'vp-ptt--recording' : isPaused ? '' : 'vp-ptt--processing'}`}
                onClick={togglePause}
                disabled={isProcessing}
              >
                {isProcessing ? <Loader size={15} className="vp-spin" /> : isPaused ? <MicOff size={15} /> : <Mic size={15} />}
                <span>
                  {isProcessing ? 'Traitement…' : isPaused ? 'Reprendre la conversation' : 'À l\'écoute · tap pour pause'}
                </span>
              </button>
            )}
          </div>

          {/* Text input */}
          <div className="vp-controls">
            <input
              ref={inputRef}
              className="vp-text-input"
              type="text"
              placeholder="Ou écrivez…"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
              disabled={thinking}
              autoComplete="off"
            />
            <button
              className="vp-text-send"
              onClick={handleTextSubmit}
              disabled={!textInput.trim() || thinking}
              aria-label="Envoyer"
            >
              {thinking ? <Loader size={14} className="vp-spin" /> : <Send size={14} />}
            </button>
          </div>

          <div className="vp-footer">Conversation en direct · Réseau humain</div>
        </div>
      )}
    </>
  );
}
