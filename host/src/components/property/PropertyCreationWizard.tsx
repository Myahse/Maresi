import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Stepper } from "@/components/ui/stepper";
import { WizardPane } from "@/components/ui/WizardPane";
import { usePriceFormatter } from "@/context/CurrencyContext";
import { isValidPrice, isValidUrl, MIN_PROPERTY_PHOTOS } from "@/lib/validation";
import { compressImageFile } from "@/lib/compressImage";
import { uploadPropertyImages } from "@/services/api";
import { listingImageUrl } from "@/lib/media";
import { LocationMapPicker } from "@/components/map/LocationMapPicker";
import { cn } from "@/lib/utils";
import type { MapboxPlace } from "@/lib/mapbox";
import type { Property } from "@/types";
import { PROPERTY_AMENITY_IDS, PROPERTY_TYPES, normalizeAmenities } from "@/lib/amenities";

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
  const [amenities, setAmenities] = useState<string[]>(() => normalizeAmenities(initial?.amenities));
  const [virtual_tour_url, setVirtualTourUrl] = useState(initial?.virtual_tour_url ?? "");
  const [wave_payment_url] = useState(initial?.wave_payment_url ?? "");
  const [orange_money_url] = useState(initial?.orange_money_url ?? "");
  const [checkInTime, setCheckInTime] = useState(initial?.check_in_time?.slice(0, 5) ?? "14:00");
  const [checkOutTime, setCheckOutTime] = useState(initial?.check_out_time?.slice(0, 5) ?? "12:00");
  const [priceMidday, setPriceMidday] = useState(initial?.price_midday?.toString() ?? "");
  const [priceFullDay, setPriceFullDay] = useState(initial?.price_full_day?.toString() ?? "");
  const [existingUrls, setExistingUrls] = useState<string[]>(
    () => (Array.isArray(initial?.images) ? initial.images.filter((url): url is string => Boolean(url)) : [])
  );
  const [images, setImages] = useState<File[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [previews, setPreviews] = useState<string[]>([]);
  const [pendingSlots, setPendingSlots] = useState(0);
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [waitingUpload, setWaitingUpload] = useState(false);
  const uploadGen = useRef(0);
  const remoteByFile = useRef(new WeakMap<File, string>());
  const inflight = useRef(0);
  const waiters = useRef<Array<() => void>>([]);
  const imagesRef = useRef<File[]>([]);
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
    { id: "rates", label: t("wizard.property.steps.rates") },
    { id: "amenities", label: t("wizard.property.steps.amenities") },
    { id: "media", label: t("wizard.property.steps.media") },
    { id: "review", label: t("wizard.property.steps.review") },
  ];

  const validateStep = (s: number): string | null => {
    switch (s) {
      case 0:
        if (!title.trim()) return t("wizard.property.errors.title");
        if (title.trim().length < 5) return t("wizard.property.errors.titleShort");
        if (!description.trim()) return t("wizard.property.errors.description");
        if (!bedrooms || Number(bedrooms) < 1) return t("wizard.property.errors.bedrooms");
        return null;
      case 1:
        if (!latitude || !longitude || !location.trim()) return t("wizard.property.errors.mapPin");
        return null;
      case 2:
        if (!isValidPrice(price)) return t("wizard.property.errors.price");
        if (!max_guests || Number(max_guests) < 1) return t("wizard.property.errors.guests");
        if (!checkInTime || !checkOutTime) return t("wizard.property.errors.times");
        return null;
      case 3:
        if (priceMidday && !isValidPrice(priceMidday)) return t("wizard.property.errors.price");
        if (priceFullDay && !isValidPrice(priceFullDay)) return t("wizard.property.errors.price");
        return null;
      case 5:
        if (existingUrls.length + images.length < MIN_PROPERTY_PHOTOS) {
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

  const beginWork = () => {
    inflight.current += 1;
  };

  const endWork = () => {
    inflight.current = Math.max(0, inflight.current - 1);
    if (inflight.current === 0) {
      setPreparingPhotos(false);
      setUploadingPhotos(false);
      waiters.current.splice(0).forEach((resolve) => resolve());
    }
  };

  const waitForWork = () => {
    if (inflight.current === 0) return Promise.resolve();
    return new Promise<void>((resolve) => waiters.current.push(resolve));
  };

  const uploadOne = async (file: File, gen: number) => {
    if (remoteByFile.current.get(file)) return;
    setUploadingPhotos(true);
    try {
      const result = await uploadPropertyImages([file]);
      if (gen !== uploadGen.current) return;
      const url = Array.isArray(result.urls) ? result.urls[0] : undefined;
      if (url) remoteByFile.current.set(file, url);
    } catch {
      /* publish can still attach the local file */
    }
  };

  const handlePhotosSelected = (list: FileList | null) => {
    const incoming = Array.from(list || []);
    if (incoming.length === 0) return;
    const gen = uploadGen.current;
    setPendingSlots((count) => count + incoming.length);
    setPreparingPhotos(true);
    beginWork();
    void (async () => {
      let leftover = incoming.length;
      try {
        const concurrency = 2;
        let cursor = 0;
        const uploads: Promise<void>[] = [];
        const run = async () => {
          while (cursor < incoming.length && gen === uploadGen.current) {
            const file = incoming[cursor];
            cursor += 1;
            const compressed = await compressImageFile(file);
            leftover -= 1;
            if (gen !== uploadGen.current) return;
            setPendingSlots((count) => Math.max(0, count - 1));
            setImages((prev) => {
              const next = [...prev, compressed];
              imagesRef.current = next;
              return next;
            });
            uploads.push(uploadOne(compressed, gen));
          }
        };
        await Promise.all(Array.from({ length: Math.min(concurrency, incoming.length) }, () => run()));
        await Promise.all(uploads);
      } finally {
        if (leftover > 0) {
          setPendingSlots((count) => Math.max(0, count - leftover));
        }
        endWork();
      }
    })();
  };

  const photoCount = existingUrls.length + images.length + pendingSlots;

  const removePhoto = (idx: number) => {
    if (idx < existingUrls.length) {
      setExistingUrls((prev) => prev.filter((_, i) => i !== idx));
    } else {
      const fileIdx = idx - existingUrls.length;
      const next = images.filter((_, i) => i !== fileIdx);
      imagesRef.current = next;
      setImages(next);
    }
    setCoverIndex((current) => {
      if (photoCount <= 1) return 0;
      if (idx === current) return 0;
      if (idx < current) return current - 1;
      return current;
    });
  };

  const handleSubmit = async (asDraft = false) => {
    if (!asDraft && photoCount < MIN_PROPERTY_PHOTOS) {
      setError(t("wizard.property.errors.photosMin", { count: MIN_PROPERTY_PHOTOS }));
      return;
    }
    if (!asDraft) {
      const err = validateStep(step);
      if (err) {
        setError(err);
        return;
      }
    }
    setError("");
    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("description", description.trim());
    formData.set("property_type", property_type);
    formData.set("location", location.trim());
    if (latitude) formData.set("latitude", latitude);
    if (longitude) formData.set("longitude", longitude);
    if (price) formData.set("price", price);
    if (bedrooms) formData.set("bedrooms", bedrooms);
    if (max_guests) formData.set("max_guests", max_guests);
    if (amenities.length === 0) formData.append("amenities", "");
    amenities.forEach((id) => formData.append("amenities", id));
    if (virtual_tour_url.trim()) formData.set("virtual_tour_url", virtual_tour_url.trim());
    if (wave_payment_url.trim()) formData.set("wave_payment_url", wave_payment_url.trim());
    if (orange_money_url.trim()) formData.set("orange_money_url", orange_money_url.trim());
    if (checkInTime) formData.set("check_in_time", checkInTime);
    if (checkOutTime) formData.set("check_out_time", checkOutTime);
    if (priceMidday) formData.set("price_midday", priceMidday);
    if (priceFullDay) formData.set("price_full_day", priceFullDay);
    formData.set("draft", asDraft ? "true" : "false");
    setWaitingUpload(true);
    try {
      await waitForWork();
      const readyUrls = images.map((file) => remoteByFile.current.get(file));
      const allUploaded = readyUrls.every((url): url is string => Boolean(url));
      if (allUploaded || images.length === 0) {
        const orderedUrls = [...existingUrls, ...(allUploaded ? readyUrls : [])];
        if (coverIndex > 0 && coverIndex < orderedUrls.length) {
          const [cover] = orderedUrls.splice(coverIndex, 1);
          orderedUrls.unshift(cover);
        }
        orderedUrls.forEach((url) => formData.append("image_urls", url));
      } else {
        existingUrls.forEach((url) => formData.append("image_urls", url));
        readyUrls.forEach((url) => {
          if (url) formData.append("image_urls", url);
        });
        const leftover = images.filter((_, i) => !readyUrls[i]);
        leftover.forEach((file) => formData.append("images", file));
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
        <WizardPane step={0}>
          <h2 className="text-lg font-bold text-foreground">{t("wizard.property.basicsTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("wizard.property.basicsHint")}</p>
          <div className="space-y-2">
            <Label htmlFor="title">{t("propertyForm.title")} *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Label htmlFor="bedrooms">{t("wizard.property.bedrooms")} *</Label>
              <Input
                id="bedrooms"
                type="number"
                min={1}
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
              />
            </div>
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
        </WizardPane>
      )}

      {step === 1 && (
        <WizardPane step={1}>
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
        </WizardPane>
      )}

      {step === 2 && (
        <WizardPane step={2}>
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
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="check-in-time">{t("wizard.property.checkInTime")} *</Label>
              <Input
                id="check-in-time"
                type="time"
                step={900}
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="check-out-time">{t("wizard.property.checkOutTime")} *</Label>
              <Input
                id="check-out-time"
                type="time"
                step={900}
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                required
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t("wizard.property.timesHint")}</p>
        </WizardPane>
      )}

      {step === 3 && (
        <WizardPane step={3}>
          <h2 className="text-lg font-bold text-foreground">{t("wizard.property.ratesTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("wizard.property.ratesHint")}</p>
          <div className="space-y-2">
            <Label htmlFor="midday">{t("wizard.property.priceMidday")}</Label>
            <Input
              id="midday"
              type="number"
              min={0}
              value={priceMidday}
              onChange={(e) => setPriceMidday(e.target.value)}
              placeholder="15000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullday">{t("wizard.property.priceFullDay")}</Label>
            <Input
              id="fullday"
              type="number"
              min={0}
              value={priceFullDay}
              onChange={(e) => setPriceFullDay(e.target.value)}
              placeholder="20000"
            />
          </div>
        </WizardPane>
      )}

      {step === 4 && (
        <WizardPane step={4}>
          <h2 className="text-lg font-bold text-foreground">{t("wizard.property.amenitiesTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("wizard.property.amenitiesHint")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PROPERTY_AMENITY_IDS.map((id) => {
              const checked = amenities.includes(id);
              return (
                <label
                  key={id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-sm cursor-pointer transition-colors",
                    checked ? "border-brand bg-brand/5" : "border-border bg-card"
                  )}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-brand"
                    checked={checked}
                    onChange={() =>
                      setAmenities((current) =>
                        current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
                      )
                    }
                  />
                  {t(`amenities.${id}`)}
                </label>
              );
            })}
          </div>
        </WizardPane>
      )}

      {step === 5 && (
        <WizardPane step={5}>
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
            {photoCount > 0 && (
              <p className={`text-xs ${photoCount >= MIN_PROPERTY_PHOTOS ? "text-emerald-600" : "text-muted-foreground"}`}>
                {t("wizard.property.photosSelected", { count: photoCount, min: MIN_PROPERTY_PHOTOS })}
              </p>
            )}
            {photoCount > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t("wizard.property.coverHint")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {[...existingUrls.map((url) => listingImageUrl(url)), ...previews].map((src, idx) => (
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
                        <img src={src} alt="" className="h-24 w-full object-cover" decoding="async" />
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
                  {Array.from({ length: pendingSlots }, (_, i) => (
                    <div
                      key={`pending-${i}`}
                      className="h-24 rounded-xl border-2 border-dashed border-brand/40 bg-muted animate-pulse"
                    />
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
        </WizardPane>
      )}

      {step === 6 && (
        <WizardPane step={6}>
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
            {priceMidday && (
              <div className="flex justify-between gap-4 p-4">
                <dt className="text-muted-foreground">{t("wizard.property.priceMidday")}</dt>
                <dd className="font-semibold">{formatPrice(Number(priceMidday))}</dd>
              </div>
            )}
            {priceFullDay && (
              <div className="flex justify-between gap-4 p-4">
                <dt className="text-muted-foreground">{t("wizard.property.priceFullDay")}</dt>
                <dd className="font-semibold">{formatPrice(Number(priceFullDay))}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 p-4">
              <dt className="text-muted-foreground">{t("wizard.property.bedrooms")}</dt>
              <dd className="font-semibold">{bedrooms}</dd>
            </div>
            <div className="flex justify-between gap-4 p-4">
              <dt className="text-muted-foreground">{t("wizard.property.maxGuests")}</dt>
              <dd className="font-semibold">{max_guests}</dd>
            </div>
            <div className="flex justify-between gap-4 p-4">
              <dt className="text-muted-foreground">{t("wizard.property.checkInTime")}</dt>
              <dd className="font-semibold">{checkInTime}</dd>
            </div>
            <div className="flex justify-between gap-4 p-4">
              <dt className="text-muted-foreground">{t("wizard.property.checkOutTime")}</dt>
              <dd className="font-semibold">{checkOutTime}</dd>
            </div>
            <div className="flex justify-between gap-4 p-4">
              <dt className="text-muted-foreground">{t("wizard.property.amenitiesTitle")}</dt>
              <dd className="font-semibold text-right">
                {amenities.length > 0
                  ? amenities.map((id) => t(`amenities.${id}`)).join(", ")
                  : t("wizard.property.amenitiesEmpty")}
              </dd>
            </div>
            <div className="flex justify-between gap-4 p-4">
              <dt className="text-muted-foreground">{t("common.photos")}</dt>
              <dd className="font-semibold">{photoCount}</dd>
            </div>
            {([...existingUrls.map((url) => listingImageUrl(url)), ...previews][coverIndex]) && (
              <div className="p-4 space-y-2">
                <dt className="text-muted-foreground">{t("wizard.property.coverBadge")}</dt>
                <img
                  src={[...existingUrls.map((url) => listingImageUrl(url)), ...previews][coverIndex]}
                  alt=""
                  className="mt-2 h-32 w-full rounded-xl object-cover"
                />
              </div>
            )}
          </dl>
        </WizardPane>
      )}

      <div className="flex flex-wrap gap-3 pt-4 pb-2">
        {step > 0 && (
          <Button type="button" variant="outline" className="rounded-full" onClick={back}>
            {t("wizard.back")}
          </Button>
        )}
        <Button type="button" variant="ghost" className="rounded-full" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          disabled={loading || waitingUpload}
          onClick={() => void handleSubmit(true)}
        >
          {t("wizard.property.saveDraft")}
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
            onClick={() => void handleSubmit(false)}
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
