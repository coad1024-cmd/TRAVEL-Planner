import { describe, it, expect, vi, beforeEach } from 'vitest';
import { preFlightCheck, morningBriefing, passportExpiryScan } from './workflows.js';
import { publishEvent } from '@travel/shared';

// Mock publishEvent
vi.mock('@travel/shared', async () => {
  const actual = await vi.importActual('@travel/shared');
  return {
    ...actual as any,
    publishEvent: vi.fn().mockResolvedValue('msg-123'),
  };
});

describe('Scheduler Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('preFlightCheck', () => {
    it('publishes a flight.status_changed event', async () => {
      const ctx = { tripId: 'trip-1', travelerId: 'user-1', flightNumber: 'AI101' };
      await preFlightCheck(ctx);
      expect(publishEvent).toHaveBeenCalledWith(expect.objectContaining({
        event_type: 'flight.status_changed',
        trip_id: 'trip-1',
      }));
    });

    it('does nothing if flightNumber is missing', async () => {
      const ctx = { tripId: 'trip-1', travelerId: 'user-1' };
      await preFlightCheck(ctx);
      expect(publishEvent).not.toHaveBeenCalled();
    });
  });

  describe('morningBriefing', () => {
    it('publishes a weather.alert event as a briefing trigger', async () => {
      const ctx = { tripId: 'trip-1', travelerId: 'user-1' };
      await morningBriefing(ctx);
      expect(publishEvent).toHaveBeenCalledWith(expect.objectContaining({
        event_type: 'weather.alert',
        trip_id: 'trip-1',
      }));
    });
  });

  describe('passportExpiryScan', () => {
    it('publishes profile.document_expiry if within 6 months', async () => {
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 3); // 3 months is < 6 months
      const ctx = { 
        tripId: 'trip-1', 
        travelerId: 'user-1', 
        documentType: 'passport', 
        expiryDate: sixMonthsFromNow.toISOString().split('T')[0] 
      };
      
      await passportExpiryScan(ctx);
      expect(publishEvent).toHaveBeenCalledWith(expect.objectContaining({
        event_type: 'profile.document_expiry',
        severity: 'warning',
      }));
    });

    it('does nothing if expiry is far in future', async () => {
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 2);
      const ctx = { 
        tripId: 'trip-1', 
        travelerId: 'user-1', 
        documentType: 'passport', 
        expiryDate: nextYear.toISOString().split('T')[0] 
      };
      
      await passportExpiryScan(ctx);
      expect(publishEvent).not.toHaveBeenCalled();
    });
  });
});
