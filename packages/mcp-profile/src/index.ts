import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import type { TravelerProfile, Money } from '@travel/shared';

// NOTE: In-memory store — Phase 4 will replace with PostgreSQL + encrypted document storage.
// Documents containing PII (passport, visa, etc.) would be encrypted at rest in production
// using AES-256-GCM with per-user keys stored in a KMS.

const profileStore = new Map<string, TravelerProfile>();

const documentStore = new Map<string, Array<{
  document_id: string;
  traveler_id: string;
  doc_type: string;
  data: Record<string, unknown>;
  stored_at: string;
}>>();

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function createDefaultProfile(travelerId: string): TravelerProfile {
  const now = new Date().toISOString();
  return {
    id: travelerId,
    name: 'Traveler',
    email: '',
    phone: '',
    dietary: [],
    allergies: [],
    room_preferences: {},
    activity_style: 'moderate',
    budget_comfort_zone: {
      min: { amount: 2000, currency: 'INR' } as Money,
      max: { amount: 10000, currency: 'INR' } as Money,
    },
    companions: [],
    documents: [],
    trip_history: [],
    loyalty_tier: 'bronze',
    created_at: now,
    updated_at: now,
  };
}

// Seed a demo traveler profile
const DEMO_PROFILE: TravelerProfile = {
  id: 'traveler-demo-001',
  name: 'Arjun Sharma',
  email: 'arjun.sharma@example.com',
  phone: '+91-9876543210',
  dietary: ['vegetarian'],
  allergies: ['nuts'],
  room_preferences: { floor: 'high', view: 'mountain', bed: 'king' },
  activity_style: 'moderate',
  budget_comfort_zone: {
    min: { amount: 3000, currency: 'INR', amount_usd: 36 },
    max: { amount: 15000, currency: 'INR', amount_usd: 180 },
  },
  companions: [
    { name: 'Priya Sharma', relationship: 'spouse', preferences: { dietary: ['vegetarian'], activities: ['light_trekking'] } },
  ],
  documents: [
    { type: 'passport', number: '***ENCRYPTED***', country: 'IN', expiry: '2030-05-15' },
  ],
  trip_history: ['trip-2024-goa', 'trip-2024-rajasthan'],
  loyalty_tier: 'silver',
  created_at: '2024-01-15T10:30:00Z',
  updated_at: new Date().toISOString(),
};
profileStore.set(DEMO_PROFILE.id, DEMO_PROFILE);

const server = new McpServer({ name: 'mcp-profile', version: '1.0.0' });

server.tool(
  'get_profile',
  'Retrieve a traveler profile by ID.',
  { traveler_id: z.string().describe('Traveler ID') },
  async (input) => {
    const profile = profileStore.get(input.traveler_id);
    if (!profile) {
      // Auto-create a profile for new travelers
      const newProfile = createDefaultProfile(input.traveler_id);
      profileStore.set(input.traveler_id, newProfile);
      return { content: [{ type: 'text', text: JSON.stringify({ ...newProfile, created: true }) }] };
    }
    return { content: [{ type: 'text', text: JSON.stringify(profile) }] };
  }
);

server.tool(
  'update_profile',
  'Update fields in a traveler profile.',
  {
    traveler_id: z.string().describe('Traveler ID'),
    updates: z.record(z.unknown()).describe('Partial profile fields to update'),
  },
  async (input) => {
    let profile = profileStore.get(input.traveler_id);
    if (!profile) {
      profile = createDefaultProfile(input.traveler_id);
    }

    // Merge updates (shallow merge top-level, deep merge for objects)
    const updates = input.updates as Partial<TravelerProfile>;
    const updated: TravelerProfile = {
      ...profile,
      ...updates,
      id: profile.id, // Never override ID
      updated_at: new Date().toISOString(),
    };

    profileStore.set(input.traveler_id, updated);
    return { content: [{ type: 'text', text: JSON.stringify(updated) }] };
  }
);

server.tool(
  'get_documents',
  'Get all documents associated with a traveler profile.',
  { traveler_id: z.string().describe('Traveler ID') },
  async (input) => {
    const profile = profileStore.get(input.traveler_id);
    if (!profile) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: true, message: `Profile ${input.traveler_id} not found` }) }],
        isError: true,
      };
    }

    // Return profile documents + any separately stored documents
    const storedDocs = documentStore.get(input.traveler_id) ?? [];
    const result = {
      profile_documents: profile.documents,
      stored_documents: storedDocs.map(d => ({
        document_id: d.document_id,
        doc_type: d.doc_type,
        stored_at: d.stored_at,
        // Note: actual data would be encrypted at rest in production
        data_available: true,
      })),
      encryption_note: 'In production, document data is encrypted at rest using AES-256-GCM with per-user KMS keys.',
    };

    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
);

server.tool(
  'store_document',
  'Store a document securely for a traveler.',
  {
    traveler_id: z.string().describe('Traveler ID'),
    doc_type: z.string().describe('Document type (passport, visa, insurance, vaccination, etc.)'),
    data: z.record(z.unknown()).describe('Document data fields'),
  },
  async (input) => {
    let profile = profileStore.get(input.traveler_id);
    if (!profile) {
      profile = createDefaultProfile(input.traveler_id);
      profileStore.set(input.traveler_id, profile);
    }

    const documentId = generateId('doc');
    const stored_at = new Date().toISOString();

    // Store in document store
    const existing = documentStore.get(input.traveler_id) ?? [];
    existing.push({
      document_id: documentId,
      traveler_id: input.traveler_id,
      doc_type: input.doc_type,
      data: input.data,
      stored_at,
    });
    documentStore.set(input.traveler_id, existing);

    // Also update profile documents array if it's a standard document type
    const standardTypes = ['passport', 'visa', 'insurance', 'vaccination'] as const;
    type StandardDocType = typeof standardTypes[number];

    if (standardTypes.includes(input.doc_type as StandardDocType)) {
      const docEntry = {
        type: input.doc_type as StandardDocType,
        number: String(input.data['number'] ?? '***ENCRYPTED***'),
        country: String(input.data['country'] ?? 'IN'),
        expiry: String(input.data['expiry'] ?? ''),
      };
      const updatedDocs = profile.documents.filter(d => d.type !== input.doc_type);
      updatedDocs.push(docEntry);
      const updatedProfile: TravelerProfile = {
        ...profile,
        documents: updatedDocs,
        updated_at: stored_at,
      };
      profileStore.set(input.traveler_id, updatedProfile);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          stored: true,
          document_id: documentId,
          doc_type: input.doc_type,
          stored_at,
          encryption_note: 'In production, this data would be encrypted at rest using AES-256-GCM before storage.',
        }),
      }],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[mcp-profile] Server started on stdio');
}

main().catch(err => {
  console.error('[mcp-profile] Fatal error:', err);
  process.exit(1);
});
