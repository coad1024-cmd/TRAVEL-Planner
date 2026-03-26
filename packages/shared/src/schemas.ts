import { z } from 'zod';

// ============================================================
// Core Zod schemas mirroring types.ts interfaces
// ============================================================

export const MoneySchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().length(3), // ISO 4217
  amount_usd: z.number().nonnegative().optional(),
});

export const LocationRefSchema = z.object({
  name: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  region: z.string(),
  country_code: z.string().length(2), // ISO 3166
  connectivity: z.enum(['none', '2G', '4G', '5G']).optional(),
});

export const TransportSegmentSchema = z.object({
  type: z.literal('transport'),
  mode: z.enum(['flight', 'rail', 'road', 'ferry', 'helicopter']),
  origin: LocationRefSchema,
  destination: LocationRefSchema,
  departure: z.string().datetime(),
  arrival: z.string().datetime(),
  cost: MoneySchema,
  carrier: z.string().optional(),
  flight_number: z.string().optional(),
  booking_ref: z.string().optional(),
  reliability_score: z.number().min(0).max(1),
  tunnel_dependent: z.boolean().optional(),
  permit_required: z.string().optional(),
});

export const AccommodationSegmentSchema = z.object({
  type: z.literal('accommodation'),
  property_name: z.string(),
  location: LocationRefSchema,
  check_in: z.string(),
  check_out: z.string(),
  nightly_rate: MoneySchema,
  total_cost: MoneySchema,
  amenities: z.array(z.string()),
  cancellation_policy: z.string(),
  suitability_score: z.number().min(0).max(1),
  booking_ref: z.string().optional(),
});

export const ExcursionSegmentSchema = z.object({
  type: z.literal('excursion'),
  activity_name: z.string(),
  location: LocationRefSchema,
  start_time: z.string().datetime(),
  duration_minutes: z.number().positive(),
  cost: MoneySchema,
  difficulty: z.enum(['easy', 'moderate', 'hard']),
  weather_dependent: z.boolean(),
  guide_required: z.boolean(),
  altitude_meters: z.number().optional(),
  fitness_notes: z.string().optional(),
});

export const DiningSegmentSchema = z.object({
  type: z.literal('dining'),
  restaurant_name: z.string(),
  location: LocationRefSchema,
  time: z.string().datetime(),
  cuisine: z.string(),
  budget_level: z.enum(['budget', 'mid', 'premium']),
  dietary_match: z.boolean(),
});

export const ItineraryDaySchema = z.object({
  itinerary_id: z.string().uuid(),
  day_number: z.number().int().positive(),
  date: z.string(), // ISO date
  segments: z.array(
    z.discriminatedUnion('type', [
      TransportSegmentSchema,
      AccommodationSegmentSchema,
      ExcursionSegmentSchema,
      DiningSegmentSchema,
    ])
  ),
  risk_level: z.enum(['low', 'medium', 'high']),
  weather_summary: z.string(),
  nearest_hospital_km: z.number().nonnegative(),
});

export const BudgetDashboardSchema = z.object({
  total_budget: MoneySchema,
  total_spent: MoneySchema,
  remaining: MoneySchema,
  percent_used: z.number().min(0).max(100),
  by_category: z.object({
    transport: MoneySchema,
    accommodation: MoneySchema,
    excursions: MoneySchema,
    food: MoneySchema,
    contingency: MoneySchema,
  }),
  alerts: z.array(z.string()),
});

export const TripRequestSchema = z.object({
  id: z.string().uuid(),
  traveler_id: z.string().uuid(),
  destination: z.string().min(1),
  dates: z.object({
    start: z.string(), // ISO date
    end: z.string(),
  }),
  budget: MoneySchema,
  party_size: z.number().int().positive(),
  purpose: z.enum(['honeymoon', 'business', 'family', 'adventure', 'solo', 'group']),
  preferences: z.object({
    accommodation_style: z.string().optional(),
    activity_level: z.enum(['relaxed', 'moderate', 'adventurous']).optional(),
    dietary: z.string().optional(),
    must_include: z.array(z.string()).optional(),
    avoid: z.array(z.string()).optional(),
  }).passthrough(),
});

export const AgentMessageSchema = z.object({
  from: z.string(),
  to: z.string(),
  type: z.enum(['task_request', 'task_response', 'error', 'escalation', 'event']),
  correlation_id: z.string().uuid(),
  timestamp: z.string().datetime(),
  payload: z.unknown(),
  confidence: z.number().min(0).max(1),
  requires_human_confirmation: z.boolean(),
  errors: z.array(z.string()),
});

