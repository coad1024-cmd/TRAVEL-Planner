'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Volume2, VolumeX, Send, ArrowLeft,
  Plane, Hotel, MapPin, Calendar, Wallet, Users,
  CheckCircle2, XCircle, CreditCard, Smartphone,
  Building2, Clock, ChevronDown, ChevronUp,
  Sparkles, Loader2, Shield, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '../../lib/utils';

// ─── Types ───────────────────────────────────────────────

interface VisualState {
  step: string;
  transcript: { role: string; content: string; timestamp: string }[];
  structured_inputs: any;
  missing_fields: string[];
  itinerary: any[] | null;
  budget_dashboard: any | null;
  payment_status: string;
  payment_method: string | null;
  booking_confirmation: any | null;
  orchestration_status?: string;
}

interface ManagerResponse {
  voice_text: string;
  visual_state: VisualState;
  intent: string;
  correlation_id: string;
}

// ─── Voice Hook ──────────────────────────────────────────

function useVoice(language: string = 'en') {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = language === 'hi' ? 'hi-IN' : 'en-US';

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const t = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += t;
            } else {
              interimTranscript += t;
            }
          }
          setTranscript(finalTranscript || interimTranscript);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [language]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening && !isSpeaking) {
      setTranscript('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {}
    }
  }, [isListening, isSpeaking]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Select voice based on language
    const voices = synthRef.current.getVoices();
    if (language === 'hi' || language === 'hinglish') {
      const hiVoice = voices.find(v => v.lang.startsWith('hi')) || voices.find(v => v.lang.startsWith('en-IN'));
      if (hiVoice) utterance.voice = hiVoice;
    } else {
      const enVoice = voices.find(v => v.lang.startsWith('en-US')) || voices.find(v => v.lang.startsWith('en'));
      if (enVoice) utterance.voice = enVoice;
    }

    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  }, [voiceEnabled, language]);

  const stopSpeaking = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return { isListening, isSpeaking, transcript, voiceEnabled, setVoiceEnabled, startListening, stopListening, speak, stopSpeaking, setTranscript };
}

// ─── Budget Pie Chart ────────────────────────────────────

