import { z } from 'zod';
export declare const MoneySchema: z.ZodObject<{
    amount: z.ZodNumber;
    currency: z.ZodString;
    amount_usd: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    amount: number;
    currency: string;
    amount_usd?: number | undefined;
}, {
    amount: number;
    currency: string;
    amount_usd?: number | undefined;
}>;
export declare const LocationRefSchema: z.ZodObject<{
    name: z.ZodString;
    latitude: z.ZodNumber;
    longitude: z.ZodNumber;
    region: z.ZodString;
    country_code: z.ZodString;
    connectivity: z.ZodOptional<z.ZodEnum<["none", "2G", "4G", "5G"]>>;
}, "strip", z.ZodTypeAny, {
    region: string;
    name: string;
    latitude: number;
    longitude: number;
    country_code: string;
    connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
}, {
    region: string;
    name: string;
    latitude: number;
    longitude: number;
    country_code: string;
    connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
}>;
export declare const TransportSegmentSchema: z.ZodObject<{
    type: z.ZodLiteral<"transport">;
    mode: z.ZodEnum<["flight", "rail", "road", "ferry", "helicopter"]>;
    origin: z.ZodObject<{
        name: z.ZodString;
        latitude: z.ZodNumber;
        longitude: z.ZodNumber;
        region: z.ZodString;
        country_code: z.ZodString;
        connectivity: z.ZodOptional<z.ZodEnum<["none", "2G", "4G", "5G"]>>;
    }, "strip", z.ZodTypeAny, {
        region: string;
        name: string;
        latitude: number;
        longitude: number;
        country_code: string;
        connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
    }, {
        region: string;
        name: string;
        latitude: number;
        longitude: number;
        country_code: string;
        connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
    }>;
    destination: z.ZodObject<{
        name: z.ZodString;
        latitude: z.ZodNumber;
        longitude: z.ZodNumber;
        region: z.ZodString;
        country_code: z.ZodString;
        connectivity: z.ZodOptional<z.ZodEnum<["none", "2G", "4G", "5G"]>>;
    }, "strip", z.ZodTypeAny, {
        region: string;
        name: string;
        latitude: number;
        longitude: number;
        country_code: string;
        connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
    }, {
        region: string;
        name: string;
        latitude: number;
        longitude: number;
        country_code: string;
        connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
    }>;
    departure: z.ZodString;
    arrival: z.ZodString;
    cost: z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodString;
        amount_usd: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    }, {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    }>;
    carrier: z.ZodOptional<z.ZodString>;
    flight_number: z.ZodOptional<z.ZodString>;
    booking_ref: z.ZodOptional<z.ZodString>;
    reliability_score: z.ZodNumber;
    tunnel_dependent: z.ZodOptional<z.ZodBoolean>;
    permit_required: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "transport";
    mode: "flight" | "rail" | "road" | "ferry" | "helicopter";
    origin: {
        region: string;
        name: string;
        latitude: number;
        longitude: number;
        country_code: string;
        connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
    };
    destination: {
        region: string;
        name: string;
        latitude: number;
        longitude: number;
        country_code: string;
        connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
    };
    departure: string;
    arrival: string;
    cost: {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    };
    reliability_score: number;
    carrier?: string | undefined;
    flight_number?: string | undefined;
    booking_ref?: string | undefined;
    tunnel_dependent?: boolean | undefined;
    permit_required?: string | undefined;
}, {
    type: "transport";
    mode: "flight" | "rail" | "road" | "ferry" | "helicopter";
    origin: {
        region: string;
        name: string;
        latitude: number;
        longitude: number;
        country_code: string;
        connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
    };
    destination: {
        region: string;
        name: string;
        latitude: number;
        longitude: number;
        country_code: string;
        connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
    };
    departure: string;
    arrival: string;
    cost: {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    };
    reliability_score: number;
    carrier?: string | undefined;
    flight_number?: string | undefined;
    booking_ref?: string | undefined;
    tunnel_dependent?: boolean | undefined;
    permit_required?: string | undefined;
}>;
export declare const AccommodationSegmentSchema: z.ZodObject<{
    type: z.ZodLiteral<"accommodation">;
    property_name: z.ZodString;
    location: z.ZodObject<{
        name: z.ZodString;
        latitude: z.ZodNumber;
        longitude: z.ZodNumber;
        region: z.ZodString;
        country_code: z.ZodString;
        connectivity: z.ZodOptional<z.ZodEnum<["none", "2G", "4G", "5G"]>>;
    }, "strip", z.ZodTypeAny, {
        region: string;
        name: string;
        latitude: number;
        longitude: number;
        country_code: string;
        connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
    }, {
        region: string;
        name: string;
        latitude: number;
        longitude: number;
        country_code: string;
        connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
    }>;
    check_in: z.ZodString;
    check_out: z.ZodString;
    nightly_rate: z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodString;
        amount_usd: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    }, {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    }>;
    total_cost: z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodString;
        amount_usd: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    }, {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    }>;
    amenities: z.ZodArray<z.ZodString, "many">;
    cancellation_policy: z.ZodString;
    suitability_score: z.ZodNumber;
    booking_ref: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "accommodation";
    property_name: string;
    location: {
        region: string;
        name: string;
        latitude: number;
        longitude: number;
        country_code: string;
        connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
    };
    check_in: string;
    check_out: string;
    nightly_rate: {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    };
    total_cost: {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    };
    amenities: string[];
    cancellation_policy: string;
    suitability_score: number;
    booking_ref?: string | undefined;
}, {
    type: "accommodation";
    property_name: string;
    location: {
        region: string;
        name: string;
        latitude: number;
        longitude: number;
        country_code: string;
        connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
    };
    check_in: string;
    check_out: string;
    nightly_rate: {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    };
    total_cost: {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    };
    amenities: string[];
    cancellation_policy: string;
    suitability_score: number;
    booking_ref?: string | undefined;
}>;
export declare const ExcursionSegmentSchema: z.ZodObject<{
    type: z.ZodLiteral<"excursion">;
    activity_name: z.ZodString;
    location: z.ZodObject<{
        name: z.ZodString;
        latitude: z.ZodNumber;
        longitude: z.ZodNumber;
        region: z.ZodString;
        country_code: z.ZodString;
        connectivity: z.ZodOptional<z.ZodEnum<["none", "2G", "4G", "5G"]>>;
    }, "strip", z.ZodTypeAny, {
        region: string;
        name: string;
        latitude: number;
        longitude: number;
        country_code: string;
        connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
    }, {
        region: string;
        name: string;
        latitude: number;
        longitude: number;
        country_code: string;
        connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
    }>;
    start_time: z.ZodString;
    duration_minutes: z.ZodNumber;
    cost: z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodString;
        amount_usd: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    }, {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    }>;
    difficulty: z.ZodEnum<["easy", "moderate", "hard"]>;
    weather_dependent: z.ZodBoolean;
    guide_required: z.ZodBoolean;
    altitude_meters: z.ZodOptional<z.ZodNumber>;
    fitness_notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "excursion";
    cost: {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    };
    location: {
        region: string;
        name: string;
        latitude: number;
        longitude: number;
        country_code: string;
        connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
    };
    activity_name: string;
    start_time: string;
    duration_minutes: number;
    difficulty: "moderate" | "easy" | "hard";
    weather_dependent: boolean;
    guide_required: boolean;
    altitude_meters?: number | undefined;
    fitness_notes?: string | undefined;
}, {
    type: "excursion";
    cost: {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    };
    location: {
        region: string;
        name: string;
        latitude: number;
        longitude: number;
        country_code: string;
        connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
    };
    activity_name: string;
    start_time: string;
    duration_minutes: number;
    difficulty: "moderate" | "easy" | "hard";
    weather_dependent: boolean;
    guide_required: boolean;
    altitude_meters?: number | undefined;
    fitness_notes?: string | undefined;
}>;
export declare const DiningSegmentSchema: z.ZodObject<{
    type: z.ZodLiteral<"dining">;
    restaurant_name: z.ZodString;
    location: z.ZodObject<{
        name: z.ZodString;
        latitude: z.ZodNumber;
        longitude: z.ZodNumber;
        region: z.ZodString;
        country_code: z.ZodString;
        connectivity: z.ZodOptional<z.ZodEnum<["none", "2G", "4G", "5G"]>>;
    }, "strip", z.ZodTypeAny, {
        region: string;
        name: string;
        latitude: number;
        longitude: number;
        country_code: string;
        connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
    }, {
        region: string;
        name: string;
        latitude: number;
        longitude: number;
        country_code: string;
        connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
    }>;
    time: z.ZodString;
    cuisine: z.ZodString;
    budget_level: z.ZodEnum<["budget", "mid", "premium"]>;
    dietary_match: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    type: "dining";
    location: {
        region: string;
        name: string;
        latitude: number;
        longitude: number;
        country_code: string;
        connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
    };
    restaurant_name: string;
    time: string;
    cuisine: string;
    budget_level: "budget" | "mid" | "premium";
    dietary_match: boolean;
}, {
    type: "dining";
    location: {
        region: string;
        name: string;
        latitude: number;
        longitude: number;
        country_code: string;
        connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
    };
    restaurant_name: string;
    time: string;
    cuisine: string;
    budget_level: "budget" | "mid" | "premium";
    dietary_match: boolean;
}>;
export declare const ItineraryDaySchema: z.ZodObject<{
    itinerary_id: z.ZodString;
    day_number: z.ZodNumber;
    date: z.ZodString;
    segments: z.ZodArray<z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
        type: z.ZodLiteral<"transport">;
        mode: z.ZodEnum<["flight", "rail", "road", "ferry", "helicopter"]>;
        origin: z.ZodObject<{
            name: z.ZodString;
            latitude: z.ZodNumber;
            longitude: z.ZodNumber;
            region: z.ZodString;
            country_code: z.ZodString;
            connectivity: z.ZodOptional<z.ZodEnum<["none", "2G", "4G", "5G"]>>;
        }, "strip", z.ZodTypeAny, {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        }, {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        }>;
        destination: z.ZodObject<{
            name: z.ZodString;
            latitude: z.ZodNumber;
            longitude: z.ZodNumber;
            region: z.ZodString;
            country_code: z.ZodString;
            connectivity: z.ZodOptional<z.ZodEnum<["none", "2G", "4G", "5G"]>>;
        }, "strip", z.ZodTypeAny, {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        }, {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        }>;
        departure: z.ZodString;
        arrival: z.ZodString;
        cost: z.ZodObject<{
            amount: z.ZodNumber;
            currency: z.ZodString;
            amount_usd: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        }, {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        }>;
        carrier: z.ZodOptional<z.ZodString>;
        flight_number: z.ZodOptional<z.ZodString>;
        booking_ref: z.ZodOptional<z.ZodString>;
        reliability_score: z.ZodNumber;
        tunnel_dependent: z.ZodOptional<z.ZodBoolean>;
        permit_required: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "transport";
        mode: "flight" | "rail" | "road" | "ferry" | "helicopter";
        origin: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        destination: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        departure: string;
        arrival: string;
        cost: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        reliability_score: number;
        carrier?: string | undefined;
        flight_number?: string | undefined;
        booking_ref?: string | undefined;
        tunnel_dependent?: boolean | undefined;
        permit_required?: string | undefined;
    }, {
        type: "transport";
        mode: "flight" | "rail" | "road" | "ferry" | "helicopter";
        origin: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        destination: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        departure: string;
        arrival: string;
        cost: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        reliability_score: number;
        carrier?: string | undefined;
        flight_number?: string | undefined;
        booking_ref?: string | undefined;
        tunnel_dependent?: boolean | undefined;
        permit_required?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"accommodation">;
        property_name: z.ZodString;
        location: z.ZodObject<{
            name: z.ZodString;
            latitude: z.ZodNumber;
            longitude: z.ZodNumber;
            region: z.ZodString;
            country_code: z.ZodString;
            connectivity: z.ZodOptional<z.ZodEnum<["none", "2G", "4G", "5G"]>>;
        }, "strip", z.ZodTypeAny, {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        }, {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        }>;
        check_in: z.ZodString;
        check_out: z.ZodString;
        nightly_rate: z.ZodObject<{
            amount: z.ZodNumber;
            currency: z.ZodString;
            amount_usd: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        }, {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        }>;
        total_cost: z.ZodObject<{
            amount: z.ZodNumber;
            currency: z.ZodString;
            amount_usd: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        }, {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        }>;
        amenities: z.ZodArray<z.ZodString, "many">;
        cancellation_policy: z.ZodString;
        suitability_score: z.ZodNumber;
        booking_ref: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "accommodation";
        property_name: string;
        location: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        check_in: string;
        check_out: string;
        nightly_rate: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        total_cost: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        amenities: string[];
        cancellation_policy: string;
        suitability_score: number;
        booking_ref?: string | undefined;
    }, {
        type: "accommodation";
        property_name: string;
        location: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        check_in: string;
        check_out: string;
        nightly_rate: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        total_cost: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        amenities: string[];
        cancellation_policy: string;
        suitability_score: number;
        booking_ref?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"excursion">;
        activity_name: z.ZodString;
        location: z.ZodObject<{
            name: z.ZodString;
            latitude: z.ZodNumber;
            longitude: z.ZodNumber;
            region: z.ZodString;
            country_code: z.ZodString;
            connectivity: z.ZodOptional<z.ZodEnum<["none", "2G", "4G", "5G"]>>;
        }, "strip", z.ZodTypeAny, {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        }, {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        }>;
        start_time: z.ZodString;
        duration_minutes: z.ZodNumber;
        cost: z.ZodObject<{
            amount: z.ZodNumber;
            currency: z.ZodString;
            amount_usd: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        }, {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        }>;
        difficulty: z.ZodEnum<["easy", "moderate", "hard"]>;
        weather_dependent: z.ZodBoolean;
        guide_required: z.ZodBoolean;
        altitude_meters: z.ZodOptional<z.ZodNumber>;
        fitness_notes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "excursion";
        cost: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        location: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        activity_name: string;
        start_time: string;
        duration_minutes: number;
        difficulty: "moderate" | "easy" | "hard";
        weather_dependent: boolean;
        guide_required: boolean;
        altitude_meters?: number | undefined;
        fitness_notes?: string | undefined;
    }, {
        type: "excursion";
        cost: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        location: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        activity_name: string;
        start_time: string;
        duration_minutes: number;
        difficulty: "moderate" | "easy" | "hard";
        weather_dependent: boolean;
        guide_required: boolean;
        altitude_meters?: number | undefined;
        fitness_notes?: string | undefined;
    }>, z.ZodObject<{
        type: z.ZodLiteral<"dining">;
        restaurant_name: z.ZodString;
        location: z.ZodObject<{
            name: z.ZodString;
            latitude: z.ZodNumber;
            longitude: z.ZodNumber;
            region: z.ZodString;
            country_code: z.ZodString;
            connectivity: z.ZodOptional<z.ZodEnum<["none", "2G", "4G", "5G"]>>;
        }, "strip", z.ZodTypeAny, {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        }, {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        }>;
        time: z.ZodString;
        cuisine: z.ZodString;
        budget_level: z.ZodEnum<["budget", "mid", "premium"]>;
        dietary_match: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        type: "dining";
        location: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        restaurant_name: string;
        time: string;
        cuisine: string;
        budget_level: "budget" | "mid" | "premium";
        dietary_match: boolean;
    }, {
        type: "dining";
        location: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        restaurant_name: string;
        time: string;
        cuisine: string;
        budget_level: "budget" | "mid" | "premium";
        dietary_match: boolean;
    }>]>, "many">;
    risk_level: z.ZodEnum<["low", "medium", "high"]>;
    weather_summary: z.ZodString;
    nearest_hospital_km: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    date: string;
    itinerary_id: string;
    day_number: number;
    segments: ({
        type: "transport";
        mode: "flight" | "rail" | "road" | "ferry" | "helicopter";
        origin: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        destination: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        departure: string;
        arrival: string;
        cost: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        reliability_score: number;
        carrier?: string | undefined;
        flight_number?: string | undefined;
        booking_ref?: string | undefined;
        tunnel_dependent?: boolean | undefined;
        permit_required?: string | undefined;
    } | {
        type: "accommodation";
        property_name: string;
        location: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        check_in: string;
        check_out: string;
        nightly_rate: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        total_cost: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        amenities: string[];
        cancellation_policy: string;
        suitability_score: number;
        booking_ref?: string | undefined;
    } | {
        type: "excursion";
        cost: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        location: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        activity_name: string;
        start_time: string;
        duration_minutes: number;
        difficulty: "moderate" | "easy" | "hard";
        weather_dependent: boolean;
        guide_required: boolean;
        altitude_meters?: number | undefined;
        fitness_notes?: string | undefined;
    } | {
        type: "dining";
        location: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        restaurant_name: string;
        time: string;
        cuisine: string;
        budget_level: "budget" | "mid" | "premium";
        dietary_match: boolean;
    })[];
    risk_level: "low" | "medium" | "high";
    weather_summary: string;
    nearest_hospital_km: number;
}, {
    date: string;
    itinerary_id: string;
    day_number: number;
    segments: ({
        type: "transport";
        mode: "flight" | "rail" | "road" | "ferry" | "helicopter";
        origin: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        destination: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        departure: string;
        arrival: string;
        cost: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        reliability_score: number;
        carrier?: string | undefined;
        flight_number?: string | undefined;
        booking_ref?: string | undefined;
        tunnel_dependent?: boolean | undefined;
        permit_required?: string | undefined;
    } | {
        type: "accommodation";
        property_name: string;
        location: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        check_in: string;
        check_out: string;
        nightly_rate: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        total_cost: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        amenities: string[];
        cancellation_policy: string;
        suitability_score: number;
        booking_ref?: string | undefined;
    } | {
        type: "excursion";
        cost: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        location: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        activity_name: string;
        start_time: string;
        duration_minutes: number;
        difficulty: "moderate" | "easy" | "hard";
        weather_dependent: boolean;
        guide_required: boolean;
        altitude_meters?: number | undefined;
        fitness_notes?: string | undefined;
    } | {
        type: "dining";
        location: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        restaurant_name: string;
        time: string;
        cuisine: string;
        budget_level: "budget" | "mid" | "premium";
        dietary_match: boolean;
    })[];
    risk_level: "low" | "medium" | "high";
    weather_summary: string;
    nearest_hospital_km: number;
}>;
export declare const BudgetDashboardSchema: z.ZodObject<{
    total_budget: z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodString;
        amount_usd: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    }, {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    }>;
    total_spent: z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodString;
        amount_usd: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    }, {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    }>;
    remaining: z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodString;
        amount_usd: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    }, {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    }>;
    percent_used: z.ZodNumber;
    by_category: z.ZodObject<{
        transport: z.ZodObject<{
            amount: z.ZodNumber;
            currency: z.ZodString;
            amount_usd: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        }, {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        }>;
        accommodation: z.ZodObject<{
            amount: z.ZodNumber;
            currency: z.ZodString;
            amount_usd: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        }, {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        }>;
        excursions: z.ZodObject<{
            amount: z.ZodNumber;
            currency: z.ZodString;
            amount_usd: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        }, {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        }>;
        food: z.ZodObject<{
            amount: z.ZodNumber;
            currency: z.ZodString;
            amount_usd: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        }, {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        }>;
        contingency: z.ZodObject<{
            amount: z.ZodNumber;
            currency: z.ZodString;
            amount_usd: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        }, {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        transport: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        accommodation: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        excursions: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        food: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        contingency: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
    }, {
        transport: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        accommodation: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        excursions: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        food: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        contingency: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
    }>;
    alerts: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    total_budget: {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    };
    total_spent: {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    };
    remaining: {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    };
    percent_used: number;
    by_category: {
        transport: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        accommodation: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        excursions: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        food: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        contingency: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
    };
    alerts: string[];
}, {
    total_budget: {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    };
    total_spent: {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    };
    remaining: {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    };
    percent_used: number;
    by_category: {
        transport: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        accommodation: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        excursions: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        food: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        contingency: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
    };
    alerts: string[];
}>;
export declare const TripRequestSchema: z.ZodObject<{
    id: z.ZodString;
    traveler_id: z.ZodString;
    destination: z.ZodString;
    dates: z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
    }, {
        start: string;
        end: string;
    }>;
    budget: z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodString;
        amount_usd: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    }, {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    }>;
    party_size: z.ZodNumber;
    purpose: z.ZodEnum<["honeymoon", "business", "family", "adventure", "solo", "group"]>;
    preferences: z.ZodObject<{
        accommodation_style: z.ZodOptional<z.ZodString>;
        activity_level: z.ZodOptional<z.ZodEnum<["relaxed", "moderate", "adventurous"]>>;
        dietary: z.ZodOptional<z.ZodString>;
        must_include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        avoid: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        accommodation_style: z.ZodOptional<z.ZodString>;
        activity_level: z.ZodOptional<z.ZodEnum<["relaxed", "moderate", "adventurous"]>>;
        dietary: z.ZodOptional<z.ZodString>;
        must_include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        avoid: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        accommodation_style: z.ZodOptional<z.ZodString>;
        activity_level: z.ZodOptional<z.ZodEnum<["relaxed", "moderate", "adventurous"]>>;
        dietary: z.ZodOptional<z.ZodString>;
        must_include: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        avoid: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">>;
}, "strip", z.ZodTypeAny, {
    budget: {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    };
    destination: string;
    id: string;
    traveler_id: string;
    dates: {
        start: string;
        end: string;
    };
    party_size: number;
    purpose: "honeymoon" | "business" | "family" | "adventure" | "solo" | "group";
    preferences: {
        accommodation_style?: string | undefined;
        activity_level?: "relaxed" | "moderate" | "adventurous" | undefined;
        dietary?: string | undefined;
        must_include?: string[] | undefined;
        avoid?: string[] | undefined;
    } & {
        [k: string]: unknown;
    };
}, {
    budget: {
        amount: number;
        currency: string;
        amount_usd?: number | undefined;
    };
    destination: string;
    id: string;
    traveler_id: string;
    dates: {
        start: string;
        end: string;
    };
    party_size: number;
    purpose: "honeymoon" | "business" | "family" | "adventure" | "solo" | "group";
    preferences: {
        accommodation_style?: string | undefined;
        activity_level?: "relaxed" | "moderate" | "adventurous" | undefined;
        dietary?: string | undefined;
        must_include?: string[] | undefined;
        avoid?: string[] | undefined;
    } & {
        [k: string]: unknown;
    };
}>;
export declare const AgentMessageSchema: z.ZodObject<{
    from: z.ZodString;
    to: z.ZodString;
    type: z.ZodEnum<["task_request", "task_response", "error", "escalation", "event"]>;
    correlation_id: z.ZodString;
    timestamp: z.ZodString;
    payload: z.ZodUnknown;
    confidence: z.ZodNumber;
    requires_human_confirmation: z.ZodBoolean;
    errors: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    type: "task_request" | "task_response" | "error" | "escalation" | "event";
    from: string;
    to: string;
    correlation_id: string;
    timestamp: string;
    confidence: number;
    requires_human_confirmation: boolean;
    errors: string[];
    payload?: unknown;
}, {
    type: "task_request" | "task_response" | "error" | "escalation" | "event";
    from: string;
    to: string;
    correlation_id: string;
    timestamp: string;
    confidence: number;
    requires_human_confirmation: boolean;
    errors: string[];
    payload?: unknown;
}>;
export declare const TravelerProfileSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    email: z.ZodString;
    phone: z.ZodString;
    dietary: z.ZodArray<z.ZodString, "many">;
    allergies: z.ZodArray<z.ZodString, "many">;
    room_preferences: z.ZodRecord<z.ZodString, z.ZodString>;
    activity_style: z.ZodString;
    budget_comfort_zone: z.ZodObject<{
        min: z.ZodObject<{
            amount: z.ZodNumber;
            currency: z.ZodString;
            amount_usd: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        }, {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        }>;
        max: z.ZodObject<{
            amount: z.ZodNumber;
            currency: z.ZodString;
            amount_usd: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        }, {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        min: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        max: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
    }, {
        min: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        max: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
    }>;
    companions: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        relationship: z.ZodString;
        preferences: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        relationship: string;
        preferences?: Record<string, unknown> | undefined;
    }, {
        name: string;
        relationship: string;
        preferences?: Record<string, unknown> | undefined;
    }>, "many">;
    documents: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["passport", "visa", "insurance", "vaccination"]>;
        number: z.ZodString;
        country: z.ZodString;
        expiry: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        number: string;
        type: "passport" | "visa" | "insurance" | "vaccination";
        country: string;
        expiry: string;
    }, {
        number: string;
        type: "passport" | "visa" | "insurance" | "vaccination";
        country: string;
        expiry: string;
    }>, "many">;
    trip_history: z.ZodArray<z.ZodString, "many">;
    loyalty_tier: z.ZodEnum<["bronze", "silver", "gold", "platinum"]>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    dietary: string[];
    name: string;
    id: string;
    email: string;
    phone: string;
    allergies: string[];
    room_preferences: Record<string, string>;
    activity_style: string;
    budget_comfort_zone: {
        min: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        max: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
    };
    companions: {
        name: string;
        relationship: string;
        preferences?: Record<string, unknown> | undefined;
    }[];
    documents: {
        number: string;
        type: "passport" | "visa" | "insurance" | "vaccination";
        country: string;
        expiry: string;
    }[];
    trip_history: string[];
    loyalty_tier: "bronze" | "silver" | "gold" | "platinum";
    created_at: string;
    updated_at: string;
}, {
    dietary: string[];
    name: string;
    id: string;
    email: string;
    phone: string;
    allergies: string[];
    room_preferences: Record<string, string>;
    activity_style: string;
    budget_comfort_zone: {
        min: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
        max: {
            amount: number;
            currency: string;
            amount_usd?: number | undefined;
        };
    };
    companions: {
        name: string;
        relationship: string;
        preferences?: Record<string, unknown> | undefined;
    }[];
    documents: {
        number: string;
        type: "passport" | "visa" | "insurance" | "vaccination";
        country: string;
        expiry: string;
    }[];
    trip_history: string[];
    loyalty_tier: "bronze" | "silver" | "gold" | "platinum";
    created_at: string;
    updated_at: string;
}>;
export declare const SearchFlightsInputSchema: z.ZodObject<{
    origin: z.ZodString;
    destination: z.ZodString;
    departure_date: z.ZodString;
    return_date: z.ZodOptional<z.ZodString>;
    passengers: z.ZodDefault<z.ZodNumber>;
    cabin_class: z.ZodDefault<z.ZodEnum<["economy", "premium_economy", "business", "first"]>>;
    max_results: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    origin: string;
    destination: string;
    departure_date: string;
    passengers: number;
    cabin_class: "business" | "economy" | "premium_economy" | "first";
    max_results: number;
    return_date?: string | undefined;
}, {
    origin: string;
    destination: string;
    departure_date: string;
    return_date?: string | undefined;
    passengers?: number | undefined;
    cabin_class?: "business" | "economy" | "premium_economy" | "first" | undefined;
    max_results?: number | undefined;
}>;
export declare const GetFlightDetailsInputSchema: z.ZodObject<{
    offer_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    offer_id: string;
}, {
    offer_id: string;
}>;
export declare const GetFareRulesInputSchema: z.ZodObject<{
    offer_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    offer_id: string;
}, {
    offer_id: string;
}>;
export declare const SearchPropertiesInputSchema: z.ZodObject<{
    location: z.ZodString;
    check_in: z.ZodString;
    check_out: z.ZodString;
    guests: z.ZodDefault<z.ZodNumber>;
    budget_max: z.ZodOptional<z.ZodNumber>;
    amenities_filter: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    max_results: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    location: string;
    check_in: string;
    check_out: string;
    max_results: number;
    guests: number;
    budget_max?: number | undefined;
    amenities_filter?: string[] | undefined;
}, {
    location: string;
    check_in: string;
    check_out: string;
    max_results?: number | undefined;
    guests?: number | undefined;
    budget_max?: number | undefined;
    amenities_filter?: string[] | undefined;
}>;
export declare const GetRouteInputSchema: z.ZodObject<{
    origin: z.ZodString;
    destination: z.ZodString;
    mode: z.ZodDefault<z.ZodEnum<["driving", "transit", "walking"]>>;
    departure_time: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    mode: "driving" | "transit" | "walking";
    origin: string;
    destination: string;
    departure_time?: string | undefined;
}, {
    origin: string;
    destination: string;
    mode?: "driving" | "transit" | "walking" | undefined;
    departure_time?: string | undefined;
}>;
export declare const SearchPlacesInputSchema: z.ZodObject<{
    query: z.ZodString;
    location: z.ZodString;
    radius: z.ZodDefault<z.ZodNumber>;
    type: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    location: string;
    query: string;
    radius: number;
    type?: string | undefined;
}, {
    location: string;
    query: string;
    type?: string | undefined;
    radius?: number | undefined;
}>;
export declare const GetForecastInputSchema: z.ZodObject<{
    lat: z.ZodNumber;
    lng: z.ZodNumber;
    days_ahead: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    lat: number;
    lng: number;
    days_ahead: number;
}, {
    lat: number;
    lng: number;
    days_ahead?: number | undefined;
}>;
export declare const GetHistoricalAvgInputSchema: z.ZodObject<{
    lat: z.ZodNumber;
    lng: z.ZodNumber;
    month: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    lat: number;
    lng: number;
    month: number;
}, {
    lat: number;
    lng: number;
    month: number;
}>;
export declare const ConvertCurrencyInputSchema: z.ZodObject<{
    amount: z.ZodNumber;
    from: z.ZodString;
    to: z.ZodString;
}, "strip", z.ZodTypeAny, {
    amount: number;
    from: string;
    to: string;
}, {
    amount: number;
    from: string;
    to: string;
}>;
export declare const GetTravelAdvisoryInputSchema: z.ZodObject<{
    country_code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    country_code: string;
}, {
    country_code: string;
}>;
export declare const GetNearbyHospitalsInputSchema: z.ZodObject<{
    lat: z.ZodNumber;
    lng: z.ZodNumber;
    radius_km: z.ZodDefault<z.ZodNumber>;
    max_results: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    max_results: number;
    lat: number;
    lng: number;
    radius_km: number;
}, {
    lat: number;
    lng: number;
    max_results?: number | undefined;
    radius_km?: number | undefined;
}>;
export declare const RagRetrieveInputSchema: z.ZodObject<{
    collection: z.ZodEnum<["regulatory", "accommodation", "excursions", "geo_context", "health_safety", "traveler_reviews", "dispute_playbooks", "emergency_protocols", "local_knowledge"]>;
    query: z.ZodString;
    filters: z.ZodOptional<z.ZodObject<{
        region: z.ZodOptional<z.ZodString>;
        season: z.ZodOptional<z.ZodString>;
        document_type: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        region?: string | undefined;
        season?: string | undefined;
        document_type?: string | undefined;
    }, {
        region?: string | undefined;
        season?: string | undefined;
        document_type?: string | undefined;
    }>>;
    top_k: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    query: string;
    collection: "accommodation" | "regulatory" | "excursions" | "geo_context" | "health_safety" | "traveler_reviews" | "dispute_playbooks" | "emergency_protocols" | "local_knowledge";
    top_k: number;
    filters?: {
        region?: string | undefined;
        season?: string | undefined;
        document_type?: string | undefined;
    } | undefined;
}, {
    query: string;
    collection: "accommodation" | "regulatory" | "excursions" | "geo_context" | "health_safety" | "traveler_reviews" | "dispute_playbooks" | "emergency_protocols" | "local_knowledge";
    filters?: {
        region?: string | undefined;
        season?: string | undefined;
        document_type?: string | undefined;
    } | undefined;
    top_k?: number | undefined;
}>;
export declare const SendNotificationInputSchema: z.ZodObject<{
    title: z.ZodString;
    body: z.ZodString;
    data: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    urgency: z.ZodDefault<z.ZodEnum<["info", "warning", "critical"]>>;
}, "strip", z.ZodTypeAny, {
    title: string;
    body: string;
    urgency: "info" | "warning" | "critical";
    data?: Record<string, unknown> | undefined;
}, {
    title: string;
    body: string;
    data?: Record<string, unknown> | undefined;
    urgency?: "info" | "warning" | "critical" | undefined;
}>;
export declare const TrackFlightInputSchema: z.ZodObject<{
    flight_number: z.ZodString;
    date: z.ZodString;
}, "strip", z.ZodTypeAny, {
    date: string;
    flight_number: string;
}, {
    date: string;
    flight_number: string;
}>;
export declare const ScanReceiptInputSchema: z.ZodObject<{
    image_base64: z.ZodString;
    trip_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    image_base64: string;
    trip_id: string;
}, {
    image_base64: string;
    trip_id: string;
}>;
export declare const TravelEventSchema: z.ZodDiscriminatedUnion<"event_type", [z.ZodObject<{
    event_type: z.ZodLiteral<"flight.status_changed">;
    trip_id: z.ZodString;
    timestamp: z.ZodString;
    severity: z.ZodEnum<["info", "warning", "critical"]>;
    data: z.ZodObject<{
        flight_number: z.ZodString;
        new_status: z.ZodString;
        delay_minutes: z.ZodNumber;
        gate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        flight_number: string;
        new_status: string;
        delay_minutes: number;
        gate?: string | undefined;
    }, {
        flight_number: string;
        new_status: string;
        delay_minutes: number;
        gate?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    data: {
        flight_number: string;
        new_status: string;
        delay_minutes: number;
        gate?: string | undefined;
    };
    trip_id: string;
    event_type: "flight.status_changed";
    severity: "info" | "warning" | "critical";
}, {
    timestamp: string;
    data: {
        flight_number: string;
        new_status: string;
        delay_minutes: number;
        gate?: string | undefined;
    };
    trip_id: string;
    event_type: "flight.status_changed";
    severity: "info" | "warning" | "critical";
}>, z.ZodObject<{
    event_type: z.ZodLiteral<"weather.alert">;
    trip_id: z.ZodString;
    timestamp: z.ZodString;
    severity: z.ZodEnum<["info", "warning", "critical"]>;
    data: z.ZodObject<{
        region: z.ZodString;
        description: z.ZodString;
        valid_until: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        region: string;
        description: string;
        valid_until: string;
    }, {
        region: string;
        description: string;
        valid_until: string;
    }>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    data: {
        region: string;
        description: string;
        valid_until: string;
    };
    trip_id: string;
    event_type: "weather.alert";
    severity: "info" | "warning" | "critical";
}, {
    timestamp: string;
    data: {
        region: string;
        description: string;
        valid_until: string;
    };
    trip_id: string;
    event_type: "weather.alert";
    severity: "info" | "warning" | "critical";
}>, z.ZodObject<{
    event_type: z.ZodLiteral<"road.closure">;
    trip_id: z.ZodString;
    timestamp: z.ZodString;
    severity: z.ZodEnum<["info", "warning", "critical"]>;
    data: z.ZodObject<{
        route_id: z.ZodString;
        reason: z.ZodString;
        estimated_reopen: z.ZodString;
        alternatives: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        route_id: string;
        reason: string;
        estimated_reopen: string;
        alternatives: string[];
    }, {
        route_id: string;
        reason: string;
        estimated_reopen: string;
        alternatives: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    data: {
        route_id: string;
        reason: string;
        estimated_reopen: string;
        alternatives: string[];
    };
    trip_id: string;
    event_type: "road.closure";
    severity: "info" | "warning" | "critical";
}, {
    timestamp: string;
    data: {
        route_id: string;
        reason: string;
        estimated_reopen: string;
        alternatives: string[];
    };
    trip_id: string;
    event_type: "road.closure";
    severity: "info" | "warning" | "critical";
}>, z.ZodObject<{
    event_type: z.ZodLiteral<"booking.confirmation">;
    trip_id: z.ZodString;
    timestamp: z.ZodString;
    severity: z.ZodLiteral<"info">;
    data: z.ZodObject<{
        booking_id: z.ZodString;
        type: z.ZodString;
        provider: z.ZodString;
        reference: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: string;
        booking_id: string;
        provider: string;
        reference: string;
    }, {
        type: string;
        booking_id: string;
        provider: string;
        reference: string;
    }>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    data: {
        type: string;
        booking_id: string;
        provider: string;
        reference: string;
    };
    trip_id: string;
    event_type: "booking.confirmation";
    severity: "info";
}, {
    timestamp: string;
    data: {
        type: string;
        booking_id: string;
        provider: string;
        reference: string;
    };
    trip_id: string;
    event_type: "booking.confirmation";
    severity: "info";
}>, z.ZodObject<{
    event_type: z.ZodLiteral<"booking.cancellation">;
    trip_id: z.ZodString;
    timestamp: z.ZodString;
    severity: z.ZodEnum<["warning", "critical"]>;
    data: z.ZodObject<{
        booking_id: z.ZodString;
        reason: z.ZodString;
        refund_status: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        reason: string;
        booking_id: string;
        refund_status: string;
    }, {
        reason: string;
        booking_id: string;
        refund_status: string;
    }>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    data: {
        reason: string;
        booking_id: string;
        refund_status: string;
    };
    trip_id: string;
    event_type: "booking.cancellation";
    severity: "warning" | "critical";
}, {
    timestamp: string;
    data: {
        reason: string;
        booking_id: string;
        refund_status: string;
    };
    trip_id: string;
    event_type: "booking.cancellation";
    severity: "warning" | "critical";
}>, z.ZodObject<{
    event_type: z.ZodLiteral<"emergency.triggered">;
    trip_id: z.ZodString;
    timestamp: z.ZodString;
    severity: z.ZodLiteral<"critical">;
    data: z.ZodObject<{
        type: z.ZodEnum<["medical", "security", "natural_disaster", "lost_document"]>;
        location: z.ZodObject<{
            name: z.ZodString;
            latitude: z.ZodNumber;
            longitude: z.ZodNumber;
            region: z.ZodString;
            country_code: z.ZodString;
            connectivity: z.ZodOptional<z.ZodEnum<["none", "2G", "4G", "5G"]>>;
        }, "strip", z.ZodTypeAny, {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        }, {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        }>;
        traveler_id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "medical" | "security" | "natural_disaster" | "lost_document";
        location: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        traveler_id: string;
    }, {
        type: "medical" | "security" | "natural_disaster" | "lost_document";
        location: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        traveler_id: string;
    }>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    data: {
        type: "medical" | "security" | "natural_disaster" | "lost_document";
        location: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        traveler_id: string;
    };
    trip_id: string;
    event_type: "emergency.triggered";
    severity: "critical";
}, {
    timestamp: string;
    data: {
        type: "medical" | "security" | "natural_disaster" | "lost_document";
        location: {
            region: string;
            name: string;
            latitude: number;
            longitude: number;
            country_code: string;
            connectivity?: "none" | "2G" | "4G" | "5G" | undefined;
        };
        traveler_id: string;
    };
    trip_id: string;
    event_type: "emergency.triggered";
    severity: "critical";
}>, z.ZodObject<{
    event_type: z.ZodLiteral<"profile.document_expiry">;
    trip_id: z.ZodString;
    timestamp: z.ZodString;
    severity: z.ZodLiteral<"warning">;
    data: z.ZodObject<{
        document_type: z.ZodString;
        expiry_date: z.ZodString;
        traveler_id: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        document_type: string;
        traveler_id: string;
        expiry_date: string;
    }, {
        document_type: string;
        traveler_id: string;
        expiry_date: string;
    }>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    data: {
        document_type: string;
        traveler_id: string;
        expiry_date: string;
    };
    trip_id: string;
    event_type: "profile.document_expiry";
    severity: "warning";
}, {
    timestamp: string;
    data: {
        document_type: string;
        traveler_id: string;
        expiry_date: string;
    };
    trip_id: string;
    event_type: "profile.document_expiry";
    severity: "warning";
}>]>;
//# sourceMappingURL=schemas.d.ts.map