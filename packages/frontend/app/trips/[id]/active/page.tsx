'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

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

export default function ActiveTripPage({ params }: { params: { id: string } }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Hello! I'm your AI travel concierge for Pahalgam. How can I help you today? Ask me about local restaurants, weather, attractions, or anything else!",
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>(MOCK_EXPENSES);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', category: 'Food' });

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
        body: JSON.stringify({ message: userMessage }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.response }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I had trouble connecting. Please try again.' },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleAddExpense(e: FormEvent) {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) return;
    const expense: Expense = {
      id: Date.now(),
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      currency: 'INR',
      category: newExpense.category,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };
    setExpenses((prev) => [expense, ...prev]);
    setNewExpense({ description: '', amount: '', category: 'Food' });
    setShowAddExpense(false);
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top bar */}
      <div className="bg-indigo-700 text-white rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-indigo-200 uppercase tracking-wide font-medium">Active Trip</div>
          <div className="text-xl font-bold mt-0.5">Day 2 — Friday, April 11, 2026</div>
          <div className="text-indigo-200 text-sm mt-0.5">Pahalgam, Kashmir</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link
            href={`/trips/${params.id}`}
            className="text-xs text-indigo-200 hover:text-white transition-colors"
          >
            ← Back to Itinerary
          </Link>
          <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full font-medium">
            On Track
          </span>
        </div>
      </div>

      {/* Emergency Button */}
      <div className="flex justify-center">
        <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-10 rounded-xl text-lg shadow-lg transition-colors flex items-center gap-3">
          <span className="text-2xl">🚨</span>
          EMERGENCY — Get Help Now
        </button>
      </div>

      {/* Morning Briefing */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>☀️</span> Morning Briefing
        </h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
            <span className="text-yellow-500 text-lg">🌤️</span>
            <div>
              <div className="text-sm font-medium text-gray-900">Weather</div>
              <div className="text-sm text-gray-600">Partly cloudy, 15°C. Light showers expected after 3 PM. Carry a rain jacket!</div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-indigo-50 rounded-lg">
            <span className="text-indigo-500 text-lg">📍</span>
            <div>
              <div className="text-sm font-medium text-gray-900">Today&apos;s Plan</div>
              <div className="text-sm text-gray-600">
                Betaab Valley Trek (9:00 AM) → Lunch at Wangnoo Dhaba → Chandanwari Snow Point (3:00 PM)
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
            <span className="text-green-500 text-lg">💡</span>
            <div>
              <div className="text-sm font-medium text-gray-900">Local Tip</div>
              <div className="text-sm text-gray-600">
                Betaab Valley is named after the 1983 Bollywood film. Best photography spot is near the Lidder river bend.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
            <span className="text-red-500 text-lg">🏥</span>
            <div>
              <div className="text-sm font-medium text-gray-900">Nearest Hospital</div>
              <div className="text-sm text-gray-600">
                District Hospital Pahalgam — 4.5 km away. Emergency: 01936-243220
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Concierge Chat */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-indigo-600 text-white px-5 py-3 flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <div>
            <div className="font-semibold text-sm">AI Travel Concierge</div>
            <div className="text-xs text-indigo-200">Always available to help</div>
          </div>
          <div className="ml-auto w-2 h-2 bg-green-400 rounded-full"></div>
        </div>
        <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-gray-500 shadow-sm">
                <span className="flex gap-1">
                  <span className="animate-bounce delay-0">.</span>
                  <span className="animate-bounce delay-100">.</span>
                  <span className="animate-bounce delay-200">.</span>
                </span>
              </div>
            </div>
          )}
        </div>
        <form onSubmit={handleSend} className="p-3 border-t border-gray-200 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about restaurants, weather, activities..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Send
          </button>
        </form>
      </div>

      {/* Expense Tracker */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span>💰</span> Expense Tracker
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddExpense((v) => !v)}
              className="text-xs bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              + Add
            </button>
            <button className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-lg font-medium transition-colors">
              📷 Scan Receipt
            </button>
          </div>
        </div>

        {showAddExpense && (
          <form onSubmit={handleAddExpense} className="mb-4 p-3 bg-gray-50 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Description"
                value={newExpense.description}
                onChange={(e) => setNewExpense((p) => ({ ...p, description: e.target.value }))}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <input
                type="number"
                placeholder="Amount (INR)"
                value={newExpense.amount}
                onChange={(e) => setNewExpense((p) => ({ ...p, amount: e.target.value }))}
                className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={newExpense.category}
                onChange={(e) => setNewExpense((p) => ({ ...p, category: e.target.value }))}
                className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option>Food</option>
                <option>Transport</option>
                <option>Shopping</option>
                <option>Activities</option>
                <option>Other</option>
              </select>
              <button
                type="submit"
                className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
          {expenses.map((exp) => (
            <div key={exp.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <div className="text-sm font-medium text-gray-900">{exp.description}</div>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                  <span>{exp.category}</span>
                  <span>·</span>
                  <span>{exp.time}</span>
                </div>
              </div>
              <div className="text-sm font-semibold text-gray-900">
                ₹{exp.amount.toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between">
          <span className="text-sm font-medium text-gray-700">Today&apos;s Total</span>
          <span className="text-sm font-bold text-indigo-700">
            ₹{totalExpenses.toLocaleString('en-IN')}
          </span>
        </div>
      </div>
    </div>
  );
}
