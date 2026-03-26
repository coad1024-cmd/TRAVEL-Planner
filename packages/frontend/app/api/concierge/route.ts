import { NextRequest, NextResponse } from 'next/server';

const MOCK_RESPONSES = [
  "Here are 3 vegetarian restaurants near you in Pahalgam: 1) **Wangnoo Dhaba** (0.3 km) — home-style Kashmiri thali, very popular with locals. 2) **Lidder View Restaurant** (0.5 km) — excellent Kashmiri Wazwan with a view of the Lidder river. 3) **Mama's Kitchen** (0.8 km) — cozy spot serving traditional Dum Aloo and Kashmiri Saag.",
  "The weather today in Pahalgam is partly cloudy with 15°C. Light showers are expected after 3 PM. I recommend carrying a rain jacket if you plan to visit Betaab Valley. The snow point at Chandanwari is accessible but may be slippery — wear sturdy shoes.",
  "For Betaab Valley, the jeep stand is near the Pahalgam bus stand. A shared jeep costs around ₹100-150 per person, or you can hire a private jeep for ₹400-500 return. The valley is about 15 km from Pahalgam town.",
  "Your nearest hospital is District Hospital Pahalgam, about 4.5 km away. For emergencies, call 01936-243220. There is also a pharmacy at the main market open until 9 PM. For altitude sickness, Diamox is available — consult a doctor before use above 3000m.",
  "The Gulmarg Gondola tickets can be purchased online at jammukashmirtourism.com or at the gondola counter. Phase 1 (Gulmarg to Kongdoori) costs ₹800/person, Phase 2 (Kongdoori to Apharwat Peak) costs ₹1000/person. Arrive early as queues can be long on weekends.",
];

let responseIndex = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message: string = body.message || '';

    // Simple keyword matching for more relevant responses
    let response: string;
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes('restaurant') || lowerMsg.includes('food') || lowerMsg.includes('eat') || lowerMsg.includes('vegetarian')) {
      response = MOCK_RESPONSES[0];
    } else if (lowerMsg.includes('weather') || lowerMsg.includes('rain') || lowerMsg.includes('temperature')) {
      response = MOCK_RESPONSES[1];
    } else if (lowerMsg.includes('betaab') || lowerMsg.includes('jeep') || lowerMsg.includes('valley')) {
      response = MOCK_RESPONSES[2];
    } else if (lowerMsg.includes('hospital') || lowerMsg.includes('emergency') || lowerMsg.includes('medical') || lowerMsg.includes('sick')) {
      response = MOCK_RESPONSES[3];
    } else if (lowerMsg.includes('gulmarg') || lowerMsg.includes('gondola') || lowerMsg.includes('ticket')) {
      response = MOCK_RESPONSES[4];
    } else {
      // Rotate through responses for general queries
      response = MOCK_RESPONSES[responseIndex % MOCK_RESPONSES.length];
      responseIndex++;
    }

    return NextResponse.json({ response });
  } catch {
    return NextResponse.json(
      { response: 'I encountered an issue. Please try again.' },
      { status: 200 }
    );
  }
}
