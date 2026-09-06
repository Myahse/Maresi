import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export function FavoriteHeart({
  liked,
  onToggle,
  className,
  iconClassName,
  emptyClassName = "text-white",
}: {
  liked: boolean;
  onToggle: () => void;
  className?: string;
  iconClassName?: string;
  emptyClassName?: string;
}) {
  const [beat, setBeat] = useState(false);
  const wasLiked = useRef(liked);

  useEffect(() => {
    if (liked && !wasLiked.current) setBeat(true);
    wasLiked.current = liked;
  }, [liked]);

  return (
    <button
      type="button"
      className={className}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      aria-label={liked ? "Remove favorite" : "Add favorite"}
    >
      <Heart
        className={cn(
          iconClassName,
          liked ? "fill-pink-500 text-pink-500" : emptyClassName,
          beat && "animate-heart-beat"
        )}
        onAnimationEnd={() => setBeat(false)}
      />
    </button>
  );
}
