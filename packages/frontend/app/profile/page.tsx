'use client';

import { useState, useEffect } from 'react';
import type { TravelerProfile } from '@travel/shared';
import { Shield, Map, Settings, AlertCircle, CheckCircle2, Star, Calendar, Wallet, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import Link from 'next/link';

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
  const [profile, setProfile] = useState<TravelerProfile | null>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/profile').then(r => r.json()),
      fetch('/api/trips').then(r => r.json())
    ]).then(([pData, tData]) => {
      setProfile(pData);
      setTrips(tData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="text-muted-foreground font-medium">Syncing profile data...</p>
    </div>
  );

  if (!profile) return <div>Failed to load profile.</div>;

  const p = profile;
  const tier = TIER_CONFIG[p.loyalty_tier] ?? TIER_CONFIG.bronze;
  const initials = p.name ? p.name.split(' ').map((n) => n[0]).join('').slice(0, 2) : 'TR';

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Traveller Profile</h1>

      {/* Identity card */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold shrink-0 shadow-sm transition-transform hover:scale-105">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{p.name}</h2>
              <div className="text-sm text-muted-foreground mt-0.5">{p.email}</div>
              <div className="text-sm text-muted-foreground">{p.phone}</div>
            </div>
          </div>
          <span className={cn('text-sm font-semibold px-3.5 py-1.5 rounded-full border capitalize shadow-sm', tier.className)}>
            ★ {tier.label} Member
          </span>
        </div>

        {p.companions?.length > 0 && (
          <div className="mt-5 pt-5 border-t border-border">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Companions</div>
            <div className="flex flex-wrap gap-2">
              {p.companions.map((c, i) => (
                <div key={i} className="flex items-center gap-2 bg-secondary text-secondary-foreground text-sm px-3 py-1.5 rounded-full hover:bg-secondary/80 transition-colors">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground text-xs">· {c.relationship}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Document vault */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2 bg-muted/20">
          <Shield className="h-4.5 w-4.5 text-primary" size={18} />
          <h2 className="text-sm font-semibold text-foreground">Document Vault</h2>
        </div>
        <div className="divide-y divide-border">
          {p.documents?.map((doc, i) => {
            const expiring = isExpiringSoon(doc.expiry);
            const meta = DOC_META[doc.type] ?? { label: doc.type, icon: '📄' };
            return (
              <div key={i} className={cn('flex items-center justify-between px-6 py-4 gap-4 transition-colors hover:bg-muted/10', expiring && 'bg-warning/5')}>
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
                    <div className="flex items-center gap-1 text-xs font-semibold text-warning bg-warning/15 border border-warning/25 px-2.5 py-1 rounded-full animate-pulse">
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
          {(!p.documents || p.documents.length === 0) && (
            <div className="px-6 py-12 text-center text-muted-foreground text-sm">
              No documents securely stored yet.
            </div>
          )}
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2 bg-muted/20">
          <Settings className="h-4.5 w-4.5 text-primary" size={18} />
          <h2 className="text-sm font-semibold text-foreground">Preferences</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Dietary</div>
              <div className="flex flex-wrap gap-2">
                {p.dietary?.map((d) => (
                  <span key={d} className="text-xs font-medium bg-success/10 text-success border border-success/20 px-2.5 py-1 rounded-full capitalize">{d}</span>
                ))}
              </div>
            </div>
            {p.allergies?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Allergies</div>
                <div className="flex flex-wrap gap-2">
                  {p.allergies.map((a) => (
                    <span key={a} className="text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20 px-2.5 py-1 rounded-full capitalize">🚫 {a}</span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Activity Style</div>
              <p className="text-sm text-foreground capitalize">{p.activity_style}</p>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Room Preferences</div>
            <div className="bg-muted/30 rounded-xl border border-border divide-y divide-border">
              {Object.entries(p.room_preferences || {}).map(([k, v]) => (
                <div key={k} className="flex justify-between items-center px-3.5 py-2.5">
                  <span className="text-xs text-muted-foreground capitalize">{k.replace('_', ' ')}</span>
                  <span className="text-xs font-semibold text-foreground">{v as string}</span>
                </div>
              ))}
              {Object.keys(p.room_preferences || {}).length === 0 && (
                <div className="px-3.5 py-4 text-center text-xs text-muted-foreground">Standard settings</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trip history */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2 bg-muted/20">
          <Map className="h-4.5 w-4.5 text-primary" size={18} />
          <h2 className="text-sm font-semibold text-foreground">Trip History</h2>
        </div>
        <div className="divide-y divide-border">
          {trips.map((trip) => {
            const m = trip.metadata;
            const status = trip.state || 'planned';
            const spent = trip.itinerary?.items?.reduce((sum: number, item: any) => sum + (item.price?.amount || 0), 0) || 0;
            const currency = trip.itinerary?.items?.[0]?.price?.currency || 'INR';

            return (
              <Link
                key={trip.trip_id}
                href={`/trips/${trip.trip_id}${status === 'active' ? '/active' : ''}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-all gap-4 group"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">{m.destination}</div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(m.dates?.start).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} – {new Date(m.dates?.end).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="capitalize">· {m.purpose}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5 justify-end">
                      <Wallet className="h-3 w-3" />
                      Est. Spent
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {spent > 0 ? `${currency === 'INR' ? '₹' : '$'}${spent.toLocaleString('en-IN')}` : '–'}
                    </div>
                  </div>
                  <span className={cn(
                    'text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border tracking-tight',
                    status === 'active' ? 'bg-primary/10 text-primary border-primary/20' :
                    status === 'completed' ? 'bg-success/10 text-success border-success/20' :
                    'bg-muted text-muted-foreground border-border'
                  )}>
                    {status}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            );
          })}
          {trips.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground mb-4">You haven't planned any trips yet.</p>
              <Link href="/" className="text-sm font-bold text-primary hover:underline">Start planning your first journey →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChevronRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

