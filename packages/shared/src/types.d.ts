export interface TripRequest {
    id: string;
    traveler_id: string;
    destination: string;
    dates: {
        start: string;
        end: string;
    };
    budget: Money;
    party_size: number;
    purpose: 'honeymoon' | 'business' | 'family' | 'adventure' | 'solo' | 'group';
    preferences: {
        accommodation_style?: string;
        activity_level?: 'relaxed' | 'moderate' | 'adventurous';
        dietary?: string;
        must_include?: string[];
        avoid?: string[];
        [key: string]: unknown;
    };
}
export interface Money {
    amount: number;
    currency: string;
    amount_usd?: number;
}
export interface LocationRef {
    name: string;
    latitude: number;
    longitude: number;
    region: string;
    country_code: string;
    connectivity?: 'none' | '2G' | '4G' | '5G';
}
export interface ItineraryDay {
    itinerary_id: string;
    day_number: number;
    date: string;
    segments: (TransportSegment | AccommodationSegment | ExcursionSegment | DiningSegment)[];
    risk_level: 'low' | 'medium' | 'high';
    weather_summary: string;
    nearest_hospital_km: number;
}
export interface TransportSegment {
    type: 'transport';
    mode: 'flight' | 'rail' | 'road' | 'ferry' | 'helicopter';
    origin: LocationRef;
    destination: LocationRef;
    departure: string;
    arrival: string;
    cost: Money;
    carrier?: string;
    flight_number?: string;
    booking_ref?: string;
    reliability_score: number;
    tunnel_dependent?: boolean;
    permit_required?: string;
}
export interface AccommodationSegment {
    type: 'accommodation';
    property_name: string;
    location: LocationRef;
    check_in: string;
    check_out: string;
    nightly_rate: Money;
    total_cost: Money;
    amenities: string[];
    cancellation_policy: string;
    suitability_score: number;
    booking_ref?: string;
}
export interface ExcursionSegment {
    type: 'excursion';
    activity_name: string;
    location: LocationRef;
    start_time: string;
    duration_minutes: number;
    cost: Money;
    difficulty: 'easy' | 'moderate' | 'hard';
    weather_dependent: boolean;
    guide_required: boolean;
    altitude_meters?: number;
    fitness_notes?: string;
}
export interface DiningSegment {
    type: 'dining';
    restaurant_name: string;
    location: LocationRef;
    time: string;
    cuisine: string;
    budget_level: 'budget' | 'mid' | 'premium';
    dietary_match: boolean;
}
export interface BudgetDashboard {
    total_budget: Money;
    total_spent: Money;
    remaining: Money;
    percent_used: number;
    by_category: {
        transport: Money;
        accommodation: Money;
        excursions: Money;
        food: Money;
        contingency: Money;
    };
    alerts: string[];
}
export interface AgentMessage {
    from: string;
    to: string;
    type: 'task_request' | 'task_response' | 'error' | 'escalation' | 'event';
    correlation_id: string;
    timestamp: string;
    payload: unknown;
    confidence: number;
    requires_human_confirmation: boolean;
    errors: string[];
}
export interface TravelerProfile {
    id: string;
    name: string;
    email: string;
    phone: string;
    dietary: string[];
    allergies: string[];
    room_preferences: Record<string, string>;
    activity_style: string;
    budget_comfort_zone: {
        min: Money;
        max: Money;
    };
    companions: {
        name: string;
        relationship: string;
        preferences?: Record<string, unknown>;
    }[];
    documents: {
        type: 'passport' | 'visa' | 'insurance' | 'vaccination';
        number: string;
        country: string;
        expiry: string;
    }[];
    trip_history: string[];
    loyalty_tier: 'bronze' | 'silver' | 'gold' | 'platinum';
    created_at: string;
    updated_at: string;
}
export type AgentId = 'relationship-manager' | 'synthesizer' | 'logistics' | 'accommodation' | 'excursion' | 'budget-finance' | 'security-health' | 'locations-intel' | 'concierge' | 'live-rerouting' | 'emergency' | 'feedback-claims' | 'traveler-profile';
export type IntentClassification = 'PLANNING' | 'LIVE_HELP' | 'EMERGENCY' | 'COMPLAINT' | 'GENERAL';
export type SynthesizerState = 'INTAKE' | 'DECOMPOSE' | 'DISPATCH' | 'RESOLVE' | 'ASSEMBLE' | 'PRESENT';
export interface FlightStatusChangedEvent {
    event_type: 'flight.status_changed';
    trip_id: string;
    timestamp: string;
    severity: 'info' | 'warning' | 'critical';
    data: {
        flight_number: string;
        new_status: string;
        delay_minutes: number;
        gate?: string;
    };
}
export interface WeatherAlertEvent {
    event_type: 'weather.alert';
    trip_id: string;
    timestamp: string;
    severity: 'info' | 'warning' | 'critical';
    data: {
        region: string;
        description: string;
        valid_until: string;
    };
}
export interface RoadClosureEvent {
    event_type: 'road.closure';
    trip_id: string;
    timestamp: string;
    severity: 'info' | 'warning' | 'critical';
    data: {
        route_id: string;
        reason: string;
        estimated_reopen: string;
        alternatives: string[];
    };
}
export interface BookingConfirmationEvent {
    event_type: 'booking.confirmation';
    trip_id: string;
    timestamp: string;
    severity: 'info';
    data: {
        booking_id: string;
        type: string;
        provider: string;
        reference: string;
    };
}
export interface BookingCancellationEvent {
    event_type: 'booking.cancellation';
    trip_id: string;
    timestamp: string;
    severity: 'warning' | 'critical';
    data: {
        booking_id: string;
        reason: string;
        refund_status: string;
    };
}
export interface EmergencyTriggeredEvent {
    event_type: 'emergency.triggered';
    trip_id: string;
    timestamp: string;
    severity: 'critical';
    data: {
        type: 'medical' | 'security' | 'natural_disaster' | 'lost_document';
        location: LocationRef;
        traveler_id: string;
    };
}
export interface ProfileDocumentExpiryEvent {
    event_type: 'profile.document_expiry';
    trip_id: string;
    timestamp: string;
    severity: 'warning';
    data: {
        document_type: string;
        expiry_date: string;
        traveler_id: string;
    };
}
export type TravelSystemEvent = FlightStatusChangedEvent | WeatherAlertEvent | RoadClosureEvent | BookingConfirmationEvent | BookingCancellationEvent | EmergencyTriggeredEvent | ProfileDocumentExpiryEvent;
export type RagCollection = 'regulatory' | 'accommodation' | 'excursions' | 'geo_context' | 'health_safety' | 'traveler_reviews' | 'dispute_playbooks' | 'emergency_protocols' | 'local_knowledge';
export interface RagChunkMetadata {
    region: string;
    season?: string;
    document_type: string;
    source_url?: string;
    last_verified_date?: string;
    confidence_score: number;
    [key: string]: unknown;
}
export interface RagRetrieveRequest {
    collection: RagCollection;
    query: string;
    filters?: {
        region?: string;
        season?: string;
        document_type?: string;
    };
    top_k: number;
}
export interface RagRetrieveResult {
    chunks: Array<{
        id: string;
        content: string;
        metadata: RagChunkMetadata;
        similarity_score: number;
    }>;
}
export interface FlightOffer {
    offer_id: string;
    carrier: string;
    flight_number: string;
    origin: string;
    destination: string;
    departure: string;
    arrival: string;
    duration_minutes: number;
    stops: number;
    price: Money;
    cabin_class: 'economy' | 'premium_economy' | 'business' | 'first';
    booking_deeplink: string;
    baggage_allowance?: string;
    cancellation_policy?: string;
}
export interface PropertyListing {
    property_id: string;
    property_name: string;
    location: LocationRef;
    star_rating: number;
    nightly_rate: Money;
    total_cost: Money;
    amenities: string[];
    cancellation_policy: string;
    suitability_score: number;
    booking_deeplink: string;
    distance_to_next_activity_km?: number;
}
export interface RouteResult {
    origin: string;
    destination: string;
    mode: string;
    duration_minutes: number;
    distance_km: number;
    departure_time?: string;
    arrival_time?: string;
    steps: string[];
    tunnel_dependent?: boolean;
    map_url?: string;
}
export interface WeatherForecast {
    date: string;
    high_celsius: number;
    low_celsius: number;
    description: string;
    precipitation_mm: number;
    wind_kph: number;
    uv_index: number;
    suitable_for_trekking: boolean;
}
export interface TravelAdvisory {
    country_code: string;
    level: 1 | 2 | 3 | 4;
    summary: string;
    last_updated: string;
    source_url: string;
}
export interface HospitalInfo {
    name: string;
    location: LocationRef;
    distance_km: number;
    phone: string;
    specialties: string[];
    emergency_24h: boolean;
}
export interface PlaceResult {
    place_id: string;
    name: string;
    location: LocationRef;
    rating: number;
    price_level?: 1 | 2 | 3 | 4;
    cuisine?: string;
    phone?: string;
    hours?: string;
    map_url?: string;
}
export interface DailyRiskAssessment {
    date: string;
    risk_level: 'low' | 'medium' | 'high';
    nearest_medical_facility: HospitalInfo;
    emergency_contacts: {
        type: string;
        number: string;
    }[];
    required_precautions: string[];
    notes?: string;
}
//# sourceMappingURL=types.d.ts.map