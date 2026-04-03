'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, Volume2, VolumeX, Send, RotateCcw, Check, MapPin, Calendar, Wallet, Users, Loader2, CreditCard, Smartphone, Building2, ChevronRight } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type AppState = 'init' | 'greeting' | 'gathering' | 'itinerary' | 'payment';

interface ChatMessage {
  role: 'agent' | 'user';
  text: string;
}

// ── Web Speech API hook ───────────────────────────────────────────────────────

function useVoiceBot() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript]   = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    synthRef.current = window.speechSynthesis;
  }, []);

  // Start speech recognition
  const startListening = useCallback((onResult: (text: string) => void) => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition is not supported in this browser. Use Chrome.'); return; }

    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart  = () => setIsListening(true);
    recognition.onend    = () => setIsListening(false);
    recognition.onerror  = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      setTranscript(final || interim);
      if (final) { onResult(final.trim()); setTranscript(''); }
    };

    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // Text-to-speech
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!voiceEnabled || !synthRef.current) { onEnd?.(); return; }
    synthRef.current.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-IN';
    utter.rate = 1.0;
    utter.pitch = 1.1;

    // Pick a female voice if available
    const voices = synthRef.current.getVoices();
    const femaleVoice = voices.find(v =>
      /female|woman|samantha|victoria|karen|zira/i.test(v.name) && /en/i.test(v.lang)
    ) || voices.find(v => /en/i.test(v.lang));
    if (femaleVoice) utter.voice = femaleVoice;

    utter.onstart = () => setIsSpeaking(true);
    utter.onend   = () => { setIsSpeaking(false); onEnd?.(); };
    utter.onerror = () => { setIsSpeaking(false); onEnd?.(); };
    synthRef.current.speak(utter);
  }, [voiceEnabled]);

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  }, []);

  return { isListening, isSpeaking, transcript, voiceEnabled, setVoiceEnabled, startListening, stopListening, speak, stopSpeaking };
}

// ── Mandala SVG (decorative) ───────────────────────────────────────────────────

function MandalaBg() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none select-none" viewBox="0 0 800 800" fill="none">
      <circle cx="400" cy="400" r="380" stroke="#D4AF37" strokeWidth="1"/>
      <circle cx="400" cy="400" r="300" stroke="#D4AF37" strokeWidth="0.5"/>
      <circle cx="400" cy="400" r="220" stroke="#D4AF37" strokeWidth="0.5"/>
      <circle cx="400" cy="400" r="140" stroke="#D4AF37" strokeWidth="0.5"/>
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i * 360) / 24, r = (a * Math.PI) / 180;
        return <line key={i} x1={400 + 140 * Math.cos(r)} y1={400 + 140 * Math.sin(r)} x2={400 + 380 * Math.cos(r)} y2={400 + 380 * Math.sin(r)} stroke="#D4AF37" strokeWidth="0.3"/>;
      })}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * 360) / 8, r = (a * Math.PI) / 180;
        return <circle key={i} cx={400 + 260 * Math.cos(r)} cy={400 + 260 * Math.sin(r)} r="18" stroke="#D4AF37" strokeWidth="0.5"/>;
      })}
      <circle cx="400" cy="400" r="30" stroke="#D4AF37" strokeWidth="1" fill="none"/>
    </svg>
  );
}

// ── Typing Indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-bl-sm" style={{ background: 'var(--khoj-surface-2)', border: '1px solid rgba(212,175,55,0.12)' }}>
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#D4AF37] inline-block"/>
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#D4AF37] inline-block"/>
      <span className="typing-dot w-1.5 h-1.5 rounded-full bg-[#D4AF37] inline-block"/>
    </div>
  );
}

// ── Chat Bubble ───────────────────────────────────────────────────────────────

function ChatBubble({ msg }: { msg: ChatMessage }) {
  const isAgent = msg.role === 'agent';
  return (
    <div className={`flex ${isAgent ? 'justify-start' : 'justify-end'} animate-fade-in`}>
      {isAgent && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1 text-xs font-bold" style={{ background: 'linear-gradient(135deg,#1A3530,#2a4a40)', border: '1px solid rgba(212,175,55,0.4)', color: '#D4AF37' }}>K</div>
      )}
      <div className="max-w-[78%] px-4 py-3 text-sm leading-relaxed" style={isAgent ? {
        background: 'var(--khoj-surface-2)', border: '1px solid rgba(212,175,55,0.15)',
        borderRadius: '1rem 1rem 1rem 0.25rem', color: 'var(--khoj-text)',
      } : {
        background: 'linear-gradient(135deg, #B84C24, #D96030)',
        borderRadius: '1rem 1rem 0.25rem 1rem', color: '#fff',
      }}>
        {msg.text}
      </div>
    </div>
  );
}

