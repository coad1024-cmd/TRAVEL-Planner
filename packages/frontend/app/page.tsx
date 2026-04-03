'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Send, RotateCcw, Check, MapPin, Calendar, Wallet, Users, Loader2, CreditCard, Smartphone, Building2, ChevronRight } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type AppState = 'init' | 'greeting' | 'gathering' | 'itinerary' | 'payment';

interface ChatMessage {
  role: 'agent' | 'user';
  text: string;
  delay?: number;
}

// ── Mandala SVG (decorative) ───────────────────────────────────────────────────

function MandalaBg() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none select-none"
      viewBox="0 0 800 800"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="400" cy="400" r="380" stroke="#D4AF37" strokeWidth="1"/>
      <circle cx="400" cy="400" r="300" stroke="#D4AF37" strokeWidth="0.5"/>
      <circle cx="400" cy="400" r="220" stroke="#D4AF37" strokeWidth="0.5"/>
      <circle cx="400" cy="400" r="140" stroke="#D4AF37" strokeWidth="0.5"/>
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i * 360) / 24;
        const rad = (angle * Math.PI) / 180;
        const x1 = 400 + 140 * Math.cos(rad);
        const y1 = 400 + 140 * Math.sin(rad);
        const x2 = 400 + 380 * Math.cos(rad);
        const y2 = 400 + 380 * Math.sin(rad);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#D4AF37" strokeWidth="0.3"/>;
      })}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 360) / 8;
        const rad = (angle * Math.PI) / 180;
        const cx = 400 + 260 * Math.cos(rad);
        const cy = 400 + 260 * Math.sin(rad);
        return <circle key={i} cx={cx} cy={cy} r="18" stroke="#D4AF37" strokeWidth="0.5"/>;
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

function ChatBubble({ msg, animate }: { msg: ChatMessage; animate?: boolean }) {
  const isAgent = msg.role === 'agent';
  return (
    <div
      className={`flex ${isAgent ? 'justify-start' : 'justify-end'} ${animate ? 'animate-fade-in' : ''}`}
    >
      {isAgent && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1 text-xs font-bold" style={{ background: 'linear-gradient(135deg,#1A3530,#2a4a40)', border: '1px solid rgba(212,175,55,0.4)', color: '#D4AF37' }}>
          K
        </div>
      )}
      <div
        className="max-w-[78%] px-4 py-3 text-sm leading-relaxed"
        style={isAgent ? {
          background: 'var(--khoj-surface-2)',
          border: '1px solid rgba(212,175,55,0.15)',
          borderRadius: '1rem 1rem 1rem 0.25rem',
          color: 'var(--khoj-text)',
        } : {
          background: 'linear-gradient(135deg, #B84C24, #D96030)',
          borderRadius: '1rem 1rem 0.25rem 1rem',
          color: '#fff',
        }}
      >
        {msg.text}
      </div>
    </div>
  );
}

// ── Mic Button ────────────────────────────────────────────────────────────────

