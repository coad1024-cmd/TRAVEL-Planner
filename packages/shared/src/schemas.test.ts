import { describe, it, expect } from 'vitest';
import {
  MoneySchema,
  LocationRefSchema,
  TripRequestSchema,
  TravelerProfileSchema,
  AgentMessageSchema,
  TransportSegmentSchema,
  AccommodationSegmentSchema,
  ExcursionSegmentSchema,
  DiningSegmentSchema,
  ItineraryDaySchema,
  BudgetDashboardSchema,
  SearchFlightsInputSchema,
  GetForecastInputSchema,
  ConvertCurrencyInputSchema,
  TravelEventSchema,
  RagRetrieveInputSchema,
  SendNotificationInputSchema,
} from './schemas.js';

// ─── Helpers ───────────────────────────────────

function validMoney(overrides: Record<string, unknown> = {}) {
  return { amount: 5000, currency: 'INR', ...overrides };
}

function validLocation(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Pahalgam',
    latitude: 34.0161,
    longitude: 75.3147,
    region: 'Kashmir',
    country_code: 'IN',
    ...overrides,
  };
}

// ─── MoneySchema ───────────────────────────────

describe('MoneySchema', () => {
  it('accepts valid money', () => {
    const result = MoneySchema.safeParse({ amount: 100, currency: 'USD' });
    expect(result.success).toBe(true);
  });

  it('accepts money with optional amount_usd', () => {
    const result = MoneySchema.safeParse({ amount: 100, currency: 'INR', amount_usd: 1.2 });
    expect(result.success).toBe(true);
  });

  it('rejects negative amount', () => {
    const result = MoneySchema.safeParse({ amount: -10, currency: 'USD' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid currency length', () => {
    expect(MoneySchema.safeParse({ amount: 10, currency: 'US' }).success).toBe(false);
    expect(MoneySchema.safeParse({ amount: 10, currency: 'USDX' }).success).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(MoneySchema.safeParse({ amount: 10 }).success).toBe(false);
    expect(MoneySchema.safeParse({ currency: 'USD' }).success).toBe(false);
    expect(MoneySchema.safeParse({}).success).toBe(false);
  });
});

// ─── LocationRefSchema ─────────────────────────

describe('LocationRefSchema', () => {
  it('accepts valid location', () => {
    const result = LocationRefSchema.safeParse(validLocation());
    expect(result.success).toBe(true);
  });

  it('rejects latitude out of range', () => {
    expect(LocationRefSchema.safeParse(validLocation({ latitude: 91 })).success).toBe(false);
    expect(LocationRefSchema.safeParse(validLocation({ latitude: -91 })).success).toBe(false);
  });

  it('rejects longitude out of range', () => {
    expect(LocationRefSchema.safeParse(validLocation({ longitude: 181 })).success).toBe(false);
    expect(LocationRefSchema.safeParse(validLocation({ longitude: -181 })).success).toBe(false);
  });

  it('rejects invalid country_code length', () => {
    expect(LocationRefSchema.safeParse(validLocation({ country_code: 'IND' })).success).toBe(false);
  });

  it('accepts valid connectivity enum', () => {
    for (const c of ['none', '2G', '4G', '5G']) {
      expect(LocationRefSchema.safeParse(validLocation({ connectivity: c })).success).toBe(true);
    }
  });

  it('rejects invalid connectivity value', () => {
    expect(LocationRefSchema.safeParse(validLocation({ connectivity: '3G' })).success).toBe(false);
  });
});

// ─── TripRequestSchema ─────────────────────────

describe('TripRequestSchema', () => {
  const validTrip = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    traveler_id: '550e8400-e29b-41d4-a716-446655440001',
    destination: 'Pahalgam',
    dates: { start: '2026-07-10', end: '2026-07-15' },
    budget: validMoney(),
    party_size: 2,
    purpose: 'honeymoon',
    preferences: { activity_level: 'moderate' },
  };

  it('accepts valid trip request', () => {
    const result = TripRequestSchema.safeParse(validTrip);
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID for id', () => {
    expect(TripRequestSchema.safeParse({ ...validTrip, id: 'not-a-uuid' }).success).toBe(false);
  });

  it('rejects empty destination', () => {
    expect(TripRequestSchema.safeParse({ ...validTrip, destination: '' }).success).toBe(false);
  });

  it('rejects non-positive party_size', () => {
    expect(TripRequestSchema.safeParse({ ...validTrip, party_size: 0 }).success).toBe(false);
    expect(TripRequestSchema.safeParse({ ...validTrip, party_size: -1 }).success).toBe(false);
  });

  it('rejects invalid purpose', () => {
    expect(TripRequestSchema.safeParse({ ...validTrip, purpose: 'vacation' }).success).toBe(false);
  });

  it('accepts all valid purpose values', () => {
    for (const purpose of ['honeymoon', 'business', 'family', 'adventure', 'solo', 'group']) {
      expect(TripRequestSchema.safeParse({ ...validTrip, purpose }).success).toBe(true);
    }
  });

  it('accepts optional preference fields', () => {
    const trip = { ...validTrip, preferences: {} };
    expect(TripRequestSchema.safeParse(trip).success).toBe(true);
  });

  it('rejects invalid activity_level', () => {
    const trip = { ...validTrip, preferences: { activity_level: 'extreme' } };
    expect(TripRequestSchema.safeParse(trip).success).toBe(false);
  });
});

// ─── TravelerProfileSchema ─────────────────────

describe('TravelerProfileSchema', () => {
  const validProfile = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Rohan Mehta',
    email: 'rohan@example.com',
    phone: '+91-9876543210',
    dietary: ['vegetarian'],
    allergies: ['peanuts'],
    room_preferences: { floor: 'high', bed: 'king' },
    activity_style: 'adventurous',
    budget_comfort_zone: {
      min: { amount: 50000, currency: 'INR' },
      max: { amount: 200000, currency: 'INR' },
    },
    companions: [
      { name: 'Priya Mehta', relationship: 'spouse' },
    ],
    documents: [
      { type: 'passport', number: 'T1234567', country: 'IN', expiry: '2029-03-15' },
    ],
    trip_history: [],
    loyalty_tier: 'gold',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  it('accepts valid profile', () => {
    expect(TravelerProfileSchema.safeParse(validProfile).success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(TravelerProfileSchema.safeParse({ ...validProfile, email: 'not-an-email' }).success).toBe(false);
  });

  it('rejects empty name', () => {
    expect(TravelerProfileSchema.safeParse({ ...validProfile, name: '' }).success).toBe(false);
  });

  it('rejects short phone', () => {
    expect(TravelerProfileSchema.safeParse({ ...validProfile, phone: '123' }).success).toBe(false);
  });

  it('rejects invalid loyalty tier', () => {
    expect(TravelerProfileSchema.safeParse({ ...validProfile, loyalty_tier: 'diamond' }).success).toBe(false);
  });

  it('accepts all valid loyalty tiers', () => {
    for (const tier of ['bronze', 'silver', 'gold', 'platinum']) {
      expect(TravelerProfileSchema.safeParse({ ...validProfile, loyalty_tier: tier }).success).toBe(true);
    }
  });

  it('rejects invalid document type', () => {
    const profile = {
      ...validProfile,
      documents: [{ type: 'drivers_license', number: 'X', country: 'IN', expiry: '2029-01-01' }],
    };
    expect(TravelerProfileSchema.safeParse(profile).success).toBe(false);
  });
});

// ─── AgentMessageSchema ────────────────────────

describe('AgentMessageSchema', () => {
  const validMessage = {
    from: 'synthesizer',
    to: 'logistics',
    type: 'task_request',
    correlation_id: '550e8400-e29b-41d4-a716-446655440000',
    timestamp: '2026-03-29T10:00:00Z',
    payload: { query: 'Find flights' },
    confidence: 0.95,
    requires_human_confirmation: false,
    errors: [],
  };

  it('accepts valid agent message', () => {
    expect(AgentMessageSchema.safeParse(validMessage).success).toBe(true);
  });

  it('rejects invalid type', () => {
    expect(AgentMessageSchema.safeParse({ ...validMessage, type: 'invalid' }).success).toBe(false);
  });

  it('rejects confidence out of range', () => {
    expect(AgentMessageSchema.safeParse({ ...validMessage, confidence: 1.5 }).success).toBe(false);
    expect(AgentMessageSchema.safeParse({ ...validMessage, confidence: -0.1 }).success).toBe(false);
  });

  it('accepts all valid message types', () => {
    for (const type of ['task_request', 'task_response', 'error', 'escalation', 'event']) {
      expect(AgentMessageSchema.safeParse({ ...validMessage, type }).success).toBe(true);
    }
  });
});

// ─── TransportSegmentSchema ────────────────────

describe('TransportSegmentSchema', () => {
  const validTransport = {
    type: 'transport',
    mode: 'flight',
    origin: validLocation(),
    destination: validLocation({ name: 'Srinagar' }),
    departure: '2026-07-10T10:00:00Z',
    arrival: '2026-07-10T12:00:00Z',
    cost: validMoney(),
    carrier: 'Air India',
    reliability_score: 0.85,
  };

  it('accepts valid transport segment', () => {
    expect(TransportSegmentSchema.safeParse(validTransport).success).toBe(true);
  });

  it('rejects invalid mode', () => {
    expect(TransportSegmentSchema.safeParse({ ...validTransport, mode: 'bicycle' }).success).toBe(false);
  });

  it('rejects reliability_score out of range', () => {
    expect(TransportSegmentSchema.safeParse({ ...validTransport, reliability_score: 1.5 }).success).toBe(false);
  });

  it('accepts all valid transport modes', () => {
    for (const mode of ['flight', 'rail', 'road', 'ferry', 'helicopter']) {
      expect(TransportSegmentSchema.safeParse({ ...validTransport, mode }).success).toBe(true);
    }
  });
});

// ─── AccommodationSegmentSchema ────────────────

describe('AccommodationSegmentSchema', () => {
  const validAccommodation = {
    type: 'accommodation',
    property_name: 'Heevan Resort',
    location: validLocation(),
    check_in: '2026-07-10',
    check_out: '2026-07-15',
    nightly_rate: validMoney({ amount: 8200 }),
    total_cost: validMoney({ amount: 41000 }),
    amenities: ['WiFi', 'River View', 'Breakfast'],
    cancellation_policy: 'Free cancellation until 48h before check-in',
    suitability_score: 0.9,
  };

  it('accepts valid accommodation segment', () => {
    expect(AccommodationSegmentSchema.safeParse(validAccommodation).success).toBe(true);
  });

  it('rejects wrong type literal', () => {
    expect(AccommodationSegmentSchema.safeParse({ ...validAccommodation, type: 'hotel' }).success).toBe(false);
  });
});

// ─── ExcursionSegmentSchema ────────────────────

describe('ExcursionSegmentSchema', () => {
  const validExcursion = {
    type: 'excursion',
    activity_name: 'Betaab Valley Trek',
    location: validLocation(),
    start_time: '2026-07-11T08:00:00Z',
    duration_minutes: 180,
    cost: validMoney({ amount: 2500 }),
    difficulty: 'moderate',
    weather_dependent: true,
    guide_required: true,
    altitude_meters: 2740,
  };

  it('accepts valid excursion', () => {
    expect(ExcursionSegmentSchema.safeParse(validExcursion).success).toBe(true);
  });

  it('rejects non-positive duration', () => {
    expect(ExcursionSegmentSchema.safeParse({ ...validExcursion, duration_minutes: 0 }).success).toBe(false);
  });

  it('rejects invalid difficulty', () => {
    expect(ExcursionSegmentSchema.safeParse({ ...validExcursion, difficulty: 'extreme' }).success).toBe(false);
  });
});

// ─── DiningSegmentSchema ───────────────────────

describe('DiningSegmentSchema', () => {
  const validDining = {
    type: 'dining',
    restaurant_name: 'Wazwan House',
    location: validLocation(),
    time: '2026-07-11T19:00:00Z',
    cuisine: 'Kashmiri',
    budget_level: 'mid',
    dietary_match: true,
  };

  it('accepts valid dining segment', () => {
    expect(DiningSegmentSchema.safeParse(validDining).success).toBe(true);
  });

  it('rejects invalid budget_level', () => {
    expect(DiningSegmentSchema.safeParse({ ...validDining, budget_level: 'luxury' }).success).toBe(false);
  });
});

// ─── SearchFlightsInputSchema ──────────────────

describe('SearchFlightsInputSchema', () => {
  it('accepts valid search with defaults', () => {
    const result = SearchFlightsInputSchema.safeParse({
      origin: 'DEL',
      destination: 'SXR',
      departure_date: '2026-07-10',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.passengers).toBe(1);
      expect(result.data.cabin_class).toBe('economy');
      expect(result.data.max_results).toBe(10);
    }
  });

  it('rejects invalid IATA code length', () => {
    expect(SearchFlightsInputSchema.safeParse({
      origin: 'DELH',
      destination: 'SXR',
      departure_date: '2026-07-10',
    }).success).toBe(false);
  });
});

// ─── GetForecastInputSchema ────────────────────

describe('GetForecastInputSchema', () => {
  it('accepts valid forecast request with default', () => {
    const result = GetForecastInputSchema.safeParse({ lat: 34.01, lng: 75.31 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.days_ahead).toBe(7);
    }
  });

  it('rejects days_ahead out of range', () => {
    expect(GetForecastInputSchema.safeParse({ lat: 34, lng: 75, days_ahead: 0 }).success).toBe(false);
    expect(GetForecastInputSchema.safeParse({ lat: 34, lng: 75, days_ahead: 8 }).success).toBe(false);
  });
});

// ─── ConvertCurrencyInputSchema ────────────────

describe('ConvertCurrencyInputSchema', () => {
  it('accepts valid conversion request', () => {
    const result = ConvertCurrencyInputSchema.safeParse({ amount: 100, from: 'USD', to: 'INR' });
    expect(result.success).toBe(true);
  });

  it('rejects negative amount', () => {
    expect(ConvertCurrencyInputSchema.safeParse({ amount: -5, from: 'USD', to: 'INR' }).success).toBe(false);
  });
});

// ─── TravelEventSchema ─────────────────────────

describe('TravelEventSchema', () => {
  it('accepts flight.status_changed event', () => {
    const event = {
      event_type: 'flight.status_changed',
      trip_id: 'trip-123',
      timestamp: '2026-07-10T10:00:00Z',
      severity: 'warning',
      data: {
        flight_number: '6E-2345',
        new_status: 'delayed',
        delay_minutes: 45,
      },
    };
    expect(TravelEventSchema.safeParse(event).success).toBe(true);
  });

  it('accepts emergency.triggered event', () => {
    const event = {
      event_type: 'emergency.triggered',
      trip_id: 'trip-123',
      timestamp: '2026-07-10T10:00:00Z',
      severity: 'critical',
      data: {
        type: 'medical',
        location: validLocation(),
        traveler_id: 'traveler-1',
      },
    };
    expect(TravelEventSchema.safeParse(event).success).toBe(true);
  });

  it('rejects unknown event_type', () => {
    const event = {
      event_type: 'unknown.event',
      trip_id: 'trip-123',
      timestamp: '2026-07-10T10:00:00Z',
      severity: 'info',
      data: {},
    };
    expect(TravelEventSchema.safeParse(event).success).toBe(false);
  });

  it('rejects emergency with wrong severity', () => {
    const event = {
      event_type: 'emergency.triggered',
      trip_id: 'trip-123',
      timestamp: '2026-07-10T10:00:00Z',
      severity: 'info', // must be 'critical'
      data: {
        type: 'medical',
        location: validLocation(),
        traveler_id: 'traveler-1',
      },
    };
    expect(TravelEventSchema.safeParse(event).success).toBe(false);
  });

  it('accepts booking.confirmation event', () => {
    const event = {
      event_type: 'booking.confirmation',
      trip_id: 'trip-123',
      timestamp: '2026-07-10T10:00:00Z',
      severity: 'info',
      data: {
        booking_id: 'bk-1',
        type: 'accommodation',
        provider: 'booking.com',
        reference: 'REF123',
      },
    };
    expect(TravelEventSchema.safeParse(event).success).toBe(true);
  });
});

// ─── RagRetrieveInputSchema ────────────────────

describe('RagRetrieveInputSchema', () => {
  it('accepts valid rag retrieve input', () => {
    const result = RagRetrieveInputSchema.safeParse({
      collection: 'regulatory',
      query: 'visa requirements for J&K',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.top_k).toBe(5);
    }
  });

  it('rejects invalid collection', () => {
    expect(RagRetrieveInputSchema.safeParse({
      collection: 'invalid_collection',
      query: 'test',
    }).success).toBe(false);
  });

  it('rejects empty query', () => {
    expect(RagRetrieveInputSchema.safeParse({
      collection: 'regulatory',
      query: '',
    }).success).toBe(false);
  });
});

// ─── BudgetDashboardSchema ─────────────────────

describe('BudgetDashboardSchema', () => {
  const validDashboard = {
    total_budget: validMoney({ amount: 200000 }),
    total_spent: validMoney({ amount: 85000 }),
    remaining: validMoney({ amount: 115000 }),
    percent_used: 42.5,
    by_category: {
      transport: validMoney({ amount: 25000 }),
      accommodation: validMoney({ amount: 41000 }),
      excursions: validMoney({ amount: 10000 }),
      food: validMoney({ amount: 7000 }),
      contingency: validMoney({ amount: 2000 }),
    },
    alerts: [],
  };

  it('accepts valid budget dashboard', () => {
    expect(BudgetDashboardSchema.safeParse(validDashboard).success).toBe(true);
  });

  it('rejects percent_used over 100', () => {
    expect(BudgetDashboardSchema.safeParse({ ...validDashboard, percent_used: 101 }).success).toBe(false);
  });

  it('rejects negative percent_used', () => {
    expect(BudgetDashboardSchema.safeParse({ ...validDashboard, percent_used: -1 }).success).toBe(false);
  });
});
