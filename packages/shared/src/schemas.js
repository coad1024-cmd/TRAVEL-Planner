"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TravelEventSchema = exports.ScanReceiptInputSchema = exports.TrackFlightInputSchema = exports.SendNotificationInputSchema = exports.RagRetrieveInputSchema = exports.GetNearbyHospitalsInputSchema = exports.GetTravelAdvisoryInputSchema = exports.ConvertCurrencyInputSchema = exports.GetHistoricalAvgInputSchema = exports.GetForecastInputSchema = exports.SearchPlacesInputSchema = exports.GetRouteInputSchema = exports.SearchPropertiesInputSchema = exports.GetFareRulesInputSchema = exports.GetFlightDetailsInputSchema = exports.SearchFlightsInputSchema = exports.TravelerProfileSchema = exports.AgentMessageSchema = exports.TripRequestSchema = exports.BudgetDashboardSchema = exports.ItineraryDaySchema = exports.DiningSegmentSchema = exports.ExcursionSegmentSchema = exports.AccommodationSegmentSchema = exports.TransportSegmentSchema = exports.LocationRefSchema = exports.MoneySchema = void 0;
const zod_1 = require("zod");
// ============================================================
// Core Zod schemas mirroring types.ts interfaces
// ============================================================
exports.MoneySchema = zod_1.z.object({
    amount: zod_1.z.number().nonnegative(),
    currency: zod_1.z.string().length(3), // ISO 4217
    amount_usd: zod_1.z.number().nonnegative().optional(),
});
exports.LocationRefSchema = zod_1.z.object({
    name: zod_1.z.string(),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    region: zod_1.z.string(),
    country_code: zod_1.z.string().length(2), // ISO 3166
    connectivity: zod_1.z.enum(['none', '2G', '4G', '5G']).optional(),
});
exports.TransportSegmentSchema = zod_1.z.object({
    type: zod_1.z.literal('transport'),
    mode: zod_1.z.enum(['flight', 'rail', 'road', 'ferry', 'helicopter']),
    origin: exports.LocationRefSchema,
    destination: exports.LocationRefSchema,
    departure: zod_1.z.string().datetime(),
    arrival: zod_1.z.string().datetime(),
    cost: exports.MoneySchema,
    carrier: zod_1.z.string().optional(),
    flight_number: zod_1.z.string().optional(),
    booking_ref: zod_1.z.string().optional(),
    reliability_score: zod_1.z.number().min(0).max(1),
    tunnel_dependent: zod_1.z.boolean().optional(),
    permit_required: zod_1.z.string().optional(),
});
exports.AccommodationSegmentSchema = zod_1.z.object({
    type: zod_1.z.literal('accommodation'),
    property_name: zod_1.z.string(),
    location: exports.LocationRefSchema,
    check_in: zod_1.z.string(),
    check_out: zod_1.z.string(),
    nightly_rate: exports.MoneySchema,
    total_cost: exports.MoneySchema,
    amenities: zod_1.z.array(zod_1.z.string()),
    cancellation_policy: zod_1.z.string(),
    suitability_score: zod_1.z.number().min(0).max(1),
    booking_ref: zod_1.z.string().optional(),
});
exports.ExcursionSegmentSchema = zod_1.z.object({
    type: zod_1.z.literal('excursion'),
    activity_name: zod_1.z.string(),
    location: exports.LocationRefSchema,
    start_time: zod_1.z.string().datetime(),
    duration_minutes: zod_1.z.number().positive(),
    cost: exports.MoneySchema,
    difficulty: zod_1.z.enum(['easy', 'moderate', 'hard']),
    weather_dependent: zod_1.z.boolean(),
    guide_required: zod_1.z.boolean(),
    altitude_meters: zod_1.z.number().optional(),
    fitness_notes: zod_1.z.string().optional(),
});
exports.DiningSegmentSchema = zod_1.z.object({
    type: zod_1.z.literal('dining'),
    restaurant_name: zod_1.z.string(),
    location: exports.LocationRefSchema,
    time: zod_1.z.string().datetime(),
    cuisine: zod_1.z.string(),
    budget_level: zod_1.z.enum(['budget', 'mid', 'premium']),
    dietary_match: zod_1.z.boolean(),
});
exports.ItineraryDaySchema = zod_1.z.object({
    itinerary_id: zod_1.z.string().uuid(),
    day_number: zod_1.z.number().int().positive(),
    date: zod_1.z.string(), // ISO date
    segments: zod_1.z.array(zod_1.z.discriminatedUnion('type', [
        exports.TransportSegmentSchema,
        exports.AccommodationSegmentSchema,
        exports.ExcursionSegmentSchema,
        exports.DiningSegmentSchema,
    ])),
    risk_level: zod_1.z.enum(['low', 'medium', 'high']),
    weather_summary: zod_1.z.string(),
    nearest_hospital_km: zod_1.z.number().nonnegative(),
});
exports.BudgetDashboardSchema = zod_1.z.object({
    total_budget: exports.MoneySchema,
    total_spent: exports.MoneySchema,
    remaining: exports.MoneySchema,
    percent_used: zod_1.z.number().min(0).max(100),
    by_category: zod_1.z.object({
        transport: exports.MoneySchema,
        accommodation: exports.MoneySchema,
        excursions: exports.MoneySchema,
        food: exports.MoneySchema,
        contingency: exports.MoneySchema,
    }),
    alerts: zod_1.z.array(zod_1.z.string()),
});
exports.TripRequestSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    traveler_id: zod_1.z.string().uuid(),
    destination: zod_1.z.string().min(1),
    dates: zod_1.z.object({
        start: zod_1.z.string(), // ISO date
        end: zod_1.z.string(),
    }),
    budget: exports.MoneySchema,
    party_size: zod_1.z.number().int().positive(),
    purpose: zod_1.z.enum(['honeymoon', 'business', 'family', 'adventure', 'solo', 'group']),
    preferences: zod_1.z.object({
        accommodation_style: zod_1.z.string().optional(),
        activity_level: zod_1.z.enum(['relaxed', 'moderate', 'adventurous']).optional(),
        dietary: zod_1.z.string().optional(),
        must_include: zod_1.z.array(zod_1.z.string()).optional(),
        avoid: zod_1.z.array(zod_1.z.string()).optional(),
    }).passthrough(),
});
exports.AgentMessageSchema = zod_1.z.object({
    from: zod_1.z.string(),
    to: zod_1.z.string(),
    type: zod_1.z.enum(['task_request', 'task_response', 'error', 'escalation', 'event']),
    correlation_id: zod_1.z.string().uuid(),
    timestamp: zod_1.z.string().datetime(),
    payload: zod_1.z.unknown(),
    confidence: zod_1.z.number().min(0).max(1),
    requires_human_confirmation: zod_1.z.boolean(),
    errors: zod_1.z.array(zod_1.z.string()),
});
exports.TravelerProfileSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().min(5),
    dietary: zod_1.z.array(zod_1.z.string()),
    allergies: zod_1.z.array(zod_1.z.string()),
    room_preferences: zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
    activity_style: zod_1.z.string(),
    budget_comfort_zone: zod_1.z.object({
        min: exports.MoneySchema,
        max: exports.MoneySchema,
    }),
    companions: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        relationship: zod_1.z.string(),
        preferences: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    })),
    documents: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['passport', 'visa', 'insurance', 'vaccination']),
        number: zod_1.z.string(),
        country: zod_1.z.string(),
        expiry: zod_1.z.string(),
    })),
    trip_history: zod_1.z.array(zod_1.z.string()),
    loyalty_tier: zod_1.z.enum(['bronze', 'silver', 'gold', 'platinum']),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
