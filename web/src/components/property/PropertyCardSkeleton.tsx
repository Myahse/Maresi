export function PropertyCardSkeleton() {
  return (
    <div className="w-[62vw] max-w-[240px] min-w-[196px] shrink-0 snap-start sm:w-72 sm:max-w-none sm:min-w-0 md:w-80 lg:w-[340px] bg-muted rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-border animate-pulse">
      <div className="relative aspect-[4/5] bg-gray-200">
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent pt-16 px-3 pb-3 space-y-2">
          <div className="h-4 bg-white/30 rounded w-3/4" />
          <div className="h-3 bg-white/20 rounded w-1/2" />
          <div className="h-5 bg-white/30 rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}
