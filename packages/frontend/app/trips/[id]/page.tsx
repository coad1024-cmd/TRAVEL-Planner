'use client';

import { useState } from 'react';
import Link from 'next/link';
import type {
  ItineraryDay,
  TransportSegment,
  AccommodationSegment,
  ExcursionSegment,
  DiningSegment,
  BudgetDashboard,
} from '@travel/shared';
import { MOCK_ITINERARY, MOCK_BUDGET } from './mockData';

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function RiskBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  const styles = {
    low: 'bg-green-100 text-green-700 border border-green-200',
    medium: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    high: 'bg-red-100 text-red-700 border border-red-200',
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${styles[level]}`}>
      {level.toUpperCase()} RISK
    </span>
  );
}

function ModeIcon({ mode }: { mode: string }) {
  const icons: Record<string, string> = {
    flight: '✈️',
    rail: '🚂',
    road: '🚗',
    ferry: '⛴️',
    helicopter: '🚁',
  };
  return <span className="text-lg">{icons[mode] || '🚗'}</span>;
}

function DifficultyBadge({ difficulty }: { difficulty: 'easy' | 'moderate' | 'hard' }) {
  const styles = {
    easy: 'bg-green-100 text-green-700',
    moderate: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${styles[difficulty]}`}>
      {difficulty}
    </span>
  );
}