function MicButton({ onClick, active }: { onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all ${active ? 'animate-pulse-ring-rust' : ''}`}
      style={{ background: 'linear-gradient(135deg,#B84C24,#D96030)' }}
      title="Voice input (focus)"
    >
      <Mic className="w-4 h-4 text-white"/>
    </button>
  );
}

// ── State 1: Initialization ───────────────────────────────────────────────────

function StateInit({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden" style={{ background: 'var(--khoj-bg)' }}>
      <MandalaBg />

      {/* Corner ornaments */}
      <div className="absolute top-4 left-4 w-16 h-16 opacity-30" style={{ borderTop: '2px solid #D4AF37', borderLeft: '2px solid #D4AF37', borderRadius: '4px 0 0 0' }}/>
      <div className="absolute top-4 right-4 w-16 h-16 opacity-30" style={{ borderTop: '2px solid #D4AF37', borderRight: '2px solid #D4AF37', borderRadius: '0 4px 0 0' }}/>
      <div className="absolute bottom-4 left-4 w-16 h-16 opacity-30" style={{ borderBottom: '2px solid #D4AF37', borderLeft: '2px solid #D4AF37', borderRadius: '0 0 0 4px' }}/>
      <div className="absolute bottom-4 right-4 w-16 h-16 opacity-30" style={{ borderBottom: '2px solid #D4AF37', borderRight: '2px solid #D4AF37', borderRadius: '0 0 4px 0' }}/>

      <div className="relative z-10 flex flex-col items-center gap-10 animate-slide-up px-6 text-center">

        {/* Badge */}
        <div className="text-xs tracking-[0.25em] uppercase font-medium px-4 py-1.5 rounded-full" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
          AI Travel Companion
        </div>

        {/* Logo text */}
        <div className="space-y-2">
          <div className="text-5xl md:text-6xl font-bold tracking-wider khoj-shimmer" style={{ fontFamily: "'Cinzel', serif" }}>
            KHOJ AI
          </div>
          <p className="text-[var(--khoj-muted)] text-base">One tap, and let&apos;s go!</p>
        </div>

        {/* Pulsing START button */}
        <button
          onClick={onStart}
          className="w-36 h-36 rounded-full khoj-btn-gold animate-pulse-ring flex flex-col items-center justify-center gap-1 shadow-2xl animate-float"
          style={{ fontSize: '1rem', letterSpacing: '0.1em' }}
        >
          <span className="text-xs font-semibold tracking-widest opacity-70 uppercase">Tap to</span>
          <span className="text-xl font-extrabold tracking-widest" style={{ fontFamily: "'Cinzel', serif" }}>START</span>
        </button>

        {/* Tagline */}
        <p className="text-[var(--khoj-text-dim)] text-sm max-w-xs leading-relaxed">
          Your AI eyes &amp; ears for every journey. Powered by 13 live agents.
        </p>
      </div>
    </div>
  );
}

// ── State 2: Greeting & Input ─────────────────────────────────────────────────

function StateGreeting({ onNext }: { onNext: (dest: string) => void }) {
  const [dest, setDest] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setShowInput(true), 1200);
    return () => clearTimeout(t);
  }, []);

  function handleMic() {
    setMicActive(true);
    inputRef.current?.focus();
    setTimeout(() => setMicActive(false), 2000);
  }

  function submit() {
    if (dest.trim()) onNext(dest.trim());
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: 'var(--khoj-bg)' }}>
      <MandalaBg />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        <div className="text-sm font-bold tracking-widest khoj-shimmer" style={{ fontFamily: "'Cinzel', serif" }}>KHOJ AI</div>
        <div className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37' }}>
          Agent&apos;s
        </div>
      </div>

      <div className="relative z-10 flex flex-col flex-1 max-w-lg mx-auto w-full px-6 pt-10 pb-8 gap-6">

        {/* Agent greeting bubble */}
        <div className="animate-fade-in">
          <ChatBubble msg={{ role: 'agent', text: "HEY! I'M KHOJ AI, YOUR EYES AND EARS FOR THIS TRIP. WHERE ARE WE DREAMING OF TODAY?" }} />
        </div>

        {showInput && (
          <div className="animate-fade-in space-y-4">
            {/* Destination input */}
            <div className="khoj-card p-5 space-y-3">
              <label className="block text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--khoj-muted)' }}>Going to...</label>
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 khoj-input px-3 py-3">
                  <MapPin className="w-4 h-4 shrink-0" style={{ color: 'var(--khoj-gold)' }} />
                  <input
                    ref={inputRef}
                    value={dest}
                    onChange={e => setDest(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submit()}
                    placeholder="Going to..."
                    className="bg-transparent flex-1 text-sm outline-none placeholder:text-[var(--khoj-text-dim)]"
                    style={{ color: 'var(--khoj-text)' }}
                  />
                </div>
                <MicButton onClick={handleMic} active={micActive} />
              </div>
            </div>

            {dest.trim() && (
              <button onClick={submit} className="w-full py-3 khoj-btn-gold text-sm animate-fade-in">
                Continue →
              </button>
            )}
          </div>
        )}
      </div>

      {/* Mic hint */}
      <div className="relative z-10 text-center pb-8 text-xs" style={{ color: 'var(--khoj-text-dim)' }}>
        Tap the mic or type your destination
      </div>
    </div>
  );
}

// ── State 3: Structured Gathering ─────────────────────────────────────────────

const GATHERING_STEPS = [
  { key: 'dates', question: 'Cool! {dest}. When&apos;s the vibe? Tell me your travel dates.', placeholder: 'e.g. Oct 15–20', icon: <Calendar className="w-4 h-4"/> },
  { key: 'budget', question: 'Perfect. What&apos;s your budget range? (₹₹₹ or a number)', placeholder: 'e.g. ₹50,000 or 50000', icon: <Wallet className="w-4 h-4"/> },
  { key: 'party', question: 'Nice! Who&apos;s coming along? (couple, family, solo, group)', placeholder: 'e.g. couple, 2 people', icon: <Users className="w-4 h-4"/> },
];

function StateGathering({ destination, onDone, onBack }: { destination: string; onDone: (answers: Record<string, string>) => void; onBack: () => void }) {
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'agent', text: `Cool! ${destination}. When's the vibe? Tell me your travel dates.` },
  ]);
  const [showTyping, setShowTyping] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [micActive, setMicActive]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showTyping]);

  async function submitAnswer() {
    if (!current.trim() || submitting) return;
    const key = GATHERING_STEPS[step].key;
    const newAnswers = { ...answers, [key]: current.trim() };
    setAnswers(newAnswers);
    setMessages(m => [...m, { role: 'user', text: current.trim() }]);
    setCurrent('');
    setShowTyping(true);

    await new Promise(r => setTimeout(r, 1000));
    setShowTyping(false);

    if (step + 1 < GATHERING_STEPS.length) {
      const nextQ = GATHERING_STEPS[step + 1].question.replace('{dest}', destination);
      setMessages(m => [...m, { role: 'agent', text: nextQ }]);
      setStep(s => s + 1);
    } else {
      setSubmitting(true);
      setMessages(m => [...m, { role: 'agent', text: `Okay, found this epic itinerary! Let me build your ${destination} plan...` }]);
      await new Promise(r => setTimeout(r, 1200));
      onDone(newAnswers);
    }
  }

  function handleMic() {
    setMicActive(true);
    inputRef.current?.focus();
    setTimeout(() => setMicActive(false), 2000);
  }

  const confirmed = Object.entries(answers).map(([k, v]) => {
    if (k === 'dates') return `📅 ${v}`;
    if (k === 'budget') return `💰 Budget: ${v}`;
    if (k === 'party') return `👥 ${v}`;
    return v;
  });

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: 'var(--khoj-bg)' }}>
      <MandalaBg />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        <button onClick={onBack} className="text-xs flex items-center gap-1" style={{ color: 'var(--khoj-muted)' }}>
          ← Back
        </button>
        <div className="text-xs font-bold tracking-widest khoj-shimmer" style={{ fontFamily: "'Cinzel', serif" }}>KHOJ AI</div>
        <div className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(184,76,36,0.15)', border: '1px solid rgba(184,76,36,0.3)', color: '#D96030' }}>
          Gathering Inputs
        </div>
      </div>

      {/* Confirmed info pills */}
      {confirmed.length > 0 && (
        <div className="relative z-10 flex flex-wrap gap-2 px-6 pt-4">
          {confirmed.map((c, i) => (
            <span key={i} className="text-xs px-3 py-1 rounded-full animate-fade-in" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)', color: '#D4AF37' }}>
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Chat area */}
      <div className="relative z-10 flex-1 overflow-y-auto px-6 pt-6 pb-4 space-y-4 max-w-lg mx-auto w-full">
        {messages.map((msg, i) => (
          <ChatBubble key={i} msg={msg} animate={i === messages.length - 1} />
        ))}
        {showTyping && (
          <div className="flex justify-start animate-fade-in">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1 text-xs font-bold" style={{ background: 'linear-gradient(135deg,#1A3530,#2a4a40)', border: '1px solid rgba(212,175,55,0.4)', color: '#D4AF37' }}>K</div>
            <TypingIndicator />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      {!submitting && (
        <div className="relative z-10 px-6 pb-8 max-w-lg mx-auto w-full">
          <div className="flex items-center gap-3 khoj-input px-4 py-3">
            <span style={{ color: 'var(--khoj-gold)' }}>{GATHERING_STEPS[step]?.icon}</span>
            <input
              ref={inputRef}
              value={current}
              onChange={e => setCurrent(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitAnswer()}
              placeholder={GATHERING_STEPS[step]?.placeholder}
              className="bg-transparent flex-1 text-sm outline-none placeholder:text-[var(--khoj-text-dim)]"
              style={{ color: 'var(--khoj-text)' }}
            />
            <MicButton onClick={handleMic} active={micActive} />
            <button
              type="button"
              onClick={submitAnswer}
              disabled={!current.trim()}
              className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-30 transition-opacity"
              style={{ background: current.trim() ? 'linear-gradient(135deg,#C9A227,#E8C840)' : 'var(--khoj-surface-2)' }}
            >
              <Send className="w-4 h-4" style={{ color: current.trim() ? '#0D1F1A' : '#6B9A85' }} />
            </button>
          </div>
          <p className="text-center text-xs mt-3" style={{ color: 'var(--khoj-text-dim)' }}>Iterating live…</p>
        </div>
      )}

      {submitting && (
        <div className="relative z-10 px-6 pb-8 flex justify-center">
          <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--khoj-gold)' }}>
            <Loader2 className="w-5 h-5 animate-spin" /> Building your itinerary…
          </div>
        </div>
      )}
    </div>
  );
}

// ── State 4: Itinerary / Plan Presentation ────────────────────────────────────

function StateItinerary({
  destination,
  tripId,
  answers,
  onApprove,
  onIterate,
}: {
  destination: string;
  tripId: string | null;
  answers: Record<string, string>;
  onApprove: () => void;
  onIterate: () => void;
}) {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: 'var(--khoj-bg)' }}>
      <MandalaBg />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        <div className="text-sm font-bold tracking-widest khoj-shimmer" style={{ fontFamily: "'Cinzel', serif" }}>KHOJ AI</div>
        <div className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(152,90,30,0.2)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
          Itinerary
        </div>
      </div>

      <div className="relative z-10 max-w-lg mx-auto w-full px-6 pt-6 pb-32 space-y-5 overflow-y-auto animate-slide-up">

        {/* Agent message */}
        <ChatBubble msg={{ role: 'agent', text: `Okay, found this epic itinerary! We fly to ${destination}, stay in a heritage Haveli, and explore the sights. Want to lock it in?` }} />

        {/* Plan card */}
        <div className="khoj-card overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, rgba(26,53,48,0.9),rgba(13,31,26,0.9))', borderBottom: '1px solid rgba(212,175,55,0.15)' }}>
            <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--khoj-muted)' }}>Your Dream Trip</div>
            <div className="text-xl font-bold" style={{ color: 'var(--khoj-gold)', fontFamily: "'Cinzel',serif" }}>{destination}</div>
            {answers.dates && <div className="text-xs mt-0.5" style={{ color: 'var(--khoj-text-dim)' }}>📅 {answers.dates}</div>}
          </div>

          {/* Flight */}
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(212,175,55,0.1)' }}>
            <div className="text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: 'var(--khoj-muted)' }}>Flight</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)' }}>
                  ✈️
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--khoj-text)' }}>Demo Airlines</div>
                  <div className="text-xs" style={{ color: 'var(--khoj-text-dim)' }}>Economy · DA-123</div>
                </div>
              </div>
              <div className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>
                {answers.budget ? `Budget: ${answers.budget}` : 'Budget: ₹₹₹'}
              </div>
            </div>
          </div>

          {/* Stay */}
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(212,175,55,0.1)' }}>
            <div className="text-xs uppercase tracking-widest mb-2 font-semibold" style={{ color: 'var(--khoj-muted)' }}>Stay</div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(152,90,30,0.15)', border: '1px solid rgba(184,76,36,0.2)' }}>
                  🏰
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--khoj-text)' }}>Heritage Haveli</div>
                  <div className="text-xs" style={{ color: 'var(--khoj-text-dim)' }}>{destination} · 3 nights</div>
                </div>
              </div>
              <div className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(152,90,30,0.12)', color: '#D96030' }}>
                Boutique
              </div>
            </div>
          </div>

          {/* Days */}
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

      {/* Bottom CTAs */}
      <div className="fixed bottom-0 inset-x-0 px-6 pb-8 pt-4 z-20 max-w-lg mx-auto" style={{ background: 'linear-gradient(to top, var(--khoj-bg) 80%, transparent)' }}>
        <div className="flex gap-3">
          <button onClick={onIterate} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all" style={{ background: 'var(--khoj-surface)', border: '1px solid rgba(212,175,55,0.2)', color: 'var(--khoj-muted)' }}>
            <RotateCcw className="w-4 h-4" /> Iterate
          </button>
          <button onClick={onApprove} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl khoj-btn-gold text-sm">
            <Check className="w-4 h-4" /> Approve &amp; Book
          </button>
        </div>
        {tripId && (
          <button
            onClick={() => window.location.href = `/trips/${tripId}`}
            className="mt-3 w-full flex items-center justify-center gap-2 py-3 text-xs rounded-xl"
            style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.12)', color: 'var(--khoj-muted)' }}
          >
            View full itinerary details <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── State 5: Payment Bridge ───────────────────────────────────────────────────

function StatePayment({ destination, onDone }: { destination: string; onDone: () => void }) {
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  async function handlePay(method: string) {
    setSelected(method);
    setLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    setLoading(false);
    setPaid(true);
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: 'var(--khoj-bg)' }}>
      <MandalaBg />

      <div className="relative z-10 flex items-center justify-between px-6 pt-6">
        <div className="text-sm font-bold tracking-widest khoj-shimmer" style={{ fontFamily: "'Cinzel', serif" }}>KHOJ AI</div>
        <div className="text-xs px-3 py-1 rounded-full" style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.3)', color: '#D4AF37' }}>
          Payment
        </div>
      </div>

      <div className="relative z-10 max-w-lg mx-auto w-full px-6 pt-6 pb-10 space-y-6 animate-slide-up">

        {!paid ? (
          <>
            {/* Agent message */}
            <ChatBubble msg={{ role: 'agent', text: `Looks perfect! Ready to book this ${destination} dream? Let's complete your booking.` }} />

            {/* Payment portal */}
            <div className="khoj-card overflow-hidden">
              <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(212,175,55,0.12)' }}>
                <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--khoj-muted)' }}>Secure Payment Portal</div>
                <div className="text-xl font-bold" style={{ color: 'var(--khoj-gold)', fontFamily: "'Cinzel',serif" }}>₹28,500 all-in</div>
              </div>

              <div className="px-5 py-5 space-y-3">
                {[
                  { id: 'upi', icon: <Smartphone className="w-5 h-5"/>, label: 'UPI', desc: 'Instant payment' },
                  { id: 'card', icon: <CreditCard className="w-5 h-5"/>, label: 'Card', desc: 'Debit / Credit' },
                  { id: 'netbanking', icon: <Building2 className="w-5 h-5"/>, label: 'Net Banking', desc: 'All major banks' },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => handlePay(m.id)}
                    disabled={loading}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all"
                    style={{
                      background: selected === m.id ? 'rgba(212,175,55,0.12)' : 'var(--khoj-surface-2)',
                      border: selected === m.id ? '1px solid rgba(212,175,55,0.5)' : '1px solid rgba(212,175,55,0.1)',
                    }}
                  >
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

            <p className="text-center text-xs" style={{ color: 'var(--khoj-text-dim)' }}>
              🔒 256-bit SSL encrypted · Zero-fee transactions
            </p>
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
            <div className="khoj-card px-6 py-4 w-full">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📱</span>
                <div className="text-left">
                  <div className="text-sm font-semibold" style={{ color: 'var(--khoj-text)' }}>Itinerary sent!</div>
                  <div className="text-xs" style={{ color: 'var(--khoj-text-dim)' }}>Check WhatsApp &amp; Email</div>
                </div>
              </div>
            </div>
            <button onClick={onDone} className="w-full py-3.5 khoj-btn-gold text-sm mt-2">
              Plan Another Trip →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Root Component ─────────────────────────────────────────────────────────────

export default function KhojAIPage() {
  const router = useRouter();
  const [appState, setAppState] = useState<AppState>('init');
  const [destination, setDestination] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [tripId, setTripId] = useState<string | null>(null);

  function handleStart() { setAppState('greeting'); }

  function handleDestination(dest: string) {
    setDestination(dest);
    setAppState('gathering');
  }

  async function handleGathered(ans: Record<string, string>) {
    setAnswers(ans);
    // Parse gathered answers into API payload
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
      if (res.ok) {
        const data = await res.json();
        setTripId(data.id);
      }
    } catch { /* silently use mock */ }
    setAppState('itinerary');
  }

  function handleApprove() { setAppState('payment'); }
  function handleIterate() { setAppState('gathering'); }
  function handleDone() {
    setAppState('init');
    setDestination('');
    setAnswers({});
    setTripId(null);
  }

  if (appState === 'init')      return <StateInit onStart={handleStart} />;
  if (appState === 'greeting')  return <StateGreeting onNext={handleDestination} />;
  if (appState === 'gathering') return <StateGathering destination={destination} onDone={handleGathered} onBack={() => setAppState('greeting')} />;
  if (appState === 'itinerary') return <StateItinerary destination={destination} tripId={tripId} answers={answers} onApprove={handleApprove} onIterate={handleIterate} />;
  if (appState === 'payment')   return <StatePayment destination={destination} onDone={handleDone} />;
  return null;
}
