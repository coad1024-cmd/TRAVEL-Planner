'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, Star, Loader2, PartyPopper, MapPin, Calendar, Users, Wallet } from 'lucide-react';
import { cn } from '../../../../lib/utils';

interface SegmentFeedback {
  id: string;
  label: string;
  type: string;
  rating: number;
  comment: string;
}

const INITIAL_SEGMENTS: SegmentFeedback[] = [
  { id: 'flight-in', label: 'IndiGo 6E-2401 (DEL → SXR)', type: 'Transport', rating: 0, comment: '' },
  { id: 'hotel', label: 'The Pahalgam Hotel', type: 'Accommodation', rating: 0, comment: '' },
  { id: 'betaab', label: 'Betaab Valley Trek', type: 'Excursion', rating: 0, comment: '' },
  { id: 'chandanwari', label: 'Chandanwari Snow Point', type: 'Excursion', rating: 0, comment: '' },
  { id: 'baisaran', label: 'Baisaran Meadow & Horse Riding', type: 'Excursion', rating: 0, comment: '' },
  { id: 'gondola', label: 'Gulmarg Gondola Phase 1 & 2', type: 'Excursion', rating: 0, comment: '' },
  { id: 'rafting', label: 'Lidder River Rafting', type: 'Excursion', rating: 0, comment: '' },
  { id: 'lidder-view', label: 'Lidder View Restaurant', type: 'Dining', rating: 0, comment: '' },
  { id: 'flight-out', label: 'Air India AI-824 (SXR → DEL)', type: 'Transport', rating: 0, comment: '' },
];

const TYPE_COLORS: Record<string, string> = {
  Transport: 'bg-primary/10 text-primary',
  Accommodation: 'bg-success/10 text-success',
  Excursion: 'bg-warning/10 text-warning',
  Dining: 'bg-accent/20 text-accent-foreground',
};

const RATING_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5 focus:outline-none transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            className={cn(
              'h-6 w-6 transition-colors',
              star <= (hover || value) ? 'fill-warning text-warning' : 'text-border fill-transparent'
            )}
          />
        </button>
      ))}
    </div>
  );
}

export default function PostTripPage({ params }: { params: { id: string } }) {
  const [segments, setSegments] = useState<SegmentFeedback[]>(INITIAL_SEGMENTS);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const ratedCount = segments.filter((s) => s.rating > 0).length;
  const avgRating = ratedCount > 0
    ? (segments.reduce((sum, s) => sum + s.rating, 0) / ratedCount).toFixed(1)
    : '—';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Post-Trip Summary</h1>
            <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
              <MapPin className="h-3.5 w-3.5" />
              Pahalgam, Kashmir
            </div>
          </div>
          <Link
            href={`/trips/${params.id}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] items-center"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to itinerary
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={<Calendar className="h-4 w-4 text-primary" />} value="7" label="Days" bg="bg-primary/5 border-primary/15" />
          <StatCard icon={<Wallet className="h-4 w-4 text-success" />} value="₹92,400" label="Total Spent" bg="bg-success/5 border-success/15" />
          <StatCard icon={<Star className="h-4 w-4 text-warning" />} value={avgRating} label="Avg Rating" bg="bg-warning/5 border-warning/15" />
          <StatCard icon={<Users className="h-4 w-4 text-muted-foreground" />} value={`${ratedCount}/${segments.length}`} label="Reviewed" bg="bg-muted/50 border-border" />
        </div>
      </div>

      {submitted ? (
        <div className="bg-card border border-success/20 rounded-2xl p-10 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
            <PartyPopper className="h-8 w-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Feedback Submitted!</h2>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
            Thank you for sharing your experience. Your feedback helps our AI plan even better trips.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <button className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors min-h-[44px]">
              <BarChart3 className="h-4 w-4" />
              View Expense Report
            </button>
            <Link
              href="/"
              className="flex items-center gap-2 bg-card border border-border text-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-muted transition-colors min-h-[44px]"
            >
              Plan Another Trip
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Rate Your Experience</h2>

          {segments.map((seg) => (
            <div key={seg.id} className="bg-card rounded-xl border border-border p-5 space-y-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-md shrink-0', TYPE_COLORS[seg.type] ?? 'bg-muted text-muted-foreground')}>
                    {seg.type}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{seg.label}</span>
                </div>
                {seg.rating > 0 && (
                  <span className="text-xs text-muted-foreground shrink-0">{RATING_LABELS[seg.rating]}</span>
                )}
              </div>

              <StarRating
                value={seg.rating}
                onChange={(v) => setSegments((prev) => prev.map((s) => s.id === seg.id ? { ...s, rating: v } : s))}
              />

              <textarea
                value={seg.comment}
                onChange={(e) => setSegments((prev) => prev.map((s) => s.id === seg.id ? { ...s, comment: e.target.value } : s))}
                placeholder="Leave a comment (optional)"
                rows={2}
                className="w-full bg-background border border-input rounded-lg px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-colors"
              />
            </div>
          ))}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || ratedCount === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm min-h-[48px]"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
              ) : (
                'Submit Feedback'
              )}
            </button>
            <button
              type="button"
              className="flex items-center gap-2 bg-card border border-border text-foreground py-3 px-5 rounded-xl font-medium text-sm hover:bg-muted transition-colors min-h-[48px]"
            >
              <BarChart3 className="h-4 w-4" />
              Expense Report
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function StatCard({ icon, value, label, bg }: { icon: React.ReactNode; value: string; label: string; bg: string }) {
  return (
    <div className={cn('rounded-xl border p-4 flex flex-col gap-2', bg)}>
      {icon}
      <div className="text-xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