function BudgetLevelBadge({ level }: { level: 'budget' | 'mid' | 'premium' }) {
  const styles = {
    budget: 'bg-gray-100 text-gray-600',
    mid: 'bg-blue-100 text-blue-700',
    premium: 'bg-purple-100 text-purple-700',
  };
  const labels = { budget: '$', mid: '$$', premium: '$$$' };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${styles[level]}`}>
      {labels[level]}
    </span>
  );
}

function TransportCard({ seg }: { seg: TransportSegment }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
      <ModeIcon mode={seg.mode} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <span>{seg.origin.name}</span>
          <span className="text-indigo-400">→</span>
          <span>{seg.destination.name}</span>
          {seg.flight_number && (
            <span className="text-xs text-gray-500">({seg.flight_number})</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
          <span>Dep: {formatDateTime(seg.departure)}</span>
          <span>Arr: {formatDateTime(seg.arrival)}</span>
          {seg.carrier && <span className="text-indigo-600">{seg.carrier}</span>}
        </div>
        {seg.booking_ref && (
          <div className="text-xs text-gray-400 mt-0.5">Ref: {seg.booking_ref}</div>
        )}
      </div>
      <div className="text-sm font-semibold text-indigo-700 whitespace-nowrap">
        {formatCurrency(seg.cost.amount, seg.cost.currency)}
      </div>
    </div>
  );
}

function AccommodationCard({ seg }: { seg: AccommodationSegment }) {
  return (
    <div className="p-3 bg-green-50 rounded-lg border border-green-100">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <span>🏨</span>
            {seg.property_name}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{seg.location.name}</div>
          <div className="flex flex-wrap gap-1 mt-2">
            {seg.amenities.map((a) => (
              <span key={a} className="text-xs bg-white border border-green-200 text-green-700 px-2 py-0.5 rounded-full">
                {a}
              </span>
            ))}
          </div>
          <div className="text-xs text-gray-400 mt-1">{seg.cancellation_policy}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-green-700">
            {formatCurrency(seg.nightly_rate.amount, seg.nightly_rate.currency)}/night
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            Total: {formatCurrency(seg.total_cost.amount, seg.total_cost.currency)}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExcursionCard({ seg }: { seg: ExcursionSegment }) {
  return (
    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <span>🏔️</span>
            {seg.activity_name}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <DifficultyBadge difficulty={seg.difficulty} />
            <span className="text-xs text-gray-500">
              {Math.floor(seg.duration_minutes / 60)}h{' '}
              {seg.duration_minutes % 60 > 0 ? `${seg.duration_minutes % 60}m` : ''}
            </span>
            {seg.altitude_meters && (
              <span className="text-xs text-gray-500">{seg.altitude_meters}m alt.</span>
            )}
          </div>
          {seg.fitness_notes && (
            <div className="text-xs text-gray-500 mt-1 italic">{seg.fitness_notes}</div>
          )}
          <div className="flex gap-3 mt-1 text-xs text-gray-400">
            {seg.guide_required && <span>Guide required</span>}
            {seg.weather_dependent && <span>Weather dependent</span>}
          </div>
        </div>
        <div className="text-sm font-bold text-yellow-700 ml-3">
          {seg.cost.amount === 0
            ? 'Free'
            : formatCurrency(seg.cost.amount, seg.cost.currency)}
        </div>
      </div>
    </div>
  );
}

function DiningCard({ seg }: { seg: DiningSegment }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
      <span className="text-lg">🍽️</span>
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900">{seg.restaurant_name}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-500">{seg.cuisine}</span>
          <BudgetLevelBadge level={seg.budget_level} />
          {seg.dietary_match && (
            <span className="text-xs text-green-600 font-medium">Diet ✓</span>
          )}
        </div>
      </div>
      <div className="text-xs text-gray-400">{formatDateTime(seg.time)}</div>
    </div>
  );
}

function SegmentCard({ segment }: { segment: TransportSegment | AccommodationSegment | ExcursionSegment | DiningSegment }) {
  if (segment.type === 'transport') return <TransportCard seg={segment} />;
  if (segment.type === 'accommodation') return <AccommodationCard seg={segment} />;
  if (segment.type === 'excursion') return <ExcursionCard seg={segment} />;
  if (segment.type === 'dining') return <DiningCard seg={segment} />;
  return null;
}

function DayCard({ day }: { day: ItineraryDay }) {
  const [open, setOpen] = useState(day.day_number === 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
            {day.day_number}
          </div>
          <div>
            <div className="font-semibold text-gray-900">{formatDate(day.date)}</div>
            <div className="text-xs text-gray-500 mt-0.5">{day.weather_summary}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RiskBadge level={day.risk_level} />
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {day.segments.map((seg, i) => (
            <SegmentCard key={i} segment={seg} />
          ))}
        </div>
      )}
    </div>
  );
}

function BudgetBar({ budget }: { budget: BudgetDashboard }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Budget Overview</h2>
        <span className="text-sm text-gray-500">
          {budget.percent_used.toFixed(1)}% used
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3 mb-3">
        <div
          className={`h-3 rounded-full ${budget.percent_used > 80 ? 'bg-red-500' : budget.percent_used > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
          style={{ width: `${Math.min(budget.percent_used, 100)}%` }}
        />
      </div>
      <div className="grid grid-cols-3 gap-4 text-sm mb-3">
        <div>
          <div className="text-gray-500 text-xs">Total</div>
          <div className="font-semibold text-gray-900">
            {formatCurrency(budget.total_budget.amount, budget.total_budget.currency)}
          </div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">Spent</div>
          <div className="font-semibold text-yellow-700">
            {formatCurrency(budget.total_spent.amount, budget.total_spent.currency)}
          </div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">Remaining</div>
          <div className="font-semibold text-green-700">
            {formatCurrency(budget.remaining.amount, budget.remaining.currency)}
          </div>
        </div>
      </div>
      {budget.alerts.length > 0 && (
        <div className="space-y-1">
          {budget.alerts.map((alert, i) => (
            <div key={i} className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-1.5">
              ⚠️ {alert}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TripItineraryPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pahalgam, Kashmir</h1>
          <p className="text-gray-500 mt-1">Trip ID: {params.id} · 7 days · 2 travelers</p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/trips/${params.id}/active`}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Active Dashboard
          </Link>
          <Link
            href={`/trips/${params.id}/post-trip`}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Post Trip
          </Link>
        </div>
      </div>

      <BudgetBar budget={MOCK_BUDGET} />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Day-by-Day Itinerary</h2>
        {MOCK_ITINERARY.map((day) => (
          <DayCard key={day.day_number} day={day} />
        ))}
      </div>
    </div>
  );
}
