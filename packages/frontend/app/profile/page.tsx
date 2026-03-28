import type { TravelerProfile } from '@travel/shared';
import { Shield, Map, Settings, AlertCircle, CheckCircle2, Star, Calendar, Wallet } from 'lucide-react';
import { cn } from '../../lib/utils';

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
    { type: 'passport', number: 'P1234567', country: 'IN', expiry: '2028-11-15' },
    { type: 'visa', number: 'V987654', country: 'US', expiry: '2026-05-20' },
    { type: 'insurance', number: 'INS-2024-88765', country: 'IN', expiry: '2026-03-31' },
    { type: 'vaccination', number: 'VAC-COVID-XYZ', country: 'IN', expiry: '2027-06-01' },
  ],
  trip_history: ['trip-001', 'trip-002'],
  loyalty_tier: 'gold',
  created_at: '2023-01-15T10:00:00Z',
  updated_at: '2026-03-20T08:30:00Z',
};

const PAST_TRIPS = [
  { id: 'trip-001', destination: 'Goa, India', dates: 'Dec 20–27, 2024', purpose: 'Family', status: 'completed', rating: 4, spent: '₹85,000' },
  { id: 'trip-002', destination: 'Manali, Himachal Pradesh', dates: 'Aug 5–12, 2025', purpose: 'Adventure', status: 'completed', rating: 5, spent: '₹72,000' },
];

const DOC_META: Record<string, { label: string; icon: string }> = {
  passport: { label: 'Passport', icon: '🛂' },
  visa: { label: 'Visa', icon: '🪪' },
  insurance: { label: 'Insurance', icon: '🛡️' },
  vaccination: { label: 'Vaccination', icon: '💉' },
};

const TIER_CONFIG: Record<string, { label: string; className: string }> = {
  bronze: { label: 'Bronze', className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' },
  silver: { label: 'Silver', className: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600' },
  gold: { label: 'Gold', className: 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800' },
  platinum: { label: 'Platinum', className: 'bg-primary/10 text-primary border-primary/30' },
};

function isExpiringSoon(expiry: string): boolean {
  const d = new Date(expiry);
  const six = new Date();
  six.setMonth(six.getMonth() + 6);
  return d <= six;
}

function fmtExpiry(expiry: string): string {
  return new Date(expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ProfilePage() {
  const p = MOCK_PROFILE;
  const tier = TIER_CONFIG[p.loyalty_tier] ?? TIER_CONFIG.bronze;
  const initials = p.name.split(' ').map((n) => n[0]).join('').slice(0, 2);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Traveller Profile</h1>

      {/* Identity card */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold shrink-0 shadow-sm">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{p.name}</h2>
              <div className="text-sm text-muted-foreground mt-0.5">{p.email}</div>
              <div className="text-sm text-muted-foreground">{p.phone}</div>
            </div>
          </div>
          <span className={cn('text-sm font-semibold px-3.5 py-1.5 rounded-full border capitalize', tier.className)}>
            ★ {tier.label} Member
          </span>
        </div>

        {p.companions.length > 0 && (
          <div className="mt-5 pt-5 border-t border-border">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Companions</div>
            <div className="flex flex-wrap gap-2">
              {p.companions.map((c, i) => (
                <div key={i} className="flex items-center gap-2 bg-secondary text-secondary-foreground text-sm px-3 py-1.5 rounded-full">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground text-xs">· {c.relationship}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Document vault */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Shield className="h-4.5 w-4.5 text-primary" size={18} />
          <h2 className="text-sm font-semibold text-foreground">Document Vault</h2>
        </div>
        <div className="divide-y divide-border">
          {p.documents.map((doc, i) => {
            const expiring = isExpiringSoon(doc.expiry);
            const meta = DOC_META[doc.type] ?? { label: doc.type, icon: '📄' };
            return (
              <div key={i} className={cn('flex items-center justify-between px-6 py-4 gap-4', expiring && 'bg-warning/5')}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg shrink-0">{meta.icon}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">{meta.label}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{doc.number}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs text-muted-foreground">Country</div>
                    <div className="text-sm font-medium text-foreground">{doc.country}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Expires</div>
                    <div className={cn('text-sm font-medium', expiring ? 'text-warning' : 'text-foreground')}>{fmtExpiry(doc.expiry)}</div>
                  </div>
                  {expiring ? (
                    <div className="flex items-center gap-1 text-xs font-semibold text-warning bg-warning/15 border border-warning/25 px-2.5 py-1 rounded-full">
                      <AlertCircle className="h-3 w-3" />
                      Expiring
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-xs font-semibold text-success bg-success/10 border border-success/20 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="h-3 w-3" />
                      Valid
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Settings className="h-4.5 w-4.5 text-primary" size={18} />
          <h2 className="text-sm font-semibold text-foreground">Preferences</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Dietary</div>
              <div className="flex flex-wrap gap-2">
                {p.dietary.map((d) => (
                  <span key={d} className="text-xs font-medium bg-success/10 text-success border border-success/20 px-2.5 py-1 rounded-full">{d}</span>
                ))}
              </div>
            </div>
            {p.allergies.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Allergies</div>
                <div className="flex flex-wrap gap-2">
                  {p.allergies.map((a) => (
                    <span key={a} className="text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20 px-2.5 py-1 rounded-full">🚫 {a}</span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Activity Style</div>
              <p className="text-sm text-foreground">{p.activity_style}</p>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Room Preferences</div>
            <div className="bg-muted/30 rounded-xl border border-border divide-y divide-border">
              {Object.entries(p.room_preferences).map(([k, v]) => (
                <div key={k} className="flex justify-between items-center px-3.5 py-2.5">
                  <span className="text-xs text-muted-foreground capitalize">{k.replace('_', ' ')}</span>
                  <span className="text-xs font-semibold text-foreground">{v as string}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trip history */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Map className="h-4.5 w-4.5 text-primary" size={18} />
          <h2 className="text-sm font-semibold text-foreground">Trip History</h2>
        </div>
        <div className="divide-y divide-border">
          {PAST_TRIPS.map((trip) => (
            <div key={trip.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors gap-4">
              <div className="min-w-0">
                <div className="font-semibold text-foreground text-sm">{trip.destination}</div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{trip.dates}</span>
                  <span>· {trip.purpose}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right hidden sm:block">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5"><Wallet className="h-3 w-3" />Spent</div>
                  <div className="text-sm font-semibold text-foreground">{trip.spent}</div>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={cn('h-4 w-4', s <= trip.rating ? 'fill-warning text-warning' : 'text-border fill-transparent')} />
                  ))}
                </div>
                <span className="text-xs font-semibold text-success bg-success/10 border border-success/20 px-2.5 py-1 rounded-full capitalize">
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
