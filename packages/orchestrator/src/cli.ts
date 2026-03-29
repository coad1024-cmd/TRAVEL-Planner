#!/usr/bin/env node
/**
 * CLI entry point — type a trip request in natural language and observe
 * the voice-optimized requirement gathering and orchestration.
 */
import { createInterface } from 'readline';
import { AgentRegistry } from './registry.js';
import { handleTravelerMessage } from './relationship-manager.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Manually load .env since we are in a monorepo and want to ensure it's loaded
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../../../.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      process.env[key.trim()] = value;
    }
  });
}

async function main() {
  console.log('\n========================================');
  console.log('  Multi-Agent Travel System — CLI Demo');
  console.log('  (Voice-Optimized Manager Agent)');
  console.log('========================================\n');

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[WARN] ANTHROPIC_API_KEY not set. Agent LLM calls will fail.');
  }

  const registry = new AgentRegistry();
  await registry.startAll();

  console.log('\nRegistered agents:');
  registry.listAgents().forEach(a => {
    console.log(`  • ${a.name} (${a.id})`);
  });

  console.log('\n----------------------------------------');
  console.log('Voice Prompt: "How can I help with your travel plans today?"');
  console.log('Type your request (or "exit" to quit):\n');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const travelerId = 'demo-traveler-' + Math.random().toString(36).slice(2, 7);

  const ask = () =>
    rl.question('You: ', async (input) => {
      const text = input.trim();
      if (!text) return ask();
      if (text.toLowerCase() === 'exit') {
        await registry.stopAll();
        rl.close();
        return;
      }

      try {
        const result = await handleTravelerMessage(text, travelerId, registry);
        console.log(`\n[Intent: ${result.intent} | Routed To: ${result.routed_to}]`);
        console.log(`\nAssistant (Voice): ${result.response}\n`);
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.error(`\n[ERROR] ${error}\n`);
      }

      ask();
    });

  ask();
}

main().catch(console.error);
