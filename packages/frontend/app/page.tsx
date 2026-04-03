'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, MicOff, Volume2, VolumeX, Send, RotateCcw, Check,
  MapPin, Calendar, Wallet, Users, Loader2, CreditCard,
  Smartphone, Building2, ChevronRight, AlertCircle
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
type AppState = 'init' | 'greeting' | 'gathering' | 'itinerary' | 'payment';
interface ChatMessage { role: 'agent' | 'user'; text: string; }

/* ─────────────────────────────────────────────────────────────────────────────
   VOICE HOOK  (fixes: getVoices race, stale closures, cleanup on unmount)
───────────────────────────────────────────────────────────────────────────── */
function useVoiceBot() {
  const [isListening,   setIsListening]   = useState(false);
  const [isSpeaking,    setIsSpeaking]    = useState(false);
  const [transcript,    setTranscript]    = useState('');
  const [voiceEnabled,  setVoiceEnabled]  = useState(true);
  const [voiceError,    setVoiceError]    = useState('');

  // stable refs so callbacks never go stale
  const voiceEnabledRef  = useRef(voiceEnabled);
  const recognitionRef   = useRef<any>(null);
  const synthRef         = useRef<SpeechSynthesis | null>(null);
  const voicesRef        = useRef<SpeechSynthesisVoice[]>([]);
  const speechActiveRef  = useRef(false);
  const unmountedRef     = useRef(false);

  useEffect(() => { voiceEnabledRef.current = voiceEnabled; }, [voiceEnabled]);

  // pre-load voices
  useEffect(() => {
    if (typeof window === 'undefined') return;
    synthRef.current = window.speechSynthesis;
    function loadVoices() { voicesRef.current = synthRef.current!.getVoices(); }
    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      unmountedRef.current = true;
      speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      synthRef.current?.cancel();
      recognitionRef.current?.stop();
    };
  }, []);

  /* ── speak ── */
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!voiceEnabledRef.current || !synthRef.current) { onEnd?.(); return; }
    synthRef.current.cancel();
    speechActiveRef.current = true;

    const utter = new SpeechSynthesisUtterance(text);
    utter.lang  = 'en-IN';
    utter.rate  = 0.95;
    utter.pitch = 1.05;

    // pick best voice
    const voices = voicesRef.current.length ? voicesRef.current : speechSynthesis.getVoices();
    const pick =
      voices.find(v => /samantha|victoria|karen|zira|female/i.test(v.name) && /en/i.test(v.lang)) ||
      voices.find(v => /en[-_](GB|IN|AU)/i.test(v.lang)) ||
      voices.find(v => /en/i.test(v.lang));
    if (pick) utter.voice = pick;

    utter.onstart = () => { if (!unmountedRef.current) setIsSpeaking(true); };
    utter.onend   = () => {
      speechActiveRef.current = false;
      if (!unmountedRef.current) setIsSpeaking(false);
      if (!unmountedRef.current) onEnd?.();
    };
    utter.onerror = (e) => {
      speechActiveRef.current = false;
      if (!unmountedRef.current) { setIsSpeaking(false); onEnd?.(); }
    };

    synthRef.current.speak(utter);
  }, []);   // stable — reads voiceEnabledRef via ref

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    speechActiveRef.current = false;
    setIsSpeaking(false);
  }, []);

  /* ── listen ── */
  const startListening = useCallback((onResult: (text: string) => void) => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setVoiceError('Speech recognition not supported. Use Chrome or Edge.');
      return;
    }
    recognitionRef.current?.stop();

    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang            = 'en-IN';
    rec.continuous      = false;
    rec.interimResults  = true;
    rec.maxAlternatives = 1;

    rec.onstart  = () => { if (!unmountedRef.current) { setIsListening(true); setTranscript(''); } };
    rec.onend    = () => { if (!unmountedRef.current) setIsListening(false); };
    rec.onerror  = (e: any) => {
      if (!unmountedRef.current) {
        setIsListening(false);
        if (e.error !== 'aborted') setVoiceError(`Mic error: ${e.error}`);
      }
    };

    rec.onresult = (event: any) => {
      let finalText = '', interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interimText += t;
      }
      if (!unmountedRef.current) setTranscript(finalText || interimText);
      if (finalText && !unmountedRef.current) {
        setTranscript('');
        onResult(finalText.trim());
      }
    };

    try { rec.start(); } catch { /* already started */ }
  }, []);   // stable

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return {
    isListening, isSpeaking, transcript, voiceEnabled, voiceError,
    setVoiceEnabled, setVoiceError,
    speak, stopSpeaking, startListening, stopListening,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
   SHARED UI PRIMITIVES
───────────────────────────────────────────────────────────────────────────── */

function MandalaBg() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none select-none" viewBox="0 0 800 800" fill="none">
      <circle cx="400" cy="400" r="380" stroke="#D4AF37" strokeWidth="1"/>
      <circle cx="400" cy="400" r="300" stroke="#D4AF37" strokeWidth="0.5"/>
      <circle cx="400" cy="400" r="220" stroke="#D4AF37" strokeWidth="0.5"/>
      <circle cx="400" cy="400" r="140" stroke="#D4AF37" strokeWidth="0.5"/>
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i * 360) / 24, r = (a * Math.PI) / 180;
        return <line key={i} x1={400+140*Math.cos(r)} y1={400+140*Math.sin(r)} x2={400+380*Math.cos(r)} y2={400+380*Math.sin(r)} stroke="#D4AF37" strokeWidth="0.3"/>;
      })}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i*360)/8, r = (a*Math.PI)/180;
        return <circle key={i} cx={400+260*Math.cos(r)} cy={400+260*Math.sin(r)} r="18" stroke="#D4AF37" strokeWidth="0.5"/>;
      })}
      <circle cx="400" cy="400" r="30" stroke="#D4AF37" strokeWidth="1" fill="none"/>
    </svg>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-bl-sm" style={{ background:'var(--khoj-surface-2)', border:'1px solid rgba(212,175,55,0.12)' }}>
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#D4AF37] inline-block"/>
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#D4AF37] inline-block"/>
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#D4AF37] inline-block"/>
    </div>
  );
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isAgent = msg.role === 'agent';
  return (
    <div className={`flex ${isAgent ? 'justify-start' : 'justify-end'} animate-fade-in`}>
      {isAgent && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1 text-xs font-bold" style={{ background:'linear-gradient(135deg,#1A3530,#2a4a40)', border:'1px solid rgba(212,175,55,0.4)', color:'#D4AF37' }}>K</div>
      )}
      <div className="max-w-[78%] px-4 py-3 text-sm leading-relaxed" style={isAgent ? {
        background:'var(--khoj-surface-2)', border:'1px solid rgba(212,175,55,0.15)',
        borderRadius:'1rem 1rem 1rem 0.25rem', color:'var(--khoj-text)',
      } : {
        background:'linear-gradient(135deg, #B84C24, #D96030)',
        borderRadius:'1rem 1rem 0.25rem 1rem', color:'#fff',
      }}>
        {msg.text}
      </div>
    </div>
  );
}

