export function PropertyCardSkeleton() {
  return (
    <div className="w-[62vw] max-w-[240px] min-w-[196px] shrink-0 snap-start sm:w-72 sm:max-w-none sm:min-w-0 md:w-80 lg:w-[340px] animate-pulse">
      <div className="aspect-[4/5] rounded-2xl bg-gray-200" />
      <div className="pt-2 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    </div>
  );
}
