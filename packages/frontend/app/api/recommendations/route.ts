import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an AI trip planning assistant. Given a destination and preferences, return 5 personalised recommendations.

Return ONLY a JSON array with this structure (no markdown wrapping):
[
  {
    "title": "Short action title",
    "description": "1-2 sentences with specific details",
    "category": "accommodation|activity|dining|transport|safety",
    "priority": "must-do|recommended|optional"
  }
]

Be specific to the destination, dates, party type, and budget. Mention specific names, costs, timings.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { destination, dates, budget, purpose, activity_level, party_size } = body;

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ recommendations: getMockRecommendations(destination) });
    }

    const prompt = `Destination: ${destination}
Dates: ${dates?.start} to ${dates?.end}
Budget: ${budget?.amount} ${budget?.currency}
Purpose: ${purpose}
Party size: ${party_size}
Activity level: ${activity_level}

Give 5 specific planning tips.`;

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
    const recommendations = JSON.parse(text);
    return NextResponse.json({ recommendations });
  } catch (err) {
    console.error('[Recommendations API] Error:', err);
    return NextResponse.json({ recommendations: getMockRecommendations('') });
  }
}

function getMockRecommendations(destination: string) {
  const dest = destination.toLowerCase();
  if (/pahalgam|kashmir/.test(dest)) {
    return [
      { title: 'Book Pahalgam Hotel early', description: 'The Pahalgam Hotel and Hotel Heevan fill up fast in April. Book 60+ days ahead for best rates (~₹5,000-8,000/night).', category: 'accommodation', priority: 'must-do' },
      { title: 'Pre-book Gulmarg Gondola', description: 'Phase 2 tickets sell out by 10 AM daily. Book online at jammukashmirtourism.com the night before.', category: 'activity', priority: 'must-do' },
      { title: 'Carry cash — ATMs unreliable beyond Pahalgam', description: 'Withdraw enough INR in Srinagar. Most excursion operators and local restaurants are cash-only.', category: 'safety', priority: 'must-do' },
      { title: 'Pack for 0-20°C swing in April', description: 'Mornings at altitude can drop to 2°C. Bring thermal layers, a waterproof jacket, and sturdy trekking shoes.', category: 'safety', priority: 'recommended' },
      { title: 'Try Wazwan at a local home', description: 'Ask your hotel to arrange a home Wazwan dinner (₹500-800/person). Far superior to restaurant versions — a true Kashmir experience.', category: 'dining', priority: 'recommended' },
    ];
  }
  return [
    { title: 'Research local entry requirements', description: 'Check permit requirements, local holidays, and festival dates before finalising dates.', category: 'safety', priority: 'must-do' },
    { title: 'Book accommodation in advance', description: 'Popular hotels at this destination fill up weeks ahead. Secure accommodation before finalising transport.', category: 'accommodation', priority: 'must-do' },
    { title: 'Budget for local transport', description: 'Set aside 15-20% of your budget for ground transport. Pre-book where possible.', category: 'transport', priority: 'recommended' },
  ];
}
