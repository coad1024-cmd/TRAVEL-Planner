'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Siren,
  CloudSun,
  MapPin,
  Lightbulb,
  Hospital,
  Bot,
  Send,
  Plus,
  Camera,
  Loader2,
  ReceiptText,
  ChevronDown,
  Plane,
  Bell,
  AlertTriangle,
  Clock,
  Hotel,
  Globe,
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import type { LiveStatus, FlightStatus, HotelNotification, TripAlert } from '../../../../lib/live-status';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Expense {
  id: number;
  description: string;
  amount: number;
  currency: string;
  category: string;
  time: string;
}

const MOCK_EXPENSES: Expense[] = [
  { id: 1, description: 'Cab to Betaab Valley', amount: 400, currency: 'INR', category: 'Transport', time: '09:00 AM' },
  { id: 2, description: 'Lunch at Wangnoo Dhaba', amount: 650, currency: 'INR', category: 'Food', time: '01:30 PM' },
  { id: 3, description: 'Handicraft souvenir', amount: 1200, currency: 'INR', category: 'Shopping', time: '04:00 PM' },
];

const CATEGORY_COLORS: Record<string, string> = {
  Transport: 'bg-primary/10 text-primary',
  Food: 'bg-warning/10 text-warning',
  Shopping: 'bg-accent/20 text-accent-foreground',
  Activities: 'bg-success/10 text-success',
  Other: 'bg-muted text-muted-foreground',
};

