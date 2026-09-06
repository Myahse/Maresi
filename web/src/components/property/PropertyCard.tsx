import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, MapPin, Star } from "lucide-react";
import type { Property } from "@/types";
import { usePriceFormatter } from "@/context/CurrencyContext";
import { useAuthModal } from "@/context/AuthModalContext";
import { useFavorites } from "@/context/FavoritesContext";
import { FavoriteHeart } from "@/components/property/FavoriteHeart";
import { useHorizontalSwipe } from "@/hooks/useHorizontalSwipe";
import { cn } from "@/lib/utils";
import { listingImageUrls } from "@/lib/media";
import { displayPropertyType, isPropertyType } from "@/lib/amenities";

interface PropertyCardProps {
  property: Property;
  onToggleFavorite?: (id: string) => void;
  isFavorite?: boolean;
  /** immo-style horizontal card for landing scroll rows */
  rental?: boolean;
  /** Short row for the phone map sheet */
  compact?: boolean;
  selected?: boolean;
  className?: string;
}

export function PropertyCard({
  property,
  onToggleFavorite,
  isFavorite,
  rental = true,
  compact = false,
  selected = false,
  className,
}: PropertyCardProps) {
  const { t } = useTranslation();
  const { formatPrice } = usePriceFormatter();
  const { requireAuth } = useAuthModal();
  const favorites = useFavorites();
  const navigate = useNavigate();
  const liked = isFavorite ?? favorites.isFavorite(property.id);
  const toggleLike = () => {
    requireAuth(() => {
      if (onToggleFavorite) onToggleFavorite(property.id);
      else void favorites.toggle(property.id);
    });
  };
  const placeholder = `https://placehold.co/640x400/0D9488/white?text=${encodeURIComponent(t("propertyDetails.noImage"))}`;
  const resolved = listingImageUrls(property.images);
  const photos = resolved.length > 0 ? resolved : [placeholder];
  const [imageIndex, setImageIndex] = useState(0);
  const hasMultiple = photos.length > 1;
  const { consumeSwipe, handlers: swipeHandlers } = useHorizontalSwipe(
    (direction) => setImageIndex((index) => (index + direction + photos.length) % photos.length),
    hasMultiple
  );

  const goToDetails = () => navigate(`/properties/${property.id}`);
  const openDetailsUnlessSwipe = () => {
    if (consumeSwipe()) return;
    goToDetails();
  };

  const typeLabel =
    isPropertyType(property.property_type) || property.property_type
      ? t(`propertyTypes.${displayPropertyType(property.property_type)}`)
      : property.property_type;
  const headline = t("properties.typeInLocation", {
    type: typeLabel,
    location: property.location,
  });
  const stayPrice = t("properties.forNights", {
    price: formatPrice(property.price),
    count: 1,
  });
  const rating = Number(property.average_rating ?? 0);
  const ratingCount = Number(property.rating_count ?? 0);
  const showGuestFavorite = Boolean(property.premium_positioning) || (ratingCount > 0 && rating >= 4.8);

  const photoBlock = (
    <div
      className="relative group aspect-square w-full overflow-hidden rounded-2xl bg-muted touch-pan-y"
      {...swipeHandlers}
    >
      <div
        className="flex h-full w-full transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${imageIndex * 100}%)` }}
      >
        {photos.map((photo, idx) => (
          <div key={idx} className="min-w-full w-full h-full shrink-0">
            <img
              src={photo}
              alt={`${property.title} ${idx + 1}`}
              className="w-full h-full object-cover"
              draggable={false}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = placeholder;
              }}
            />
          </div>
        ))}
      </div>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setImageIndex((i) => (i > 0 ? i - 1 : photos.length - 1));
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white text-foreground p-1 sm:p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setImageIndex((i) => (i + 1) % photos.length);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white text-foreground p-1 sm:p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 flex gap-1">
            {photos.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  idx === imageIndex ? "bg-white w-4" : "bg-white/70 w-1.5"
                )}
              />
            ))}
          </div>
        </>
      )}

      {showGuestFavorite && (
        <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-white text-[10px] sm:text-xs font-semibold text-foreground shadow-sm">
          {t("properties.guestFavorite")}
        </span>
      )}

      <FavoriteHeart
        liked={liked}
        onToggle={toggleLike}
        className="absolute top-1.5 right-1.5 z-10 p-1 sm:top-2.5 sm:right-2.5 sm:p-1.5"
        iconClassName="h-5 w-5 sm:h-6 sm:w-6 drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]"
      />

      <span className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white shadow-sm sm:bottom-2.5 sm:left-2.5 sm:text-xs">
        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 sm:h-3.5 sm:w-3.5" />
        {ratingCount > 0 ? rating.toFixed(2) : "—"}
      </span>
    </div>
  );

  const infoBlock = (
    <div className="pt-1.5 px-0.5 sm:pt-2">
      <h3 className="font-semibold text-foreground text-xs sm:text-[15px] leading-snug line-clamp-1">{headline}</h3>
      <p className="mt-0.5 text-[11px] sm:text-[13px] text-muted-foreground truncate">{stayPrice}</p>
    </div>
  );

  const cardInner = (
    <>
      {photoBlock}
      {infoBlock}
    </>
  );

  if (compact) {
    return (
      <article
        className={cn(
          "flex gap-3 rounded-2xl border-2 bg-card overflow-hidden cursor-pointer",
          selected ? "border-brand shadow-md" : "border-border",
          className
        )}
        onClick={openDetailsUnlessSwipe}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && goToDetails()}
      >
        <img
          src={photos[0]}
          alt={property.title}
          className="h-[88px] w-[88px] shrink-0 object-cover bg-muted"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = placeholder;
          }}
        />
        <div className="min-w-0 flex-1 py-2 pr-2">
          <h3 className="font-bold text-sm text-foreground line-clamp-1">{headline}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{property.location}</span>
          </p>
          <p className="text-sm mt-1 text-muted-foreground">{stayPrice}</p>
        </div>
        <FavoriteHeart
          liked={liked}
          onToggle={toggleLike}
          className="self-start p-2"
          iconClassName="h-4 w-4"
          emptyClassName="text-muted-foreground"
        />
      </article>
    );
  }

  const cardClass = cn(
    "bg-transparent cursor-pointer",
    "w-[38vw] max-w-[148px] min-w-[128px] shrink-0 snap-start sm:w-64 sm:max-w-none sm:min-w-0 md:w-72 lg:w-[300px]",
    className
  );

  if (rental) {
    return (
      <article className={cardClass} onClick={openDetailsUnlessSwipe} role="link" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && goToDetails()}>
        {cardInner}
      </article>
    );
  }

  return (
    <Link
      to={`/properties/${property.id}`}
      className={cardClass}
      onClick={(event) => {
        if (consumeSwipe()) event.preventDefault();
      }}
    >
      {cardInner}
    </Link>
  );
}
