'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function TripRequestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    const target = e.target as HTMLInputElement;
    setForm((prev) => ({ ...prev, [target.name]: target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const body = {
        destination: form.destination,
        dates: { start: form.start_date, end: form.end_date },
        budget: {
          amount: parseFloat(form.budget_amount) || 0,
          currency: form.budget_currency,
        },
        party_size: parseInt(form.party_size, 10),
        purpose: form.purpose,
        preferences: {
          accommodation_style: form.accommodation_style,
          activity_level: form.activity_level,
          dietary: form.dietary,
          must_include: form.must_include
            ? form.must_include.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
          avoid: form.avoid
            ? form.avoid.split(',').map((s) => s.trim()).filter(Boolean)
            : [],
        },
      };
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Plan Your Trip</h1>
        <p className="text-gray-500 mb-8">
          Let our AI agents craft your perfect itinerary.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Destination */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destination <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="destination"
              required
              value={form.destination}
              onChange={handleChange}
              placeholder="e.g. Pahalgam, Kashmir"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="start_date"
                required
                value={form.start_date}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="end_date"
                required
                value={form.end_date}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Budget */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="budget_amount"
                required
                min="0"
                value={form.budget_amount}
                onChange={handleChange}
                placeholder="150000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                name="budget_currency"
                value={form.budget_currency}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          {/* Party Size & Purpose */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Party Size <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="party_size"
                required
                min="1"
                max="50"
                value={form.party_size}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purpose
              </label>
              <select
                name="purpose"
                value={form.purpose}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="honeymoon">Honeymoon</option>
                <option value="business">Business</option>
                <option value="family">Family</option>
                <option value="adventure">Adventure</option>
                <option value="solo">Solo</option>
                <option value="group">Group</option>
              </select>
            </div>
          </div>

          {/* Accommodation Style */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Accommodation Style
            </label>
            <input
              type="text"
              name="accommodation_style"
              value={form.accommodation_style}
              onChange={handleChange}
              placeholder="e.g. Luxury resort, Boutique hotel, Houseboat"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Activity Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Activity Level
            </label>
            <select
              name="activity_level"
              value={form.activity_level}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="relaxed">Relaxed</option>
              <option value="moderate">Moderate</option>
              <option value="adventurous">Adventurous</option>
            </select>
          </div>

          {/* Dietary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dietary Requirements
            </label>
            <input
              type="text"
              name="dietary"
              value={form.dietary}
              onChange={handleChange}
              placeholder="e.g. Vegetarian, No nuts, Halal"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Must Include */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Must Include
              <span className="text-gray-400 font-normal ml-1">(comma-separated)</span>
            </label>
            <textarea
              name="must_include"
              value={form.must_include}
              onChange={handleChange}
              rows={2}
              placeholder="e.g. Shikara ride, Gulmarg, local cuisine"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Avoid */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Avoid
              <span className="text-gray-400 font-normal ml-1">(comma-separated)</span>
            </label>
            <textarea
              name="avoid"
              value={form.avoid}
              onChange={handleChange}
              rows={2}
              placeholder="e.g. Crowded markets, extreme altitude"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Planning your trip...
              </span>
            ) : (
              'Plan My Trip'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
