import { Loader2 } from 'lucide-react';

export default function TripLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-4">
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-10 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded"></div>
      </div>

      {/* Budget Skeleton */}
      <div className="bg-card rounded-xl border border-border p-5 mb-6">
        <div className="flex justify-between mb-4">
          <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
        </div>
        <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full mb-4"></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
        </div>
      </div>

      {/* Itinerary Skeleton */}
      <div className="space-y-3">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-4"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 w-full bg-slate-200 dark:bg-slate-800 rounded-xl border border-border"></div>
        ))}
      </div>

      <div className="flex flex-col items-center justify-center pt-8 text-primary">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <span className="text-sm font-semibold tracking-wide uppercase opacity-70">Synthesizing Trip Details...</span>
      </div>
    </div>
  );
}
