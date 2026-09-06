export function PropertyCardSkeleton() {
  return (
    <div className="w-[38vw] max-w-[148px] min-w-[128px] shrink-0 snap-start sm:w-64 sm:max-w-none sm:min-w-0 md:w-72 lg:w-[300px] animate-pulse">
      <div className="aspect-square rounded-2xl bg-gray-200" />
      <div className="pt-1.5 space-y-2 sm:pt-2">
        <div className="h-3 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    </div>
  );
}
