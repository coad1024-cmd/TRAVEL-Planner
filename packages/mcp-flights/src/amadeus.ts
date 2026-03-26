import type { FlightOffer, Money } from '@travel/shared';
import { LRUCache } from './cache.js';
import { TokenBucketRateLimiter } from './rate-limiter.js';
import { CircuitBreaker } from './circuit-breaker.js';

interface AmadeusToken {
  access_token: string;
  expires_at: number; // ms timestamp
}

interface AmadeusFlightOffer {
  id: string;
  itineraries: Array<{
    segments: Array<{
      departure: { iataCode: string; at: string };
      arrival: { iataCode: string; at: string };
      carrierCode: string;
      number: string;
      duration: string;
    }>;
  }>;
  price: { grandTotal: string; currency: string };
  numberOfBookableSeats: number;
  travelerPricings: Array<{ fareOption: string }>;
}

export class AmadeusClient {
  private token: AmadeusToken | null = null;
  private readonly cache = new LRUCache<FlightOffer[]>(100, 10 * 60 * 1000); // 10 min
  private readonly rateLimiter = new TokenBucketRateLimiter(10);
  private readonly circuitBreaker = new CircuitBreaker(3, 30_000);
  private readonly baseUrl = 'https://api.amadeus.com';

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expires_at - 60_000) {
      return this.token.access_token;
    }

    const clientId = process.env.AMADEUS_CLIENT_ID;
    const clientSecret = process.env.AMADEUS_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET must be set');
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });

    const res = await fetch(`${this.baseUrl}/v1/security/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      throw new Error(`Amadeus auth failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json() as { access_token: string; expires_in: number };
    this.token = {
      access_token: data.access_token,
      expires_at: Date.now() + data.expires_in * 1000,
    };
    return this.token.access_token;
  }

  async searchFlights(params: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    adults: number;
    travelClass: string;
    max: number;
  }): Promise<FlightOffer[]> {
    const cacheKey = JSON.stringify(params);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    return this.circuitBreaker.execute(async () => {
      await this.rateLimiter.acquire();
      const token = await this.getToken();

      const query = new URLSearchParams({
        originLocationCode: params.origin,
        destinationLocationCode: params.destination,
        departureDate: params.departureDate,
        adults: String(params.adults),
        travelClass: params.travelClass.toUpperCase(),
        max: String(params.max),
        currencyCode: 'INR',
      });
      if (params.returnDate) query.set('returnDate', params.returnDate);

      const res = await fetch(`${this.baseUrl}/v2/shopping/flight-offers?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Amadeus flight search failed: ${res.status} ${text}`);
      }

      const data = await res.json() as { data: AmadeusFlightOffer[] };
      const offers = (data.data ?? []).map(o => this.mapOffer(o));
      this.cache.set(cacheKey, offers);
      return offers;
    });
  }

  async getFlightDetails(offerId: string): Promise<FlightOffer | null> {
    // Amadeus doesn't have a single offer endpoint; details come from the search cache
    // In production, use the Pricing API to refresh a specific offer
    return null;
  }

  async getFareRules(offerId: string): Promise<string> {
    // Would call Amadeus SeatMap / branded fares endpoint in production
    return `Fare rules for offer ${offerId}: Standard non-refundable economy fare. Changes permitted with fee. No-show: forfeit ticket.`;
  }

  private mapOffer(o: AmadeusFlightOffer): FlightOffer {
    const firstItinerary = o.itineraries[0];
    const firstSegment = firstItinerary.segments[0];
    const lastSegment = firstItinerary.segments[firstItinerary.segments.length - 1];

    const durationMs = firstItinerary.segments.reduce((acc, seg) => {
      // Parse ISO 8601 duration e.g. PT2H30M
      const match = seg.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
      const hours = parseInt(match?.[1] ?? '0');
      const mins = parseInt(match?.[2] ?? '0');
      return acc + hours * 60 + mins;
    }, 0);

    const price: Money = {
      amount: parseFloat(o.price.grandTotal),
      currency: o.price.currency,
    };

    return {
      offer_id: o.id,
      carrier: firstSegment.carrierCode,
      flight_number: `${firstSegment.carrierCode}${firstSegment.number}`,
      origin: firstSegment.departure.iataCode,
      destination: lastSegment.arrival.iataCode,
      departure: firstSegment.departure.at,
      arrival: lastSegment.arrival.at,
      duration_minutes: durationMs,
      stops: firstItinerary.segments.length - 1,
      price,
      cabin_class: 'economy',
      booking_deeplink: `https://www.amadeus.com/flights?offerId=${o.id}`,
    };
  }
}
