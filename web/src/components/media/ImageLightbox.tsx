import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useHorizontalSwipe } from "@/hooks/useHorizontalSwipe";

export function ImageLightbox({
  src,
  images,
  index = 0,
  onIndexChange,
  alt,
  open,
  onClose,
}: {
  src?: string;
  images?: string[];
  index?: number;
  onIndexChange?: (index: number) => void;
  alt: string;
  open: boolean;
  onClose: () => void;
}) {
  const photos = images && images.length > 0 ? images : src ? [src] : [];
  const safeIndex = photos.length ? Math.min(Math.max(index, 0), photos.length - 1) : 0;
  const current = photos[safeIndex] ?? src ?? "";
  const hasMultiple = photos.length > 1;

  const go = (next: number) => {
    if (!hasMultiple) return;
    const wrapped = (next + photos.length) % photos.length;
    onIndexChange?.(wrapped);
  };

  const { consumeSwipe, handlers: swipeHandlers } = useHorizontalSwipe((direction) => {
    go(safeIndex + direction);
  }, hasMultiple);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") go(safeIndex - 1);
      if (event.key === "ArrowRight") go(safeIndex + 1);
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose, safeIndex, hasMultiple, photos.length]);

  if (!open || !current) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-3 sm:p-6 touch-pan-y"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={() => {
        if (consumeSwipe()) return;
        onClose();
      }}
      {...swipeHandlers}
    >
      <button
        type="button"
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-2xl leading-none text-white hover:bg-white/25"
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>
      {hasMultiple && (
        <>
          <button
            type="button"
            className="absolute left-2 sm:left-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30"
            onClick={(event) => {
              event.stopPropagation();
              go(safeIndex - 1);
            }}
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            className="absolute right-2 sm:right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/30"
            onClick={(event) => {
              event.stopPropagation();
              go(safeIndex + 1);
            }}
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <p className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-sm text-white">
            {safeIndex + 1} / {photos.length}
          </p>
        </>
      )}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div
          className="flex h-full w-full"
          style={{ transform: `translate3d(-${safeIndex * 100}%,0,0)`, transition: "transform 300ms ease-out" }}
        >
          {photos.map((photo, idx) => (
            <div key={`${photo}-${idx}`} className="flex h-full w-full shrink-0 grow-0 basis-full items-center justify-center p-3 sm:p-6">
              <img
                src={photo}
                alt={alt}
                className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
              />
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