export const TravelerProfileSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(5),
  dietary: z.array(z.string()),
  allergies: z.array(z.string()),
  room_preferences: z.record(z.string(), z.string()),
  activity_style: z.string(),
  budget_comfort_zone: z.object({
    min: MoneySchema,
    max: MoneySchema,
  }),
  companions: z.array(z.object({
    name: z.string(),
    relationship: z.string(),
    preferences: z.record(z.string(), z.unknown()).optional(),
  })),
  documents: z.array(z.object({
    type: z.enum(['passport', 'visa', 'insurance', 'vaccination']),
    number: z.string(),
    country: z.string(),
    expiry: z.string(),
  })),
  trip_history: z.array(z.string()),
  loyalty_tier: z.enum(['bronze', 'silver', 'gold', 'platinum']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// ============================================================
// MCP tool input schemas
// ============================================================

export const SearchFlightsInputSchema = z.object({
  origin: z.string().length(3).describe('IATA airport code'),
  destination: z.string().length(3).describe('IATA airport code'),
  departure_date: z.string().describe('ISO date YYYY-MM-DD'),
  return_date: z.string().optional().describe('ISO date for round trip'),
  passengers: z.number().int().positive().default(1),
  cabin_class: z.enum(['economy', 'premium_economy', 'business', 'first']).default('economy'),
  max_results: z.number().int().positive().max(50).default(10),
});

export const GetFlightDetailsInputSchema = z.object({
  offer_id: z.string(),
});

export const GetFareRulesInputSchema = z.object({
  offer_id: z.string(),
});

export const SearchPropertiesInputSchema = z.object({
  location: z.string().describe('Location name or coords as "lat,lng"'),
  check_in: z.string().describe('ISO date'),
  check_out: z.string().describe('ISO date'),
  guests: z.number().int().positive().default(2),
  budget_max: z.number().nonnegative().optional(),
  amenities_filter: z.array(z.string()).optional(),
  max_results: z.number().int().positive().max(20).default(10),
});

export const GetRouteInputSchema = z.object({
  origin: z.string().describe('Address or "lat,lng"'),
  destination: z.string().describe('Address or "lat,lng"'),
  mode: z.enum(['driving', 'transit', 'walking']).default('driving'),
  departure_time: z.string().optional().describe('ISO datetime'),
});

export const SearchPlacesInputSchema = z.object({
  query: z.string(),
  location: z.string().describe('"lat,lng"'),
  radius: z.number().positive().default(5000).describe('Radius in meters'),
  type: z.string().optional(),
});

export const GetForecastInputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  days_ahead: z.number().int().min(1).max(7).default(7),
});

export const GetHistoricalAvgInputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  month: z.number().int().min(1).max(12),
});

export const ConvertCurrencyInputSchema = z.object({
  amount: z.number().nonnegative(),
  from: z.string().length(3),
  to: z.string().length(3),
});

export const GetTravelAdvisoryInputSchema = z.object({
  country_code: z.string().length(2),
});

export const GetNearbyHospitalsInputSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius_km: z.number().positive().default(50),
  max_results: z.number().int().positive().max(10).default(5),
});

export const RagRetrieveInputSchema = z.object({
  collection: z.enum([
    'regulatory',
    'accommodation',
    'excursions',
    'geo_context',
    'health_safety',
    'traveler_reviews',
    'dispute_playbooks',
    'emergency_protocols',
    'local_knowledge',
  ]),
  query: z.string().min(1),
  filters: z.object({
    region: z.string().optional(),
    season: z.string().optional(),
    document_type: z.string().optional(),
  }).optional(),
  top_k: z.number().int().positive().max(20).default(5),
});

export const SendNotificationInputSchema = z.object({
  title: z.string(),
  body: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  urgency: z.enum(['info', 'warning', 'critical']).default('info'),
});

export const TrackFlightInputSchema = z.object({
  flight_number: z.string(),
  date: z.string().describe('ISO date'),
});

export const ScanReceiptInputSchema = z.object({
  image_base64: z.string(),
  trip_id: z.string().uuid(),
});

// ============================================================
// Event schemas
// ============================================================

export const TravelEventSchema = z.discriminatedUnion('event_type', [
  z.object({
    event_type: z.literal('flight.status_changed'),
    trip_id: z.string(),
    timestamp: z.string().datetime(),
    severity: z.enum(['info', 'warning', 'critical']),
    data: z.object({
      flight_number: z.string(),
      new_status: z.string(),
      delay_minutes: z.number(),
      gate: z.string().optional(),
    }),
  }),
  z.object({
    event_type: z.literal('weather.alert'),
    trip_id: z.string(),
    timestamp: z.string().datetime(),
    severity: z.enum(['info', 'warning', 'critical']),
    data: z.object({
      region: z.string(),
      description: z.string(),
      valid_until: z.string().datetime(),
    }),
  }),
  z.object({
    event_type: z.literal('road.closure'),
    trip_id: z.string(),
    timestamp: z.string().datetime(),
    severity: z.enum(['info', 'warning', 'critical']),
    data: z.object({
      route_id: z.string(),
      reason: z.string(),
      estimated_reopen: z.string().datetime(),
      alternatives: z.array(z.string()),
    }),
  }),
  z.object({
    event_type: z.literal('booking.confirmation'),
    trip_id: z.string(),
    timestamp: z.string().datetime(),
    severity: z.literal('info'),
    data: z.object({
      booking_id: z.string(),
      type: z.string(),
      provider: z.string(),
      reference: z.string(),
    }),
  }),
  z.object({
    event_type: z.literal('booking.cancellation'),
    trip_id: z.string(),
    timestamp: z.string().datetime(),
    severity: z.enum(['warning', 'critical']),
    data: z.object({
      booking_id: z.string(),
      reason: z.string(),
      refund_status: z.string(),
    }),
  }),
  z.object({
    event_type: z.literal('emergency.triggered'),
    trip_id: z.string(),
    timestamp: z.string().datetime(),
    severity: z.literal('critical'),
    data: z.object({
      type: z.enum(['medical', 'security', 'natural_disaster', 'lost_document']),
      location: LocationRefSchema,
      traveler_id: z.string(),
    }),
  }),
  z.object({
    event_type: z.literal('profile.document_expiry'),
    trip_id: z.string(),
    timestamp: z.string().datetime(),
    severity: z.literal('warning'),
    data: z.object({
      document_type: z.string(),
      expiry_date: z.string(),
      traveler_id: z.string(),
    }),
  }),
]);
