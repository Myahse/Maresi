export function PropertyCardSkeleton() {
  return (
    <div className="w-full sm:w-72 md:w-80 lg:w-[340px] bg-white rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-gray-200 animate-pulse">
      <div className="h-48 sm:h-52 md:h-56 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
        <div className="h-5 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}
