#!/usr/bin/env node
/**
 * CLI entry point — type a trip request in natural language and observe
 * which agents are dispatched and in what order.
 */
import { createInterface } from 'readline';
import { AgentRegistry } from './registry.js';
import type { AgentId, IntentClassification } from '@travel/shared';

const INTENT_DISPATCH_MAP: Record<IntentClassification, AgentId> = {
  PLANNING: 'synthesizer',
  LIVE_HELP: 'concierge',
  EMERGENCY: 'emergency',
  COMPLAINT: 'feedback-claims',
  GENERAL: 'relationship-manager',
};

async function classifyIntent(message: string): Promise<IntentClassification> {
  const msg = message.toLowerCase();
  if (/emergency|help|accident|lost|stolen|hospital|doctor|police|crisis/.test(msg)) return 'EMERGENCY';
  if (/complaint|refund|claim|dispute|poor|terrible|bad experience/.test(msg)) return 'COMPLAINT';
  if (/book|plan|trip|travel|hotel|flight|itinerary|holiday|vacation/.test(msg)) return 'PLANNING';
  if (/nearby|now|currently|find me|on my trip|i'm at|i am at/.test(msg)) return 'LIVE_HELP';
  return 'GENERAL';
}

async function main() {
  console.log('\n========================================');
  console.log('  Multi-Agent Travel System — CLI Demo');
  console.log('========================================\n');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[WARN] ANTHROPIC_API_KEY not set. Agent LLM calls will fail.');
    console.warn('       Set it in .env or export ANTHROPIC_API_KEY=...\n');
  }

  const registry = new AgentRegistry();
  await registry.startAll();

  console.log('\nRegistered agents:');
  registry.listAgents().forEach(a => {
    console.log(`  • ${a.name} (${a.id})`);
    if (a.mcp_servers.length) {
      console.log(`    MCP: ${a.mcp_servers.join(', ')}`);
    }
  });

  console.log('\n----------------------------------------');
  console.log('Type your travel request (or "exit" to quit):\n');

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const ask = () =>
    rl.question('You: ', async (input) => {
      const text = input.trim();
      if (!text) return ask();
      if (text.toLowerCase() === 'exit') {
        await registry.stopAll();
        rl.close();
        return;
      }

      const intent = await classifyIntent(text);
      const targetAgent = INTENT_DISPATCH_MAP[intent];

      console.log(`\n[Router] Intent classified: ${intent}`);
      console.log(`[Router] Dispatching to: ${targetAgent}`);

      if (intent === 'PLANNING') {
        console.log('\n[Synthesizer] Dispatch order:');
        console.log('  1. locations-intel  → weather/seasonal context');
        console.log('  2. logistics        → transport legs');
        console.log('  3. accommodation    → overnight slots (parallel)');
        console.log('  4. excursion        → activity slots');
        console.log('  5. budget-finance   → cost aggregation');
        console.log('  6. security-health  → risk assessment\n');
      }

      try {
        const rm = registry.get('relationship-manager');
        const response = await rm.handleMessage(text, { intent, routed_to: targetAgent });
        console.log(`\nAssistant: ${response}\n`);
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error(`\n[ERROR] ${error}\n`);
      }

      ask();
    });

  ask();
}

main().catch(console.error);
