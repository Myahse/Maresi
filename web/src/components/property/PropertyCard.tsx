import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Heart, MapPin, ChevronLeft, ChevronRight, BedDouble, Users } from "lucide-react";
import type { Property } from "@/types";
import { usePriceFormatter } from "@/context/CurrencyContext";
import { PropertyRatingMark } from "@/components/rating/PropertyRatingMark";
import { cn } from "@/lib/utils";
import { listingImageUrls } from "@/lib/media";
import { isPropertyType, normalizeAmenities } from "@/lib/amenities";

interface PropertyCardProps {
  property: Property;
  onToggleFavorite?: (id: string) => void;
  isFavorite?: boolean;
  /** immo-style horizontal card for landing scroll rows */
  rental?: boolean;
  className?: string;
}

export function PropertyCard({
  property,
  onToggleFavorite,
  isFavorite,
  rental = true,
  className,
}: PropertyCardProps) {
  const { t } = useTranslation();
  const { formatPrice } = usePriceFormatter();
  const navigate = useNavigate();
  const placeholder = `https://placehold.co/640x400/0D9488/white?text=${encodeURIComponent(t("propertyDetails.noImage"))}`;
  const resolved = listingImageUrls(property.images);
  const photos = resolved.length > 0 ? resolved : [placeholder];
  const [imageIndex, setImageIndex] = useState(0);
  const hasMultiple = photos.length > 1;

  const goToDetails = () => navigate(`/properties/${property.id}`);
  const amenityIds = normalizeAmenities(property.amenities);

  const cardInner = (
    <>
      <div className="relative group w-full overflow-hidden">
        <div
          className="flex w-full transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${imageIndex * 100}%)` }}
        >
          {photos.map((photo, idx) => (
            <div key={idx} className="min-w-full w-full shrink-0">
              <img
                src={photo}
                alt={`${property.title} ${idx + 1}`}
                className="w-full h-48 sm:h-52 md:h-56 object-cover bg-muted"
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
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
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
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              aria-label="Next"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {photos.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    idx === imageIndex ? "bg-white w-5" : "bg-white/60 w-1.5"
                  )}
                />
              ))}
            </div>
          </>
        )}

        {onToggleFavorite && (
          <button
            type="button"
            className="absolute top-2 right-2 p-2 rounded-full bg-black/30 hover:bg-black/40 backdrop-blur-sm transition-transform hover:scale-110"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(property.id);
            }}
            aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
          >
            <Heart
              className={cn(
                "h-5 w-5 transition-colors",
                isFavorite ? "fill-pink-500 text-pink-500" : "text-white"
              )}
            />
          </button>
        )}

        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-card/90 text-[10px] sm:text-xs font-semibold text-foreground capitalize">
          {isPropertyType(property.property_type)
            ? t(`propertyTypes.${property.property_type}`)
            : property.property_type}
        </span>
        {property.premium_positioning && (
          <span className="absolute top-2 left-2 mt-6 px-2 py-0.5 rounded-full bg-amber-500 text-[10px] sm:text-xs font-bold text-white">
            {t("properties.premium")}
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-bold text-foreground text-base sm:text-lg mb-1 flex items-start gap-2">
          <PropertyRatingMark
            rating={property.average_rating}
            count={property.rating_count}
            className="mt-0.5 text-sm"
          />
          <span className="line-clamp-2">{property.title}</span>
        </h3>
        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{property.location}</span>
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mb-2">
          {property.bedrooms != null && property.bedrooms > 0 && (
            <span className="inline-flex items-center gap-1">
              <BedDouble className="h-3.5 w-3.5" />
              {t("common.rooms", { count: property.bedrooms })}
            </span>
          )}
          {property.max_guests != null && property.max_guests > 0 && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {t("common.guests", { count: property.max_guests })}
            </span>
          )}
        </p>
        {amenityIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {amenityIds.slice(0, 3).map((id) => (
              <span
                key={id}
                className="px-2 py-0.5 rounded-full bg-muted text-[11px] font-medium text-foreground"
              >
                {t(`amenities.${id}`)}
              </span>
            ))}
            {amenityIds.length > 3 && (
              <span className="px-2 py-0.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                +{amenityIds.length - 3}
              </span>
            )}
          </div>
        )}
        <p className="text-brand font-bold text-lg">
          {formatPrice(property.price)}
          <span className="text-muted-foreground font-normal text-sm"> {t("common.night")}</span>
        </p>
      </div>
    </>
  );

  const cardClass = cn(
    "bg-card rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-border",
    "cursor-pointer hover:shadow-xl hover:border-brand transition-all duration-300 hover:-translate-y-1",
    rental && "sm:shrink-0 w-full sm:w-72 md:w-80 lg:w-[340px]",
    className
  );

  if (rental) {
    return (
      <article className={cardClass} onClick={goToDetails} role="link" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && goToDetails()}>
        {cardInner}
      </article>
    );
  }

  return (
    <Link to={`/properties/${property.id}`} className={cardClass}>
      {cardInner}
    </Link>
  );
}
