'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Calendar, Wallet, Users, Sparkles, ChevronDown, Loader2, Lightbulb, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { cn } from '../lib/utils';

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
  { value: 'honeymoon', label: 'Honeymoon', icon: '💑' },
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧' },
  { value: 'adventure', label: 'Adventure', icon: '🧗' },
  { value: 'business', label: 'Business', icon: '💼' },
  { value: 'solo', label: 'Solo', icon: '🎒' },
  { value: 'group', label: 'Group', icon: '👥' },
];

const ACTIVITY_LEVELS = [
  { value: 'relaxed', label: 'Relaxed', desc: 'Leisurely pace, cultural experiences' },
  { value: 'moderate', label: 'Moderate', desc: 'Mix of activities and downtime' },
  { value: 'adventurous', label: 'Adventurous', desc: 'Action-packed, high energy' },
];

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-foreground mb-1.5">
      {children}
      {required && <span className="text-destructive ml-1">*</span>}
    </label>
  );
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full bg-background border border-input rounded-lg px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
        'transition-colors disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(
          'w-full appearance-none bg-background border border-input rounded-lg px-3.5 py-2.5 pr-9 text-sm text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
          'transition-colors disabled:opacity-50',
          className
        )}
        {...props}
      />
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    </div>
  );
}

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full bg-background border border-input rounded-lg px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
        'transition-colors disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export default function TripRequestPage() {
  const router = useRouter();
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
      // silently fail — recommendations are non-critical
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

  return (
    <div className="max-w-2xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-4 border border-primary/20">
          <Sparkles className="h-3.5 w-3.5" />
          Powered by 13 AI agents
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground mb-3">
          Plan your perfect trip
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Tell us where you want to go and our AI will craft a personalised itinerary in seconds.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm">
        {error && (
          <div className="mx-6 mt-6 p-3.5 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm flex items-start gap-2">
            <span className="text-base leading-none mt-0.5">⚠</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Destination */}
          <div>
            <Label required>Destination</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  name="destination"
                  required
                  value={form.destination}
                  onChange={handleChange}
                  placeholder="e.g. Pahalgam, Kashmir"
                  className="pl-9"
                />
              </div>
              <button
                type="button"
                onClick={fetchRecommendations}
                disabled={!form.destination || fetchingRecs}
                className="flex items-center gap-1.5 text-sm font-medium bg-secondary text-secondary-foreground border border-border px-3.5 py-2.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 shrink-0 whitespace-nowrap"
              >
                {fetchingRecs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lightbulb className="h-3.5 w-3.5" />}
                AI Tips
              </button>
            </div>
          </div>

          {/* AI Recommendations panel — Issue #1 */}
          {recommendations.length > 0 && (
            <div className="bg-secondary/50 border border-border rounded-xl p-4 space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Planning Tips for {form.destination}
              </div>
              <div className="space-y-2.5">
                {recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border">
                    <span className="text-base shrink-0">{CATEGORY_ICON[rec.category] ?? '💡'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{rec.title}</span>
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', PRIORITY_STYLES[rec.priority])}>
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{rec.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Start Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  name="start_date"
                  required
                  value={form.start_date}
                  onChange={handleChange}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label required>End Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  name="end_date"
                  required
                  value={form.end_date}
                  onChange={handleChange}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Budget */}
          <div>
            <Label required>Budget</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  name="budget_amount"
                  required
                  min="0"
                  value={form.budget_amount}
                  onChange={handleChange}
                  placeholder="150,000"
                  className="pl-9"
                />
              </div>
              <Select name="budget_currency" value={form.budget_currency} onChange={handleChange} className="w-24">
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </Select>
            </div>
          </div>

          {/* Party & Purpose */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label required>Party Size</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  name="party_size"
                  required
                  min="1"
                  max="50"
                  value={form.party_size}
                  onChange={handleChange}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label>Trip Purpose</Label>
              <Select name="purpose" value={form.purpose} onChange={handleChange}>
                {PURPOSES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.icon} {p.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Activity Level */}
          <div>
            <Label>Activity Level</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {ACTIVITY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, activity_level: level.value }))}
                  className={cn(
                    'p-3 rounded-lg border-2 text-left transition-all',
                    form.activity_level === level.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground'
                  )}
                >
                  <div className="text-sm font-semibold">{level.label}</div>
                  <div className="text-xs mt-0.5 leading-tight opacity-80">{level.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Accommodation Style */}
          <div>
            <Label>Accommodation Style</Label>
            <Input
              name="accommodation_style"
              value={form.accommodation_style}
              onChange={handleChange}
              placeholder="e.g. Luxury resort, Boutique hotel, Houseboat"
            />
          </div>

          {/* Dietary */}
          <div>
            <Label>Dietary Requirements</Label>
            <Input
              name="dietary"
              value={form.dietary}
              onChange={handleChange}
              placeholder="e.g. Vegetarian, No nuts, Halal"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>
                Must Include{' '}
                <span className="text-muted-foreground font-normal text-xs">(comma-separated)</span>
              </Label>
              <Textarea
                name="must_include"
                value={form.must_include}
                onChange={handleChange}
                rows={2}
                placeholder="e.g. Shikara ride, Gulmarg"
              />
            </div>
            <div>
              <Label>
                Avoid{' '}
                <span className="text-muted-foreground font-normal text-xs">(comma-separated)</span>
              </Label>
              <Textarea
                name="avoid"
                value={form.avoid}
                onChange={handleChange}
                rows={2}
                placeholder="e.g. Crowded markets"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-semibold py-3 px-6 rounded-lg transition-colors text-sm flex items-center justify-center gap-2 shadow-sm min-h-[48px]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Planning your trip…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Plan My Trip
              </>
            )}
          </button>
        </form>
      </div>

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-6 mt-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
          13 AI agents
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
          Real-time pricing
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
          Live rerouting
        </div>
      </div>
    </div>
  );
}
