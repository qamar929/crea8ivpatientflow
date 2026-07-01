// Skeleton placeholders — shown instead of a blank spinner while data loads, so
// a page feels responsive immediately. Pairs with the stale-while-revalidate
// cache (peekApiCache): first-ever load shows skeletons; revisits show real,
// cached data instantly and refresh silently.

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-gray-200/70 dark:bg-white/10 ${className}`} />;
}

// A greyed-out table body approximating the real one.
export function TableSkeleton({ rows = 8, cols = 6 }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="h-3 w-20" />)}
        </div>
      </div>
      <div className="divide-y divide-gray-50 dark:divide-white/5">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="grid gap-3 px-4 py-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }).map((_, c) => <Skeleton key={c} className={`h-3 ${c === 0 ? 'w-24' : 'w-16'}`} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

// A grid of card placeholders (for stat cards / list cards).
export function CardGridSkeleton({ count = 4, className = 'grid grid-cols-2 gap-4 xl:grid-cols-4' }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <Skeleton className="mb-3 h-3 w-24" />
          <Skeleton className="h-6 w-28" />
        </div>
      ))}
    </div>
  );
}
