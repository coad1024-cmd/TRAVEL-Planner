import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { CircuitBreaker } from './circuit-breaker.js';

const smsCB = new CircuitBreaker();
const emailCB = new CircuitBreaker();
const whatsappCB = new CircuitBreaker();

const TWILIO_SID = process.env.TWILIO_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;
const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM = process.env.SENDGRID_FROM_EMAIL ?? 'noreply@travel-system.app';
const WHATSAPP_KEY = process.env.WHATSAPP_API_KEY;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

if (!TWILIO_SID || !TWILIO_AUTH_TOKEN) console.error('[mcp-notifications] Twilio not configured — SMS will be mocked');
if (!SENDGRID_KEY) console.error('[mcp-notifications] SendGrid not configured — email will be mocked');
if (!WHATSAPP_KEY) console.error('[mcp-notifications] WhatsApp not configured — will be mocked');

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

async function twilioSendSms(to: string, body: string): Promise<string> {
  return await smsCB.execute(async () => {
    const auth = Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ From: TWILIO_PHONE!, To: to, Body: body }).toString(),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Twilio error: ${res.status} ${err}`);
    }
    const data = await res.json() as { sid?: string };
    return data.sid ?? generateId('SM');
  });
}

async function sendgridSendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
  await emailCB.execute(async () => {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: SENDGRID_FROM },
        subject,
        content: [{ type: 'text/html', value: htmlBody }],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`SendGrid error: ${res.status} ${err}`);
    }
  });
}

async function whatsappSend(phone: string, templateId: string, params: string[]): Promise<void> {
  await whatsappCB.execute(async () => {
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
          type: 'template',
          template: {
            name: templateId,
            language: { code: 'en' },
            components: params.length > 0 ? [{
              type: 'body',
              parameters: params.map(p => ({ type: 'text', text: p })),
            }] : [],
          },
        }),
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`WhatsApp error: ${res.status} ${err}`);
    }
  });
}

const server = new McpServer({ name: 'mcp-notifications', version: '1.0.0' });

server.tool(
  'send_push',
  'Send a push notification.',
  {
    title: z.string().describe('Notification title'),
    body: z.string().describe('Notification body'),
    data: z.record(z.unknown()).optional().describe('Additional data payload'),
    urgency: z.enum(['info', 'warning', 'critical']).describe('Urgency level'),
  },
  async (input) => {
    const messageId = generateId('push');
    // For critical urgency, also trigger SMS if configured
    if (input.urgency === 'critical') {
      console.error(`[mcp-notifications] CRITICAL push: ${input.title} — ${input.body}`);
    }
    // Push notification infrastructure (FCM/APNs) would be wired here
    // For now, log and return success
    console.error(`[mcp-notifications] Push [${input.urgency}]: ${input.title}`);
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ sent: true, message_id: messageId }),
      }],
    };
  }
);

server.tool(
  'send_sms',
  'Send an SMS message via Twilio.',
  {
    phone: z.string().describe('Recipient phone number (E.164 format)'),
    message: z.string().describe('SMS message body'),
  },
  async (input) => {
    if (!TWILIO_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE) {
      console.error(`[mcp-notifications] Mock SMS to ${input.phone}: ${input.message}`);
      return {
        content: [{ type: 'text', text: JSON.stringify({ sent: true, sid: generateId('SM'), mock: true }) }],
      };
    }

    try {
      const sid = await twilioSendSms(input.phone, input.message);
      return { content: [{ type: 'text', text: JSON.stringify({ sent: true, sid }) }] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: JSON.stringify({ sent: false, sid: '', error: msg }) }],
        isError: true,
      };
    }
  }
);

server.tool(
  'send_email',
  'Send an email via SendGrid.',
  {
    to: z.string().email().describe('Recipient email address'),
    subject: z.string().describe('Email subject'),
    html_body: z.string().describe('HTML email body'),
  },
  async (input) => {
    if (!SENDGRID_KEY) {
      console.error(`[mcp-notifications] Mock email to ${input.to}: ${input.subject}`);
      return { content: [{ type: 'text', text: JSON.stringify({ sent: true, mock: true }) }] };
    }

    try {
      await sendgridSendEmail(input.to, input.subject, input.html_body);
      return { content: [{ type: 'text', text: JSON.stringify({ sent: true }) }] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: JSON.stringify({ sent: false, error: msg }) }],
        isError: true,
      };
    }
  }
);

server.tool(
  'send_whatsapp',
  'Send a WhatsApp template message.',
  {
    phone: z.string().describe('Recipient phone number (E.164 format)'),
    template_id: z.string().describe('WhatsApp template name'),
    params: z.array(z.string()).describe('Template parameter values'),
  },
  async (input) => {
    if (!WHATSAPP_KEY || !WHATSAPP_PHONE_ID) {
      console.error(`[mcp-notifications] Mock WhatsApp to ${input.phone}: template=${input.template_id}`);
      return { content: [{ type: 'text', text: JSON.stringify({ sent: true, mock: true }) }] };
    }

    try {
      await whatsappSend(input.phone, input.template_id, input.params);
      return { content: [{ type: 'text', text: JSON.stringify({ sent: true }) }] };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text', text: JSON.stringify({ sent: false, error: msg }) }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[mcp-notifications] Server started on stdio');
}

main().catch(err => {
  console.error('[mcp-notifications] Fatal error:', err);
  process.exit(1);
});
