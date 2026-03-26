import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { CircuitBreaker } from './circuit-breaker.js';

const telegramCB = new CircuitBreaker();
const whatsappCB = new CircuitBreaker();

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WHATSAPP_KEY = process.env.WHATSAPP_API_KEY;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

if (!TELEGRAM_TOKEN) console.error('[mcp-messaging] TELEGRAM_BOT_TOKEN not set — Telegram will be mocked');
if (!WHATSAPP_KEY) console.error('[mcp-messaging] WHATSAPP_API_KEY not set — WhatsApp will be mocked');

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

interface ParsedMessage {
  message_id: string;
  from: string;
  text: string;
  timestamp: string;
}

function parseWhatsAppWebhook(webhookData: Record<string, unknown>): ParsedMessage {
  // WhatsApp Business API webhook format
  const entry = (webhookData['entry'] as Array<Record<string, unknown>> | undefined)?.[0];
  const changes = (entry?.['changes'] as Array<Record<string, unknown>> | undefined)?.[0];
  const value = changes?.['value'] as Record<string, unknown> | undefined;
  const messages = value?.['messages'] as Array<Record<string, unknown>> | undefined;
  const msg = messages?.[0];

  if (!msg) {
    // Try simpler format (direct message object)
    return {
      message_id: String(webhookData['id'] ?? generateId('wamid')),
      from: String(webhookData['from'] ?? 'unknown'),
      text: String((webhookData['text'] as Record<string, unknown> | undefined)?.['body'] ?? webhookData['body'] ?? ''),
      timestamp: new Date(Number(webhookData['timestamp'] ?? Date.now() / 1000) * 1000).toISOString(),
    };
  }

  return {
    message_id: String(msg['id'] ?? generateId('wamid')),
    from: String(msg['from'] ?? 'unknown'),
    text: String((msg['text'] as Record<string, unknown> | undefined)?.['body'] ?? ''),
    timestamp: new Date(Number(msg['timestamp'] ?? Date.now() / 1000) * 1000).toISOString(),
  };
}

function parseTelegramUpdate(update: Record<string, unknown>): ParsedMessage {
  const message = update['message'] as Record<string, unknown> | undefined;
  const from = message?.['from'] as Record<string, unknown> | undefined;
  const chat = message?.['chat'] as Record<string, unknown> | undefined;

  return {
    message_id: String(message?.['message_id'] ?? update['update_id'] ?? generateId('tg')),
    from: String(from?.['username'] ?? from?.['first_name'] ?? chat?.['id'] ?? 'unknown'),
    text: String(message?.['text'] ?? ''),
    timestamp: new Date(Number(message?.['date'] ?? Date.now() / 1000) * 1000).toISOString(),
  };
}

async function telegramSendMessage(chatId: string, text: string): Promise<string> {
  return await telegramCB.execute(async () => {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Telegram error: ${res.status} ${err}`);
    }
    const data = await res.json() as { result?: { message_id?: number } };
    return String(data.result?.message_id ?? generateId('tg'));
  });
}

async function whatsappSendText(phone: string, text: string): Promise<string> {
  return await whatsappCB.execute(async () => {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WHATSAPP_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: text },
        }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`WhatsApp error: ${res.status} ${err}`);
    }
    const data = await res.json() as { messages?: Array<{ id?: string }> };
    return String(data.messages?.[0]?.id ?? generateId('wamid'));
  });
}

const server = new McpServer({ name: 'mcp-messaging', version: '1.0.0' });

server.tool(
  'listen_whatsapp',
  'Parse an incoming WhatsApp webhook payload into a structured message.',
  {
    webhook_data: z.record(z.unknown()).describe('Raw WhatsApp Business API webhook payload'),
  },
  async (input) => {
    try {
      const parsed = parseWhatsAppWebhook(input.webhook_data);
      return { content: [{ type: 'text', text: JSON.stringify(parsed) }] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: true, message: msg }) }],
        isError: true,
      };
    }
  }
);

server.tool(
  'listen_telegram',
  'Parse an incoming Telegram Bot API update into a structured message.',
  {
    update: z.record(z.unknown()).describe('Raw Telegram Bot API update object'),
  },
  async (input) => {
    try {
      const parsed = parseTelegramUpdate(input.update);
      return { content: [{ type: 'text', text: JSON.stringify(parsed) }] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: true, message: msg }) }],
        isError: true,
      };
    }
  }
);

server.tool(
  'send_reply',
  'Send a reply message via WhatsApp or Telegram.',
  {
    channel: z.enum(['whatsapp', 'telegram']).describe('Messaging channel to use'),
    conversation_id: z.string().describe('Chat ID (Telegram) or phone number (WhatsApp)'),
    message: z.string().describe('Message text to send'),
  },
  async (input) => {
    try {
      let messageId: string;

      if (input.channel === 'telegram') {
        if (!TELEGRAM_TOKEN) {
          console.error(`[mcp-messaging] Mock Telegram reply to ${input.conversation_id}: ${input.message}`);
          messageId = generateId('tg');
        } else {
          messageId = await telegramSendMessage(input.conversation_id, input.message);
        }
      } else {
        // whatsapp
        if (!WHATSAPP_KEY || !WHATSAPP_PHONE_ID) {
          console.error(`[mcp-messaging] Mock WhatsApp reply to ${input.conversation_id}: ${input.message}`);
          messageId = generateId('wamid');
        } else {
          messageId = await whatsappSendText(input.conversation_id, input.message);
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ sent: true, message_id: messageId, channel: input.channel }),
        }],
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: JSON.stringify({ sent: false, message_id: '', error: msg }) }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[mcp-messaging] Server started on stdio');
}

main().catch(err => {
  console.error('[mcp-messaging] Fatal error:', err);
  process.exit(1);
});