function BudgetPie({ budget }: { budget: any }) {
  if (!budget?.by_category) return null;
  const categories = [
    { key: 'transport', label: 'Transport', color: 'hsl(var(--primary))' },
    { key: 'accommodation', label: 'Hotels', color: 'hsl(var(--accent))' },
    { key: 'excursions', label: 'Activities', color: 'hsl(var(--success))' },
    { key: 'food', label: 'Food', color: 'hsl(var(--warning))' },
    { key: 'contingency', label: 'Buffer', color: 'hsl(var(--muted-foreground))' },
  ];
  const total = Object.values(budget.by_category).reduce((s: number, c: any) => s + (c?.amount || 0), 0);
  let cumulative = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-32 h-32 shrink-0">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          {categories.map((cat) => {
            const amount = budget.by_category[cat.key]?.amount || 0;
            const pct = total > 0 ? (amount / total) * 100 : 0;
            const offset = cumulative;
            cumulative += pct;
            return (
              <circle
                key={cat.key}
                cx="18" cy="18" r="15.915"
                fill="none"
                strokeWidth="3.5"
                stroke={cat.color}
                strokeDasharray={`${pct} ${100 - pct}`}
                strokeDashoffset={`${-offset}`}
                className="transition-all duration-700"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold">{budget.percent_used}%</span>
          <span className="text-[10px] text-muted-foreground">used</span>
        </div>
      </div>
      <div className="space-y-1.5 flex-1">
        {categories.map((cat) => (
          <div key={cat.key} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
            <span className="text-muted-foreground flex-1">{cat.label}</span>
            <span className="font-semibold tabular-nums">
              {(budget.by_category[cat.key]?.amount || 0).toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Payment Card ────────────────────────────────────────

function PaymentOption({ icon, label, sublabel, selected, onClick }: {
  icon: React.ReactNode; label: string; sublabel: string; selected: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all hover:shadow-md",
        selected
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
          : "border-border hover:border-primary/30"
      )}
    >
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center transition-colors", selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
        {icon}
      </div>
      <div className="text-sm font-bold">{label}</div>
      <div className="text-[10px] text-muted-foreground">{sublabel}</div>
    </button>
  );
}

// ─── Main Page ───────────────────────────────────────────

export default function InteractPage() {
  const [started, setStarted] = useState(false);
  const [travelerId] = useState(() => typeof window !== 'undefined' ? `traveler-${Date.now()}` : 'traveler-0');
  const [visualState, setVisualState] = useState<VisualState | null>(null);
  const [loading, setLoading] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1]));
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'hi' | 'hinglish'>('en');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const voice = useVoice(language);

  // ─── Real-time Sync (SSE / Polling Fallback) ───────────
  useEffect(() => {
    if (!started || !travelerId) return;

    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    if (typeof window !== 'undefined' && typeof window.EventSource !== 'undefined') {
      eventSource = new EventSource(`/api/interact/stream?travelerId=${travelerId}`);
      
      eventSource.onmessage = (e) => {
        try {
          const state: VisualState = JSON.parse(e.data);
          setVisualState(prev => {
            // When moving from ORCHESTRATION to PLAN_GENERATION, trigger the backend to speak the plan
            if (prev && prev.step === 'ORCHESTRATION' && state.step === 'PLAN_GENERATION') {
              setTimeout(() => {
                sendMessage(''); // Send an empty message to trigger the voice response
              }, 500);
            }
            return state;
          });
        } catch (err) {}
      };

      eventSource.onerror = () => {
        // Will auto-reconnect or fail gracefully
      };
    } else {
      // Fallback
      pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/interact/stream?travelerId=${travelerId}&poll=true`);
          const text = await res.text();
          const match = text.match(/data: (.*)\n\n/);
          if (match && match[1]) {
            const state: VisualState = JSON.parse(match[1]);
            setVisualState(prev => {
              if (prev && prev.step === 'ORCHESTRATION' && state.step === 'PLAN_GENERATION') {
                setTimeout(() => {
                  sendMessage('');
                }, 500);
              }
              return state;
            });
          }
        } catch(err) {}
      }, 3000);
    }

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [started, travelerId]);
  
  // Auto-scroll transcript
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visualState?.transcript]);

  // Send message to manager
  const sendMessage = useCallback(async (message: string, paymentMethod?: string) => {
    if (!message.trim() && !paymentMethod) return;
    setLoading(true);
    try {
      const res = await fetch('/api/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          travelerId,
          language,
          ...(paymentMethod && { payment_method: paymentMethod }),
        }),
      });
      const data: ManagerResponse = await res.json();
      setVisualState(data.visual_state);

      // Speak the response
      if (data.voice_text) {
        voice.speak(data.voice_text);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setLoading(false);
    }
  }, [travelerId, voice, language]);

  // Handle start interaction
  const handleStart = useCallback(async () => {
    setStarted(true);
    await sendMessage('Hello, I want to plan a trip');
  }, [sendMessage]);

  // Handle voice input complete
  useEffect(() => {
    if (!voice.isListening && voice.transcript && started) {
      const msg = voice.transcript;
      voice.setTranscript('');
      sendMessage(msg);
    }
  }, [voice.isListening, voice.transcript, started, sendMessage]);

  // Handle text submit
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      sendMessage(textInput);
      setTextInput('');
    }
  };

  // Handle payment selection
  const handlePayment = async (method: string) => {
    setSelectedPayment(method);
    await sendMessage('Process my payment', method);
  };

  const toggleDay = (day: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const step = visualState?.step || 'INIT';

  // ── Homepage: Start Interaction ──
  if (!started) {
    return (
      <div className="relative min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 -left-4 w-96 h-96 bg-primary/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-300/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-300/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />

        <div className="z-10 text-center space-y-8 max-w-lg">
          <div className="inline-flex items-center gap-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-primary/20 text-primary text-xs font-bold px-4 py-1.5 rounded-full">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            VOICE-FIRST AI TRAVEL PLANNING
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
            Plan your trip with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">your voice</span>
          </h1>

          <p className="text-muted-foreground text-lg leading-relaxed">
            Just speak naturally. Our Manager Agent will orchestrate 13 specialist AIs to craft your perfect journey.
          </p>

          <button
            onClick={handleStart}
            className="group relative inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-lg font-bold rounded-full shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 transition-all"
          >
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-20" />
            <Mic className="w-6 h-6" />
            Start Interaction
          </button>

          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5" /> Voice In/Out</span>
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Secure Payments</span>
            <span className="flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> 13 AI Agents</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Active Interaction ──
  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-6 animate-fade-in">

      {/* Left Panel: Voice + Transcript */}
      <div className="flex-1 flex flex-col min-h-0">

        {/* Voice Orb */}
        <div className="flex flex-col items-center py-8">
          <div className="relative">
            {/* Outer ring animations */}
            {(voice.isListening || voice.isSpeaking) && (
              <>
                <div className={cn("absolute inset-0 rounded-full animate-ping opacity-20", voice.isListening ? "bg-primary" : "bg-accent")} style={{ animationDuration: '1.5s' }} />
                <div className={cn("absolute -inset-3 rounded-full opacity-10", voice.isListening ? "bg-primary" : "bg-accent")} style={{ animation: 'pulse 2s ease-in-out infinite' }} />
                <div className={cn("absolute -inset-6 rounded-full opacity-5", voice.isListening ? "bg-primary" : "bg-accent")} style={{ animation: 'pulse 2.5s ease-in-out infinite' }} />
              </>
            )}

            {/* Main orb */}
            <button
              onClick={voice.isListening ? voice.stopListening : voice.startListening}
              disabled={loading || voice.isSpeaking}
              className={cn(
                "relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl",
                voice.isListening
                  ? "bg-primary text-primary-foreground shadow-primary/40 scale-110"
                  : voice.isSpeaking
                    ? "bg-accent text-accent-foreground shadow-accent/40"
                    : "bg-card text-foreground border-2 border-border hover:border-primary/50 hover:shadow-primary/20"
              )}
            >
              {loading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : voice.isListening ? (
                <Mic className="w-8 h-8 animate-pulse" />
              ) : voice.isSpeaking ? (
                <Volume2 className="w-8 h-8" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>
          </div>

          <div className="mt-4 text-sm text-muted-foreground text-center">
            {loading ? 'Thinking...' : voice.isListening ? 'Listening...' : voice.isSpeaking ? 'Speaking...' : 'Tap to speak'}
          </div>

          {/* Live transcript while listening */}
          {voice.isListening && voice.transcript && (
            <div className="mt-2 px-4 py-2 bg-primary/5 rounded-xl text-sm text-primary italic max-w-sm text-center">
              {voice.transcript}
            </div>
          )}

          {/* Voice / mute controls */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex bg-muted rounded-lg p-1">
              {[
                { id: 'en', label: 'EN' },
                { id: 'hi', label: 'HI' },
                { id: 'hinglish', label: 'HIN' }
              ].map(lang => (
                <button
                  key={lang.id}
                  onClick={() => setLanguage(lang.id as any)}
                  className={cn(
                    "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                    language === lang.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {lang.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => voice.setVoiceEnabled(!voice.voiceEnabled)}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground ml-2"
              title={voice.voiceEnabled ? "Mute voice" : "Enable voice"}
            >
              {voice.voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            {voice.isSpeaking && (
              <button onClick={voice.stopSpeaking} className="px-3 py-1 text-xs bg-muted rounded-lg hover:bg-muted/80">
                Stop
              </button>
            )}
          </div>
        </div>

        {/* Transcript / Chat */}
        <div className="flex-1 overflow-y-auto px-4 space-y-3 min-h-0 max-h-[40vh] lg:max-h-none">
          {visualState?.transcript.map((turn, i) => (
            <div key={i} className={cn("flex", turn.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                "max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
                turn.role === 'user'
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border rounded-bl-md"
              )}>
                {turn.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 flex gap-1">
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce-dot" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce-dot" style={{ animationDelay: '0.16s' }} />
                <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce-dot" style={{ animationDelay: '0.32s' }} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Text input fallback */}
        <form onSubmit={handleTextSubmit} className="px-4 py-4 border-t border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Or type your message..."
              className="flex-1 bg-muted rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !textInput.trim()}
              className="p-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Right Panel: Visual Sync */}
      <div className="w-full lg:w-[420px] shrink-0 space-y-4 overflow-y-auto max-h-[50vh] lg:max-h-[calc(100vh-8rem)] pb-4">

        {/* Step Indicator */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Session Status
          </div>
          <div className="flex gap-1.5">
            {['INIT', 'REQUIREMENT_GATHERING', 'ORCHESTRATION', 'PLAN_GENERATION', 'USER_DECISION_LOOP', 'CONFIRMATION', 'PAYMENT', 'POST_PAYMENT'].map((s, i) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-500",
                  step === s ? "bg-primary" :
                  ['INIT', 'REQUIREMENT_GATHERING', 'ORCHESTRATION', 'PLAN_GENERATION', 'USER_DECISION_LOOP', 'CONFIRMATION', 'PAYMENT', 'POST_PAYMENT'].indexOf(step) > i
                    ? "bg-primary/40"
                    : "bg-muted"
                )}
              />
            ))}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {step === 'INIT' && 'Starting...'}
            {step === 'REQUIREMENT_GATHERING' && 'Collecting your preferences'}
            {step === 'ORCHESTRATION' && (
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {visualState?.orchestration_status || 'Coordinating specialist agents...'}
              </span>
            )}
            {step === 'PLAN_GENERATION' && 'Generating your itinerary'}
            {step === 'USER_DECISION_LOOP' && 'Review your plan'}
            {step === 'CONFIRMATION' && 'Awaiting your confirmation'}
            {step === 'PAYMENT' && 'Payment'}
            {step === 'POST_PAYMENT' && 'Booking confirmed!'}
          </div>
        </div>

        {/* Structured Inputs Card */}
        {visualState?.structured_inputs && Object.keys(visualState.structured_inputs).length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4 animate-fade-in">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Trip Details</div>
            <div className="space-y-2.5">
              {visualState.structured_inputs.destination && (
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-medium">{visualState.structured_inputs.destination}</span>
                </div>
              )}
              {visualState.structured_inputs.dates?.start && (
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm">{visualState.structured_inputs.dates.start} to {visualState.structured_inputs.dates.end}</span>
                </div>
              )}
              {visualState.structured_inputs.budget?.amount && (
                <div className="flex items-center gap-2.5">
                  <Wallet className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-medium">
                    {visualState.structured_inputs.budget.currency} {visualState.structured_inputs.budget.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
              {visualState.structured_inputs.party_size && (
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm">{visualState.structured_inputs.party_size} travellers</span>
                </div>
              )}
              {visualState.missing_fields.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Still needed</div>
                  <div className="flex flex-wrap gap-1.5">
                    {visualState.missing_fields.map(f => (
                      <span key={f} className="px-2 py-0.5 text-[10px] bg-warning/10 text-warning rounded-md font-medium">
                        {f.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Itinerary Dashboard */}
        {visualState?.itinerary && visualState.itinerary.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4 animate-fade-in">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Itinerary</div>

            {/* Budget Overview */}
            {visualState.budget_dashboard && (
              <div className="mb-4 p-3 bg-muted/50 rounded-xl">
                <BudgetPie budget={visualState.budget_dashboard} />
              </div>
            )}

            {/* Day Cards */}
            <div className="space-y-2">
              {visualState.itinerary.map((day: any) => (
                <div key={day.day_number} className="border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleDay(day.day_number)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                        {day.day_number}
                      </span>
                      <span className="text-sm font-medium">{day.date}</span>
                      <span className={cn("px-1.5 py-0.5 text-[9px] rounded font-bold uppercase",
                        day.risk_level === 'low' ? 'bg-success/10 text-success' :
                        day.risk_level === 'medium' ? 'bg-warning/10 text-warning' :
                        'bg-destructive/10 text-destructive'
                      )}>{day.risk_level}</span>
                    </div>
                    {expandedDays.has(day.day_number) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {expandedDays.has(day.day_number) && (
                    <div className="px-3 pb-3 space-y-2 border-t border-border">
                      {day.weather_summary && (
                        <div className="text-[10px] text-muted-foreground pt-2">{day.weather_summary}</div>
                      )}
                      {day.segments?.map((seg: any, si: number) => (
                        <div key={si} className="flex items-start gap-2 py-1.5">
                          <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                            seg.type === 'transport' ? 'bg-blue-500/10 text-blue-500' :
                            seg.type === 'accommodation' ? 'bg-amber-500/10 text-amber-500' :
                            seg.type === 'excursion' ? 'bg-green-500/10 text-green-500' :
                            'bg-purple-500/10 text-purple-500'
                          )}>
                            {seg.type === 'transport' ? <Plane className="w-3 h-3" /> :
                             seg.type === 'accommodation' ? <Hotel className="w-3 h-3" /> :
                             <MapPin className="w-3 h-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">
                              {seg.type === 'transport' ? `${seg.carrier || seg.mode} ${seg.origin?.name || ''} → ${seg.destination?.name || ''}` :
                               seg.type === 'accommodation' ? seg.property_name :
                               seg.activity_name || seg.restaurant_name || 'Activity'}
                            </div>
                            {seg.cost && (
                              <div className="text-[10px] text-muted-foreground">
                                {seg.cost.currency} {seg.cost.amount?.toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Accept/Reject buttons */}
            {step === 'USER_DECISION_LOOP' && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => sendMessage('Looks perfect, I love this plan!')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-success text-success-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Accept Plan
                </button>
                <button
                  onClick={() => sendMessage("I'd like some changes to this plan")}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-muted text-muted-foreground rounded-xl font-bold text-sm hover:bg-muted/80 transition-all"
                >
                  <XCircle className="w-4 h-4" />
                  Request Changes
                </button>
              </div>
            )}
          </div>
        )}

        {/* Payment Screen */}
        {(step === 'PAYMENT' || step === 'CONFIRMATION') && visualState?.payment_status !== 'success' && (
          <div className="bg-card border border-border rounded-2xl p-4 animate-fade-in">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Payment</div>

            {visualState?.payment_status === 'processing' ? (
              <div className="flex flex-col items-center py-8 gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <div className="text-sm font-medium">Processing payment...</div>
              </div>
            ) : (
              <>
                <div className="text-center mb-4 p-3 bg-muted/50 rounded-xl">
                  <div className="text-2xl font-bold">
                    {visualState?.structured_inputs?.budget?.currency} {visualState?.structured_inputs?.budget?.amount?.toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-muted-foreground">Total amount</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <PaymentOption
                    icon={<Smartphone className="w-5 h-5" />}
                    label="UPI"
                    sublabel="Google Pay, PhonePe"
                    selected={selectedPayment === 'UPI'}
                    onClick={() => handlePayment('UPI')}
                  />
                  <PaymentOption
                    icon={<CreditCard className="w-5 h-5" />}
                    label="Credit Card"
                    sublabel="Visa, Mastercard"
                    selected={selectedPayment === 'CreditCard'}
                    onClick={() => handlePayment('CreditCard')}
                  />
                  <PaymentOption
                    icon={<CreditCard className="w-5 h-5" />}
                    label="Debit Card"
                    sublabel="All banks"
                    selected={selectedPayment === 'DebitCard'}
                    onClick={() => handlePayment('DebitCard')}
                  />
                  <PaymentOption
                    icon={<Building2 className="w-5 h-5" />}
                    label="EMI"
                    sublabel="Easy installments"
                    selected={selectedPayment === 'EMI'}
                    onClick={() => handlePayment('EMI')}
                  />
                </div>
              </>
            )}

            {visualState?.payment_status === 'failed' && (
              <div className="mt-3 p-3 bg-destructive/10 text-destructive rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Payment failed. Please try again.
              </div>
            )}
          </div>
        )}

        {/* Booking Confirmation */}
        {visualState?.booking_confirmation && (
          <div className="bg-gradient-to-br from-success/10 to-primary/10 border border-success/20 rounded-2xl p-5 animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-6 h-6 text-success" />
              <span className="font-bold text-lg">Booking Confirmed!</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Booking ID</span>
                <span className="font-mono font-bold">{visualState.booking_confirmation.booking_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Destination</span>
                <span className="font-medium">{visualState.booking_confirmation.destination}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold">{visualState.booking_confirmation.currency} {visualState.booking_confirmation.total_amount?.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment</span>
                <span>{visualState.booking_confirmation.payment_method}</span>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-success/20">
                <span className={cn("px-2 py-1 rounded-md text-[10px] font-bold", visualState.booking_confirmation.whatsapp_sent ? "bg-success/20 text-success" : "bg-muted text-muted-foreground")}>
                  WhatsApp {visualState.booking_confirmation.whatsapp_sent ? 'Sent' : 'Pending'}
                </span>
                <span className={cn("px-2 py-1 rounded-md text-[10px] font-bold", visualState.booking_confirmation.email_sent ? "bg-success/20 text-success" : "bg-muted text-muted-foreground")}>
                  Email {visualState.booking_confirmation.email_sent ? 'Sent' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation step buttons */}
        {step === 'CONFIRMATION' && (
          <div className="flex gap-2">
            <button
              onClick={() => sendMessage('Yes, I confirm. Go ahead with the payment.')}
              className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-all"
            >
              Confirm & Pay
            </button>
            <button
              onClick={() => sendMessage("No, I'd like to go back and review.")}
              className="flex-1 py-3 bg-muted text-muted-foreground rounded-xl font-bold text-sm hover:bg-muted/80 transition-all"
            >
              Go Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
