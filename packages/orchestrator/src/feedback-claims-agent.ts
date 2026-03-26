/**
 * Feedback & Claims Agent — post-trip wrap-up.
 * Collects structured per-segment feedback, ingests reviews into RAG,
 * initiates claims for low ratings, generates trip report.
 */
import Anthropic from '@anthropic-ai/sdk';
import { callMcpTool } from './mcp-client.js';

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface SegmentFeedback {
  segment_type: 'accommodation' | 'excursion' | 'transport' | 'overall';
  segment_id?: string;
  provider_name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
}

export interface TripReport {
  trip_id: string;
  total_days: number;
  total_spent: { amount: number; currency: string };
  feedback_summary: string;
  highlights: string[];
  issues: string[];
  recommendation_score: number; // 0-10
}

/**
 * Send structured feedback request for each segment.
 * T+24hrs after trip end.
 */
export async function sendFeedbackRequest(
  tripId: string,
  segments: { type: string; provider: string; id: string }[],
): Promise<void> {
  const feedbackForm = segments.map(seg => ({
    segment_id: seg.id,
    segment_type: seg.type,
    provider: seg.provider,
    question: `How was your ${seg.type} with ${seg.provider}? (1-5 stars + optional comment)`,
  }));

  try {
    await callMcpTool('mcp-notifications', 'send_email', {
      to: 'demo.traveler@travel-system.dev',
      subject: '✈️ Share your trip feedback — Pahalgam Honeymoon',
      html_body: `
        <h2>We'd love to hear about your trip!</h2>
        <p>Please rate each part of your journey:</p>
        ${feedbackForm.map(f => `
          <div style="margin: 16px 0; padding: 16px; border: 1px solid #eee; border-radius: 8px;">
            <strong>${f.segment_type.toUpperCase()}: ${f.provider}</strong><br/>
            <p>${f.question}</p>
          </div>
        `).join('')}
        <p><a href="https://travel.app/feedback/${tripId}">Submit Feedback</a></p>
      `,
    });
  } catch (err) {
    console.warn('[FeedbackAgent] Email notification failed:', err);
  }

  console.log(`[FeedbackAgent] Feedback request sent for trip ${tripId} (${segments.length} segments)`);
}

/**
 * Process submitted feedback.
 * Ingests reviews into RAG, triggers claims for low ratings.
 */
export async function processFeedback(
  tripId: string,
  feedbackItems: SegmentFeedback[],
): Promise<{ claims_initiated: string[]; rag_ingested: number }> {
  const claimsInitiated: string[] = [];
  let ragIngested = 0;

  for (const item of feedbackItems) {
    // Ingest into traveler_reviews RAG collection
    try {
      const reviewContent = `${item.provider_name} — ${item.segment_type}. Rating: ${item.rating}/5. ${item.comment ?? ''}`.trim();

      // In production: call rag service directly
      // For now, log the ingestion
      console.log(`[FeedbackAgent] RAG ingest: ${reviewContent.slice(0, 80)}`);
      ragIngested++;
    } catch {
      console.warn('[FeedbackAgent] RAG ingestion failed for segment', item.segment_id);
    }

    // Trigger claim for rating <= 2
    if (item.rating <= 2) {
      console.log(`[FeedbackAgent] Low rating (${item.rating}/5) for ${item.provider_name} — initiating claim check`);
      const claim = await initiateClaim(tripId, item);
      if (claim) claimsInitiated.push(claim);
    }
  }

  return { claims_initiated: claimsInitiated, rag_ingested: ragIngested };
}

async function initiateClaim(tripId: string, feedback: SegmentFeedback): Promise<string | null> {
  // Retrieve dispute playbook from RAG
  try {
    const playbook = await callMcpTool('mcp-rag', 'rag_retrieve', {
      collection: 'dispute_playbooks',
      query: `refund claim procedure for ${feedback.segment_type} ${feedback.provider_name}`,
      top_k: 3,
    });

    const response = await claude.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: `You are the Claims Specialist. Draft a professional claim email for the traveler.
Keep it factual, polite, and reference the specific issue. Include: what happened, expected vs actual,
requested resolution (refund/compensation). Subject line first, then body.`,
      messages: [{
        role: 'user',
        content: `Trip: ${tripId}
Provider: ${feedback.provider_name} (${feedback.segment_type})
Rating: ${feedback.rating}/5
Issue: ${feedback.comment ?? 'No comment provided'}
Playbook context: ${JSON.stringify(playbook)}`,
      }],
    });

    const draft = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log(`[FeedbackAgent] Claim draft for ${feedback.provider_name}:\n${draft.slice(0, 200)}...`);
    return `claim_${feedback.provider_name.replace(/\s+/g, '_')}_${Date.now()}`;
  } catch {
    return null;
  }
}

/**
 * Generate full trip wrap-up report.
 */
export async function generateTripReport(
  tripId: string,
  feedback: SegmentFeedback[],
  expenseData: { total: number; currency: string; by_category: Record<string, number> },
): Promise<TripReport> {
  const avgRating = feedback.length > 0
    ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
    : 0;

  const lowRatings = feedback.filter(f => f.rating <= 2).map(f => `${f.provider_name}: ${f.comment ?? 'No comment'}`);
  const highRatings = feedback.filter(f => f.rating >= 4).map(f => f.provider_name);

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `You are generating a post-trip report. Be warm, celebratory for good trips,
constructive for issues. Return JSON:
{
  "highlights": ["..."],
  "issues": ["..."],
  "recommendation_score": 0-10
}
Wrap in \`\`\`json...\`\`\`.`,
    messages: [{
      role: 'user',
      content: `Trip ID: ${tripId}
Average rating: ${avgRating.toFixed(1)}/5
Highlights (high ratings): ${highRatings.join(', ')}
Issues (low ratings): ${lowRatings.join(', ')}
Total spent: ${expenseData.currency} ${expenseData.total.toLocaleString()}
By category: ${JSON.stringify(expenseData.by_category)}`,
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  let parsed: { highlights: string[]; issues: string[]; recommendation_score: number } = {
    highlights: highRatings,
    issues: lowRatings,
    recommendation_score: Math.round(avgRating * 2),
  };

  try {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[1]);
  } catch {
    // Use fallback
  }

  return {
    trip_id: tripId,
    total_days: 7, // Would come from trip record
    total_spent: { amount: expenseData.total, currency: expenseData.currency },
    feedback_summary: `${feedback.length} segments rated, avg ${avgRating.toFixed(1)}/5`,
    highlights: parsed.highlights,
    issues: parsed.issues,
    recommendation_score: parsed.recommendation_score,
  };
}
