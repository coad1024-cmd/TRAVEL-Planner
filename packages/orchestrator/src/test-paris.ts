import { orchestrateTrip } from './synthesizer.js';

async function test() {
  console.log('Testing trip orchestration for Paris...');
  try {
    const result = await orchestrateTrip({
      id: 'test-paris-' + Date.now(),
      traveler_id: 'user-123',
      destination: 'Paris, France',
      dates: {
        start: '2026-07-10',
        end: '2026-07-15'
      },
      budget: {
        amount: 5000,
        currency: 'EUR'
      },
      party_size: 2,
      purpose: 'group',
      preferences: {
        activity_level: 'moderate',
        must_include: ['Eiffel Tower', 'Louvre'],
        avoid: ['crowded areas']
      }
    });
    console.log('Orchestration SUCCESS!');
    console.log('Itinerary days:', result.itinerary.length);
    console.log('Budget used:', result.budget.percent_used.toFixed(1) + '%');
  } catch (err) {
    console.error('Orchestration FAILED:');
    console.error(err);
  }
}

test();
