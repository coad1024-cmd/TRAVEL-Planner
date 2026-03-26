import type { FlightOffer, Money } from '@travel/shared';
import { LRUCache } from './cache.js';
import { CircuitBreaker } from './circuit-breaker.js';

interface DuffelOfferRequest {
  slices: Array<{
    origin: string;
    destination: string;
    departure_date: string;
  }>;
  passengers: Array<{ type: 'adult' }>;
  cabin_class: string;
}

interface DuffelOffer {
  id: string;
  slices: Array<{
    segments: Array<{
      departing_at: string;
      arriving_at: string;
      origin: { iata_code: string };
      destination: { iata_code: string };
      operating_carrier: { iata_code: string; name: string };
      operating_carrier_flight_number: string;
      duration: string;
    }>;
  }>;
  total_amount: string;
  total_currency: string;
  tax_amount: string;
}

export class DuffelClient {
  private readonly cache = new LRUCache<FlightOffer[]>(100, 10 * 60 * 1000);
  private readonly circuitBreaker = new CircuitBreaker(3, 30_000);
  private readonly baseUrl = 'https://api.duffel.com';

  private getHeaders(): Record<string, string> {
    const apiKey = process.env.DUFFEL_API_KEY;
    if (!apiKey) throw new Error('DUFFEL_API_KEY must be set');
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Duffel-Version': 'v1',
      Accept: 'application/json',
    };
  }

  async searchFlights(params: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    adults: number;
    cabinClass: string;
    max: number;
  }): Promise<FlightOffer[]> {
    const cacheKey = JSON.stringify(params);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    return this.circuitBreaker.execute(async () => {
      const body: { data: DuffelOfferRequest } = {
        data: {
          slices: [
            {
              origin: params.origin,
              destination: params.destination,
              departure_date: params.departureDate,
            },
          ],
          passengers: Array.from({ length: params.adults }, () => ({ type: 'adult' as const })),
          cabin_class: params.cabinClass.toLowerCase(),
        },
      };

      if (params.returnDate) {
        body.data.slices.push({
          origin: params.destination,
          destination: params.origin,
          departure_date: params.returnDate,
        });
      }

      // Step 1: Create offer request
      const res = await fetch(`${this.baseUrl}/air/offer_requests?return_offers=true`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Duffel offer request failed: ${res.status} ${text}`);
      }

      const data = await res.json() as { data: { offers: DuffelOffer[] } };
      const offers = (data.data.offers ?? [])
        .slice(0, params.max)
        .map(o => this.mapOffer(o));

      this.cache.set(cacheKey, offers);
      return offers;
    });
  }

  private mapOffer(o: DuffelOffer): FlightOffer {
    const firstSlice = o.slices[0];
    const firstSegment = firstSlice.segments[0];
    const lastSegment = firstSlice.segments[firstSlice.segments.length - 1];

    const durationMinutes = firstSlice.segments.reduce((acc, seg) => {
      const match = seg.duration?.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
      const h = parseInt(match?.[1] ?? '0');
      const m = parseInt(match?.[2] ?? '0');
      return acc + h * 60 + m;
    }, 0);

    const price: Money = {
      amount: parseFloat(o.total_amount),
      currency: o.total_currency,
    };

    return {
      offer_id: `duffel_${o.id}`,
      carrier: firstSegment.operating_carrier.iata_code,
      flight_number: `${firstSegment.operating_carrier.iata_code}${firstSegment.operating_carrier_flight_number}`,
      origin: firstSegment.origin.iata_code,
      destination: lastSegment.destination.iata_code,
      departure: firstSegment.departing_at,
      arrival: lastSegment.arriving_at,
      duration_minutes: durationMinutes,
      stops: firstSlice.segments.length - 1,
      price,
      cabin_class: 'economy',
      booking_deeplink: `https://app.duffel.com/flights?offer_id=${o.id}`,
    };
  }
}
