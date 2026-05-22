import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, ArrowUp, Loader, X } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionAny = any;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const CHAT_URL = `${SUPABASE_URL}/functions/v1/voice-welcome`;
const TTS_URL = `${SUPABASE_URL}/functions/v1/tts-elevenlabs`;
const API_HEADERS = {
  'Authorization': `Bearer ${SUPABASE_ANON}`,
  'Apikey': SUPABASE_ANON,
};

type VoiceState = 'idle' | 'listening' | 'user_speaking' | 'processing' | 'speaking';

interface Turn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type Props = {
  onActivityChange: (level: number) => void;
};

const SILENCE_THRESHOLD = 0.015;

function getSpeechRecognition(): (new () => SpeechRecognitionAny) | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function ConversationCapsule({ onActivityChange }: Props) {
  const [open, setOpen] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [history, setHistory] = useState<Turn[]>([]);
  const [textInput, setTextInput] = useState('');
  const [amplitude, setAmplitude] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [muted] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const monitorCtxRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<AudioBufferSourceNode | null>(null);
  const recognitionRef = useRef<SpeechRecognitionAny | null>(null);
  const isListeningRef = useRef(false);
  const processingRef = useRef(false);
  const rafRef = useRef(0);
  const historyRef = useRef<Turn[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);

  useEffect(() => {
    if (voiceState === 'user_speaking') onActivityChange(0.9);
    else if (voiceState === 'processing') onActivityChange(0.5);
    else if (voiceState === 'speaking') onActivityChange(0.6);
    else if (voiceState === 'listening') onActivityChange(0.25);
    else onActivityChange(thinking ? 0.4 : 0.05);
  }, [voiceState, thinking, onActivityChange]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    try { audioRef.current?.stop(); } catch {}
    try { recognitionRef.current?.abort(); } catch {}
    if (audioCtxRef.current?.state !== 'closed') audioCtxRef.current?.close();
    if (monitorCtxRef.current?.state !== 'closed') monitorCtxRef.current?.close();
    cancelAnimationFrame(rafRef.current);
  }, []);

  const addTurn = useCallback((role: 'user' | 'assistant', content: string) => {
    setHistory(h => [...h, { id: `${role}_${Date.now()}_${Math.random()}`, role, content }]);
  }, []);

  const playTTS = useCallback(async (text: string) => {
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
      const buf = await res.arrayBuffer();
      if (!buf.byteLength) return;
      const audioBuf = await ctx.decodeAudioData(buf);
      await new Promise<void>(resolve => {
        const source = ctx.createBufferSource();
        source.buffer = audioBuf;
        source.connect(ctx.destination);
        audioRef.current = source;
        source.onended = () => { audioRef.current = null; resolve(); };
        source.start(0);
      });
    } catch {}
  }, [muted]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || processingRef.current) return;
    processingRef.current = true;
    setVoiceState('processing');
    setThinking(true);
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
      addTurn('assistant', 'Je reste disponible.');
    } finally {
      processingRef.current = false;
      setThinking(false);
      setVoiceState(streamRef.current ? 'listening' : 'idle');
    }
  }, [addTurn, playTTS]);

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

  const beginListening = useCallback(() => {
    if (processingRef.current) return;
    try { recognitionRef.current?.abort(); } catch {}

    const Ctor = getSpeechRecognition();
    if (!Ctor) return;

    const rec = new Ctor();
    rec.lang = 'fr-FR';
    rec.continuous = true;
    rec.interimResults = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const transcript = e.results[i][0].transcript.trim();
          if (transcript.length > 1) {
            isListeningRef.current = false;
            try { rec.stop(); } catch {}
            sendMessage(transcript).then(() => {
              if (streamRef.current && !processingRef.current) beginListening();
            });
          }
        }
      }
    };

    rec.onend = () => {
      if (isListeningRef.current && !processingRef.current && streamRef.current) {
        try { rec.start(); } catch {}
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      isListeningRef.current = false;
    };

    recognitionRef.current = rec;
    isListeningRef.current = true;
    setVoiceState('listening');
    try { rec.start(); } catch {}
  }, [sendMessage]);

  const toggleVoice = useCallback(async () => {
    if (voiceState !== 'idle') {
      isListeningRef.current = false;
      try { recognitionRef.current?.abort(); } catch {}
      recognitionRef.current = null;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      try { audioRef.current?.stop(); } catch {}
      cancelAnimationFrame(rafRef.current);
      if (monitorCtxRef.current?.state !== 'closed') monitorCtxRef.current?.close();
      setVoiceState('idle');
      setAmplitude(0);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioContext();
      }
      audioCtxRef.current.resume().catch(() => {});
      startMonitoring();

      if (history.length === 0) {
        const greeting = 'Dis-moi ce qui t\'amène.';
        addTurn('assistant', greeting);
        setVoiceState('speaking');
        await playTTS(greeting);
      }
      beginListening();
    } catch {
      setVoiceState('idle');
    }
  }, [voiceState, history.length, startMonitoring, addTurn, playTTS, beginListening]);

  useEffect(() => {
    if (voiceState === 'listening' && amplitude > SILENCE_THRESHOLD * 2.5) setVoiceState('user_speaking');
    else if (voiceState === 'user_speaking' && amplitude <= SILENCE_THRESHOLD * 0.8) setVoiceState('listening');
  }, [amplitude, voiceState]);

  const handleTextSubmit = () => {
    const msg = textInput.trim();
    if (!msg || thinking) return;
    setTextInput('');
    sendMessage(msg).then(() => {
      if (streamRef.current && !processingRef.current) beginListening();
    });
  };

  const handleOpen = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  const handleClose = () => {
    setOpen(false);
    if (voiceState !== 'idle') {
      isListeningRef.current = false;
      try { recognitionRef.current?.abort(); } catch {}
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      cancelAnimationFrame(rafRef.current);
      if (monitorCtxRef.current?.state !== 'closed') monitorCtxRef.current?.close();
      setVoiceState('idle');
      setAmplitude(0);
    }
  };

  const isVoiceActive = voiceState !== 'idle';

  // Waveform
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isVoiceActive && !open) return;
    let id: number;
    function frame() { setTick(t => t + 1); id = requestAnimationFrame(frame); }
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [isVoiceActive, open]);

  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

  // Organic ring animation for collapsed state
  const breathe = Math.sin(now / 2000) * 0.15 + 1;
  const ringPulse = Math.sin(now / 1200) * 0.4 + 0.6;

  // Voice bar heights
  const bars = 5;
  const barHeights = Array.from({ length: bars }, (_, i) => {
    const wave = Math.sin(now / 220 + i * 1.1) * 0.3 + 0.5;
    const amp = Math.min(1, amplitude * 12);
    if (voiceState === 'user_speaking') return 5 + amp * 18 + wave * 4;
    if (voiceState === 'speaking') return 4 + Math.sin(now / 160 + i * 0.8) * 8 + 6;
    if (voiceState === 'processing') return 3 + Math.sin(now / 350 + i) * 2.5 + 2;
    if (voiceState === 'listening') return 2.5 + wave * 2.5;
    return 2;
  });

  const stateLabel = voiceState === 'user_speaking' ? 'Écoute...'
    : voiceState === 'speaking' ? 'Parle...'
    : voiceState === 'processing' ? 'Réfléchit...'
    : voiceState === 'listening' ? 'À l\'écoute'
    : '';

  const stateColor = voiceState === 'user_speaking' ? '#F26522'
    : voiceState === 'speaking' ? '#5ab478'
    : voiceState === 'processing' ? '#c8a85a'
    : voiceState === 'listening' ? '#5ab478'
    : 'rgba(255,255,255,0.3)';

  // ─── COLLAPSED: iconic presence ────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="group relative flex flex-col items-center gap-3 focus:outline-none"
      >
        {/* Outer breathing ring */}
        <div
          className="absolute rounded-full border border-white/[0.04] pointer-events-none"
          style={{
            width: 96 * breathe,
            height: 96 * breathe,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: ringPulse * 0.4,
          }}
        />
        <div
          className="absolute rounded-full border border-white/[0.03] pointer-events-none"
          style={{
            width: 130 * breathe,
            height: 130 * breathe,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: ringPulse * 0.2,
          }}
        />

        {/* Core orb */}
        <div className="relative w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
          {/* Glow */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(242,101,34,${0.12 + ringPulse * 0.06}) 0%, rgba(200,140,60,0.03) 60%, transparent 100%)`,
            }}
          />
          {/* Glass surface */}
          <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.08] backdrop-blur-sm" />
          {/* Icon */}
          <Mic size={20} className="relative z-10 text-white/50 group-hover:text-white/75 transition-colors" />
        </div>

        {/* Label */}
        <span className="text-[11px] font-medium text-white/30 group-hover:text-white/55 transition-colors tracking-wide">
          Parler à RENOVEC
        </span>
      </button>
    );
  }

  // ─── EXPANDED: organic conversation ────────────────────────────────
  return (
    <div className="w-full max-w-[400px] animate-fade-up">
      <div className="rounded-[28px] bg-stone-950/85 border border-white/[0.06] backdrop-blur-2xl shadow-2xl shadow-black/50 overflow-hidden">

        {/* ── Top: status + close ── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-3">
            {/* Live dot */}
            <div className="relative">
              <div
                className="w-2.5 h-2.5 rounded-full transition-colors duration-300"
                style={{ backgroundColor: stateColor }}
              />
              {isVoiceActive && (
                <div
                  className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping"
                  style={{ backgroundColor: stateColor, opacity: 0.3 }}
                />
              )}
            </div>
            <span className="text-[11px] font-semibold text-white/50 tracking-tight">RENOVEC</span>
            {stateLabel && (
              <span className="text-[10px] text-white/20 font-medium">{stateLabel}</span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-white/15 hover:text-white/40 hover:bg-white/[0.04] transition-all"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Waveform: visible when voice active ── */}
        {isVoiceActive && (
          <div className="flex items-center justify-center gap-[3px] h-8 px-5">
            {barHeights.map((h, i) => (
              <div
                key={i}
                className="rounded-full"
                style={{
                  width: 3.5,
                  height: h,
                  background: voiceState === 'user_speaking'
                    ? `rgba(242,101,34,${Math.min(1, 0.5 + amplitude * 4)})`
                    : voiceState === 'speaking'
                    ? 'rgba(90,180,120,0.55)'
                    : voiceState === 'processing'
                    ? 'rgba(200,168,90,0.35)'
                    : 'rgba(255,255,255,0.08)',
                  transition: 'background 0.15s',
                }}
              />
            ))}
          </div>
        )}

        {/* ── Conversation ── */}
        <div className="max-h-[220px] overflow-y-auto px-5 py-3 space-y-2.5 scrollbar-hide">
          {history.length === 0 && (
            <p className="text-[12px] text-white/15 text-center py-6 leading-relaxed">
              Décrivez votre situation.
            </p>
          )}
          {history.map(turn => (
            <div key={turn.id} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-[1.65] ${
                turn.role === 'user'
                  ? 'bg-white/[0.06] text-white/80 rounded-br-md'
                  : 'text-white/50 rounded-bl-md'
              }`}>
                {turn.content}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex justify-start">
              <div className="flex gap-1 px-3 py-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white/15 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/15 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/15 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* ── Unified input: mic + text fused ── */}
        <div className="px-4 pb-4 pt-1">
          <div className="flex items-center gap-0 bg-white/[0.025] border border-white/[0.06] rounded-2xl overflow-hidden transition-all focus-within:border-white/[0.1] focus-within:bg-white/[0.035]">
            {/* Mic button */}
            <button
              onClick={toggleVoice}
              className={`flex-shrink-0 w-10 h-10 flex items-center justify-center transition-all ${
                isVoiceActive
                  ? 'text-[#F26522]'
                  : 'text-white/20 hover:text-white/50'
              }`}
            >
              <div className="relative">
                <Mic size={15} />
                {isVoiceActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#F26522] animate-pulse" />
                )}
              </div>
            </button>

            {/* Text input */}
            <input
              ref={inputRef}
              type="text"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
              placeholder={isVoiceActive ? 'Parlez ou écrivez...' : 'Décrivez votre situation...'}
              disabled={thinking}
              className="flex-1 bg-transparent py-2.5 text-[13px] text-white/75 placeholder-white/15 focus:outline-none"
            />

            {/* Send */}
            <button
              onClick={handleTextSubmit}
              disabled={!textInput.trim() || thinking}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-white/15 hover:text-white/50 disabled:opacity-20 transition-colors mr-0.5"
            >
              {thinking ? <Loader size={13} className="animate-spin" /> : <ArrowUp size={13} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
