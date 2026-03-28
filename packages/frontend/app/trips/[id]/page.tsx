'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  Plane,
  Car,
  Train,
  Ship,
  Hotel,
  Mountain,
  Utensils,
  MapPin,
  Clock,
  AlertTriangle,
  CloudSun,
  Activity,
  Wallet,
  TrendingUp,
  Play,
  FileText,
  Bell,
  CheckCircle2,
  XCircle,
  Info,
  BookOpen,
  RefreshCw,
} from 'lucide-react';
import type { LiveStatus, BookingConfirmation, TripAlert } from '../../../lib/live-status';
import type {
  ItineraryDay,
  TransportSegment,
  AccommodationSegment,
  ExcursionSegment,
  DiningSegment,
  BudgetDashboard,
} from '@travel/shared';
import { MOCK_ITINERARY, MOCK_BUDGET } from './mockData';
import { cn } from '../../../lib/utils';

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch { return iso; }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch { return iso; }
}

function fmt(amount: number, currency: string) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

function RiskPill({ level }: { level: 'low' | 'medium' | 'high' }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full',
      level === 'low' && 'bg-success/15 text-success border border-success/25',
      level === 'medium' && 'bg-warning/15 text-warning border border-warning/25',
      level === 'high' && 'bg-destructive/15 text-destructive border border-destructive/25',
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', level === 'low' ? 'bg-success' : level === 'medium' ? 'bg-warning' : 'bg-destructive')} />
      {level === 'low' ? 'Low risk' : level === 'medium' ? 'Caution' : 'High risk'}
    </span>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: 'easy' | 'moderate' | 'hard' }) {
  return (
    <span className={cn(
      'text-xs font-medium px-2 py-0.5 rounded-md',
      difficulty === 'easy' && 'bg-success/10 text-success',
      difficulty === 'moderate' && 'bg-warning/10 text-warning',
      difficulty === 'hard' && 'bg-destructive/10 text-destructive',
    )}>
      {difficulty}
    </span>
  );
}

function BudgetBadge({ level }: { level: 'budget' | 'mid' | 'premium' }) {
  const map = { budget: '$', mid: '$$', premium: '$$$' };
  return (
    <span className={cn(
      'text-xs font-medium px-2 py-0.5 rounded-md',
      level === 'budget' && 'bg-muted text-muted-foreground',
      level === 'mid' && 'bg-primary/10 text-primary',
      level === 'premium' && 'bg-accent/20 text-accent-foreground',
    )}>
      {map[level]}
    </span>
  );
}

function TransportCard({ seg }: { seg: TransportSegment }) {
  const icons: Record<string, React.ReactNode> = {
    flight: <Plane className="h-4 w-4" />,
    rail: <Train className="h-4 w-4" />,
    road: <Car className="h-4 w-4" />,
    ferry: <Ship className="h-4 w-4" />,
  };
  return (
    <div className="flex items-start gap-3 p-3.5 bg-primary/5 border border-primary/15 rounded-xl">
      <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
        {icons[seg.mode] ?? <Car className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {seg.origin.name}
          <span className="text-primary">→</span>
          {seg.destination.name}
          {seg.flight_number && <span className="text-xs text-muted-foreground font-normal">· {seg.flight_number}</span>}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(seg.departure)}</span>
          <span>→</span>
          <span>{formatTime(seg.arrival)}</span>
          {seg.carrier && <span className="text-primary font-medium">{seg.carrier}</span>}
        </div>
        {seg.booking_ref && (
          <div className="text-xs text-muted-foreground mt-0.5 font-mono">Ref: {seg.booking_ref}</div>
        )}
      </div>
      <div className="text-sm font-bold text-primary shrink-0">{fmt(seg.cost.amount, seg.cost.currency)}</div>
    </div>
  );
}

function AccommodationCard({ seg }: { seg: AccommodationSegment }) {
  return (
    <div className="p-3.5 bg-success/5 border border-success/15 rounded-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-success/15 text-success flex items-center justify-center shrink-0">
            <Hotel className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">{seg.property_name}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <MapPin className="h-3 w-3" />{seg.location.name}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {seg.amenities.map((a) => (
                <span key={a} className="text-xs bg-background border border-success/20 text-success px-2 py-0.5 rounded-full">
                  {a}
                </span>
              ))}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5 italic">{seg.cancellation_policy}</div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-bold text-success">{fmt(seg.nightly_rate.amount, seg.nightly_rate.currency)}<span className="font-normal text-xs text-muted-foreground">/night</span></div>
          <div className="text-xs text-muted-foreground mt-0.5">Total: {fmt(seg.total_cost.amount, seg.total_cost.currency)}</div>
        </div>
      </div>
    </div>
  );
}

