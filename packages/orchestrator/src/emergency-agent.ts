/**
 * Emergency Agent — crisis response.
 * Always provides information FIRST, asks questions after.
 * Has authority to send CRITICAL notifications without RM approval.
 * Speed saves lives.
 */
import Anthropic from '@anthropic-ai/sdk';
import { callMcpTool } from './mcp-client.js';

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EMERGENCY_SYSTEM = `You handle travel emergencies. ALWAYS provide immediate help FIRST.
Structure your response:
1. IMMEDIATE ACTIONS (numbered list — do these right now)
2. Key contacts (phone numbers)
3. Next steps

Keep it concise. The traveler is in distress. No filler words.
Use ⚠️ for warnings, 🚨 for critical actions, ☎️ before phone numbers.`;

type EmergencyType = 'medical' | 'lost_document' | 'natural_disaster' | 'security' | 'unknown';

function classifyEmergency(message: string): EmergencyType {
  const msg = message.toLowerCase();
  if (/medical|hospital|doctor|hurt|injured|sick|altitude|chest pain|breathing/.test(msg)) return 'medical';
  if (/passport|lost document|stolen document|visa|immigration/.test(msg)) return 'lost_document';
  if (/earthquake|flood|avalanche|landslide|disaster|evacuat/.test(msg)) return 'natural_disaster';
  if (/attack|robbery|theft|stolen|assault|unsafe|danger|threat/.test(msg)) return 'security';
  return 'unknown';
}

export async function handleEmergencyQuery(
  message: string,
  context: {
    gps?: { lat: number; lng: number };
    travelerPhone?: string;
    tripId?: string;
  },
): Promise<string> {
  const emergencyType = classifyEmergency(message);
  const { gps } = context;
  const lat = gps?.lat ?? 34.0161; // Pahalgam default
  const lng = gps?.lng ?? 75.3150;
  const locationStr = `${lat},${lng}`;

  // Fetch relevant data in parallel based on emergency type
  const [hospitals, emergencyNumbers, evacRoutes] = await Promise.all([
    callMcpTool('mcp-safety', 'get_nearby_hospitals', {
      lat,
      lng,
      radius_km: 100,
      max_results: 3,
    }).catch(() => ({ hospitals: [] })),

    callMcpTool('mcp-emergency', 'get_emergency_numbers', {
      country_code: 'IN',
    }).catch(() => ({ police: '100', ambulance: '108', fire: '101' })),

    emergencyType === 'natural_disaster' || emergencyType === 'security'
      ? callMcpTool('mcp-emergency', 'get_evacuation_routes', {
          lat,
          lng,
        }).catch(() => ({ safe_zones: [] }))
      : Promise.resolve(null),
  ]);

  // For medical: also get routing to nearest hospital
  let hospitalRoute = null;
  if (emergencyType === 'medical') {
    const nearestHospital = (hospitals as { hospitals?: Array<{ location?: { name?: string } }> })?.hospitals?.[0];
    if (nearestHospital?.location?.name) {
      hospitalRoute = await callMcpTool('mcp-routing', 'get_route', {
        origin: locationStr,
        destination: nearestHospital.location.name,
        mode: 'driving',
      }).catch(() => null);
    }
  }

  // For lost passport: get embassy info
  let embassyInfo = null;
  if (emergencyType === 'lost_document') {
    // Get Indian embassy info (for foreign nationals); for Indian nationals, get local authorities
    embassyInfo = await callMcpTool('mcp-emergency', 'get_embassy', {
      country_code: 'IN',
    }).catch(() => null);
  }

  // Send CRITICAL notifications immediately (no RM approval needed)
  try {
    await callMcpTool('mcp-notifications', 'send_push', {
      title: '🚨 Emergency Response Active',
      body: `Emergency agent responding to: ${message.slice(0, 80)}`,
      urgency: 'critical',
    });

    if (context.travelerPhone) {
      await callMcpTool('mcp-notifications', 'send_sms', {
        phone: context.travelerPhone,
        message: `TRAVEL EMERGENCY: Help is coordinating. ☎️ Ambulance: 108 | Police: 100`,
      });
    }
  } catch {
    // Notification failures don't block emergency response
  }

  // Build Claude prompt with all available data
  const dataContext = {
    emergency_type: emergencyType,
    location: locationStr,
    hospitals,
    emergency_numbers: emergencyNumbers,
    hospital_route: hospitalRoute,
    evacuation_routes: evacRoutes,
    embassy: embassyInfo,
  };

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: EMERGENCY_SYSTEM,
    messages: [{
      role: 'user',
      content: `Emergency: "${message}"
Type: ${emergencyType}
Location: Pahalgam, J&K (or GPS: ${locationStr})
Available data: ${JSON.stringify(dataContext)}`,
    }],
  });

  return response.content[0].type === 'text'
    ? response.content[0].text
    : `🚨 Emergency detected. Call 108 (ambulance) or 100 (police) immediately.`;
}

/**
 * Test scenarios from the acceptance criteria:
 * 1. Medical emergency at Chandanwari → PHC Pahalgam + SKIMS Srinagar + emergency numbers
 * 2. Lost passport in Srinagar → embassy + police FIR procedure
 */
export async function testMedicalEmergency(): Promise<void> {
  console.log('\n[Emergency Test] Medical emergency at Chandanwari...');
  const response = await handleEmergencyQuery(
    'I feel very dizzy and short of breath at Chandanwari glacier. I think I have altitude sickness.',
    { gps: { lat: 34.0432, lng: 75.2889 }, tripId: 'test' }, // Chandanwari coords
  );
  console.log('Response:', response);
}

export async function testLostPassport(): Promise<void> {
  console.log('\n[Emergency Test] Lost passport in Srinagar...');
  const response = await handleEmergencyQuery(
    "My passport was stolen from our hotel room in Srinagar. I don't know what to do.",
    { gps: { lat: 34.0837, lng: 74.7973 }, tripId: 'test' }, // Srinagar coords
  );
  console.log('Response:', response);
}
