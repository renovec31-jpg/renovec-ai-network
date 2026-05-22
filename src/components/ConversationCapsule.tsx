import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, ArrowUp, Loader, X, ChevronDown } from 'lucide-react';

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
  const [expanded, setExpanded] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [history, setHistory] = useState<Turn[]>([]);
  const [textInput, setTextInput] = useState('');
  const [amplitude, setAmplitude] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [muted, setMuted] = useState(false);

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

  // Propagate activity to parent for neural canvas
  useEffect(() => {
    if (voiceState === 'user_speaking') onActivityChange(0.9);
    else if (voiceState === 'processing') onActivityChange(0.5);
    else if (voiceState === 'speaking') onActivityChange(0.6);
    else if (voiceState === 'listening') onActivityChange(0.2);
    else onActivityChange(thinking ? 0.4 : 0);
  }, [voiceState, thinking, onActivityChange]);

  // Cleanup
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
      setVoiceState('idle');
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
      // Stop
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

    // Start
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

  // Amplitude → visual state
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

  const isVoiceActive = voiceState !== 'idle';

  // Waveform bars
  const bars = 5;
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const barHeights = Array.from({ length: bars }, (_, i) => {
    const wave = Math.sin(now / 250 + i * 0.9) * 0.3 + 0.5;
    const amp = Math.min(1, amplitude * 10);
    if (voiceState === 'user_speaking') return 4 + amp * 16 + wave * 3;
    if (voiceState === 'speaking') return 4 + Math.sin(now / 180 + i * 0.7) * 7 + 5;
    if (voiceState === 'processing') return 3 + Math.sin(now / 400 + i) * 2 + 2;
    if (voiceState === 'listening') return 2 + wave * 2;
    return 2;
  });

  // Force re-render for waveform animation
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!isVoiceActive) return;
    let id: number;
    function frame() { setTick(t => t + 1); id = requestAnimationFrame(frame); }
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [isVoiceActive]);

  return (
    <div className={`transition-all duration-300 ease-out ${expanded ? 'w-full max-w-md' : ''}`}>
      {/* Collapsed: compact capsule */}
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="group relative flex items-center gap-3 px-5 py-3.5 rounded-full bg-white/[0.04] border border-white/[0.07] backdrop-blur-xl hover:bg-white/[0.07] hover:border-white/[0.12] transition-all duration-200 shadow-lg shadow-black/20"
        >
          {/* Breathing dot */}
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-25" />
          </div>
          <span className="text-[13px] font-medium text-white/60 group-hover:text-white/80 transition-colors whitespace-nowrap">
            Parler à RENOVEC
          </span>
          <Mic size={14} className="text-white/25 group-hover:text-white/50 transition-colors" />
        </button>
      ) : (
        /* Expanded: conversation panel */
        <div className="w-full max-w-md rounded-3xl bg-stone-950/80 border border-white/[0.06] backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden animate-fade-up">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.04]">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className={`w-2 h-2 rounded-full transition-colors ${
                  voiceState === 'user_speaking' ? 'bg-orange-400' :
                  voiceState === 'speaking' ? 'bg-emerald-400' :
                  voiceState === 'processing' ? 'bg-amber-400' :
                  voiceState === 'listening' ? 'bg-emerald-400' : 'bg-white/30'
                }`} />
                {isVoiceActive && (
                  <div className={`absolute inset-0 w-2 h-2 rounded-full animate-ping opacity-30 ${
                    voiceState === 'user_speaking' ? 'bg-orange-400' : 'bg-emerald-400'
                  }`} />
                )}
              </div>
              <span className="text-[12px] font-semibold text-white/60 tracking-tight">RENOVEC</span>
              <span className="text-[10px] text-white/20">
                {voiceState === 'user_speaking' ? 'écoute...' :
                 voiceState === 'speaking' ? 'parle...' :
                 voiceState === 'processing' ? 'réfléchit...' :
                 voiceState === 'listening' ? 'à l\'écoute' : ''}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {isVoiceActive && (
                <button onClick={() => setMuted(!muted)} className="p-1.5 text-white/20 hover:text-white/50 transition-colors">
                  {muted ? <MicOff size={12} /> : <Mic size={12} />}
                </button>
              )}
              <button onClick={() => { setExpanded(false); }} className="p-1.5 text-white/15 hover:text-white/40 transition-colors">
                <ChevronDown size={13} />
              </button>
            </div>
          </div>

          {/* Waveform — visible when voice active */}
          {isVoiceActive && (
            <div className="flex items-center justify-center gap-1 py-3 border-b border-white/[0.03]">
              {barHeights.map((h, i) => (
                <div
                  key={i}
                  className="rounded-full transition-[background] duration-200"
                  style={{
                    width: 3,
                    height: h,
                    background: voiceState === 'user_speaking'
                      ? `rgba(242,101,34,${Math.min(1, 0.5 + amplitude * 3)})`
                      : voiceState === 'speaking'
                      ? 'rgba(90,180,120,0.6)'
                      : voiceState === 'processing'
                      ? 'rgba(200,168,90,0.4)'
                      : 'rgba(255,255,255,0.1)',
                  }}
                />
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="max-h-[240px] overflow-y-auto px-5 py-4 space-y-3 scrollbar-hide">
            {history.length === 0 && !isVoiceActive && (
              <p className="text-[12px] text-white/20 text-center py-4 leading-relaxed">
                Décrivez votre situation — rénovation, artisan, urgence.<br />
                Voix ou texte, comme vous préférez.
              </p>
            )}
            {history.map(turn => (
              <div key={turn.id} className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-[1.6] ${
                  turn.role === 'user'
                    ? 'bg-white/[0.07] text-white/85 rounded-br-lg'
                    : 'bg-white/[0.02] border border-white/[0.05] text-white/60 rounded-bl-lg'
                }`}>
                  {turn.content}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl rounded-bl-lg px-3.5 py-2.5 flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <div className="px-4 pb-4 pt-2 flex items-center gap-2">
            {/* Voice toggle */}
            <button
              onClick={toggleVoice}
              className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                isVoiceActive
                  ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                  : 'bg-white/[0.04] text-white/30 border border-white/[0.06] hover:text-white/55 hover:border-white/[0.12]'
              }`}
            >
              {isVoiceActive ? <X size={14} /> : <Mic size={14} />}
            </button>

            {/* Text input */}
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
                placeholder="Ou écrivez ici..."
                disabled={thinking}
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3.5 py-2.5 pr-10 text-[13px] text-white/80 placeholder-white/15 focus:outline-none focus:border-white/[0.12] transition-all"
              />
              <button
                onClick={handleTextSubmit}
                disabled={!textInput.trim() || thinking}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-white/20 hover:text-white/50 disabled:opacity-20 transition-colors"
              >
                {thinking ? <Loader size={13} className="animate-spin" /> : <ArrowUp size={13} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
