import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.toLowerCase() || '';

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Realistic mock data for the Airbnb-style destination experience
  const MOCK_LOCATIONS = [
    {
      id: 'loc_paris',
      name: 'Paris, France',
      type: 'City',
      coordinates: { lat: 48.8566, lng: 2.3522 },
      neighborhoods: ['Le Marais', 'Montmartre', 'Saint-Germain-des-Prés', 'Latin Quarter'],
      highlights: ['Summer Olympics 2024 Legacy Tours', 'Bastille Day Preparations', 'Seine Evening Cruises'],
      image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'loc_pahalgam',
      name: 'Pahalgam, Jammu & Kashmir',
      type: 'Region',
      coordinates: { lat: 34.0161, lng: 75.3147 },
      neighborhoods: ['Lidder Valley', 'Betaab Valley', 'Aru Valley', 'Baisaran'],
      highlights: ['Tulip blooming season', 'Amarnath Yatra registration open', 'Trout fishing festival'],
      image: 'https://images.unsplash.com/photo-1595844781442-8c9df1fb8094?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'loc_tokyo',
      name: 'Tokyo, Japan',
      type: 'City',
      coordinates: { lat: 35.6762, lng: 139.6503 },
      neighborhoods: ['Shibuya', 'Shinjuku', 'Akihabara', 'Ginza'],
      highlights: ['Cherry Blossom Forecasts', 'Sumo Spring Tournament', 'AnimeJapan 2026 prep'],
      image: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 'loc_nyc',
      name: 'New York City, USA',
      type: 'City',
      coordinates: { lat: 40.7128, lng: -74.0060 },
      neighborhoods: ['Manhattan', 'Brooklyn', 'Queens', 'Williamsburg'],
      highlights: ['Broadway Spring Openings', 'Tribeca Film Festival', 'Central Park in Bloom'],
      image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=400&q=80'
    }
  ];

  const results = MOCK_LOCATIONS.filter(
    loc => loc.name.toLowerCase().includes(q) || loc.neighborhoods.some(n => n.toLowerCase().includes(q))
  );

  return NextResponse.json({ results });
}