type VoiceBot = ReturnType<typeof useVoiceBot>;

function VoiceToggle({ voice }: { voice: VoiceBot }) {
  return (
    <button
      onClick={() => voice.setVoiceEnabled(!voice.voiceEnabled)}
      className="text-xs px-3 py-1 rounded-full flex items-center gap-1"
      style={{ background:'rgba(212,175,55,0.1)', border:'1px solid rgba(212,175,55,0.2)', color:'#D4AF37' }}
    >
      {voice.voiceEnabled ? <><Volume2 className="w-3 h-3"/> ON</> : <><VolumeX className="w-3 h-3"/> OFF</>}
    </button>
  );
}

function MicButton({ voice }: { voice: VoiceBot }) {
  function toggle() {
    if (voice.isListening) voice.stopListening();
    else voice.startListening(() => {}); // will be overridden by parent
  }
  return (
    <button
      type="button"
      onClick={toggle}
      className="w-14 h-14 rounded-full flex items-center justify-center transition-all relative"
      style={{
        background: voice.isListening ? 'linear-gradient(135deg,#c0392b,#e74c3c)' : 'linear-gradient(135deg,#B84C24,#D96030)',
        animation: voice.isListening ? 'pulse-ring-rust 1.2s ease-out infinite' : voice.isSpeaking ? 'pulse-ring 1.5s ease-out infinite' : undefined,
      }}
    >
      {voice.isListening ? <MicOff className="w-6 h-6 text-white"/> : <Mic className="w-6 h-6 text-white"/>}
    </button>
  );
}