// ── Voice Mic Button ──────────────────────────────────────────────────────────

function VoiceMicButton({
  isListening, isSpeaking, transcript, onToggle 
}: {
  isListening: boolean; isSpeaking: boolean; transcript: string; onToggle: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        className="w-14 h-14 rounded-full flex items-center justify-center transition-all relative"
        style={{
          background: isListening
            ? 'linear-gradient(135deg,#c0392b,#e74c3c)'
            : 'linear-gradient(135deg,#B84C24,#D96030)',
          boxShadow: isListening ? '0 0 0 0 rgba(231,76,60,0.5)' : 'none',
          animation: isListening ? 'pulse-ring-rust 1.2s ease-out infinite' : isSpeaking ? 'pulse-ring 1.5s ease-out infinite' : 'none',
        }}
        title={isListening ? 'Stop listening' : 'Start speaking'}
      >
        {isListening ? <MicOff className="w-6 h-6 text-white"/> : <Mic className="w-6 h-6 text-white"/>}
      </button>
      {transcript && (
        <div className="text-xs px-3 py-1 rounded-full animate-fade-in" style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
          &ldquo;{transcript}&rdquo;
        </div>
      )}
      {isSpeaking && !isListening && (
        <div className="flex items-center gap-1 text-xs" style={{ color: '#D4AF37' }}>
          <Volume2 className="w-3 h-3"/> Speaking…
        </div>
      )}
    </div>
  );
}

// ── State 1: Initialization ───────────────────────────────────────────────────

function StateInit({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden" style={{ background: 'var(--khoj-bg)' }}>
      <MandalaBg />
      <div className="absolute top-4 left-4 w-16 h-16 opacity-30" style={{ borderTop: '2px solid #D4AF37', borderLeft: '2px solid #D4AF37', borderRadius: '4px 0 0 0' }}/>
      <div className="absolute top-4 right-4 w-16 h-16 opacity-30" style={{ borderTop: '2px solid #D4AF37', borderRight: '2px solid #D4AF37', borderRadius: '0 4px 0 0' }}/>
      <div className="absolute bottom-4 left-4 w-16 h-16 opacity-30" style={{ borderBottom: '2px solid #D4AF37', borderLeft: '2px solid #D4AF37', borderRadius: '0 0 0 4px' }}/>
      <div className="absolute bottom-4 right-4 w-16 h-16 opacity-30" style={{ borderBottom: '2px solid #D4AF37', borderRight: '2px solid #D4AF37', borderRadius: '0 0 4px 0' }}/>

      <div className="relative z-10 flex flex-col items-center gap-10 animate-slide-up px-6 text-center">
        <div className="text-xs tracking-[0.25em] uppercase font-medium px-4 py-1.5 rounded-full" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
          AI Voice Travel Companion
        </div>
        <div className="space-y-2">
          <div className="text-5xl md:text-6xl font-bold tracking-wider khoj-shimmer" style={{ fontFamily: "'Cinzel', serif" }}>KHOJ AI</div>
          <p className="text-[var(--khoj-muted)] text-base">Speak to plan. One tap, and let&apos;s go!</p>
        </div>
        <button
          onClick={onStart}
          className="w-40 h-40 rounded-full khoj-btn-gold animate-pulse-ring flex flex-col items-center justify-center gap-2 shadow-2xl animate-float"
        >
          <Mic className="w-8 h-8 text-[#0D1F1A]"/>
          <span className="text-xs font-semibold tracking-widest opacity-70 uppercase">Tap to</span>
          <span className="text-xl font-extrabold tracking-widest" style={{ fontFamily: "'Cinzel', serif" }}>START</span>
        </button>
        <p className="text-[var(--khoj-text-dim)] text-sm max-w-xs leading-relaxed">
          🎤 Speak your destination &amp; preferences — your AI travel agent handles the rest.
        </p>
      </div>
    </div>
  );
}

// ── State 2: Greeting & Voice Input ─────────────────────────────────────────────

