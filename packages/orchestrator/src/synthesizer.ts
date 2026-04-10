/**
 * Synthesizer / Trip Manager — core orchestration state machine.
 * Redesigned as a Supervisor ("Boss AI") that dynamically communicates with Worker AIs via Tool calling.
 */
import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import type {
  TripRequest,
  ItineraryDay,
  BudgetDashboard,
  AgentMessage,
  SynthesizerState,
  PreDepartureChecklist,
  ItineraryVersionRecord,
  SynthesizerResult,
  AgentId,
} from '@travel/shared';
import { createAgentMessage } from '@travel/shared';
import { AgentRegistry } from './registry.js';

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BOSS_SYSTEM_PROMPT = `You are the Lead Travel Supervisor (The "Boss"). 
Your job is to orchestrate a complete travel itinerary by consulting your team of specialist Worker AIs.
You MUST communicate with them using the provided tools to gather intelligence, costs, and options.

ORCHESTRATION STRATEGY:
1. First, consult Locations Intel to understand the destination context (weather, local events).
2. Consult Logistics for transport options.
3. Consult Accommodation for stays.
4. Consult Excursions for activities.
5. Consult Budget Finance to ensure the total cost is within the limit.
6. Consult Security & Health for safety checks.

CONSTRAINT RESOLUTION:
- You MUST ensure there are no time-slot overlaps between segments (e.g., two activities at the same time).
- You MUST ensure the total cost of all segments is <= the user's budget.
- If a worker provides options that violate the budget, you MUST ping them again or ping the Budget worker to figure out a solution. 

You are an autonomous supervisor. Once you have gathered enough information and resolved any conflicts (like budget limits), you must output the final assembled itinerary and budget strictly in a structured JSON block wrapped in \`\`\`json \`\`\`.

The final JSON output MUST have this schema:
{
  "itinerary": [
    {
      "day_number": 1,
      "date": "2026-07-10",
      "segments": [ 
        { 
          "type": "transport" | "accommodation" | "excursion" | "dining", 
          "start_time": "HH:MM",
          "end_time": "HH:MM",
          "cost": { "amount": number, "currency": "INR" },
          ... 
        } 
      ],
      "risk_level": "low" | "medium" | "high",
      "weather_summary": "Sunny",
      "nearest_hospital_km": 5.2
    }
  ],
  "budget_dashboard": {
    "total_budget": { "amount": number, "currency": string },
    "total_spent": { "amount": number, "currency": string },
    "remaining": { "amount": number, "currency": string },
    "percent_used": number,
    "by_category": { "Transport": number, "Accommodation": number, "Food": number, "Activities": number },
    "alerts": []
  }
}

Do NOT output the final JSON until you are satisfied with the inputs from your workers.`;

