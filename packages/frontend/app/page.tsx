'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MapPin, 
  Calendar, 
  Wallet, 
  Users, 
  Sparkles, 
  ChevronDown, 
  Loader2, 
  Lightbulb, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  ChevronRight,
  ChevronLeft,
  Heart,
  Plane,
  Home,
  Utensils,
  Compass,
  RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';
import { DestinationSelector } from '../components/ui/DestinationSelector';

interface Recommendation {
  title: string;
  description: string;
  category: 'accommodation' | 'activity' | 'dining' | 'transport' | 'safety';
  priority: 'must-do' | 'recommended' | 'optional';
}

const CATEGORY_ICON: Record<string, string> = {
  accommodation: '🏨',
  activity: '🏔️',
  dining: '🍽️',
  transport: '🚗',
  safety: '🛡️',
};

const PRIORITY_STYLES: Record<string, string> = {
  'must-do': 'bg-destructive/10 text-destructive border-destructive/20',
  recommended: 'bg-warning/10 text-warning border-warning/20',
  optional: 'bg-muted text-muted-foreground border-border',
};

const PURPOSES = [
  { value: 'honeymoon', label: 'Honeymoon', icon: <Heart className="w-4 h-4" /> },
  { value: 'family', label: 'Family', icon: <Users className="w-4 h-4" /> },
  { value: 'adventure', label: 'Adventure', icon: <Compass className="w-4 h-4" /> },
  { value: 'business', label: 'Business', icon: <Plane className="w-4 h-4" /> },
  { value: 'solo', label: 'Solo', icon: <Users className="w-4 h-4" /> },
  { value: 'group', label: 'Group', icon: <Users className="w-4 h-4" /> },
];

const ACTIVITY_LEVELS = [
  { value: 'relaxed', label: 'Relaxed', desc: 'Leisurely pace, cultural experiences' },
  { value: 'moderate', label: 'Moderate', desc: 'Mix of activities and downtime' },
  { value: 'adventurous', label: 'Adventurous', desc: 'Action-packed, high energy' },
];

