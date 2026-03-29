'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Navigation, Info, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
// We use dynamic import for the map to prevent SSR issues with Leaflet
import dynamic from 'next/dynamic';

const DynamicMap = dynamic<any>(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center rounded-xl animate-pulse">
      <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
    </div>
  )
});

interface LocationResult {
  id: string;
  name: string;
  type: string;
  coordinates: { lat: number; lng: number };
  neighborhoods: string[];
  highlights: string[];
  image: string;
}

interface DestinationSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function DestinationSelector({ value, onChange, className }: DestinationSelectorProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationResult | null>(null);
  
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when typing outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync incoming value
  useEffect(() => {
    if (value && value !== query) {
      setQuery(value);
    }
  }, [value]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/locations/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setIsOpen(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (loc: LocationResult) => {
    setSelectedLocation(loc);
    setQuery(loc.name);
    onChange(loc.name);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative", className)} ref={wrapperRef}>
      <div className="relative group">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Where are you going?"
          className="w-full bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-12 py-4 text-lg focus:outline-none focus:border-primary/50 transition-all placeholder:text-slate-300 shadow-sm"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-16 left-0 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl z-50 overflow-hidden transform opacity-100 translate-y-0 transition-all max-h-[400px] overflow-y-auto">
          <div className="p-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 py-2">
              Destinations
            </div>
            {results.map((loc) => (
              <button
                key={loc.id}
                type="button"
                onClick={() => handleSelect(loc)}
                className="w-full flex items-center gap-4 px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 dark:text-white truncate">{loc.name}</div>
                  <div className="text-xs text-slate-500 truncate flex gap-2">
                    {loc.neighborhoods.slice(0, 3).join(', ')}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedLocation && (
        <div className="mt-6 flex flex-col md:flex-row gap-4 animate-fade-in bg-white/50 dark:bg-slate-950/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
          <div className="w-full md:w-1/2 h-64 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative shadow-sm">
            <DynamicMap 
              lat={selectedLocation.coordinates.lat} 
              lng={selectedLocation.coordinates.lng} 
              name={selectedLocation.name}
            />
          </div>
          <div className="w-full md:w-1/2 space-y-4">
             <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-1.5">
                  <Navigation className="h-3.5 w-3.5" /> Major Neighborhoods
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedLocation.neighborhoods.map(n => (
                    <span key={n} className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-md text-slate-700 dark:text-slate-300 font-medium">
                      {n}
                    </span>
                  ))}
                </div>
             </div>
             <div className="bg-purple-500/5 border border-purple-500/10 rounded-2xl p-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-purple-600 mb-2 flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" /> Ongoing Events & Context
                </h4>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  {selectedLocation.highlights.map(h => (
                    <li key={h} className="flex gap-2 items-start"><span className="text-purple-400 mt-0.5">•</span> {h}</li>
                  ))}
                </ul>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
