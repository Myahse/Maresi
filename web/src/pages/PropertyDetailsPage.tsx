import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getProperty, addFavorite, removeFavorite, getFavorites } from "@/services/api";
import type { Property } from "@/types";
import { MapPin, Heart, Mail, Phone, BedDouble, Users } from "lucide-react";
import { usePriceFormatter } from "@/context/CurrencyContext";
import { useAuthModal } from "@/context/AuthModalContext";
import { PropertyLocationMap } from "@/components/map/PropertyLocationMap";
import { VirtualTourViewer } from "@/components/property/VirtualTourViewer";
import { RatingsSection } from "@/components/rating/RatingsSection";
import { PropertyRatingMark } from "@/components/rating/PropertyRatingMark";
import { cn } from "@/lib/utils";
import { listingImageUrls } from "@/lib/media";
import { isPropertyType, normalizeAmenities } from "@/lib/amenities";

export function PropertyDetailsPage() {
  const { t } = useTranslation();
  const { formatPrice } = usePriceFormatter();
  const { requireAuth } = useAuthModal();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [ratingAvg, setRatingAvg] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    getProperty(id)
      .then((item) => {
        setProperty(item);
        setRatingAvg(Number(item.average_rating ?? 0));
        setRatingCount(Number(item.rating_count ?? 0));
      })
      .catch(() => setProperty(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    getFavorites()
      .then((list) => setIsFavorite(list.some((f) => f.property_id === id)))
      .catch(() => {});
  }, [id]);

  const placeholderImage = useMemo(
    () =>
      `https://placehold.co/800x400/0D9488/white?text=${encodeURIComponent(t("propertyDetails.noImage"))}`,
    [t]
  );

  const toggleFavorite = () => {
    if (!id) return;
    requireAuth(async () => {
      try {
        if (isFavorite) await removeFavorite(id);
        else await addFavorite(id);
        setIsFavorite(!isFavorite);
      } catch {
        /* ignore */
      }
    });
  };

  const handleReserve = (withVisit = false) => {
    if (!id) return;
    requireAuth(() =>
      navigate(withVisit ? `/properties/${id}/reserve?visit=1` : `/properties/${id}/reserve`)
    );
  };

  if (loading) return <div className="container mx-auto px-4 py-8">{t("common.loading")}</div>;
  if (!property) return <div className="container mx-auto px-4 py-8">{t("propertyDetails.notFound")}</div>;

  const resolvedImages = listingImageUrls(property.images);
  const images = resolvedImages.length ? resolvedImages : [placeholderImage];

  return (
    <div className="font-jakarta container mx-auto px-4 py-8 max-w-5xl">
      <div className="rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-border aspect-video mb-3 bg-muted shadow-sm">
        <img
          src={images[activeImage]}
          alt={property.title}
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = placeholderImage;
          }}
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar pb-1">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveImage(idx)}
              className={cn(
                "shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-colors bg-muted",
                idx === activeImage ? "border-brand ring-2 ring-brand/30" : "border-border"
              )}
            >
              <img src={img} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-start gap-3">
              <PropertyRatingMark rating={ratingAvg} count={ratingCount} className="mt-1 text-lg" />
              <span>{property.title}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <p className="text-brand font-bold text-xl">
                {formatPrice(property.price)}
                <span className="text-muted-foreground font-normal text-base ml-1">{t("common.night")}</span>
              </p>
              {ratingCount > 0 && (
                <span className="text-sm text-muted-foreground">
                  {t("ratings.count", { count: ratingCount })}
                </span>
              )}
            </div>
            <p className="text-muted-foreground flex items-center gap-2 mt-2">
              <MapPin className="h-4 w-4 shrink-0" />
              {property.location}
            </p>
            <p className="text-sm text-muted-foreground capitalize mt-1">
              {isPropertyType(property.property_type)
                ? t(`propertyTypes.${property.property_type}`)
                : property.property_type}
            </p>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
              {property.bedrooms != null && property.bedrooms > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <BedDouble className="h-4 w-4" />
                  {t("common.rooms", { count: property.bedrooms })}
                </span>
              )}
              {property.max_guests != null && property.max_guests > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {t("common.guests", { count: property.max_guests })}
                </span>
              )}
            </p>
          </div>

          {normalizeAmenities(property.amenities).length > 0 && (
            <div>
              <h2 className="font-bold text-foreground mb-3">{t("propertyDetails.amenities")}</h2>
              <div className="flex flex-wrap gap-2">
                {normalizeAmenities(property.amenities).map((id) => (
                  <span
                    key={id}
                    className="px-3 py-1.5 rounded-full border border-border bg-card text-sm font-medium"
                  >
                    {t(`amenities.${id}`)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {property.description && (
            <div>
              <h2 className="font-bold text-foreground mb-2">{t("propertyDetails.description")}</h2>
              <p className="whitespace-pre-wrap text-foreground">{property.description}</p>
            </div>
          )}

          {property.virtual_tour_url && (
            <VirtualTourViewer url={property.virtual_tour_url} title={property.title} />
          )}

          <div>
            <h2 className="font-bold text-foreground mb-3">{t("propertyDetails.location")}</h2>
            <PropertyLocationMap
              latitude={property.latitude}
              longitude={property.longitude}
              title={property.title}
              location={property.location}
            />
          </div>

          <RatingsSection
            propertyId={property.id}
            averageRating={ratingAvg}
            ratingCount={ratingCount}
            onStatsChange={(average, count) => {
              setRatingAvg(average);
              setRatingCount(count);
            }}
          />
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl border-2 border-border">
            <CardHeader className="pb-2">
              <p className="text-sm font-medium text-muted-foreground">{t("propertyDetails.contactOwner")}</p>
              {property.owner_name && <p className="font-medium">{property.owner_name}</p>}
            </CardHeader>
            <CardContent className="space-y-2">
              {property.owner_email && (
                <a href={`mailto:${property.owner_email}`} className="flex items-center gap-2 text-sm text-brand hover:underline">
                  <Mail className="h-4 w-4" /> {t("common.email")}
                </a>
              )}
              {property.owner_phone && (
                <a href={`tel:${property.owner_phone}`} className="flex items-center gap-2 text-sm text-brand hover:underline">
                  <Phone className="h-4 w-4" /> {t("propertyDetails.call")}
                </a>
              )}
              <Button className="w-full mt-2 rounded-full" variant="outline" onClick={toggleFavorite}>
                <Heart className={cn("h-4 w-4 mr-2", isFavorite && "fill-pink-500 text-pink-500")} />
                {isFavorite ? t("common.saved") : t("common.save")}
              </Button>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-2 border-brand/30 bg-brand/5">
            <CardHeader className="pb-2">
              <p className="text-sm font-bold text-foreground">{t("propertyDetails.reserveTitle")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("propertyDetails.reserveHint")}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full rounded-full bg-brand hover:bg-brand-dark" onClick={() => handleReserve(false)}>
                {t("propertyDetails.startReservation")}
              </Button>
              <Button
                className="w-full rounded-full"
                variant="outline"
                onClick={() => handleReserve(true)}
              >
                {t("propertyDetails.requestVisit")}
              </Button>
              <button
                type="button"
                className="text-sm text-brand hover:underline w-full text-center"
                onClick={() => requireAuth(() => navigate("/visits"))}
              >
                {t("visits.viewMine")}
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