function LiveStatusPanel({ tripId }: { tripId: string }) {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [language, setLanguage] = useState('auto');
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // SSE real-time connection (Issue #2)
    const es = new EventSource(`/api/trips/${tripId}/stream`);

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.trip_id) setStatus(data);
      } catch {}
    };

    es.onerror = () => {
      setConnected(false);
      // Fallback: one-shot poll
      fetch(`/api/trips/${tripId}/live-status`)
        .then(r => r.json())
        .then(setStatus)
        .catch(() => {});
    };

    return () => es.close();
  }, [tripId]);

  if (!status) return null;

  const unresolvedAlerts = status.alerts.filter(a => !a.resolved);
  const delayedFlights = status.flights.filter(f => f.status === 'delayed');
  const pendingHotelActions = status.hotel_notifications.filter(n => n.action_required);

  if (unresolvedAlerts.length === 0 && delayedFlights.length === 0 && pendingHotelActions.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
        <Bell className="h-4 w-4 text-warning" />
        <h2 className="text-sm font-semibold text-foreground">Live Updates</h2>
        <span className={cn('w-2 h-2 rounded-full', connected ? 'bg-success animate-pulse' : 'bg-muted-foreground')} title={connected ? 'Connected' : 'Disconnected'} />
        <span className="w-5 h-5 rounded-full bg-warning text-warning-foreground text-xs font-bold flex items-center justify-center ml-auto">
          {unresolvedAlerts.length + delayedFlights.length + pendingHotelActions.length}
        </span>
      </div>
      <div className="divide-y divide-border">
        {delayedFlights.map(f => (
          <div key={f.flight_number} className="flex items-start gap-3 px-5 py-3.5 bg-warning/5">
            <Plane className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground">
                {f.flight_number} ({f.route}) delayed {f.delay_minutes} min
              </div>
              {f.gate && <div className="text-xs text-muted-foreground mt-0.5">Gate {f.gate} · Terminal {f.terminal}</div>}
              {f.downstream_impact && (
                <div className="text-xs text-warning mt-1">{f.downstream_impact}</div>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-warning bg-warning/15 border border-warning/25 px-2.5 py-1 rounded-full shrink-0">
              <Clock className="h-3 w-3" />+{f.delay_minutes}m
            </div>
          </div>
        ))}
        {pendingHotelActions.map((n, i) => (
          <div key={i} className="flex items-start gap-3 px-5 py-3.5 bg-primary/5">
            <Hotel className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground">{n.property}</div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</div>
            </div>
            {n.action_required && (
              <button className="text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg shrink-0 hover:bg-primary/90 transition-colors">
                Confirm
              </button>
            )}
          </div>
        ))}
        {unresolvedAlerts.slice(0, 2).map(alert => (
          <div key={alert.id} className="flex items-start gap-3 px-5 py-3.5">
            <AlertTriangle className={cn('h-4 w-4 shrink-0 mt-0.5', alert.severity === 'critical' ? 'text-destructive' : 'text-warning')} />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">{alert.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{alert.body}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-5 py-3 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="text-xs text-muted-foreground bg-transparent border-none focus:outline-none cursor-pointer"
            title="Concierge response language"
          >
            <option value="auto">Auto language</option>
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
            <option value="Urdu">Urdu</option>
            <option value="French">French</option>
            <option value="German">German</option>
          </select>
        </div>
        <span className="text-xs text-muted-foreground">{new Date(status.last_updated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}

export default function ActiveTripPage({ params }: { params: { id: string } }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your AI travel concierge for Pahalgam. Ask me about local restaurants, weather, attractions, emergency contacts, or anything else!",
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [language, setLanguage] = useState('auto');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [expenses, setExpenses] = useState<Expense[]>(MOCK_EXPENSES);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: 'Food' });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setSending(true);
    try {
      const res = await fetch('/api/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, language, context: { location: 'Pahalgam, Kashmir', day: 2 } }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I had trouble connecting. Please try again.' }]);
    } finally {
      setSending(false);
    }
  }

  function handleAddExpense(e: FormEvent) {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) return;
    setExpenses((prev) => [
      {
        id: Date.now(),
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        currency: 'INR',
        category: newExpense.category,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev,
    ]);
    setNewExpense({ description: '', amount: '', category: 'Food' });
    setShowAddExpense(false);
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header banner */}
      <div className="bg-primary rounded-2xl p-5 text-primary-foreground">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">Active Trip</div>
            <h1 className="text-2xl font-bold">Day 2 — Fri, 11 Apr 2026</h1>
            <div className="flex items-center gap-1.5 text-sm opacity-80 mt-1">
              <MapPin className="h-3.5 w-3.5" />
              Pahalgam, Kashmir
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Link
              href={`/trips/${params.id}`}
              className="flex items-center gap-1.5 text-xs opacity-70 hover:opacity-100 transition-opacity"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to itinerary
            </Link>
            <span className="flex items-center gap-1.5 text-xs bg-success/20 border border-success/30 text-success-foreground px-2.5 py-1 rounded-full font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              On track
            </span>
          </div>
        </div>
      </div>

      {/* Issue #2: Post-booking live status — flight delays, hotel notifications, alerts */}
      <LiveStatusPanel tripId={params.id} />

      {/* Emergency button */}
      <button className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold py-4 px-6 rounded-xl text-base shadow-md transition-all hover:shadow-lg active:scale-[0.99] flex items-center justify-center gap-3 min-h-[60px]">
        <Siren className="h-5 w-5" />
        EMERGENCY — Get Help Now
      </button>

      {/* Morning briefing */}
      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <CloudSun className="h-4.5 w-4.5 text-warning" size={18} />
          <h2 className="text-sm font-semibold text-foreground">Morning Briefing</h2>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BriefingCard
            icon={<CloudSun className="h-4 w-4 text-warning" />}
            title="Weather"
            body="Partly cloudy, 15°C. Light showers expected after 3 PM. Carry a rain jacket!"
            bg="bg-warning/5 border-warning/15"
          />
          <BriefingCard
            icon={<MapPin className="h-4 w-4 text-primary" />}
            title="Today's Plan"
            body="Betaab Valley Trek (9:00 AM) → Lunch at Wangnoo Dhaba → Chandanwari Snow Point (3:00 PM)"
            bg="bg-primary/5 border-primary/15"
          />
          <BriefingCard
            icon={<Lightbulb className="h-4 w-4 text-success" />}
            title="Local Tip"
            body="Betaab Valley is named after the 1983 Bollywood film. Best photography spot is near the Lidder river bend."
            bg="bg-success/5 border-success/15"
          />
          <BriefingCard
            icon={<Hospital className="h-4 w-4 text-destructive" />}
            title="Nearest Hospital"
            body="District Hospital Pahalgam — 4.5 km. Emergency: 01936-243220"
            bg="bg-destructive/5 border-destructive/15"
          />
        </div>
      </div>

      {/* Concierge chat */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="bg-primary px-5 py-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-foreground/15 flex items-center justify-center shrink-0">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-primary-foreground">AI Travel Concierge</div>
            <div className="text-xs text-primary-foreground/70">Always available to help</div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="text-xs bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/20 rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value="auto">Auto</option>
              <option value="English">EN</option>
              <option value="Hindi">HI</option>
              <option value="Urdu">UR</option>
              <option value="French">FR</option>
            </select>
            <div className="flex items-center gap-1.5 text-xs text-primary-foreground/70">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
              Online
            </div>
          </div>
        </div>

        <div className="h-72 overflow-y-auto p-4 space-y-3 bg-muted/20">
          {messages.map((msg, i) => (
            <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-card text-foreground border border-border rounded-bl-sm shadow-sm'
              )}>
                {msg.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center">
                  {[0, 150, 300].map((delay, i) => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce-dot" style={{ animationDelay: `${delay}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-3 border-t border-border flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about restaurants, weather, activities…"
            className="flex-1 bg-background border border-input rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="w-11 h-11 flex items-center justify-center bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>

      {/* Expense tracker */}
      <div className="bg-card rounded-xl border border-border">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-4.5 w-4.5 text-primary" size={18} />
            <h2 className="text-sm font-semibold text-foreground">Expense Tracker</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddExpense((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors min-h-[36px]"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
            <button className="flex items-center gap-1.5 text-xs font-medium bg-muted text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg transition-colors min-h-[36px]">
              <Camera className="h-3.5 w-3.5" />
              Scan receipt
            </button>
          </div>
        </div>

        {showAddExpense && (
          <form onSubmit={handleAddExpense} className="mx-5 mt-4 p-4 bg-muted/40 rounded-xl border border-border space-y-3 animate-fade-in">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Description"
                value={newExpense.description}
                onChange={(e) => setNewExpense((p) => ({ ...p, description: e.target.value }))}
                className="bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
              <input
                type="number"
                placeholder="Amount (INR)"
                value={newExpense.amount}
                onChange={(e) => setNewExpense((p) => ({ ...p, amount: e.target.value }))}
                className="bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense((p) => ({ ...p, category: e.target.value }))}
                  className="w-full appearance-none bg-background border border-input rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {Object.keys(CATEGORY_COLORS).map((c) => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              </div>
              <button
                type="submit"
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Save
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-border">
          {expenses.map((exp) => (
            <div key={exp.id} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-md', CATEGORY_COLORS[exp.category] ?? 'bg-muted text-muted-foreground')}>
                  {exp.category}
                </span>
                <div>
                  <div className="text-sm font-medium text-foreground">{exp.description}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{exp.time}</div>
                </div>
              </div>
              <div className="text-sm font-semibold text-foreground">₹{exp.amount.toLocaleString('en-IN')}</div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-border flex justify-between items-center bg-muted/30 rounded-b-xl">
          <span className="text-sm font-medium text-foreground">Today&apos;s Total</span>
          <span className="text-lg font-bold text-primary">₹{totalExpenses.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
}

function BriefingCard({ icon, title, body, bg }: { icon: React.ReactNode; title: string; body: string; bg: string }) {
  return (
    <div className={cn('flex items-start gap-3 p-3.5 rounded-xl border', bg)}>
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <div className="text-xs font-semibold text-foreground mb-0.5">{title}</div>
        <div className="text-xs text-muted-foreground leading-relaxed">{body}</div>
      </div>
    </div>
  );
}
