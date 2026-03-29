import { EventEmitter } from 'events';
import type { LiveStatus, TripAlert, FlightStatus, HotelNotification } from '@travel/frontend/lib/live-status';

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

  // Helper for Issue #2 cascades
  addCascadeEvent(tripId: string, type: 'flight' | 'hotel' | 'alert', item: FlightStatus | HotelNotification | TripAlert) {
    const current = this.getLiveStatus(tripId);
    
    // Auto-create cascade_chain array if missing
    if (!item.cascade_chain) item.cascade_chain = [];

    if (type === 'flight') {
      const idx = current.flights.findIndex((f) => f.flight_number === (item as FlightStatus).flight_number);
      if (idx >= 0) current.flights[idx] = item as FlightStatus;
      else current.flights.push(item as FlightStatus);
    } else if (type === 'hotel') {
      current.hotel_notifications.push(item as HotelNotification);
    } else if (type === 'alert') {
      current.alerts.push(item as TripAlert);
    }
    this.updateLiveStatus(tripId, { ...current });
  }
}

export const liveStatusStore = new LiveStatusStore();
