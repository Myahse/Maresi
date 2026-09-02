export function PropertyCardSkeleton() {
  return (
    <div className="w-[62vw] max-w-[240px] min-w-[196px] shrink-0 snap-start sm:w-72 sm:max-w-none sm:min-w-0 md:w-80 lg:w-[340px] bg-card rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-border animate-pulse">
      <div className="h-32 sm:h-52 md:h-56 bg-gray-200" />
      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-5 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}
