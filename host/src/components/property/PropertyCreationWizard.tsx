import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Stepper } from "@/components/ui/stepper";
import { usePriceFormatter } from "@/context/CurrencyContext";
import { isValidPrice, isValidUrl, hasMinPropertyPhotos, MIN_PROPERTY_PHOTOS } from "@/lib/validation";
import { compressImageFile } from "@/lib/compressImage";
import { uploadPropertyImages } from "@/services/api";
import { LocationMapPicker } from "@/components/map/LocationMapPicker";
import { cn } from "@/lib/utils";
import type { MapboxPlace } from "@/lib/mapbox";
import type { Property } from "@/types";

const PROPERTY_TYPES = ["apartment", "house", "studio"] as const;

interface PropertyCreationWizardProps {
  initial?: Partial<Property>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function PropertyCreationWizard({
  initial,
  onSubmit,
  onCancel,
  loading,
}: PropertyCreationWizardProps) {
  const { t } = useTranslation();
  const { formatPrice } = usePriceFormatter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [property_type, setPropertyType] = useState(initial?.property_type ?? "apartment");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [latitude, setLatitude] = useState(initial?.latitude?.toString() ?? "");
  const [longitude, setLongitude] = useState(initial?.longitude?.toString() ?? "");
  const [price, setPrice] = useState(initial?.price?.toString() ?? "");
  const [bedrooms, setBedrooms] = useState(initial?.bedrooms?.toString() ?? "1");
  const [max_guests, setMaxGuests] = useState(initial?.max_guests?.toString() ?? "2");
  const [virtual_tour_url, setVirtualTourUrl] = useState(initial?.virtual_tour_url ?? "");
  const [wave_payment_url, setWavePaymentUrl] = useState(initial?.wave_payment_url ?? "");
  const [orange_money_url, setOrangeMoneyUrl] = useState(initial?.orange_money_url ?? "");
  const [images, setImages] = useState<File[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [previews, setPreviews] = useState<string[]>([]);
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [waitingUpload, setWaitingUpload] = useState(false);
  const uploadGen = useRef(0);
  const pendingUpload = useRef<Promise<string[] | null> | null>(null);
  const imagesRef = useRef<File[]>([]);
  const preparingCount = useRef(0);
  imagesRef.current = images;

  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  const steps = [
    { id: "basics", label: t("wizard.property.steps.basics") },
    { id: "location", label: t("wizard.property.steps.location") },
    { id: "pricing", label: t("wizard.property.steps.pricing") },
    { id: "media", label: t("wizard.property.steps.media") },
    { id: "review", label: t("wizard.property.steps.review") },
  ];

  const validateStep = (s: number): string | null => {
    switch (s) {
      case 0:
        if (!title.trim()) return t("wizard.property.errors.title");
        if (title.trim().length < 5) return t("wizard.property.errors.titleShort");
        if (!description.trim()) return t("wizard.property.errors.description");
        return null;
      case 1:
        if (!latitude || !longitude || !location.trim()) return t("wizard.property.errors.mapPin");
        return null;
      case 2:
        if (!isValidPrice(price)) return t("wizard.property.errors.price");
        if (!bedrooms || Number(bedrooms) < 1) return t("wizard.property.errors.bedrooms");
        if (!max_guests || Number(max_guests) < 1) return t("wizard.property.errors.guests");
        if (wave_payment_url.trim() && !isValidUrl(wave_payment_url)) return t("wizard.property.errors.url");
        if (orange_money_url.trim() && !isValidUrl(orange_money_url)) return t("wizard.property.errors.url");
        return null;
      case 3:
        if (!hasMinPropertyPhotos(images)) {
          return t("wizard.property.errors.photosMin", { count: MIN_PROPERTY_PHOTOS });
        }
        if (!isValidUrl(virtual_tour_url)) return t("wizard.property.errors.url");
        return null;
      default:
        return null;
    }
  };

  const next = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const back = () => {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  };

  const startBackgroundUpload = (files: File[]) => {
    if (files.length === 0) {
      pendingUpload.current = null;
      setUploadingPhotos(false);
      return;
    }
    const gen = ++uploadGen.current;
    pendingUpload.current = (async () => {
      setUploadingPhotos(true);
      try {
        const result = await uploadPropertyImages(files);
        if (gen !== uploadGen.current) return null;
        return Array.isArray(result.urls) && result.urls.length === files.length ? result.urls : null;
      } catch {
        if (gen !== uploadGen.current) return null;
        return null;
      } finally {
        if (gen === uploadGen.current) setUploadingPhotos(false);
      }
    })();
  };

  const handlePhotosSelected = (list: FileList | null) => {
    const incoming = Array.from(list || []);
    if (incoming.length === 0) return;
    setImages((prev) => [...prev, ...incoming]);
    preparingCount.current += 1;
    setPreparingPhotos(true);
    void (async () => {
      try {
        const compressed: File[] = [];
        const concurrency = 4;
        for (let i = 0; i < incoming.length; i += concurrency) {
          const batch = incoming.slice(i, i + concurrency);
          compressed.push(...(await Promise.all(batch.map((file) => compressImageFile(file)))));
        }
        setImages((prev) => {
          const next = [...prev];
          incoming.forEach((orig, i) => {
            const idx = next.indexOf(orig);
            if (idx >= 0) next[idx] = compressed[i];
          });
          imagesRef.current = next;
          return next;
        });
        startBackgroundUpload(imagesRef.current);
      } finally {
        preparingCount.current = Math.max(0, preparingCount.current - 1);
        if (preparingCount.current === 0) setPreparingPhotos(false);
      }
    })();
  };

  const removePhoto = (idx: number) => {
    const next = images.filter((_, i) => i !== idx);
    imagesRef.current = next;
    setImages(next);
    setCoverIndex((current) => {
      if (next.length === 0) return 0;
      if (idx === current) return 0;
      if (idx < current) return current - 1;
      return current;
    });
    uploadGen.current += 1;
    pendingUpload.current = null;
    if (next.length > 0) startBackgroundUpload(next);
    else setUploadingPhotos(false);
  };

  const handleSubmit = async () => {
    if (!hasMinPropertyPhotos(images)) {
      setError(t("wizard.property.errors.photosMin", { count: MIN_PROPERTY_PHOTOS }));
      return;
    }
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("description", description.trim());
    formData.set("property_type", property_type);
    formData.set("location", location.trim());
    if (latitude) formData.set("latitude", latitude);
    if (longitude) formData.set("longitude", longitude);
    formData.set("price", price);
    formData.set("bedrooms", bedrooms);
    formData.set("max_guests", max_guests);
    if (virtual_tour_url.trim()) formData.set("virtual_tour_url", virtual_tour_url.trim());
    if (wave_payment_url.trim()) formData.set("wave_payment_url", wave_payment_url.trim());
    if (orange_money_url.trim()) formData.set("orange_money_url", orange_money_url.trim());
    const ordered = [...images];
    if (coverIndex > 0 && coverIndex < ordered.length) {
      const [cover] = ordered.splice(coverIndex, 1);
      ordered.unshift(cover);
    }
    setWaitingUpload(true);
    try {
      const uploaded = pendingUpload.current ? await pendingUpload.current : null;
      if (uploaded && uploaded.length === images.length) {
        const orderedUrls = [...uploaded];
        if (coverIndex > 0 && coverIndex < orderedUrls.length) {
          const [cover] = orderedUrls.splice(coverIndex, 1);
          orderedUrls.unshift(cover);
        }
        orderedUrls.forEach((url) => formData.append("image_urls", url));
      } else {
        ordered.forEach((f) => formData.append("images", f));
      }
      await onSubmit(formData);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("propertyForm.saveFailed"));
    } finally {
      setWaitingUpload(false);
    }
  };

  const applyPlace = (place: MapboxPlace) => {
    setStreet(place.street);
    setCity(place.city);
    setCountry(place.country);
    setLocation(place.label);
    setLatitude(String(place.latitude));
    setLongitude(String(place.longitude));
  };

  return (
    <div className={cn("space-y-8 font-jakarta", step === 1 ? "max-w-6xl" : "max-w-2xl")}>
      <Stepper steps={steps} currentStep={step} />

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl">{error}</p>
      )}

      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">{t("wizard.property.basicsTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("wizard.property.basicsHint")}</p>
          <div className="space-y-2">
            <Label htmlFor="title">{t("propertyForm.title")} *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">{t("propertyForm.propertyType")} *</Label>
            <Select id="type" value={property_type} onChange={(e) => setPropertyType(e.target.value)}>
              {PROPERTY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`propertyTypes.${type}`)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t("propertyForm.description")} *</Label>
            <textarea
              id="description"
              className="flex min-h-[120px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">
            {t("wizard.property.locationTitle")}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {t("wizard.property.locationHint")}
          </p>
          <LocationMapPicker latitude={latitude} longitude={longitude} onChange={applyPlace}>
            <dl className="rounded-2xl border border-border bg-card divide-y text-sm sm:text-base">
              <AddressRow label={t("wizard.property.street")} value={street} />
              <AddressRow label={t("wizard.property.city")} value={city} />
              <AddressRow label={t("wizard.property.country")} value={country} />
              <AddressRow label={t("propertyForm.location")} value={location} />
              {(latitude || longitude) && (
                <AddressRow
                  label={t("wizard.property.coordinates")}
                  value={
                    latitude && longitude
                      ? `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`
                      : ""
                  }
                />
              )}
            </dl>
            {!latitude && (
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {t("wizard.property.locationEmpty")}
              </p>
            )}
          </LocationMapPicker>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">{t("wizard.property.pricingTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("wizard.property.pricingHint")}</p>
          <div className="space-y-2">
            <Label htmlFor="price">{t("wizard.property.priceXof")} *</Label>
            <Input
              id="price"
              type="number"
              min={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bedrooms">{t("wizard.property.bedrooms")} *</Label>
              <Input
                id="bedrooms"
                type="number"
                min={1}
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guests">{t("wizard.property.maxGuests")} *</Label>
              <Input
                id="guests"
                type="number"
                min={1}
                value={max_guests}
                onChange={(e) => setMaxGuests(e.target.value)}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{t("wizard.property.payHostHint")}</p>
          <div className="space-y-2">
            <Label htmlFor="wave">{t("wizard.property.waveUrl")}</Label>
            <Input
              id="wave"
              type="url"
              placeholder="https://pay.wave.com/..."
              value={wave_payment_url}
              onChange={(e) => setWavePaymentUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="om">{t("wizard.property.orangeUrl")}</Label>
            <Input
              id="om"
              type="url"
              placeholder="https://..."
              value={orange_money_url}
              onChange={(e) => setOrangeMoneyUrl(e.target.value)}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">{t("wizard.property.mediaTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("wizard.property.mediaHint", { count: MIN_PROPERTY_PHOTOS })}</p>
          <div className="space-y-2">
            <Label>{t("common.photos")}</Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                void handlePhotosSelected(e.target.files);
                e.target.value = "";
              }}
            />
            {preparingPhotos && (
              <p className="text-xs text-brand">{t("wizard.property.preparingPhotos")}</p>
            )}
            {uploadingPhotos && !preparingPhotos && (
              <p className="text-xs text-brand">{t("wizard.property.uploadingPhotos")}</p>
            )}
            {images.length > 0 && (
              <p className={`text-xs ${hasMinPropertyPhotos(images) ? "text-emerald-600" : "text-muted-foreground"}`}>
                {t("wizard.property.photosSelected", { count: images.length, min: MIN_PROPERTY_PHOTOS })}
              </p>
            )}
            {previews.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t("wizard.property.coverHint")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {previews.map((src, idx) => (
                    <div
                      key={src}
                      className={`relative overflow-hidden rounded-xl border-2 ${
                        idx === coverIndex ? "border-brand" : "border-border"
                      }`}
                    >
                      <button
                        type="button"
                        className="block w-full"
                        onClick={() => setCoverIndex(idx)}
                      >
                        <img src={src} alt="" className="h-24 w-full object-cover" />
                        {idx === coverIndex && (
                          <span className="absolute bottom-1 left-1 right-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">
                            {t("wizard.property.coverBadge")}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        className="absolute top-1 right-1 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white"
                        aria-label={t("wizard.property.removePhoto")}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removePhoto(idx);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="vr">{t("wizard.property.virtualTour")}</Label>
            <Input
              id="vr"
              type="url"
              placeholder="https://kuula.co/share/..."
              value={virtual_tour_url}
              onChange={(e) => setVirtualTourUrl(e.target.value)}
            />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">{t("wizard.property.reviewTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("wizard.property.reviewHint")}</p>
          <dl className="rounded-2xl border-2 border-border divide-y text-sm">
            <div className="flex justify-between gap-4 p-4">
              <dt className="text-muted-foreground">{t("propertyForm.title")}</dt>
              <dd className="font-semibold text-right">{title}</dd>
            </div>
            <div className="flex justify-between gap-4 p-4">
              <dt className="text-muted-foreground">{t("propertyForm.propertyType")}</dt>
              <dd className="font-semibold capitalize">
                {t(`propertyTypes.${property_type as (typeof PROPERTY_TYPES)[number]}`)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 p-4">
              <dt className="text-muted-foreground">{t("propertyForm.location")}</dt>
              <dd className="font-semibold text-right">{location}</dd>
            </div>
            <div className="flex justify-between gap-4 p-4">
              <dt className="text-muted-foreground">{t("common.perNight")}</dt>
              <dd className="font-semibold text-brand">{formatPrice(Number(price))}</dd>
            </div>
            <div className="flex justify-between gap-4 p-4">
              <dt className="text-muted-foreground">{t("wizard.property.bedrooms")}</dt>
              <dd className="font-semibold">{bedrooms}</dd>
            </div>
            <div className="flex justify-between gap-4 p-4">
              <dt className="text-muted-foreground">{t("wizard.property.maxGuests")}</dt>
              <dd className="font-semibold">{max_guests}</dd>
            </div>
            <div className="flex justify-between gap-4 p-4">
              <dt className="text-muted-foreground">{t("common.photos")}</dt>
              <dd className="font-semibold">{images.length}</dd>
            </div>
            {previews[coverIndex] && (
              <div className="p-4 space-y-2">
                <dt className="text-muted-foreground">{t("wizard.property.coverBadge")}</dt>
                <img
                  src={previews[coverIndex]}
                  alt=""
                  className="mt-2 h-32 w-full rounded-xl object-cover"
                />
              </div>
            )}
          </dl>
        </div>
      )}

      <div className="sticky z-20 flex flex-wrap gap-3 pt-3 pb-3 -mx-4 px-4 mt-2 border-t border-border bg-background above-mobile-nav lg:static lg:bottom-auto lg:mx-0 lg:mt-0 lg:border-0 lg:px-0 lg:pt-2">
        {step > 0 && (
          <Button type="button" variant="outline" className="rounded-full" onClick={back}>
            {t("wizard.back")}
          </Button>
        )}
        <Button type="button" variant="ghost" className="rounded-full" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        {step < steps.length - 1 ? (
          <Button
            type="button"
            className="rounded-full bg-brand hover:bg-brand-dark ml-auto"
            onClick={next}
          >
            {t("wizard.next")}
          </Button>
        ) : (
          <Button
            type="button"
            className="rounded-full bg-brand hover:bg-brand-dark ml-auto"
            disabled={loading || waitingUpload}
            onClick={handleSubmit}
          >
            {loading || waitingUpload
              ? uploadingPhotos
                ? t("wizard.property.uploadingPhotos")
                : t("common.saving")
              : t("wizard.property.publish")}
          </Button>
        )}
      </div>
    </div>
  );
}

function AddressRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:pt-0.5 sm:shrink-0">
        {label}
      </dt>
      <dd className="font-semibold text-foreground break-words sm:text-right">{value || "—"}</dd>
    </div>
  );
}