function VoiceStatusBar({ voice }: { voice: VoiceBot }) {
  if (voice.voiceError) return (
    <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl animate-fade-in" style={{ background:'rgba(231,76,60,0.1)', border:'1px solid rgba(231,76,60,0.25)', color:'#e74c3c' }}>
      <AlertCircle className="w-3 h-3 shrink-0"/>
      {voice.voiceError}
      <button className="ml-auto underline" onClick={() => voice.setVoiceError('')}>Dismiss</button>
    </div>
  );
  if (voice.isListening) return (
    <div className="flex items-center justify-center gap-2 text-xs animate-fade-in" style={{ color:'#e74c3c' }}>
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block"/> Listening…
      {voice.transcript && <span className="italic opacity-70">&ldquo;{voice.transcript}&rdquo;</span>}
    </div>
  );
  if (voice.isSpeaking) return (
    <div className="flex items-center justify-center gap-2 text-xs animate-fade-in" style={{ color:'#D4AF37' }}>
      <Volume2 className="w-3 h-3 animate-pulse"/> Khoj AI speaking…
    </div>
  );
  return <div className="text-xs text-center" style={{ color:'var(--khoj-text-dim)' }}>— or type below —</div>;
}

/* ─────────────────────────────────────────────────────────────────────────────
   STATE 1 — Initialization
───────────────────────────────────────────────────────────────────────────── */
function StateInit({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden" style={{ background:'var(--khoj-bg)' }}>
      <MandalaBg />
      {[['top-4 left-4','top','left'], ['top-4 right-4','top','right'], ['bottom-4 left-4','bottom','left'], ['bottom-4 right-4','bottom','right']].map(([pos, tb, lr], i) => (
        <div key={i} className={`absolute ${pos} w-16 h-16 opacity-30`} style={{ [`border${tb.charAt(0).toUpperCase()+tb.slice(1)}`]:'2px solid #D4AF37', [`border${lr.charAt(0).toUpperCase()+lr.slice(1)}`]:'2px solid #D4AF37', borderRadius: pos.includes('top-4 left') ? '4px 0 0 0' : pos.includes('top-4 right') ? '0 4px 0 0' : pos.includes('bottom-4 left') ? '0 0 0 4px' : '0 0 4px 0' }}/>
      ))}
      <div className="relative z-10 flex flex-col items-center gap-10 animate-slide-up px-6 text-center">
        <div className="text-xs tracking-[0.25em] uppercase font-medium px-4 py-1.5 rounded-full" style={{ background:'rgba(212,175,55,0.1)', border:'1px solid rgba(212,175,55,0.3)', color:'#D4AF37' }}>
          AI Voice Travel Companion
        </div>
        <div className="space-y-2">
          <div className="text-5xl md:text-6xl font-bold tracking-wider khoj-shimmer" style={{ fontFamily:"'Cinzel', serif" }}>KHOJ AI</div>
          <p className="text-[var(--khoj-muted)] text-base">Speak to plan. One tap, and let&apos;s go!</p>
        </div>
        <button onClick={onStart} className="w-40 h-40 rounded-full khoj-btn-gold animate-pulse-ring flex flex-col items-center justify-center gap-2 shadow-2xl animate-float">
          <Mic className="w-8 h-8 text-[#0D1F1A]"/>
          <span className="text-xs font-semibold tracking-widest opacity-70 uppercase">Tap to</span>
          <span className="text-xl font-extrabold tracking-widest" style={{ fontFamily:"'Cinzel', serif" }}>START</span>
        </button>
        <p className="text-[var(--khoj-text-dim)] text-sm max-w-xs leading-relaxed">
          🎤 Speak your destination &amp; preferences. Your AI travel agent handles the rest.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STATE 2 — Greeting & Voice Input
───────────────────────────────────────────────────────────────────────────── */
const GREETING_TEXT = "Hey! I'm Khoj AI, your eyes and ears for this trip. Where are we dreaming of today?";

function StateGreeting({ voice, onNext }: { voice: VoiceBot; onNext: (dest: string) => void }) {
  const [dest, setDest]     = useState('');
  const hasSpokenRef        = useRef(false);
  const onResultRef         = useRef<(t: string) => void>(() => {});

  // keep the result handler updated without re-triggering effect
  onResultRef.current = (result: string) => { setDest(result); };

  useEffect(() => {
    if (hasSpokenRef.current) return;
    hasSpokenRef.current = true;
    // slight delay so component is fully mounted before TTS starts
    const t = setTimeout(() => {
      voice.speak(GREETING_TEXT, () => {
        voice.startListening((r) => onResultRef.current(r));
      });
    }, 300);
    return () => clearTimeout(t);
  }, []); // intentionally empty — voice functions are stable refs

  function submit() {
    const d = (dest || voice.transcript).trim();
    if (!d) return;
    voice.stopListening();
    voice.stopSpeaking();
    onNext(d);
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background:'var(--khoj-bg)' }}>
      <MandalaBg />
      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        <div className="text-sm font-bold tracking-widest khoj-shimmer" style={{ fontFamily:"'Cinzel', serif" }}>KHOJ AI</div>
        <VoiceToggle voice={voice}/>
      </div>

      <div className="relative z-10 flex flex-col flex-1 max-w-lg mx-auto w-full px-6 pt-8 pb-8 gap-6">
        <ChatBubble msg={{ role:'agent', text: GREETING_TEXT }} />

        <div className="animate-fade-in space-y-5">
          <div className="flex justify-center pt-2">
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (voice.isListening) voice.stopListening();
                  else voice.startListening((r) => onResultRef.current(r));
                }}
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: voice.isListening ? 'linear-gradient(135deg,#c0392b,#e74c3c)' : 'linear-gradient(135deg,#B84C24,#D96030)',
                  animation: voice.isListening ? 'pulse-ring-rust 1.2s ease-out infinite' : undefined,
                }}
              >
                {voice.isListening ? <MicOff className="w-7 h-7 text-white"/> : <Mic className="w-7 h-7 text-white"/>}
              </button>
              <VoiceStatusBar voice={voice}/>
            </div>
          </div>

          <div className="flex items-center gap-3 khoj-input px-4 py-3">
            <MapPin className="w-4 h-4 shrink-0" style={{ color:'var(--khoj-gold)' }} />
            <input
              value={dest || voice.transcript}
              onChange={e => setDest(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Or type your destination…"
              className="bg-transparent flex-1 text-sm outline-none placeholder:text-[var(--khoj-text-dim)]"
              style={{ color:'var(--khoj-text)' }}
            />
          </div>

          {(dest || voice.transcript) && (
            <button onClick={submit} className="w-full py-3 khoj-btn-gold text-sm animate-fade-in">
              Continue with &quot;{dest || voice.transcript}&quot; →
            </button>
          )}

          {voice.voiceError && <div className="text-xs text-center" style={{ color:'#e74c3c' }}>{voice.voiceError}</div>}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STATE 3 — Structured Voice Gathering
───────────────────────────────────────────────────────────────────────────── */
const GATHER_QUESTIONS = [
  { key:'dates',  question:(dest:string) => `Cool! ${dest}. When's the trip? Tell me your travel dates.`,  placeholder:'e.g. Oct 15 to 20',    icon:<Calendar className="w-4 h-4"/> },
  { key:'budget', question:()            => 'What is your budget range? Say a number in rupees.',           placeholder:'e.g. 50000 or 1 lakh',  icon:<Wallet className="w-4 h-4"/>  },
  { key:'party',  question:()            => "Who's coming along? Say couple, family, solo, or group.",      placeholder:'e.g. couple, 2 people', icon:<Users className="w-4 h-4"/>   },
];

function StateGathering({ destination, voice, onDone, onBack }: { destination:string; voice:VoiceBot; onDone:(ans:Record<string,string>)=>void; onBack:()=>void }) {
  const [step,      setStep]      = useState(0);
  const [answers,   setAnswers]   = useState<Record<string,string>>({});
  const [current,   setCurrent]   = useState('');
  const [messages,  setMessages]  = useState<ChatMessage[]>([]);
  const [typing,    setTyping]    = useState(false);
  const [done,      setDone]      = useState(false);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const stepRef     = useRef(0);         // shadow of step to avoid stale closures
  const answersRef  = useRef<Record<string,string>>({});
  const hasAskedRef = useRef(-1);

  useEffect(() => { stepRef.current = step; }, [step]);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages, typing]);

  // Ask a question: add to chat + TTS + auto-listen
  const askQuestion = useCallback((idx: number) => {
    if (hasAskedRef.current === idx) return;
    hasAskedRef.current = idx;
    const q = GATHER_QUESTIONS[idx].question(destination);
    setMessages(m => [...m, { role:'agent', text:q }]);
    voice.speak(q, () => {
      voice.startListening((result) => {
        setCurrent(result);
      });
    });
  }, [destination, voice.speak, voice.startListening]);

  // Ask first question on mount
  useEffect(() => { askQuestion(0); }, []);

  async function submitAnswer(override?: string) {
    const ans = (override ?? current).trim();
    if (!ans || done) return;
    voice.stopListening();
    voice.stopSpeaking();
    const key = GATHER_QUESTIONS[stepRef.current].key;
    const newAns = { ...answersRef.current, [key]: ans };
    setAnswers(newAns);
    answersRef.current = newAns;
    setMessages(m => [...m, { role:'user', text:ans }]);
    setCurrent('');
    setTyping(true);
    await new Promise(r => setTimeout(r, 700));
    setTyping(false);

    const nextStep = stepRef.current + 1;
    if (nextStep < GATHER_QUESTIONS.length) {
      hasAskedRef.current = -1;
      setStep(nextStep);
      stepRef.current = nextStep;
      askQuestion(nextStep);
    } else {
      setDone(true);
      const farewell = `Perfect! Building your ${destination} itinerary now!`;
      setMessages(m => [...m, { role:'agent', text:farewell }]);
      voice.speak(farewell, async () => {
        await new Promise(r => setTimeout(r, 500));
        onDone(newAns);
      });
    }
  }

  const confirmed = Object.entries(answers).map(([k,v]) =>
    k==='dates'?`📅 ${v}`:k==='budget'?`💰 ${v}`:k==='party'?`👥 ${v}`:v
  );

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background:'var(--khoj-bg)' }}>
      <MandalaBg />
      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        <button onClick={onBack} className="text-xs" style={{ color:'var(--khoj-muted)' }}>← Back</button>
        <div className="text-xs font-bold tracking-widest khoj-shimmer" style={{ fontFamily:"'Cinzel', serif" }}>KHOJ AI</div>
        <div className="flex items-center gap-2">
          <VoiceToggle voice={voice}/>
          <div className="text-xs px-3 py-1 rounded-full" style={{ background:'rgba(184,76,36,0.15)', border:'1px solid rgba(184,76,36,0.3)', color:'#D96030' }}>Gathering</div>
        </div>
      </div>

      {confirmed.length > 0 && (
        <div className="relative z-10 flex flex-wrap gap-2 px-6 pt-3">
          {confirmed.map((c,i) => (
            <span key={i} className="text-xs px-3 py-1 rounded-full" style={{ background:'rgba(212,175,55,0.12)', border:'1px solid rgba(212,175,55,0.2)', color:'#D4AF37' }}>{c}</span>
          ))}
        </div>
      )}

      <div className="relative z-10 flex-1 overflow-y-auto px-6 pt-4 pb-4 space-y-4 max-w-lg mx-auto w-full">
        {messages.map((msg,i) => <ChatBubble key={i} msg={msg}/>)}
        {typing && (
          <div className="flex justify-start animate-fade-in">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1 text-xs font-bold" style={{ background:'linear-gradient(135deg,#1A3530,#2a4a40)', border:'1px solid rgba(212,175,55,0.4)', color:'#D4AF37' }}>K</div>
            <TypingIndicator/>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {!done && (
        <div className="relative z-10 px-6 pb-8 max-w-lg mx-auto w-full space-y-3">
          <div className="flex justify-center">
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (voice.isListening) voice.stopListening();
                  else voice.startListening((r) => setCurrent(r));
                }}
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: voice.isListening ? 'linear-gradient(135deg,#c0392b,#e74c3c)' : 'linear-gradient(135deg,#B84C24,#D96030)',
                  animation: voice.isListening ? 'pulse-ring-rust 1.2s ease-out infinite' : undefined,
                }}
              >
                {voice.isListening ? <MicOff className="w-5 h-5 text-white"/> : <Mic className="w-5 h-5 text-white"/>}
              </button>
              <VoiceStatusBar voice={voice}/>
            </div>
          </div>

          <div className="flex items-center gap-3 khoj-input px-4 py-3">
            <span style={{ color:'var(--khoj-gold)' }}>{GATHER_QUESTIONS[step]?.icon}</span>
            <input
              value={current}
              onChange={e => setCurrent(e.target.value)}
              onKeyDown={e => e.key==='Enter' && submitAnswer()}
              placeholder={GATHER_QUESTIONS[step]?.placeholder}
              className="bg-transparent flex-1 text-sm outline-none placeholder:text-[var(--khoj-text-dim)]"
              style={{ color:'var(--khoj-text)' }}
            />
            <button type="button" onClick={() => submitAnswer()} disabled={!current.trim()}
              className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-30"
              style={{ background: current.trim() ? 'linear-gradient(135deg,#C9A227,#E8C840)' : 'var(--khoj-surface-2)' }}>
              <Send className="w-4 h-4" style={{ color: current.trim() ? '#0D1F1A' : '#6B9A85' }}/>
            </button>
          </div>

          {current.trim() && (
            <button onClick={() => submitAnswer()} className="w-full py-3 khoj-btn-gold text-sm animate-fade-in">
              Confirm &quot;{current}&quot; →
            </button>
          )}
        </div>
      )}

      {done && (
        <div className="relative z-10 px-6 pb-8 flex justify-center">
          <div className="flex items-center gap-2 text-sm" style={{ color:'var(--khoj-gold)' }}>
            <Loader2 className="w-5 h-5 animate-spin"/> Building your itinerary…
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STATE 4 — Itinerary
───────────────────────────────────────────────────────────────────────────── */
function StateItinerary({ destination, tripId, answers, voice, onApprove, onIterate }:{
  destination:string; tripId:string|null; answers:Record<string,string>;
  voice:VoiceBot; onApprove:()=>void; onIterate:()=>void;
}) {
  const spokenRef = useRef(false);
  useEffect(() => {
    if (spokenRef.current) return;
    spokenRef.current = true;
    voice.speak(`Okay! I found an epic itinerary for ${destination}! We fly in, stay at a heritage Haveli, and explore the best spots. Say Approve to book, or Iterate to change something.`);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background:'var(--khoj-bg)' }}>
      <MandalaBg/>
      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        <div className="text-sm font-bold tracking-widest khoj-shimmer" style={{ fontFamily:"'Cinzel',serif" }}>KHOJ AI</div>
        <div className="flex items-center gap-2">
          <VoiceToggle voice={voice}/>
          <div className="text-xs px-3 py-1 rounded-full" style={{ background:'rgba(152,90,30,0.2)', border:'1px solid rgba(212,175,55,0.3)', color:'#D4AF37' }}>Itinerary</div>
        </div>
      </div>

      <div className="relative z-10 max-w-lg mx-auto w-full px-6 pt-4 pb-44 space-y-4 overflow-y-auto animate-slide-up">
        <ChatBubble msg={{ role:'agent', text:`Found your ${destination} itinerary! Heritage Haveli stay, flights sorted. Ready to book?` }}/>
        <div className="khoj-card overflow-hidden">
          <div className="px-5 py-4" style={{ background:'linear-gradient(135deg,rgba(26,53,48,0.9),rgba(13,31,26,0.9))', borderBottom:'1px solid rgba(212,175,55,0.15)' }}>
            <div className="text-xs uppercase tracking-widest mb-1" style={{ color:'var(--khoj-muted)' }}>Your Dream Trip</div>
            <div className="text-xl font-bold" style={{ color:'var(--khoj-gold)', fontFamily:"'Cinzel',serif" }}>{destination}</div>
            {answers.dates && <div className="text-xs mt-0.5" style={{ color:'var(--khoj-text-dim)' }}>📅 {answers.dates}</div>}
          </div>
          <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(212,175,55,0.1)' }}>
            <div className="text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color:'var(--khoj-muted)' }}>Flight</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background:'rgba(212,175,55,0.12)', border:'1px solid rgba(212,175,55,0.2)' }}>✈️</div>
                <div>
                  <div className="text-sm font-semibold" style={{ color:'var(--khoj-text)' }}>Demo Airlines</div>
                  <div className="text-xs" style={{ color:'var(--khoj-text-dim)' }}>Economy · DA-123</div>
                </div>
              </div>
              <div className="text-xs px-2 py-1 rounded-full" style={{ background:'rgba(212,175,55,0.1)', color:'#D4AF37' }}>{answers.budget?`₹${answers.budget}`:'₹₹₹'}</div>
            </div>
          </div>
          <div className="px-5 py-4 border-b" style={{ borderColor:'rgba(212,175,55,0.1)' }}>
            <div className="text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color:'var(--khoj-muted)' }}>Stay</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background:'rgba(152,90,30,0.15)', border:'1px solid rgba(184,76,36,0.2)' }}>🏰</div>
                <div>
                  <div className="text-sm font-semibold" style={{ color:'var(--khoj-text)' }}>Heritage Haveli</div>
                  <div className="text-xs" style={{ color:'var(--khoj-text-dim)' }}>{destination} · 3 nights</div>
                </div>
              </div>
              <div className="text-xs px-2 py-1 rounded-full" style={{ background:'rgba(152,90,30,0.12)', color:'#D96030' }}>Boutique</div>
            </div>
          </div>
          <div className="px-5 py-4">
            <div className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color:'var(--khoj-muted)' }}>Days</div>
            <div className="grid grid-cols-2 gap-3">
              {[{emoji:'🏯',label:'Forts',days:'Days 1–2'},{emoji:'🛍️',label:'Bazaar',days:'Days 3–4'}].map(d=>(
                <div key={d.label} className="rounded-xl px-4 py-3" style={{ background:'rgba(212,175,55,0.06)', border:'1px solid rgba(212,175,55,0.1)' }}>
                  <div className="text-xl mb-1">{d.emoji}</div>
                  <div className="text-sm font-semibold" style={{ color:'var(--khoj-text)' }}>{d.label}</div>
                  <div className="text-xs" style={{ color:'var(--khoj-text-dim)' }}>{d.days}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 px-6 pb-8 pt-4 z-20 max-w-lg mx-auto" style={{ background:'linear-gradient(to top, var(--khoj-bg) 80%, transparent)' }}>
        {voice.isSpeaking && <div className="flex justify-center mb-3 text-xs animate-fade-in" style={{ color:'#D4AF37' }}><Volume2 className="w-3 h-3 mr-1 animate-pulse"/> Khoj AI speaking…</div>}
        <div className="flex gap-3">
          <button onClick={onIterate} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold" style={{ background:'var(--khoj-surface)', border:'1px solid rgba(212,175,55,0.2)', color:'var(--khoj-muted)' }}>
            <RotateCcw className="w-4 h-4"/> Iterate
          </button>
          <button onClick={onApprove} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl khoj-btn-gold text-sm">
            <Check className="w-4 h-4"/> Approve &amp; Book
          </button>
        </div>
        {tripId && (
          <button onClick={()=>window.location.href=`/trips/${tripId}`} className="mt-3 w-full flex items-center justify-center gap-2 py-3 text-xs rounded-xl" style={{ background:'rgba(212,175,55,0.06)', border:'1px solid rgba(212,175,55,0.12)', color:'var(--khoj-muted)' }}>
            View full itinerary details <ChevronRight className="w-3 h-3"/>
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   STATE 5 — Payment
───────────────────────────────────────────────────────────────────────────── */
function StatePayment({ destination, voice, onDone }:{ destination:string; voice:VoiceBot; onDone:()=>void }) {
  const [paid,     setPaid]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState<string|null>(null);
  const spokenRef = useRef(false);

  useEffect(()=>{
    if(spokenRef.current) return;
    spokenRef.current = true;
    voice.speak(`Looks perfect! Ready to book this ${destination} dream? Choose your payment method.`);
  },[]);

  async function handlePay(method:string){
    setSelected(method); setLoading(true);
    voice.speak('Processing your payment, please wait.');
    await new Promise(r=>setTimeout(r,2000));
    setLoading(false); setPaid(true);
    voice.speak(`Booking confirmed! Your ${destination} adventure is live! The itinerary is sent to your WhatsApp and email. Have an amazing trip!`);
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background:'var(--khoj-bg)' }}>
      <MandalaBg/>
      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        <div className="text-sm font-bold tracking-widest khoj-shimmer" style={{ fontFamily:"'Cinzel',serif" }}>KHOJ AI</div>
        <VoiceToggle voice={voice}/>
      </div>
      <div className="relative z-10 max-w-lg mx-auto w-full px-6 pt-6 pb-10 space-y-6 animate-slide-up">
        {!paid ? (
          <>
            <ChatBubble msg={{ role:'agent', text:`Looks perfect! Ready to book this ${destination} dream?` }}/>
            <div className="khoj-card overflow-hidden">
              <div className="px-5 py-4" style={{ borderBottom:'1px solid rgba(212,175,55,0.12)' }}>
                <div className="text-xs uppercase tracking-widest mb-1" style={{ color:'var(--khoj-muted)' }}>Secure Payment Portal</div>
                <div className="text-xl font-bold" style={{ color:'var(--khoj-gold)', fontFamily:"'Cinzel',serif" }}>₹28,500 all-in</div>
              </div>
              <div className="px-5 py-5 space-y-3">
                {[
                  {id:'upi',       icon:<Smartphone className="w-5 h-5"/>,label:'UPI',        desc:'Instant payment'},
                  {id:'card',      icon:<CreditCard className="w-5 h-5"/>, label:'Card',       desc:'Debit / Credit'},
                  {id:'netbanking',icon:<Building2 className="w-5 h-5"/>,  label:'Net Banking',desc:'All major banks'},
                ].map(m=>(
                  <button key={m.id} onClick={()=>handlePay(m.id)} disabled={loading}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all"
                    style={{ background:selected===m.id?'rgba(212,175,55,0.12)':'var(--khoj-surface-2)', border:selected===m.id?'1px solid rgba(212,175,55,0.5)':'1px solid rgba(212,175,55,0.1)' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:'rgba(212,175,55,0.1)', color:'#D4AF37' }}>
                      {loading&&selected===m.id?<Loader2 className="w-5 h-5 animate-spin"/>:m.icon}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold" style={{ color:'var(--khoj-text)' }}>{m.label}</div>
                      <div className="text-xs" style={{ color:'var(--khoj-text-dim)' }}>{m.desc}</div>
                    </div>
                    {!loading&&<ChevronRight className="w-4 h-4 ml-auto" style={{ color:'var(--khoj-muted)'}}/>}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-center text-xs" style={{ color:'var(--khoj-text-dim)' }}>🔒 256-bit SSL encrypted · Zero-fee transactions</p>
          </>
        ) : (
          <div className="flex flex-col items-center gap-6 pt-12 animate-slide-up text-center">
            <div className="w-24 h-24 rounded-full flex items-center justify-center animate-pulse-ring" style={{ background:'linear-gradient(135deg,#1A7A4A,#22A860)' }}>
              <Check className="w-10 h-10 text-white"/>
            </div>
            <div>
              <div className="text-2xl font-bold mb-2" style={{ color:'var(--khoj-gold)', fontFamily:"'Cinzel',serif" }}>Booking Confirmed!</div>
              <p className="text-sm" style={{ color:'var(--khoj-muted)' }}>Your {destination} adventure is officially on! 🎉</p>
            </div>
            {voice.isSpeaking && <div className="flex items-center gap-2 text-xs animate-fade-in" style={{ color:'#D4AF37' }}><Volume2 className="w-4 h-4 animate-pulse"/> Speaking…</div>}
            <div className="khoj-card px-6 py-4 w-full">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📱</span>
                <div className="text-left">
                  <div className="text-sm font-semibold" style={{ color:'var(--khoj-text)' }}>Itinerary sent!</div>
                  <div className="text-xs" style={{ color:'var(--khoj-text-dim)' }}>Check WhatsApp &amp; Email</div>
                </div>
              </div>
            </div>
            <button onClick={onDone} className="w-full py-3.5 khoj-btn-gold text-sm mt-2">Plan Another Trip →</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ROOT
───────────────────────────────────────────────────────────────────────────── */
export default function KhojAIPage() {
  const [appState, setAppState] = useState<AppState>('init');
  const [destination, setDest]  = useState('');
  const [answers, setAnswers]   = useState<Record<string,string>>({});
  const [tripId, setTripId]     = useState<string|null>(null);
  const voice = useVoiceBot();

  // pre-warm the API route in background so first /api/trips call is fast
  useEffect(()=>{ fetch('/api/trips',{method:'HEAD'}).catch(()=>{}); },[]);

  async function handleGathered(ans: Record<string,string>) {
    setAnswers(ans);
    const amount = parseFloat(ans.budget?.replace(/[^0-9.]/g,'') || '50000') || 50000;
    try {
      const res = await fetch('/api/trips',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          destination,
          dates:{ start:ans.dates||'', end:'' },
          budget:{ amount, currency:'INR' },
          party_size: ans.party?.includes('solo')?1 : ans.party?.includes('family')?4 : 2,
          purpose: ans.party?.includes('solo')?'solo':ans.party?.includes('family')?'family':'honeymoon',
          preferences:{ activity_level:'moderate', must_include:[], avoid:[] },
        }),
      });
      if(res.ok){ const d=await res.json(); setTripId(d.id); }
    } catch{}
    setAppState('itinerary');
  }

  function reset(){ setAppState('init'); setDest(''); setAnswers({}); setTripId(null); }

  if(appState==='init')      return <StateInit onStart={()=>setAppState('greeting')}/>;
  if(appState==='greeting')  return <StateGreeting voice={voice} onNext={d=>{setDest(d);setAppState('gathering');}}/>;
  if(appState==='gathering') return <StateGathering destination={destination} voice={voice} onDone={handleGathered} onBack={()=>setAppState('greeting')}/>;
  if(appState==='itinerary') return <StateItinerary destination={destination} tripId={tripId} answers={answers} voice={voice} onApprove={()=>setAppState('payment')} onIterate={()=>setAppState('gathering')}/>;
  if(appState==='payment')   return <StatePayment destination={destination} voice={voice} onDone={reset}/>;
  return null;
}
