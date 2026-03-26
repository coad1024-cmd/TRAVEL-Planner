/**
 * Seed data for the Pahalgam honeymoon test case.
 * Run via: pnpm ts-node prisma/seed.ts (after DB is running)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Seeding test data...');

  // Test traveler — Pahalgam honeymoon scenario
  const traveler = await prisma.traveler.upsert({
    where: { email: 'demo.traveler@travel-system.dev' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Arjun Sharma',
      email: 'demo.traveler@travel-system.dev',
      phone: '+91-9876543210',
      dietary: ['vegetarian'],
      allergies: [],
      roomPreferences: { bed_type: 'king', view: 'mountain', heating: 'required' },
      activityStyle: 'moderate',
      budgetMin: 50000,
      budgetMinCurrency: 'INR',
      budgetMax: 150000,
      budgetMaxCurrency: 'INR',
      companions: [
        { name: 'Priya Sharma', relationship: 'spouse', preferences: { dietary: ['vegetarian'] } },
      ],
      loyaltyTier: 'silver',
    },
  });
  console.log(`  Traveler: ${traveler.name} (${traveler.id})`);

  // Add passport document
  await prisma.travelerDocument.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      travelerId: traveler.id,
      documentType: 'passport',
      documentNumber: 'ENCRYPTED', // Would be AES-256-GCM in production
      country: 'IN',
      expiry: '2029-03-15',
    },
  });

  // Pahalgam honeymoon trip
  const trip = await prisma.trip.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      travelerId: traveler.id,
      destination: 'Pahalgam, Jammu & Kashmir, India',
      dateStart: '2026-06-15',
      dateEnd: '2026-06-22',
      budgetAmount: 150000,
      budgetCurrency: 'INR',
      partySize: 2,
      purpose: 'honeymoon',
      status: 'planning',
      preferences: {
        accommodation_style: 'boutique',
        activity_level: 'moderate',
        dietary: 'vegetarian',
        must_include: ['Betaab Valley', 'shikara ride'],
        avoid: ['overcrowded spots'],
      },
    },
  });
  console.log(`  Trip: ${trip.destination} (${trip.id})`);

  // Sample segments
  await prisma.tripSegment.createMany({
    skipDuplicates: true,
    data: [
      {
        id: '00000000-0000-0000-0000-000000000003',
        tripId: trip.id,
        dayNumber: 1,
        segmentDate: '2026-06-15',
        segmentType: 'transport',
        provider: 'IndiGo',
        status: 'pending',
        costAmount: 12000,
        costCurrency: 'INR',
        details: {
          type: 'transport',
          mode: 'flight',
          origin: { name: 'Delhi', latitude: 28.5562, longitude: 77.1000, region: 'delhi', country_code: 'IN' },
          destination: { name: 'Srinagar', latitude: 34.0837, longitude: 74.7973, region: 'kashmir', country_code: 'IN' },
          flight_number: '6E-2345',
          departure: '2026-06-15T06:00:00+05:30',
          arrival: '2026-06-15T07:30:00+05:30',
          reliability_score: 0.85,
        },
      },
      {
        id: '00000000-0000-0000-0000-000000000004',
        tripId: trip.id,
        dayNumber: 1,
        segmentDate: '2026-06-15',
        segmentType: 'transport',
        status: 'pending',
        costAmount: 2500,
        costCurrency: 'INR',
        details: {
          type: 'transport',
          mode: 'road',
          origin: { name: 'Srinagar Airport', latitude: 34.0837, longitude: 74.7973, region: 'srinagar', country_code: 'IN' },
          destination: { name: 'Pahalgam', latitude: 34.0161, longitude: 75.3150, region: 'pahalgam', country_code: 'IN' },
          departure: '2026-06-15T09:00:00+05:30',
          arrival: '2026-06-15T12:00:00+05:30',
          tunnel_dependent: true,
          reliability_score: 0.80,
        },
      },
    ],
  });
  console.log('  Segments: 2 seeded');
  console.log('[Seed] Complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
