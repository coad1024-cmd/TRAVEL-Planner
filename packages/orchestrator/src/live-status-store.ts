import { EventEmitter } from 'events';
<<<<<<< HEAD
import type { LiveStatus, TripAlert, FlightStatus, HotelNotification } from '@travel/frontend/lib/live-status';
=======

// Self-contained types — mirrors packages/frontend/lib/live-status.ts
// Kept local so @travel/orchestrator has zero dependency on the frontend package.

export interface FlightStatus {
  flight_number: string;
  route: string;
  scheduled: string;
  estimated: string | null;
  status: 'on-time' | 'delayed' | 'cancelled' | 'landed' | 'boarding';
  delay_minutes: number;
  gate: string | null;
  terminal: string | null;
  downstream_impact: string | null;
  cascade_chain?: string[];
}

export interface HotelNotification {
  property: string;
  type: 'check-in' | 'check-out' | 'upgrade' | 'special-request';
  message: string;
  action_required: boolean;
  scheduled_time: string;
  cascade_chain?: string[];
}

export interface TripAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  category: 'flight' | 'weather' | 'hotel' | 'safety' | 'budget';
  title: string;
  body: string;
  timestamp: string;
  resolved: boolean;
  cascade_chain?: string[];
}

export interface BookingConfirmation {
  id: string;
  type: 'flight' | 'hotel' | 'excursion' | 'transfer';
  provider: string;
  booking_ref: string;
  description: string;
  date: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'checked-in';
  document_url: string | null;
}

export interface LiveStatus {
  trip_id: string;
  last_updated: string;
  flights: FlightStatus[];
  hotel_notifications: HotelNotification[];
  alerts: TripAlert[];
  booking_hub: BookingConfirmation[];
}
>>>>>>> feature/issue-19-dashboard-wiring

class LiveStatusStore extends EventEmitter {
  private activeTrips = new Map<string, LiveStatus>();

  getLiveStatus(tripId: string): LiveStatus {
    let status = this.activeTrips.get(tripId);
    if (!status) {
      status = {
        trip_id: tripId,
        last_updated: new Date().toISOString(),
        flights: [],
        hotel_notifications: [],
        alerts: [],
        booking_hub: []
      };
      this.activeTrips.set(tripId, status);
    }
    return status;
  }

  updateLiveStatus(tripId: string, updates: Partial<LiveStatus>) {
    const current = this.getLiveStatus(tripId);
    const updated = { ...current, ...updates, last_updated: new Date().toISOString() };
    this.activeTrips.set(tripId, updated);
    this.emit(`update:${tripId}`, updated);
  }

<<<<<<< HEAD
  // Helper for Issue #2 cascades
  addCascadeEvent(tripId: string, type: 'flight' | 'hotel' | 'alert', item: FlightStatus | HotelNotification | TripAlert) {
    const current = this.getLiveStatus(tripId);
    
    // Auto-create cascade_chain array if missing
    if (!item.cascade_chain) item.cascade_chain = [];

    if (type === 'flight') {
      const idx = current.flights.findIndex((f) => f.flight_number === (item as FlightStatus).flight_number);
      if (idx >= 0) current.flights[idx] = item as FlightStatus;
      else current.flights.push(item as FlightStatus);
=======
  /**
   * Issue #2: Cascade disruption handler.
   * Adds a flight delay / hotel notification / alert and emits an update event.
   */
  addCascadeEvent(tripId: string, type: 'flight' | 'hotel' | 'alert', item: FlightStatus | HotelNotification | TripAlert) {
    const current = this.getLiveStatus(tripId);
    
    if (!item.cascade_chain) item.cascade_chain = [];

    if (type === 'flight') {
      const flight = item as FlightStatus;
      const idx = current.flights.findIndex((f: FlightStatus) => f.flight_number === flight.flight_number);
      if (idx >= 0) current.flights[idx] = flight;
      else current.flights.push(flight);
>>>>>>> feature/issue-19-dashboard-wiring
    } else if (type === 'hotel') {
      current.hotel_notifications.push(item as HotelNotification);
    } else if (type === 'alert') {
      current.alerts.push(item as TripAlert);
    }
    this.updateLiveStatus(tripId, { ...current });
  }
<<<<<<< HEAD
=======

  /**
   * Issue #2: Full disruption cascade.
   * When a flight is delayed, auto-generate downstream hotel + alert impacts.
   */
  handleFlightDisruption(tripId: string, flight: FlightStatus) {
    const chain: string[] = [`Flight ${flight.flight_number} delayed ${flight.delay_minutes}min`];

    // 1. Update the flight itself
    flight.cascade_chain = chain;
    this.addCascadeEvent(tripId, 'flight', flight);

    // 2. Auto-generate hotel late check-in notification
    if (flight.delay_minutes >= 30) {
      const hotelNotification: HotelNotification = {
        property: 'Booked Hotel',
        type: 'check-in',
        message: `Late check-in expected — flight ${flight.flight_number} delayed by ${flight.delay_minutes} minutes. Estimated arrival pushed to ${flight.estimated || 'TBD'}.`,
        action_required: true,
        scheduled_time: flight.estimated || new Date().toISOString(),
        cascade_chain: [...chain, 'Hotel notified of late check-in'],
      };
      this.addCascadeEvent(tripId, 'hotel', hotelNotification);
      chain.push('Hotel notified of late check-in');
    }

    // 3. Auto-generate ground transport alert
    if (flight.delay_minutes >= 60) {
      const transportAlert: TripAlert = {
        id: `cascade-transport-${Date.now()}`,
        severity: 'warning',
        category: 'flight',
        title: 'Ground Transport May Need Rebooking',
        body: `Flight ${flight.flight_number} is delayed ${flight.delay_minutes}min. Your airport transfer may need to be rescheduled.`,
        timestamp: new Date().toISOString(),
        resolved: false,
        cascade_chain: [...chain, 'Ground transport rescheduling advised'],
      };
      this.addCascadeEvent(tripId, 'alert', transportAlert);
    }
  }
>>>>>>> feature/issue-19-dashboard-wiring
}

export const liveStatusStore = new LiveStatusStore();