// ============================================================
// MCP tool input schemas
// ============================================================
exports.SearchFlightsInputSchema = zod_1.z.object({
    origin: zod_1.z.string().length(3).describe('IATA airport code'),
    destination: zod_1.z.string().length(3).describe('IATA airport code'),
    departure_date: zod_1.z.string().describe('ISO date YYYY-MM-DD'),
    return_date: zod_1.z.string().optional().describe('ISO date for round trip'),
    passengers: zod_1.z.number().int().positive().default(1),
    cabin_class: zod_1.z.enum(['economy', 'premium_economy', 'business', 'first']).default('economy'),
    max_results: zod_1.z.number().int().positive().max(50).default(10),
});
exports.GetFlightDetailsInputSchema = zod_1.z.object({
    offer_id: zod_1.z.string(),
});
exports.GetFareRulesInputSchema = zod_1.z.object({
    offer_id: zod_1.z.string(),
});
exports.SearchPropertiesInputSchema = zod_1.z.object({
    location: zod_1.z.string().describe('Location name or coords as "lat,lng"'),
    check_in: zod_1.z.string().describe('ISO date'),
    check_out: zod_1.z.string().describe('ISO date'),
    guests: zod_1.z.number().int().positive().default(2),
    budget_max: zod_1.z.number().nonnegative().optional(),
    amenities_filter: zod_1.z.array(zod_1.z.string()).optional(),
    max_results: zod_1.z.number().int().positive().max(20).default(10),
});
exports.GetRouteInputSchema = zod_1.z.object({
    origin: zod_1.z.string().describe('Address or "lat,lng"'),
    destination: zod_1.z.string().describe('Address or "lat,lng"'),
    mode: zod_1.z.enum(['driving', 'transit', 'walking']).default('driving'),
    departure_time: zod_1.z.string().optional().describe('ISO datetime'),
});
exports.SearchPlacesInputSchema = zod_1.z.object({
    query: zod_1.z.string(),
    location: zod_1.z.string().describe('"lat,lng"'),
    radius: zod_1.z.number().positive().default(5000).describe('Radius in meters'),
    type: zod_1.z.string().optional(),
});
exports.GetForecastInputSchema = zod_1.z.object({
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
    days_ahead: zod_1.z.number().int().min(1).max(7).default(7),
});
exports.GetHistoricalAvgInputSchema = zod_1.z.object({
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
    month: zod_1.z.number().int().min(1).max(12),
});
exports.ConvertCurrencyInputSchema = zod_1.z.object({
    amount: zod_1.z.number().nonnegative(),
    from: zod_1.z.string().length(3),
    to: zod_1.z.string().length(3),
});
exports.GetTravelAdvisoryInputSchema = zod_1.z.object({
    country_code: zod_1.z.string().length(2),
});
exports.GetNearbyHospitalsInputSchema = zod_1.z.object({
    lat: zod_1.z.number().min(-90).max(90),
    lng: zod_1.z.number().min(-180).max(180),
    radius_km: zod_1.z.number().positive().default(50),
    max_results: zod_1.z.number().int().positive().max(10).default(5),
});
exports.RagRetrieveInputSchema = zod_1.z.object({
    collection: zod_1.z.enum([
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
    query: zod_1.z.string().min(1),
    filters: zod_1.z.object({
        region: zod_1.z.string().optional(),
        season: zod_1.z.string().optional(),
        document_type: zod_1.z.string().optional(),
    }).optional(),
    top_k: zod_1.z.number().int().positive().max(20).default(5),
});
exports.SendNotificationInputSchema = zod_1.z.object({
    title: zod_1.z.string(),
    body: zod_1.z.string(),
    data: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    urgency: zod_1.z.enum(['info', 'warning', 'critical']).default('info'),
});
exports.TrackFlightInputSchema = zod_1.z.object({
    flight_number: zod_1.z.string(),
    date: zod_1.z.string().describe('ISO date'),
});
exports.ScanReceiptInputSchema = zod_1.z.object({
    image_base64: zod_1.z.string(),
    trip_id: zod_1.z.string().uuid(),
});
// ============================================================
// Event schemas
// ============================================================
exports.TravelEventSchema = zod_1.z.discriminatedUnion('event_type', [
    zod_1.z.object({
        event_type: zod_1.z.literal('flight.status_changed'),
        trip_id: zod_1.z.string(),
        timestamp: zod_1.z.string().datetime(),
        severity: zod_1.z.enum(['info', 'warning', 'critical']),
        data: zod_1.z.object({
            flight_number: zod_1.z.string(),
            new_status: zod_1.z.string(),
            delay_minutes: zod_1.z.number(),
            gate: zod_1.z.string().optional(),
        }),
    }),
    zod_1.z.object({
        event_type: zod_1.z.literal('weather.alert'),
        trip_id: zod_1.z.string(),
        timestamp: zod_1.z.string().datetime(),
        severity: zod_1.z.enum(['info', 'warning', 'critical']),
        data: zod_1.z.object({
            region: zod_1.z.string(),
            description: zod_1.z.string(),
            valid_until: zod_1.z.string().datetime(),
        }),
    }),
    zod_1.z.object({
        event_type: zod_1.z.literal('road.closure'),
        trip_id: zod_1.z.string(),
        timestamp: zod_1.z.string().datetime(),
        severity: zod_1.z.enum(['info', 'warning', 'critical']),
        data: zod_1.z.object({
            route_id: zod_1.z.string(),
            reason: zod_1.z.string(),
            estimated_reopen: zod_1.z.string().datetime(),
            alternatives: zod_1.z.array(zod_1.z.string()),
        }),
    }),
    zod_1.z.object({
        event_type: zod_1.z.literal('booking.confirmation'),
        trip_id: zod_1.z.string(),
        timestamp: zod_1.z.string().datetime(),
        severity: zod_1.z.literal('info'),
        data: zod_1.z.object({
            booking_id: zod_1.z.string(),
            type: zod_1.z.string(),
            provider: zod_1.z.string(),
            reference: zod_1.z.string(),
        }),
    }),
    zod_1.z.object({
        event_type: zod_1.z.literal('booking.cancellation'),
        trip_id: zod_1.z.string(),
        timestamp: zod_1.z.string().datetime(),
        severity: zod_1.z.enum(['warning', 'critical']),
        data: zod_1.z.object({
            booking_id: zod_1.z.string(),
            reason: zod_1.z.string(),
            refund_status: zod_1.z.string(),
        }),
    }),
    zod_1.z.object({
        event_type: zod_1.z.literal('emergency.triggered'),
        trip_id: zod_1.z.string(),
        timestamp: zod_1.z.string().datetime(),
        severity: zod_1.z.literal('critical'),
        data: zod_1.z.object({
            type: zod_1.z.enum(['medical', 'security', 'natural_disaster', 'lost_document']),
            location: exports.LocationRefSchema,
            traveler_id: zod_1.z.string(),
        }),
    }),
    zod_1.z.object({
        event_type: zod_1.z.literal('profile.document_expiry'),
        trip_id: zod_1.z.string(),
        timestamp: zod_1.z.string().datetime(),
        severity: zod_1.z.literal('warning'),
        data: zod_1.z.object({
            document_type: zod_1.z.string(),
            expiry_date: zod_1.z.string(),
            traveler_id: zod_1.z.string(),
        }),
    }),
]);
//# sourceMappingURL=schemas.js.map