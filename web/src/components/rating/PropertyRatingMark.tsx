import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface PropertyRatingMarkProps {
  rating?: number | null;
  count?: number | null;
  className?: string;
}

export function PropertyRatingMark({ rating = 0, count = 0, className }: PropertyRatingMarkProps) {
  const value = Number(rating ?? 0);
  const reviews = Number(count ?? 0);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 font-semibold tabular-nums",
        className
      )}
    >
      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
      <span>{reviews > 0 ? value.toFixed(1) : "—"}</span>
    </span>
  );
}