function StateGreeting({ voice, onNext }: { voice: ReturnType<typeof useVoiceBot>; onNext: (dest: string) => void }) {
  const [dest, setDest] = useState('');
  const [greeted, setGreeted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const greeting = "Hey! I'm Khoj AI, your eyes and ears for this trip. Where are we dreaming of today?";

  useEffect(() => {
    if (greeted) return;
    setGreeted(true);
    voice.speak(greeting, () => {
      // Auto-start listening after greeting
      voice.startListening((result) => { setDest(result); });
    });
  }, []);

  function handleToggleMic() {
    if (voice.isListening) {
      voice.stopListening();
    } else {
      voice.startListening((result) => { setDest(result); });
    }
  }

  function submit() {
    const d = dest.trim() || voice.transcript.trim();
    if (d) { voice.stopListening(); voice.stopSpeaking(); onNext(d); }
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: 'var(--khoj-bg)' }}>
      <MandalaBg />
      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        <div className="text-sm font-bold tracking-widest khoj-shimmer" style={{ fontFamily: "'Cinzel', serif" }}>KHOJ AI</div>
        <div className="flex items-center gap-2">
          <button onClick={() => voice.setVoiceEnabled(!voice.voiceEnabled)} className="text-xs px-3 py-1 rounded-full flex items-center gap-1" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37' }}>
            {voice.voiceEnabled ? <Volume2 className="w-3 h-3"/> : <VolumeX className="w-3 h-3"/>}
            {voice.voiceEnabled ? 'Voice ON' : 'Voice OFF'}
          </button>
        </div>
      </div>

      <div className="relative z-10 flex flex-col flex-1 max-w-lg mx-auto w-full px-6 pt-8 pb-8 gap-6">
        <ChatBubble msg={{ role: 'agent', text: greeting }} />

        <div className="animate-fade-in space-y-6">
          {/* Big mic button */}
          <div className="flex justify-center pt-4">
            <VoiceMicButton isListening={voice.isListening} isSpeaking={voice.isSpeaking} transcript={voice.transcript} onToggle={handleToggleMic} />
          </div>

          <div className="text-center text-xs" style={{ color: 'var(--khoj-text-dim)' }}>
            {voice.isListening ? '🔴 Listening — say your destination…' : '— or type below —'}
          </div>

          {/* Text fallback */}
          <div className="flex items-center gap-3 khoj-input px-4 py-3">
            <MapPin className="w-4 h-4 shrink-0" style={{ color: 'var(--khoj-gold)' }} />
            <input
              ref={inputRef}
              value={dest || voice.transcript}
              onChange={e => setDest(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Or type destination..."
              className="bg-transparent flex-1 text-sm outline-none placeholder:text-[var(--khoj-text-dim)]"
              style={{ color: 'var(--khoj-text)' }}
            />
          </div>

          {(dest || voice.transcript) && (
            <button onClick={submit} className="w-full py-3 khoj-btn-gold text-sm animate-fade-in">
              Continue with &quot;{dest || voice.transcript}&quot; →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── State 3: Structured Voice Gathering ──────────────────────────────────────

const GATHER_QUESTIONS = [
  { key: 'dates',  question: (dest: string) => `Cool! ${dest}. When's the trip? Tell me your travel dates.`,  placeholder: 'e.g. Oct 15 to 20', icon: <Calendar className="w-4 h-4"/> },
  { key: 'budget', question: ()             => 'What is your budget range? You can say a number in rupees.',   placeholder: 'e.g. 50000 or 1 lakh',  icon: <Wallet className="w-4 h-4"/> },
  { key: 'party',  question: ()             => "Who's coming along? Say couple, family, solo, or group.",      placeholder: 'e.g. couple, 2 people',  icon: <Users className="w-4 h-4"/> },
];

function StateGathering({
  destination, voice, onDone, onBack
}: {
  destination: string;
  voice: ReturnType<typeof useVoiceBot>;
  onDone: (answers: Record<string, string>) => void;
  onBack: () => void;
}) {
  const [step, setStep]         = useState(0);
  const [answers, setAnswers]   = useState<Record<string, string>>({});
  const [current, setCurrent]   = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showTyping, setShowTyping] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const askedRef  = useRef(-1);

  // Ask a question via TTS, then auto-listen
  const askQuestion = useCallback((stepIdx: number, answersNow: Record<string, string>) => {
    if (askedRef.current === stepIdx) return;
    askedRef.current = stepIdx;
    const q = GATHER_QUESTIONS[stepIdx].question(destination);
    setMessages(m => [...m, { role: 'agent', text: q }]);
    voice.speak(q, () => {
      voice.startListening(result => {
        setCurrent(result);
      });
    });
  }, [destination, voice]);

  useEffect(() => { askQuestion(0, {}); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showTyping]);

  async function submitAnswer(text?: string) {
    const ans = (text || current).trim();
    if (!ans || submitting) return;
    voice.stopListening();
    voice.stopSpeaking();
    const key = GATHER_QUESTIONS[step].key;
    const newAnswers = { ...answers, [key]: ans };
    setAnswers(newAnswers);
    setMessages(m => [...m, { role: 'user', text: ans }]);
    setCurrent('');
    setShowTyping(true);
    await new Promise(r => setTimeout(r, 800));
    setShowTyping(false);

    if (step + 1 < GATHER_QUESTIONS.length) {
      askedRef.current = -1;
      setStep(s => s + 1);
      // ask next after state updates
      const nextIdx = step + 1;
      const q = GATHER_QUESTIONS[nextIdx].question(destination);
      setMessages(m => [...m, { role: 'agent', text: q }]);
      askedRef.current = nextIdx;
      voice.speak(q, () => {
        voice.startListening(result => setCurrent(result));
      });
    } else {
      setSubmitting(true);
      const farewell = `Okay! I found an epic itinerary for ${destination}. Building it now!`;
      setMessages(m => [...m, { role: 'agent', text: farewell }]);
      voice.speak(farewell, async () => {
        await new Promise(r => setTimeout(r, 600));
        onDone(newAnswers);
      });
    }
  }

  function handleToggleMic() {
    if (voice.isListening) { voice.stopListening(); }
    else {
      voice.startListening(result => { setCurrent(result); });
    }
  }

  const confirmed = Object.entries(answers).map(([k, v]) =>
    k === 'dates' ? `📅 ${v}` : k === 'budget' ? `💰 ${v}` : k === 'party' ? `👥 ${v}` : v
  );

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: 'var(--khoj-bg)' }}>
      <MandalaBg />
      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        <button onClick={onBack} className="text-xs flex items-center gap-1" style={{ color: 'var(--khoj-muted)' }}>← Back</button>
        <div className="text-xs font-bold tracking-widest khoj-shimmer" style={{ fontFamily: "'Cinzel', serif" }}>KHOJ AI</div>
        <div className="flex items-center gap-2">
          <button onClick={() => voice.setVoiceEnabled(!voice.voiceEnabled)} className="text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37' }}>
            {voice.voiceEnabled ? <Volume2 className="w-3 h-3"/> : <VolumeX className="w-3 h-3"/>}
          </button>
          <div className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(184,76,36,0.15)', border: '1px solid rgba(184,76,36,0.3)', color: '#D96030' }}>Gathering</div>
        </div>
      </div>

      {confirmed.length > 0 && (
        <div className="relative z-10 flex flex-wrap gap-2 px-6 pt-3">
          {confirmed.map((c, i) => (
            <span key={i} className="text-xs px-3 py-1 rounded-full animate-fade-in" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37' }}>{c}</span>
          ))}
        </div>
      )}

      <div className="relative z-10 flex-1 overflow-y-auto px-6 pt-4 pb-4 space-y-4 max-w-lg mx-auto w-full">
        {messages.map((msg, i) => <ChatBubble key={i} msg={msg} />)}
        {showTyping && (
          <div className="flex justify-start animate-fade-in">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1 text-xs font-bold" style={{ background: 'linear-gradient(135deg,#1A3530,#2a4a40)', border: '1px solid rgba(212,175,55,0.4)', color: '#D4AF37' }}>K</div>
            <TypingIndicator />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {!submitting && (
        <div className="relative z-10 px-6 pb-8 max-w-lg mx-auto w-full space-y-4">
          {/* Big mic button */}
          <div className="flex justify-center">
            <VoiceMicButton isListening={voice.isListening} isSpeaking={voice.isSpeaking} transcript={voice.transcript} onToggle={handleToggleMic} />
          </div>

          {/* Text fallback */}
          <div className="flex items-center gap-3 khoj-input px-4 py-3">
            <span style={{ color: 'var(--khoj-gold)' }}>{GATHER_QUESTIONS[step]?.icon}</span>
            <input
              value={current}
              onChange={e => setCurrent(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitAnswer()}
              placeholder={GATHER_QUESTIONS[step]?.placeholder}
              className="bg-transparent flex-1 text-sm outline-none placeholder:text-[var(--khoj-text-dim)]"
              style={{ color: 'var(--khoj-text)' }}
            />
            <button type="button" onClick={() => submitAnswer()} disabled={!current.trim()}
              className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-30"
              style={{ background: current.trim() ? 'linear-gradient(135deg,#C9A227,#E8C840)' : 'var(--khoj-surface-2)' }}>
              <Send className="w-4 h-4" style={{ color: current.trim() ? '#0D1F1A' : '#6B9A85' }} />
            </button>
          </div>

          {current.trim() && (
            <button onClick={() => submitAnswer()} className="w-full py-3 khoj-btn-gold text-sm animate-fade-in">
              Confirm &quot;{current}&quot; →
            </button>
          )}
        </div>
      )}

      {submitting && (
        <div className="relative z-10 px-6 pb-8 flex justify-center">
          <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--khoj-gold)' }}>
            <Loader2 className="w-5 h-5 animate-spin"/> Building your itinerary…
          </div>
        </div>
      )}
    </div>
  );
}

// ── State 4: Itinerary ────────────────────────────────────────────────────────

function StateItinerary({
  destination, tripId, answers, voice, onApprove, onIterate
}: {
  destination: string; tripId: string | null; answers: Record<string, string>;
  voice: ReturnType<typeof useVoiceBot>;
  onApprove: () => void; onIterate: () => void;
}) {
  const announcedRef = useRef(false);
  useEffect(() => {
    if (announcedRef.current) return;
    announcedRef.current = true;
    voice.speak(`Okay, I found an epic itinerary for ${destination}! We fly in, stay at a heritage Haveli, and explore the best spots. Want to approve and book?`);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: 'var(--khoj-bg)' }}>
      <MandalaBg />
      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        <div className="text-sm font-bold tracking-widest khoj-shimmer" style={{ fontFamily: "'Cinzel', serif" }}>KHOJ AI</div>
        <div className="flex items-center gap-2">
          <button onClick={() => voice.setVoiceEnabled(!voice.voiceEnabled)} className="text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37' }}>
            {voice.voiceEnabled ? <Volume2 className="w-3 h-3"/> : <VolumeX className="w-3 h-3"/>}
          </button>
          <div className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(152,90,30,0.2)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>Itinerary</div>
        </div>
      </div>

      <div className="relative z-10 max-w-lg mx-auto w-full px-6 pt-4 pb-40 space-y-4 overflow-y-auto animate-slide-up">
        <ChatBubble msg={{ role: 'agent', text: `Okay, found this epic itinerary for ${destination}! We fly in, stay in a heritage Haveli, and explore the best spots. Shall I book it?` }} />

        <div className="khoj-card overflow-hidden">
          <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg,rgba(26,53,48,0.9),rgba(13,31,26,0.9))', borderBottom: '1px solid rgba(212,175,55,0.15)' }}>
            <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--khoj-muted)' }}>Your Dream Trip</div>
            <div className="text-xl font-bold" style={{ color: 'var(--khoj-gold)', fontFamily: "'Cinzel',serif" }}>{destination}</div>
            {answers.dates && <div className="text-xs mt-0.5" style={{ color: 'var(--khoj-text-dim)' }}>📅 {answers.dates}</div>}
          </div>

          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(212,175,55,0.1)' }}>
            <div className="text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: 'var(--khoj-muted)' }}>Flight</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)' }}>✈️</div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--khoj-text)' }}>Demo Airlines</div>
                  <div className="text-xs" style={{ color: 'var(--khoj-text-dim)' }}>Economy · DA-123</div>
                </div>
              </div>
              <div className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>
                {answers.budget ? `₹${answers.budget}` : '₹₹₹'}
              </div>
            </div>
          </div>

          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(212,175,55,0.1)' }}>
            <div className="text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: 'var(--khoj-muted)' }}>Stay</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(152,90,30,0.15)', border: '1px solid rgba(184,76,36,0.2)' }}>🏰</div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--khoj-text)' }}>Heritage Haveli</div>
                  <div className="text-xs" style={{ color: 'var(--khoj-text-dim)' }}>{destination} · 3 nights</div>
                </div>
              </div>
              <div className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(152,90,30,0.12)', color: '#D96030' }}>Boutique</div>
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="text-xs uppercase tracking-widest mb-3 font-semibold" style={{ color: 'var(--khoj-muted)' }}>Days</div>
            <div className="grid grid-cols-2 gap-3">
              {[{ emoji: '🏯', label: 'Forts', days: 'Days 1–2' }, { emoji: '🛍️', label: 'Bazaar', days: 'Days 3–4' }].map(d => (
                <div key={d.label} className="rounded-xl px-4 py-3" style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.1)' }}>
                  <div className="text-xl mb-1">{d.emoji}</div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--khoj-text)' }}>{d.label}</div>
                  <div className="text-xs" style={{ color: 'var(--khoj-text-dim)' }}>{d.days}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 px-6 pb-8 pt-4 z-20 max-w-lg mx-auto" style={{ background: 'linear-gradient(to top, var(--khoj-bg) 80%, transparent)' }}>
        {voice.isSpeaking && (
          <div className="flex items-center justify-center gap-2 text-xs mb-3 animate-fade-in" style={{ color: '#D4AF37' }}>
            <Volume2 className="w-3 h-3 animate-pulse"/> Khoj AI is speaking…
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onIterate} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold" style={{ background: 'var(--khoj-surface)', border: '1px solid rgba(212,175,55,0.2)', color: 'var(--khoj-muted)' }}>
            <RotateCcw className="w-4 h-4" /> Iterate
          </button>
          <button onClick={onApprove} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl khoj-btn-gold text-sm">
            <Check className="w-4 h-4" /> Approve &amp; Book
          </button>
        </div>
        {tripId && (
          <button onClick={() => window.location.href = `/trips/${tripId}`} className="mt-3 w-full flex items-center justify-center gap-2 py-3 text-xs rounded-xl" style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.12)', color: 'var(--khoj-muted)' }}>
            View full itinerary details <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── State 5: Payment ──────────────────────────────────────────────────────────

function StatePayment({ destination, voice, onDone }: { destination: string; voice: ReturnType<typeof useVoiceBot>; onDone: () => void }) {
  const [paid, setPaid]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const announcedRef = useRef(false);

  useEffect(() => {
    if (announcedRef.current) return;
    announcedRef.current = true;
    voice.speak(`Looks perfect! Ready to book this ${destination} dream? Please choose your payment method.`);
  }, []);

  async function handlePay(method: string) {
    setSelected(method);
    setLoading(true);
    voice.speak('Processing your payment. Please wait.');
    await new Promise(r => setTimeout(r, 2000));
    setLoading(false);
    setPaid(true);
    voice.speak(`Booking confirmed! Your ${destination} adventure is live. The itinerary has been sent to your WhatsApp and email. Have an amazing trip!`);
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: 'var(--khoj-bg)' }}>
      <MandalaBg />
      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        <div className="text-sm font-bold tracking-widest khoj-shimmer" style={{ fontFamily: "'Cinzel', serif" }}>KHOJ AI</div>
        <button onClick={() => voice.setVoiceEnabled(!voice.voiceEnabled)} className="text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37' }}>
          {voice.voiceEnabled ? <Volume2 className="w-3 h-3"/> : <VolumeX className="w-3 h-3"/>}
        </button>
      </div>

      <div className="relative z-10 max-w-lg mx-auto w-full px-6 pt-6 pb-10 space-y-6 animate-slide-up">
        {!paid ? (
          <>
            <ChatBubble msg={{ role: 'agent', text: `Looks perfect! Ready to book this ${destination} dream?` }} />
            <div className="khoj-card overflow-hidden">
              <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(212,175,55,0.12)' }}>
                <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--khoj-muted)' }}>Secure Payment Portal</div>
                <div className="text-xl font-bold" style={{ color: 'var(--khoj-gold)', fontFamily: "'Cinzel',serif" }}>₹28,500 all-in</div>
              </div>
              <div className="px-5 py-5 space-y-3">
                {[
                  { id: 'upi',        icon: <Smartphone className="w-5 h-5"/>, label: 'UPI',         desc: 'Instant payment' },
                  { id: 'card',       icon: <CreditCard className="w-5 h-5"/>, label: 'Card',        desc: 'Debit / Credit' },
                  { id: 'netbanking', icon: <Building2 className="w-5 h-5"/>,  label: 'Net Banking', desc: 'All major banks' },
                ].map(m => (
                  <button key={m.id} onClick={() => handlePay(m.id)} disabled={loading}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all"
                    style={{ background: selected === m.id ? 'rgba(212,175,55,0.12)' : 'var(--khoj-surface-2)', border: selected === m.id ? '1px solid rgba(212,175,55,0.5)' : '1px solid rgba(212,175,55,0.1)' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>
                      {loading && selected === m.id ? <Loader2 className="w-5 h-5 animate-spin"/> : m.icon}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-semibold" style={{ color: 'var(--khoj-text)' }}>{m.label}</div>
                      <div className="text-xs" style={{ color: 'var(--khoj-text-dim)' }}>{m.desc}</div>
                    </div>
                    {!loading && <ChevronRight className="w-4 h-4 ml-auto" style={{ color: 'var(--khoj-muted)' }} />}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-center text-xs" style={{ color: 'var(--khoj-text-dim)' }}>🔒 256-bit SSL encrypted · Zero-fee transactions</p>
          </>
        ) : (
          <div className="flex flex-col items-center gap-6 pt-12 animate-slide-up text-center">
            <div className="w-24 h-24 rounded-full flex items-center justify-center animate-pulse-ring" style={{ background: 'linear-gradient(135deg,#1A7A4A,#22A860)' }}>
              <Check className="w-10 h-10 text-white"/>
            </div>
            <div>
              <div className="text-2xl font-bold mb-2" style={{ color: 'var(--khoj-gold)', fontFamily: "'Cinzel',serif" }}>Booking Confirmed!</div>
              <p className="text-sm" style={{ color: 'var(--khoj-muted)' }}>Your {destination} adventure is officially on! 🎉</p>
            </div>
            {voice.isSpeaking && (
              <div className="flex items-center gap-2 text-xs animate-fade-in" style={{ color: '#D4AF37' }}>
                <Volume2 className="w-4 h-4 animate-pulse"/> Khoj AI is speaking…
              </div>
            )}
            <div className="khoj-card px-6 py-4 w-full">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📱</span>
                <div className="text-left">
                  <div className="text-sm font-semibold" style={{ color: 'var(--khoj-text)' }}>Itinerary sent!</div>
                  <div className="text-xs" style={{ color: 'var(--khoj-text-dim)' }}>Check WhatsApp &amp; Email</div>
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

// ── Root ───────────────────────────────────────────────────────────────────────

export default function KhojAIPage() {
  const [appState, setAppState] = useState<AppState>('init');
  const [destination, setDestination] = useState('');
  const [answers, setAnswers]   = useState<Record<string, string>>({});
  const [tripId, setTripId]     = useState<string | null>(null);
  const voice = useVoiceBot();

  async function handleGathered(ans: Record<string, string>) {
    setAnswers(ans);
    const budgetAmount = parseFloat(ans.budget?.replace(/[^0-9.]/g, '') || '50000') || 50000;
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination,
          dates: { start: ans.dates || '', end: '' },
          budget: { amount: budgetAmount, currency: 'INR' },
          party_size: 2,
          purpose: ans.party?.includes('solo') ? 'solo' : ans.party?.includes('family') ? 'family' : 'honeymoon',
          preferences: { activity_level: 'moderate', must_include: [], avoid: [] },
        }),
      });
      if (res.ok) { const d = await res.json(); setTripId(d.id); }
    } catch { /* use mock */ }
    setAppState('itinerary');
  }

  if (appState === 'init')      return <StateInit onStart={() => setAppState('greeting')} />;
  if (appState === 'greeting')  return <StateGreeting voice={voice} onNext={d => { setDestination(d); setAppState('gathering'); }} />;
  if (appState === 'gathering') return <StateGathering destination={destination} voice={voice} onDone={handleGathered} onBack={() => setAppState('greeting')} />;
  if (appState === 'itinerary') return <StateItinerary destination={destination} tripId={tripId} answers={answers} voice={voice} onApprove={() => setAppState('payment')} onIterate={() => setAppState('gathering')} />;
  if (appState === 'payment')   return <StatePayment destination={destination} voice={voice} onDone={() => { setAppState('init'); setDestination(''); setAnswers({}); setTripId(null); }} />;
  return null;
}
