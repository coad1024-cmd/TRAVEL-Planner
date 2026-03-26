'use client';

import { useState } from 'react';
import Link from 'next/link';

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

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="text-2xl focus:outline-none transition-transform hover:scale-110"
        >
          <span className={star <= (hover || value) ? 'text-yellow-400' : 'text-gray-200'}>★</span>
        </button>
      ))}
    </div>
  );
}

const SEGMENT_ICONS: Record<string, string> = {
  Transport: '✈️',
  Accommodation: '🏨',
  Excursion: '🏔️',
  Dining: '🍽️',
};

export default function PostTripPage({ params }: { params: { id: string } }) {
  const [segments, setSegments] = useState<SegmentFeedback[]>(INITIAL_SEGMENTS);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function updateRating(id: string, rating: number) {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, rating } : s)));
  }

  function updateComment(id: string, comment: string) {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, comment } : s)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitted(true);
    setSubmitting(false);
  }

  const ratedCount = segments.filter((s) => s.rating > 0).length;
  const avgRating =
    ratedCount > 0
      ? (segments.reduce((sum, s) => sum + s.rating, 0) / ratedCount).toFixed(1)
      : '—';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Post-Trip Summary</h1>
            <p className="text-gray-500 mt-1">Pahalgam, Kashmir · April 10–16, 2026</p>
          </div>
          <Link
            href={`/trips/${params.id}`}
            className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            ← Back to Itinerary
          </Link>
        </div>

        {/* Trip Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="text-center p-3 bg-indigo-50 rounded-lg">
            <div className="text-2xl font-bold text-indigo-700">7</div>
            <div className="text-xs text-gray-500 mt-1">Days</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-bold text-green-700">₹92,400</div>
            <div className="text-xs text-gray-500 mt-1">Total Spent</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-700">{avgRating}</div>
            <div className="text-xs text-gray-500 mt-1">Avg Rating</div>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-700">{ratedCount}/{segments.length}</div>
            <div className="text-xs text-gray-500 mt-1">Reviewed</div>
          </div>
        </div>
      </div>

      {submitted ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="text-xl font-bold text-green-800 mb-2">Feedback Submitted!</h2>
          <p className="text-green-700 text-sm mb-4">
            Thank you for sharing your experience. Your feedback helps us improve future trips.
          </p>
          <div className="flex justify-center gap-3">
            <button className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
              📊 View Expense Report
            </button>
            <Link
              href="/"
              className="bg-white border border-green-300 text-green-700 hover:bg-green-50 px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Plan Another Trip
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Rate Your Experience</h2>
          {segments.map((seg) => (
            <div key={seg.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{SEGMENT_ICONS[seg.type] || '📍'}</span>
                <div>
                  <div className="font-medium text-gray-900">{seg.label}</div>
                  <div className="text-xs text-gray-400">{seg.type}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <StarRating value={seg.rating} onChange={(v) => updateRating(seg.id, v)} />
                {seg.rating > 0 && (
                  <span className="text-xs text-gray-500">
                    {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][seg.rating]}
                  </span>
                )}
              </div>
              <textarea
                value={seg.comment}
                onChange={(e) => updateComment(seg.id, e.target.value)}
                placeholder="Leave a comment (optional)"
                rows={2}
                className="mt-3 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>
          ))}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting || ratedCount === 0}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-3 px-6 rounded-lg font-semibold text-sm transition-colors"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Submitting...
                </span>
              ) : (
                'Submit Feedback'
              )}
            </button>
            <button
              type="button"
              className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 py-3 px-5 rounded-lg font-medium text-sm transition-colors"
            >
              📊 View Expense Report
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
