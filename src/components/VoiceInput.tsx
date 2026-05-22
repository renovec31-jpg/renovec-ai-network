import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Loader, Square } from 'lucide-react';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const PTT_URL = `${SUPABASE_URL}/functions/v1/voice-ptt`;

type State = 'idle' | 'requesting' | 'recording' | 'processing';

type Props = {
  onTranscript: (text: string) => void;
  disabled?: boolean;
};

function bestMimeType(): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  for (const m of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) return m;
  }
  return '';
}

export default function VoiceInput({ onTranscript, disabled = false }: Props) {
  const [state, setState] = useState<State>('idle');
  const [secs, setSecs]   = useState(0);
  const streamRef   = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (state === 'recording') {
      setSecs(0);
      timerRef.current = setInterval(() => setSecs(s => s + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled || state !== 'idle') return;
    setState('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;
      chunksRef.current = [];

      const mime = bestMimeType();
      const rec  = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.start(100);
      recorderRef.current = rec;
      setState('recording');
    } catch {
      setState('idle');
    }
  }, [disabled, state]);

  const stopAndTranscribe = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || state !== 'recording') return;

    rec.onstop = async () => {
      const mime = rec.mimeType || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type: mime });
      chunksRef.current = [];

      // Release mic
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;

      if (blob.size < 1000) {
        setState('idle');
        return;
      }

      setState('processing');

      try {
        // Try Web Speech API first (free, faster)
        const transcript = await tryWebSpeech();
        if (transcript) {
          onTranscript(transcript);
          setState('idle');
          return;
        }
      } catch { /* fallback to server */ }

      try {
        const arrayBuf = await blob.arrayBuffer();
        const bytes    = new Uint8Array(arrayBuf);
        let binary     = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const b64 = btoa(binary);

        const res = await fetch(PTT_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON}`,
            'Apikey': SUPABASE_ANON,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ audio: b64, mimeType: mime, transcribe_only: true }),
          signal: AbortSignal.timeout(25000),
        });

        if (!res.ok) throw new Error(`http_${res.status}`);
        const data = await res.json() as { transcript?: string; error?: string };

        if (data.transcript?.trim()) {
          onTranscript(data.transcript.trim());
        }
      } catch {
        // Silently fail — user can retry or type
      }

      setState('idle');
    };

    rec.stop();
    recorderRef.current = null;
  }, [state, onTranscript]);

  const cancel = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    chunksRef.current = [];
    setState('idle');
  }, []);

  const isRecording  = state === 'recording';
  const isProcessing = state === 'processing';
  const isRequesting = state === 'requesting';
  const busy = isRecording || isProcessing || isRequesting;

  if (typeof MediaRecorder === 'undefined') return null;

  return (
    <div className="flex items-center gap-2">
      {isRecording && (
        <div className="flex items-center gap-2 animate-fade-in">
          <span className="text-xs text-red-400 font-medium tabular-nums">{secs}s</span>
          <button
            onClick={cancel}
            className="p-1.5 text-white/30 hover:text-white/60 transition-colors"
            title="Annuler"
          >
            <Square size={12} />
          </button>
        </div>
      )}

      <button
        onPointerDown={e => { e.preventDefault(); startRecording(); }}
        onPointerUp={stopAndTranscribe}
        onPointerLeave={() => { if (isRecording) stopAndTranscribe(); }}
        disabled={disabled || isProcessing || isRequesting}
        className={`relative p-2.5 rounded-xl transition-all ${
          isRecording
            ? 'bg-red-500/20 text-red-400 scale-110'
            : isProcessing
            ? 'bg-white/5 text-white/30'
            : 'text-white/30 hover:text-white/60 hover:bg-white/5'
        } disabled:opacity-20`}
        title={isRecording ? 'Relâcher pour transcrire' : 'Maintenir pour dicter'}
      >
        {isProcessing || isRequesting ? (
          <Loader size={16} className="animate-spin" />
        ) : (
          <Mic size={16} />
        )}
        {isRecording && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-400 animate-pulse" />
        )}
      </button>
    </div>
  );
}

function tryWebSpeech(): Promise<string> {
  return new Promise((resolve, reject) => {
    const SR = (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition });
    const Ctor = SR.SpeechRecognition || SR.webkitSpeechRecognition;
    if (!Ctor) { reject(new Error('unsupported')); return; }

    const rec = new Ctor();
    rec.lang = 'fr-FR';
    rec.continuous = false;
    rec.interimResults = false;

    let done = false;
    rec.onresult = e => { done = true; resolve(e.results[0][0].transcript); };
    rec.onerror = () => { if (!done) reject(new Error('error')); };
    rec.onend = () => { if (!done) reject(new Error('empty')); };
    setTimeout(() => { if (!done) { rec.stop(); reject(new Error('timeout')); } }, 6000);

    try { rec.start(); } catch (e) { reject(e); }
  });
}
