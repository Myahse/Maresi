import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  max?: number;
  size?: "sm" | "md";
  interactive?: boolean;
  onChange?: (value: number) => void;
}

export function StarRating({ value, max = 5, size = "md", interactive, onChange }: StarRatingProps) {
  const iconClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const filled = i < Math.floor(value) || (i < value && value % 1 >= 0.5);
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            className={cn(interactive && "cursor-pointer hover:scale-110 transition-transform")}
            onClick={() => interactive && onChange?.(i + 1)}
          >
            <Star
              className={cn(iconClass, filled ? "fill-yellow-400 text-yellow-400" : "text-gray-300")}
            />
          </button>
        );
      })}
    </div>
  );
}