export default function TripRequestPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [fetchingRecs, setFetchingRecs] = useState(false);

  const [form, setForm] = useState({
    destination: '',
    start_date: '',
    end_date: '',
    budget_amount: '',
    budget_currency: 'INR',
    party_size: '2',
    purpose: 'honeymoon',
    accommodation_style: '',
    activity_level: 'moderate',
    dietary: '',
    must_include: '',
    avoid: '',
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function fetchRecommendations() {
    if (!form.destination) return;
    setFetchingRecs(true);
    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: form.destination,
          dates: { start: form.start_date, end: form.end_date },
          budget: { amount: parseFloat(form.budget_amount) || 0, currency: form.budget_currency },
          purpose: form.purpose,
          activity_level: form.activity_level,
          party_size: parseInt(form.party_size, 10),
        }),
      });
      const data = await res.json();
      setRecommendations(data.recommendations ?? []);
    } catch {
      // silently fail
    } finally {
      setFetchingRecs(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: form.destination,
          dates: { start: form.start_date, end: form.end_date },
          budget: { amount: parseFloat(form.budget_amount) || 0, currency: form.budget_currency },
          party_size: parseInt(form.party_size, 10),
          purpose: form.purpose,
          preferences: {
            accommodation_style: form.accommodation_style,
            activity_level: form.activity_level,
            dietary: form.dietary,
            must_include: form.must_include ? form.must_include.split(',').map((s) => s.trim()).filter(Boolean) : [],
            avoid: form.avoid ? form.avoid.split(',').map((s) => s.trim()).filter(Boolean) : [],
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to create trip');
      const data = await res.json();
      router.push(`/trips/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="relative min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center py-12 px-4 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-300/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300/10 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

      <div className="max-w-3xl w-full z-10">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border border-primary/20 text-primary text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            THE FUTURE OF TRAVEL IS AGENTIC
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Where to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">next?</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg max-w-lg mx-auto leading-relaxed">
            Our swarm of 13 AI agents will coordinate your perfect itinerary in real-time.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-10 max-w-xs mx-auto">
          <div className="flex justify-between mb-2">
            {[1, 2, 3].map((i) => (
              <div 
                key={i} 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                  step >= i ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-slate-200 dark:bg-slate-800 text-slate-400"
                )}
              >
                {step > i ? <CheckCircle2 className="w-5 h-5" /> : i}
              </div>
            ))}
          </div>
          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-out" 
              style={{ width: `${((step - 1) / 2) * 100}%` }}
            ></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-3xl p-8 md:p-10 shadow-2xl transition-all duration-500 min-h-[450px] flex flex-col">
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl text-sm flex items-start gap-3 animate-slide-in">
              <AlertCircle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          {/* STEP 1: Core Details */}
          {step === 1 && (
            <div className="space-y-8 animate-fade-in flex-1">
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Destination</label>
                  <DestinationSelector 
                    value={form.destination} 
                    onChange={(val) => setForm((prev) => ({ ...prev, destination: val }))} 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Start Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type="date"
                        name="start_date"
                        required
                        value={form.start_date}
                        onChange={handleChange}
                        className="w-full bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-12 py-4 focus:outline-none focus:border-primary/50 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-2 block">End Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type="date"
                        name="end_date"
                        required
                        value={form.end_date}
                        onChange={handleChange}
                        className="w-full bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-12 py-4 focus:outline-none focus:border-primary/50 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {recommendations.length > 0 && (
                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2 text-sm font-bold text-primary uppercase tracking-tighter">
                    <Sparkles className="h-4 w-4" />
                    AI Intelligence for {form.destination}
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {recommendations.map((rec, i) => (
                      <div key={i} className="min-w-[200px] p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex-shrink-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base">{CATEGORY_ICON[rec.category]}</span>
                          <span className="text-xs font-bold uppercase text-slate-400 truncate">{rec.title}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight line-clamp-2">{rec.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Budget & People */}
          {step === 2 && (
            <div className="space-y-8 animate-fade-in flex-1">
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Budget</label>
                  <div className="flex gap-3">
                    <div className="relative flex-1 group">
                      <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input
                        type="number"
                        name="budget_amount"
                        required
                        min="0"
                        value={form.budget_amount}
                        onChange={handleChange}
                        placeholder="Total budget amount"
                        className="w-full bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-12 py-4 text-lg focus:outline-none focus:border-primary/50 transition-all"
                      />
                    </div>
                    <select 
                      name="budget_currency" 
                      value={form.budget_currency} 
                      onChange={handleChange}
                      className="w-32 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-4 focus:outline-none focus:border-primary/50 transition-all font-bold appearance-none text-center cursor-pointer"
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Travellers</label>
                    <div className="relative group">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input
                        type="number"
                        name="party_size"
                        required
                        min="1"
                        max="50"
                        value={form.party_size}
                        onChange={handleChange}
                        className="w-full bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-12 py-4 focus:outline-none focus:border-primary/50 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Trip Purpose</label>
                    <div className="grid grid-cols-3 gap-2">
                      {PURPOSES.slice(0, 6).map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, purpose: p.value }))}
                          className={cn(
                            "p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all",
                            form.purpose === p.value 
                              ? "border-primary bg-primary/5 text-primary shadow-sm" 
                              : "border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200"
                          )}
                        >
                          {p.icon}
                          <span className="text-[10px] font-bold uppercase">{p.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Preferences & Style */}
          {step === 3 && (
            <div className="space-y-8 animate-fade-in flex-1">
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-3 block text-center">Vibe & Intensity</label>
                  <div className="grid grid-cols-3 gap-4">
                    {ACTIVITY_LEVELS.map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, activity_level: level.value as any }))}
                        className={cn(
                          'p-4 rounded-2xl border-2 text-center transition-all flex flex-col gap-1',
                          form.activity_level === level.value
                            ? 'border-primary bg-primary/5 text-primary ring-4 ring-primary/10'
                            : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200'
                        )}
                      >
                        <div className="text-sm font-bold uppercase">{level.label}</div>
                        <div className="text-[10px] leading-tight opacity-70">{level.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Accommodation</label>
                    <div className="relative group">
                      <Home className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input
                        name="accommodation_style"
                        value={form.accommodation_style}
                        onChange={handleChange}
                        placeholder="e.g. Boutique, Eco-lodge"
                        className="w-full bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-12 py-4 focus:outline-none focus:border-primary/50 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Dietary</label>
                    <div className="relative group">
                      <Utensils className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input
                        name="dietary"
                        value={form.dietary}
                        onChange={handleChange}
                        placeholder="e.g. Vegan, No gluten"
                        className="w-full bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-12 py-4 focus:outline-none focus:border-primary/50 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Must Include</label>
                    <textarea
                      name="must_include"
                      value={form.must_include}
                      onChange={handleChange}
                      rows={2}
                      placeholder="e.g. Shikara ride, Gulmarg"
                      className="w-full bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary/50 transition-all resize-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Avoid</label>
                    <textarea
                      name="avoid"
                      value={form.avoid}
                      onChange={handleChange}
                      rows={2}
                      placeholder="e.g. Crowded markets"
                      className="w-full bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 focus:outline-none focus:border-primary/50 transition-all resize-none text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-10 flex gap-4">
            {step > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
                BACK
              </button>
            )}
            
            {step < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={step === 1 && !form.destination}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
              >
                CONTINUE
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-primary to-purple-600 text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    COORDINATING AGENTS…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    FINALIZE ITINERARY
                  </>
                )}
              </button>
            )}
          </div>
        </form>

        {/* Footer badges */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 mt-12">
          <div className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center group-hover:bg-success group-hover:text-white transition-all">
              <CheckCircle2 className="w-5 h-5 text-success group-hover:text-inherit" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Status</p>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">13 agents active</p>
            </div>
          </div>
          <div className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
              <RefreshCw className="w-5 h-5 text-blue-500 group-hover:text-inherit" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Engine</p>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Live re-routing</p>
            </div>
          </div>
          <div className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-all">
              <Compass className="w-5 h-5 text-purple-500 group-hover:text-inherit" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Intelligence</p>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Real-time pricing</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