export async function orchestrateTrip(req: TripRequest): Promise<SynthesizerResult> {
  const registry = new AgentRegistry();
  await registry.startAll();
  
  const messages: AgentMessage[] = [];
  const state: SynthesizerState = 'INTAKE';

  // We map tools to the actual registry agents
  const tools: Anthropic.Tool[] = [
    {
      name: 'ask_locations_intel',
      description: 'Ask the Locations Intel worker for weather, events, and seasonal context about the destination.',
      input_schema: { type: 'object', properties: { query: { type: 'string', description: 'What you need to know' } }, required: ['query'] }
    },
    {
      name: 'ask_logistics',
      description: 'Ask the Logistics worker to find flights and transport options.',
      input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Request for transport' } }, required: ['query'] }
    },
    {
      name: 'ask_accommodation',
      description: 'Ask the Accommodation worker to find hotels/stays within budget.',
      input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Request for accommodation' } }, required: ['query'] }
    },
    {
      name: 'ask_excursions',
      description: 'Ask the Excursion worker to plan activities and schedules.',
      input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Request for activities' } }, required: ['query'] }
    },
    {
      name: 'ask_budget_finance',
      description: 'Ask the Budget worker to review current proposed costs to ensure we are not over ceiling.',
      input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Provide the costs to review' } }, required: ['query'] }
    },
    {
      name: 'ask_security_health',
      description: 'Ask the Security worker for health risks and hospital proximities.',
      input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Request for security check' } }, required: ['query'] }
    }
  ];

  const conversation: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Please plan a trip for ${req.party_size} people to ${req.destination}.
      Dates: ${req.dates.start} to ${req.dates.end}.
      Budget: ${req.budget.amount} ${req.budget.currency}.
      Purpose: ${req.purpose}. Activity Level: ${req.preferences.activity_level}.
      Dietary: ${req.preferences.dietary || 'None'}. Must include: ${(req.preferences.must_include || []).join(', ')}.

      Talk to your workers and build the final JSON itinerary.`
    }
  ];

  let finalItineraryContent = '';
  // Supervisor loop
  console.log('[Synthesizer] Boss AI starting coordination loop...');
  for (let step = 0; step < 10; step++) {
    console.log(`[Synthesizer] Boss loop iteration ${step + 1}`);
    let response;
    try {
      response = await claude.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 8192,
        system: BOSS_SYSTEM_PROMPT,
        messages: conversation,
        tools: tools,
      });
    } catch (err: any) {
      if (err?.status === 400 && (err?.message?.includes('balance') || JSON.stringify(err).includes('balance'))) {
        console.warn(`[Synthesizer] API Credit Limit Reached - Using Mock Boss Response`);
        // We will throw to let the Relationship Manager handle the catch 
        throw new Error('API Credit Limit Reached during Supervior Loop.');
      }
      throw err;
    }

    conversation.push({ role: 'assistant', content: response.content });

    const toolUses = response.content.filter(block => block.type === 'tool_use') as Anthropic.ToolUseBlock[];
    const textBlocks = response.content.filter(block => block.type === 'text') as Anthropic.TextBlock[];

    if (textBlocks.length > 0) {
      const text = textBlocks.map(b => b.text).join('\\n');
      if (text.includes('```json')) {
        finalItineraryContent = text;
        break;
      }
    }

    if (toolUses.length === 0) {
      // LLM stopped using tools but didn't output JSON. Ask it to finish or produce the output.
      conversation.push({ role: 'user', content: 'Please output the final JSON wrapped in `\\`\\`\\`json` as instructed.' });
      continue;
    }

    // Execute the requested tools
    const toolResults: Anthropic.MessageParam = { role: 'user', content: [] };
    
    for (const tool of toolUses) {
      const agentMap: Record<string, string> = {
        'ask_locations_intel': 'locations-intel',
        'ask_logistics': 'logistics',
        'ask_accommodation': 'accommodation',
        'ask_excursions': 'excursion',
        'ask_budget_finance': 'budget-finance',
        'ask_security_health': 'security-health'
      };

      const agentId = agentMap[tool.name] as AgentId;
      if (agentId) {
        console.log(`[Synthesizer] Boss consulting worker: ${agentId}`);
        const agent = registry.get(agentId);
        const query = (tool.input as any).query;
        messages.push(createAgentMessage('synthesizer' as AgentId, agentId, 'task_request', { query }));
        
        try {
          const workerResponse = await agent.handleMessage(query);
          messages.push(createAgentMessage(agentId, 'synthesizer' as AgentId, 'task_response', { response: workerResponse }));
          (toolResults.content as Array<any>).push({
            type: 'tool_result',
            tool_use_id: tool.id,
            content: workerResponse
          });
        } catch (e: any) {
           (toolResults.content as Array<any>).push({
            type: 'tool_result',
            tool_use_id: tool.id,
            content: `Worker Error: ${e.message}`,
            is_error: true
          });
        }
      }
    }
    
    conversation.push(toolResults);
  }

  await registry.stopAll();

  // Ensure JSON parsing from final output
  let parsedFinal: any = { itinerary: [], budget_dashboard: {} };
  try {
    const jsonMatch = finalItineraryContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      parsedFinal = JSON.parse(jsonMatch[1]);
    }
  } catch (err) {
    console.error('[Synthesizer] Failed to parse final boss JSON.', err);
  }

  const version: ItineraryVersionRecord = {
    version_id: randomUUID(),
    trip_id: req.id,
    parent_version_id: null,
    version_number: 1,
    itinerary_snapshot: parsedFinal.itinerary || [],
    mutation_type: 'initial',
    mutated_by: 'synthesizer',
    mutation_reason: 'Supervisor final iteration',
    created_at: new Date().toISOString()
  };

  const checklist: PreDepartureChecklist = {
    trip_id: req.id,
    generated_at: new Date().toISOString(),
    items: [] 
  };

  return {
    itinerary: parsedFinal.itinerary || [],
    budget: parsedFinal.budget_dashboard || {},
    messages,
    state: 'PRESENT',
    escalation_needed: false,
    pre_departure_checklist: checklist,
    itinerary_version: version,
    calendar_conflicts: []
  };
}