function ExcursionCard({ seg }: { seg: ExcursionSegment }) {
  const durationH = Math.floor(seg.duration_minutes / 60);
  const durationM = seg.duration_minutes % 60;
  return (
    <div className="p-3.5 bg-warning/5 border border-warning/15 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-warning/15 text-warning flex items-center justify-center shrink-0">
          <Mountain className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-semibold text-foreground">{seg.activity_name}</div>
            <div className="text-sm font-bold text-warning shrink-0">
              {seg.cost.amount === 0 ? <span className="text-success text-xs font-semibold">Free</span> : fmt(seg.cost.amount, seg.cost.currency)}
            </div>
          </div>
          <div className="flex items-center flex-wrap gap-2 mt-1.5">
            <DifficultyBadge difficulty={seg.difficulty} />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />{durationH}h{durationM > 0 ? ` ${durationM}m` : ''}
            </span>
            {seg.altitude_meters && (
              <span className="text-xs text-muted-foreground">{seg.altitude_meters.toLocaleString()}m</span>
            )}
            {seg.guide_required && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md">Guide required</span>}
          </div>
          {seg.fitness_notes && (
            <div className="text-xs text-muted-foreground mt-1.5 italic">{seg.fitness_notes}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function DiningCard({ seg }: { seg: DiningSegment }) {
  return (
    <div className="flex items-center gap-3 p-3.5 bg-accent/5 border border-accent/20 rounded-xl">
      <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center shrink-0">
        <Utensils className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground truncate">{seg.restaurant_name}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">{seg.cuisine}</span>
          <BudgetBadge level={seg.budget_level} />
          {seg.dietary_match && (
            <span className="text-xs text-success font-medium">✓ Diet match</span>
          )}
        </div>
      </div>
      <div className="text-xs text-muted-foreground shrink-0">{formatTime(seg.time)}</div>
    </div>
  );
}

type AnySegment = TransportSegment | AccommodationSegment | ExcursionSegment | DiningSegment;

function SegmentCard({ segment }: { segment: AnySegment }) {
  if (segment.type === 'transport') return <TransportCard seg={segment} />;
  if (segment.type === 'accommodation') return <AccommodationCard seg={segment} />;
  if (segment.type === 'excursion') return <ExcursionCard seg={segment} />;
  if (segment.type === 'dining') return <DiningCard seg={segment} />;
  return null;
}

function DayCard({ day }: { day: ItineraryDay }) {
  const [open, setOpen] = useState(day.day_number === 1);

  return (
    <div className={cn('bg-card rounded-xl border transition-all duration-200', open ? 'border-primary/30 shadow-sm' : 'border-border hover:border-border/80')}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-4">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-colors', open ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
            {day.day_number}
          </div>
          <div>
            <div className="font-semibold text-foreground text-sm">{formatDate(day.date)}</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <CloudSun className="h-3 w-3" />
              {day.weather_summary}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RiskPill level={day.risk_level} />
          <div className="text-xs text-muted-foreground hidden sm:block">{day.segments.length} activities</div>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-border animate-fade-in">
          <div className="pt-3 space-y-3">
            {day.segments.map((seg, i) => (
              <SegmentCard key={i} segment={seg} />
            ))}
          </div>
          {day.nearest_hospital_km && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border mt-2">
              <Activity className="h-3 w-3 text-destructive" />
              Nearest hospital: {day.nearest_hospital_km} km
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BudgetPanel({ budget }: { budget: BudgetDashboard }) {
  const pct = Math.min(budget.percent_used, 100);
  const color = pct > 80 ? 'bg-destructive' : pct > 60 ? 'bg-warning' : 'bg-success';

  return (
    <div className="bg-card rounded-xl border border-border p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-4.5 w-4.5 text-primary" size={18} />
          <h2 className="text-sm font-semibold text-foreground">Budget Overview</h2>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className={cn('h-3.5 w-3.5', pct > 80 ? 'text-destructive' : 'text-muted-foreground')} />
          <span className={cn('text-sm font-semibold', pct > 80 ? 'text-destructive' : 'text-foreground')}>
            {budget.percent_used.toFixed(1)}% used
          </span>
        </div>
      </div>

      <div className="w-full bg-muted rounded-full h-2.5 mb-4 overflow-hidden">
        <div
          className={cn('h-2.5 rounded-full transition-all duration-700', color)}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Total Budget</div>
          <div className="text-sm font-bold text-foreground">{fmt(budget.total_budget.amount, budget.total_budget.currency)}</div>
        </div>
        <div className="bg-warning/5 border border-warning/15 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Spent</div>
          <div className="text-sm font-bold text-warning">{fmt(budget.total_spent.amount, budget.total_spent.currency)}</div>
        </div>
        <div className="bg-success/5 border border-success/15 rounded-lg p-3">
          <div className="text-xs text-muted-foreground mb-1">Remaining</div>
          <div className="text-sm font-bold text-success">{fmt(budget.remaining.amount, budget.remaining.currency)}</div>
        </div>
      </div>

      {budget.alerts.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {budget.alerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-warning bg-warning/5 border border-warning/20 rounded-lg px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              {alert}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'bg-success/10 text-success border-success/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  'checked-in': 'bg-primary/10 text-primary border-primary/20',
  'on-time': 'bg-success/10 text-success border-success/20',
  delayed: 'bg-warning/10 text-warning border-warning/20',
  boarding: 'bg-primary/10 text-primary border-primary/20',
  landed: 'bg-muted text-muted-foreground border-border',
};

const BOOKING_TYPE_ICON: Record<string, React.ReactNode> = {
  flight: <Plane className="h-4 w-4" />,
  hotel: <Hotel className="h-4 w-4" />,
  excursion: <Mountain className="h-4 w-4" />,
  transfer: <Car className="h-4 w-4" />,
};

function BookingHub({ tripId }: { tripId: string }) {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bookings' | 'alerts'>('alerts');

  useEffect(() => {
    fetch(`/api/trips/${tripId}/live-status`)
      .then(r => r.json())
      .then(data => { setStatus(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tripId]);

  const unresolvedAlerts = status?.alerts.filter(a => !a.resolved) ?? [];

  return (
    <div className="bg-card rounded-xl border border-border mb-6">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="h-4.5 w-4.5 text-primary" size={18} />
          <h2 className="text-sm font-semibold text-foreground">Trip Hub</h2>
          {unresolvedAlerts.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-warning text-warning-foreground text-xs font-bold flex items-center justify-center">
              {unresolvedAlerts.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('alerts')}
            className={cn('text-xs font-medium px-3 py-1.5 rounded-lg transition-colors', activeTab === 'alerts' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            Alerts
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={cn('text-xs font-medium px-3 py-1.5 rounded-lg transition-colors', activeTab === 'bookings' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            <BookOpen className="h-3.5 w-3.5 inline mr-1" />
            Bookings
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 px-5 py-4 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Fetching live status…
        </div>
      ) : activeTab === 'alerts' ? (
        <div className="divide-y divide-border">
          {unresolvedAlerts.length === 0 ? (
            <div className="flex items-center gap-2 px-5 py-4 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" />
              No active alerts — everything looks good
            </div>
          ) : unresolvedAlerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {(status?.booking_hub ?? []).map((bk) => (
            <BookingRow key={bk.id} booking={bk} />
          ))}
        </div>
      )}

      {status && (
        <div className="px-5 py-2.5 border-t border-border text-xs text-muted-foreground flex items-center gap-1.5">
          <RefreshCw className="h-3 w-3" />
          Updated {new Date(status.last_updated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}
    </div>
  );
}

function AlertRow({ alert }: { alert: TripAlert }) {
  const severityStyles = {
    critical: 'bg-destructive/5 border-l-4 border-l-destructive',
    warning: 'bg-warning/5 border-l-4 border-l-warning',
    info: 'bg-muted/30 border-l-4 border-l-border',
  };
  const Icon = alert.severity === 'critical' ? XCircle : alert.severity === 'warning' ? AlertTriangle : Info;
  const iconColor = alert.severity === 'critical' ? 'text-destructive' : alert.severity === 'warning' ? 'text-warning' : 'text-muted-foreground';
  return (
    <div className={cn('flex items-start gap-3 px-5 py-3.5', severityStyles[alert.severity])}>
      <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', iconColor)} />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">{alert.title}</div>
        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{alert.body}</div>
      </div>
    </div>
  );
}

function BookingRow({ booking }: { booking: BookingConfirmation }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 gap-3 hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
          {BOOKING_TYPE_ICON[booking.type] ?? <BookOpen className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground truncate">{booking.provider}</div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">{booking.description}</div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="font-mono text-xs text-muted-foreground hidden sm:block">{booking.booking_ref}</span>
        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border capitalize', STATUS_STYLES[booking.status] ?? 'bg-muted text-muted-foreground border-border')}>
          {booking.status}
        </span>
      </div>
    </div>
  );
}

export default function TripItineraryPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <MapPin className="h-3.5 w-3.5" />
            Kashmir, India
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Pahalgam</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Trip #{params.id.slice(0, 8)} · 7 days · 2 travellers · Honeymoon
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/trips/${params.id}/active`}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm min-h-[44px]"
          >
            <Play className="h-3.5 w-3.5" />
            Active
          </Link>
          <Link
            href={`/trips/${params.id}/post-trip`}
            className="flex items-center gap-1.5 bg-card border border-border text-foreground text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
          >
            <FileText className="h-3.5 w-3.5" />
            Post-trip
          </Link>
        </div>
      </div>

      <BudgetPanel budget={MOCK_BUDGET} />

      {/* Issue #2: Booking hub with live flight status + alerts */}
      <BookingHub tripId={params.id} />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Day-by-Day Itinerary</h2>
        {MOCK_ITINERARY.map((day) => (
          <DayCard key={day.day_number} day={day} />
        ))}
      </div>
    </div>
  );
}
