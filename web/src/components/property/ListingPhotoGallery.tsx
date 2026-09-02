import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ImageLightbox } from "@/components/media/ImageLightbox";
import { cn } from "@/lib/utils";

export function ListingPhotoGallery({
  images,
  title,
  placeholder,
}: {
  images: string[];
  title: string;
  placeholder: string;
}) {
  const { t } = useTranslation();
  const photos = images.length ? images : [placeholder];
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);
  const pointerStartX = useRef<number | null>(null);
  const didSwipe = useRef(false);
  const hasMultiple = photos.length > 1;

  useEffect(() => {
    setActive(0);
  }, [photos[0]]);

  useEffect(() => {
    const selected = stripRef.current?.querySelector<HTMLElement>(`[data-thumb="${active}"]`);
    selected?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  const show = (next: number) => {
    if (!hasMultiple) return;
    setActive((next + photos.length) % photos.length);
  };

  const openIfNotSwipe = () => {
    if (didSwipe.current) {
      didSwipe.current = false;
      return;
    }
    setOpen(true);
  };

  return (
    <div className="mb-6 min-w-0">
      <div
        className="group relative mb-3 aspect-video touch-pan-y overflow-hidden rounded-2xl border-2 border-border bg-muted shadow-sm sm:rounded-3xl"
        onPointerDown={(event) => {
          pointerStartX.current = event.clientX;
          didSwipe.current = false;
        }}
        onPointerMove={(event) => {
          if (pointerStartX.current == null) return;
          if (Math.abs(event.clientX - pointerStartX.current) > 36) didSwipe.current = true;
        }}
        onPointerUp={(event) => {
          const start = pointerStartX.current;
          pointerStartX.current = null;
          if (start == null || !hasMultiple || !didSwipe.current) return;
          const dx = event.clientX - start;
          if (Math.abs(dx) > 36) show(dx < 0 ? active + 1 : active - 1);
        }}
        onPointerCancel={() => {
          pointerStartX.current = null;
        }}
      >
        <div
          className="flex h-full w-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {photos.map((photo, idx) => (
            <button
              key={`${photo}-${idx}`}
              type="button"
              className="relative h-full min-w-full shrink-0"
              onClick={openIfNotSwipe}
              aria-label={t("propertyDetails.enlargePhoto")}
            >
              <img
                src={photo}
                alt={`${title} ${idx + 1}`}
                className="h-full w-full object-cover"
                draggable={false}
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = placeholder;
                }}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/80"
          onClick={() => setOpen(true)}
        >
          <Expand className="h-3.5 w-3.5" />
          {t("propertyDetails.enlargePhoto")}
        </button>

        {hasMultiple && (
          <>
            <button
              type="button"
              className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              onClick={() => show(active - 1)}
              aria-label={t("propertyDetails.prevPhoto")}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              onClick={() => show(active + 1)}
              aria-label={t("propertyDetails.nextPhoto")}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <p className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
              {active + 1} / {photos.length}
            </p>
          </>
        )}
      </div>

      {hasMultiple && (
        <div
          ref={stripRef}
          className="flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin] touch-pan-x"
        >
          {photos.map((img, idx) => (
            <button
              key={`${img}-thumb-${idx}`}
              type="button"
              data-thumb={idx}
              onClick={() => setActive(idx)}
              onDoubleClick={() => {
                setActive(idx);
                setOpen(true);
              }}
              className={cn(
                "h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 bg-muted transition-colors",
                idx === active ? "border-brand ring-2 ring-brand/30" : "border-border"
              )}
              aria-label={t("propertyDetails.photoN", { n: idx + 1 })}
            >
              <img src={img} alt="" className="h-full w-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      )}

      <ImageLightbox
        open={open}
        images={photos}
        index={active}
        onIndexChange={setActive}
        alt={title}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
