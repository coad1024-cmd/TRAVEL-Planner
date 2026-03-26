import type { TravelerProfile } from '@travel/shared';

const MOCK_PROFILE: TravelerProfile = {
  id: 'traveler-001',
  name: 'Arjun Sharma',
  email: 'arjun.sharma@email.com',
  phone: '+91 98765 43210',
  dietary: ['Vegetarian', 'No Onion-Garlic'],
  allergies: ['Peanuts', 'Shellfish'],
  room_preferences: {
    bed_type: 'King',
    floor: 'High floor',
    view: 'Mountain view',
    temperature: 'Cool (20-22°C)',
  },
  activity_style: 'Moderate — enjoys scenic hikes and cultural experiences',
  budget_comfort_zone: {
    min: { amount: 50000, currency: 'INR' },
    max: { amount: 200000, currency: 'INR' },
  },
  companions: [
    {
      name: 'Priya Sharma',
      relationship: 'Spouse',
      preferences: { dietary: 'Vegetarian', activity: 'relaxed' },
    },
  ],
  documents: [
    {
      type: 'passport',
      number: 'P1234567',
      country: 'IN',
      expiry: '2028-11-15',
    },
    {
      type: 'visa',
      number: 'V987654',
      country: 'US',
      expiry: '2026-05-20',
    },
    {
      type: 'insurance',
      number: 'INS-2024-88765',
      country: 'IN',
      expiry: '2026-03-31',
    },
    {
      type: 'vaccination',
      number: 'VAC-COVID-XYZ',
      country: 'IN',
      expiry: '2027-06-01',
    },
  ],
  trip_history: ['trip-001', 'trip-002'],
  loyalty_tier: 'gold',
  created_at: '2023-01-15T10:00:00Z',
  updated_at: '2026-03-20T08:30:00Z',
};

const PAST_TRIPS = [
  {
    id: 'trip-001',
    destination: 'Goa, India',
    dates: 'Dec 20 – Dec 27, 2024',
    purpose: 'Family',
    status: 'completed',
    rating: 4,
    spent: '₹85,000',
  },
  {
    id: 'trip-002',
    destination: 'Manali, Himachal Pradesh',
    dates: 'Aug 5 – Aug 12, 2025',
    purpose: 'Adventure',
    status: 'completed',
    rating: 5,
    spent: '₹72,000',
  },
];

function isExpiringWithin6Months(expiry: string): boolean {
  const expiryDate = new Date(expiry);
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
  return expiryDate <= sixMonthsFromNow;
}

function formatExpiry(expiry: string): string {
  return new Date(expiry).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const TIER_STYLES = {
  bronze: 'bg-orange-100 text-orange-700 border border-orange-200',
  silver: 'bg-gray-100 text-gray-600 border border-gray-300',
  gold: 'bg-yellow-100 text-yellow-700 border border-yellow-300',
  platinum: 'bg-indigo-100 text-indigo-700 border border-indigo-300',
};

const DOC_TYPE_LABELS = {
  passport: '🛂 Passport',
  visa: '🪪 Visa',
  insurance: '🛡️ Insurance',
  vaccination: '💉 Vaccination',
};

export default function ProfilePage() {
  const profile = MOCK_PROFILE;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Traveler Profile</h1>

      {/* Profile Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {profile.name.charAt(0)}
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{profile.name}</div>
              <div className="text-sm text-gray-500 mt-0.5">{profile.email}</div>
              <div className="text-sm text-gray-500">{profile.phone}</div>
            </div>
          </div>
          <span
            className={`text-sm font-semibold px-3 py-1 rounded-full capitalize ${TIER_STYLES[profile.loyalty_tier]}`}
          >
            {profile.loyalty_tier} Member
          </span>
        </div>

        {profile.companions.length > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <div className="text-sm font-medium text-gray-700 mb-2">Companions</div>
            <div className="flex flex-wrap gap-2">
              {profile.companions.map((c, i) => (
                <div key={i} className="text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full">
                  {c.name} <span className="text-indigo-400">·</span> {c.relationship}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Document Vault */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>🗄️</span> Document Vault
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">Type</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">Number</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">Country</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">Expiry</th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {profile.documents.map((doc, i) => {
                const expiring = isExpiringWithin6Months(doc.expiry);
                return (
                  <tr key={i} className={expiring ? 'bg-yellow-50' : ''}>
                    <td className="py-3 font-medium text-gray-900">
                      {DOC_TYPE_LABELS[doc.type]}
                    </td>
                    <td className="py-3 text-gray-600 font-mono text-xs">{doc.number}</td>
                    <td className="py-3 text-gray-600">{doc.country}</td>
                    <td className={`py-3 font-medium ${expiring ? 'text-yellow-700' : 'text-gray-700'}`}>
                      {formatExpiry(doc.expiry)}
                    </td>
                    <td className="py-3">
                      {expiring ? (
                        <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full font-medium">
                          ⚠️ Expiring Soon
                        </span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          Valid
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>⚙️</span> Preferences
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Dietary</div>
            <div className="flex flex-wrap gap-2">
              {profile.dietary.map((d) => (
                <span key={d} className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                  {d}
                </span>
              ))}
            </div>
            {profile.allergies.length > 0 && (
              <div className="mt-3">
                <div className="text-sm font-medium text-gray-700 mb-2">Allergies</div>
                <div className="flex flex-wrap gap-2">
                  {profile.allergies.map((a) => (
                    <span key={a} className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
                      🚫 {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Activity Style</div>
            <div className="text-sm text-gray-600">{profile.activity_style}</div>

            <div className="mt-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Room Preferences</div>
              <div className="space-y-1">
                {Object.entries(profile.room_preferences).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-gray-500 capitalize">{k.replace('_', ' ')}</span>
                    <span className="text-gray-700 font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trip History */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span>🗺️</span> Trip History
        </h2>
        <div className="space-y-3">
          {PAST_TRIPS.map((trip) => (
            <div
              key={trip.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-indigo-50 hover:border-indigo-100 transition-colors"
            >
              <div>
                <div className="font-semibold text-gray-900">{trip.destination}</div>
                <div className="text-xs text-gray-500 mt-0.5">{trip.dates} · {trip.purpose}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-700">{trip.spent}</div>
                  <div className="flex gap-0.5 justify-end mt-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} className={`text-xs ${s <= trip.rating ? 'text-yellow-400' : 'text-gray-200'}`}>
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium capitalize">
                  {trip.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
