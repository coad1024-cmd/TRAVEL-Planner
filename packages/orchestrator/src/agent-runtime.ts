import Anthropic from '@anthropic-ai/sdk';
import type { AgentCharacter, AgentRuntime } from './types.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export class ClaudeAgentRuntime implements AgentRuntime {
  readonly character: AgentCharacter;
  isRunning: boolean = false;
  private conversationHistory: Anthropic.MessageParam[] = [];

  constructor(character: AgentCharacter) {
    this.character = character;
  }

  async start(): Promise<void> {
    this.isRunning = true;
    this.conversationHistory = [];
    console.log(`[${this.character.agent_id}] Agent started`);
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log(`[${this.character.agent_id}] Agent stopped`);
  }

  async handleMessage(message: string, context?: Record<string, unknown>): Promise<string> {
    const contextStr = context && Object.keys(context).length > 0
      ? `\n\n[Context: ${JSON.stringify(context, null, 2)}]`
      : '';

    this.conversationHistory.push({
      role: 'user',
      content: `${message}${contextStr}`,
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: this.character.system_prompt,
      messages: this.conversationHistory,
    });

    const assistantMessage = response.content[0].type === 'text'
      ? response.content[0].text
      : '[non-text response]';

    this.conversationHistory.push({
      role: 'assistant',
      content: assistantMessage,
    });

    return assistantMessage;
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }
}
