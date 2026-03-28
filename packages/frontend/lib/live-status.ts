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
}

export interface HotelNotification {
  property: string;
  type: 'check-in' | 'check-out' | 'upgrade' | 'special-request';
  message: string;
  action_required: boolean;
  scheduled_time: string;
}

export interface TripAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  category: 'flight' | 'weather' | 'hotel' | 'safety' | 'budget';
  title: string;
  body: string;
  timestamp: string;
  resolved: boolean;
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
