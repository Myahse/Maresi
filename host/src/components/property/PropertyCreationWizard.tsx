import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  AMENITY_GROUPS,
  PROPERTY_TYPES,
  displayPropertyType,
  normalizeAmenities,
} from "@/lib/amenities";

interface PropertyCreationWizardProps {
  initial?: Partial<Property>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  /** Unvalidated hosts can only save drafts */
  canPublish?: boolean;
}

export function PropertyCreationWizard({
  initial,
  onSubmit,
  onCancel,
  loading,
  canPublish = true,
}: PropertyCreationWizardProps) {
  const { t } = useTranslation();
  const { formatPrice } = usePriceFormatter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [property_type, setPropertyType] = useState(
    displayPropertyType(initial?.property_type ?? "apartment")
  );
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
  const [hasDelegate, setHasDelegate] = useState(Boolean(initial?.manager_name));
  const [managerName, setManagerName] = useState(initial?.manager_name ?? "");
  const [managerPhone, setManagerPhone] = useState(initial?.manager_phone ?? "");
  const [managerEmail, setManagerEmail] = useState(initial?.manager_email ?? "");
  const [managerRole, setManagerRole] = useState(initial?.manager_role ?? "");
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
    { id: "type", label: t("wizard.property.steps.type") },
    { id: "title", label: t("wizard.property.steps.title") },
    { id: "description", label: t("wizard.property.steps.description") },
    { id: "bedrooms", label: t("wizard.property.steps.bedrooms") },
    { id: "location", label: t("wizard.property.steps.location") },
    { id: "amenities", label: t("wizard.property.steps.amenities") },
    { id: "media", label: t("wizard.property.steps.media") },
    { id: "capacity", label: t("wizard.property.steps.capacity") },
    { id: "price", label: t("wizard.property.steps.price") },
    { id: "delegate", label: t("wizard.property.steps.delegate") },
    { id: "review", label: t("wizard.property.steps.review") },
  ];

  const validateStep = (s: number): string | null => {
    switch (s) {
      case 0:
        if (!PROPERTY_TYPES.includes(property_type as (typeof PROPERTY_TYPES)[number])) {
          return t("wizard.property.errors.type");
        }
        return null;
      case 1:
        if (!title.trim()) return t("wizard.property.errors.title");
        if (title.trim().length < 5) return t("wizard.property.errors.titleShort");
        return null;
      case 2:
        if (!description.trim()) return t("wizard.property.errors.description");
        return null;
      case 3:
        if (bedrooms === "" || Number(bedrooms) < 0) return t("wizard.property.errors.bedrooms");
        return null;
      case 4:
        if (!latitude || !longitude || !location.trim()) return t("wizard.property.errors.mapPin");
        return null;
      case 6:
        if (existingUrls.length + images.length < MIN_PROPERTY_PHOTOS) {
          return t("wizard.property.errors.photosMin", { count: MIN_PROPERTY_PHOTOS });
        }
        if (!isValidUrl(virtual_tour_url)) return t("wizard.property.errors.url");
        return null;
      case 7:
        if (!max_guests || Number(max_guests) < 1) return t("wizard.property.errors.guests");
        if (!checkInTime || !checkOutTime) return t("wizard.property.errors.times");
        return null;
      case 8:
        if (!isValidPrice(price)) return t("wizard.property.errors.price");
        return null;
      case 9:
        if (hasDelegate && managerName.trim().length < 2) return t("wizard.property.errors.delegateName");
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
              const nextImages = [...prev, compressed];
              imagesRef.current = nextImages;
              return nextImages;
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
      const nextImages = images.filter((_, i) => i !== fileIdx);
      imagesRef.current = nextImages;
      setImages(nextImages);
    }
    setCoverIndex((current) => {
      if (photoCount <= 1) return 0;
      if (idx === current) return 0;
      if (idx < current) return current - 1;
      return current;
    });
  };

  const handleSubmit = async (asDraft = false) => {
    const saveDraft = asDraft || !canPublish;
    if (!saveDraft && photoCount < MIN_PROPERTY_PHOTOS) {
      setError(t("wizard.property.errors.photosMin", { count: MIN_PROPERTY_PHOTOS }));
      return;
    }
    if (!saveDraft) {
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
    formData.set("manager_name", hasDelegate ? managerName.trim() : "");
    formData.set("manager_phone", hasDelegate ? managerPhone.trim() : "");
    formData.set("manager_email", hasDelegate ? managerEmail.trim() : "");
    formData.set("manager_role", hasDelegate ? managerRole.trim() : "");
    formData.set("draft", saveDraft ? "true" : "false");
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

  const toggleAmenity = (id: string) => {
    setAmenities((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  return (
    <div className="w-full space-y-8 font-jakarta">
      <Stepper steps={steps} currentStep={step} />

      {!canPublish && (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 p-3 rounded-xl">
          {t("wizard.property.unverifiedBanner")}
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl">{error}</p>
      )}

      {step === 0 && (
        <WizardPane step={0}>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{t("wizard.property.typeTitle")}</h2>
          <p className="text-sm sm:text-base text-muted-foreground">{t("wizard.property.typeHint")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {PROPERTY_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setPropertyType(type)}
                className={cn(
                  "rounded-2xl border-2 px-4 py-6 text-left transition-colors",
                  property_type === type ? "border-brand bg-brand/5" : "border-border bg-card"
                )}
              >
                <p className="font-bold text-foreground">{t(`propertyTypes.${type}`)}</p>
                <p className="text-sm text-muted-foreground mt-1">{t(`wizard.property.typeHints.${type}`)}</p>
              </button>
            ))}
          </div>
        </WizardPane>
      )}

      {step === 1 && (
        <WizardPane step={1}>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{t("wizard.property.titleStepTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("wizard.property.titleStepHint")}</p>
          <div className="space-y-2">
            <Label htmlFor="title">{t("propertyForm.title")} *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </WizardPane>
      )}

      {step === 2 && (
        <WizardPane step={2}>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{t("wizard.property.descriptionTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("wizard.property.descriptionHint")}</p>
          <textarea
            id="description"
            className="flex min-h-[220px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm sm:text-base"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </WizardPane>
      )}

      {step === 3 && (
        <WizardPane step={3}>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{t("wizard.property.bedroomsTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("wizard.property.bedroomsHint")}</p>
          <div className="space-y-2 max-w-sm">
            <Label htmlFor="bedrooms">{t("wizard.property.bedrooms")} *</Label>
            <Input
              id="bedrooms"
              type="number"
              min={0}
              value={bedrooms}
              onChange={(e) => setBedrooms(e.target.value)}
            />
          </div>
        </WizardPane>
      )}

      {step === 4 && (
        <WizardPane step={4}>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{t("wizard.property.locationTitle")}</h2>
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

      {step === 5 && (
        <WizardPane step={5}>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{t("wizard.property.amenitiesTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("wizard.property.amenitiesHint")}</p>
          <div className="space-y-6">
            {AMENITY_GROUPS.map((group) => (
              <section key={group.id} className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t(`amenities.groups.${group.id}`)}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  {group.ids.map((id) => {
                    const checked = amenities.includes(id);
                    return (
                      <label
                        key={id}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border-2 px-3 py-3 text-sm cursor-pointer transition-colors",
                          checked ? "border-brand bg-brand/5" : "border-border bg-card"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 accent-brand"
                          checked={checked}
                          onChange={() => toggleAmenity(id)}
                        />
                        <span>
                          <span className="font-medium text-foreground">{t(`amenities.${id}`)}</span>
                          <span className="block text-xs text-muted-foreground mt-0.5">
                            {t(`amenities.hints.${id}`)}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </WizardPane>
      )}

      {step === 6 && (
        <WizardPane step={6}>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{t("wizard.property.mediaTitle")}</h2>
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
                <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-2">
                  {[...existingUrls.map((url) => listingImageUrl(url)), ...previews].map((src, idx) => (
                    <div
                      key={src}
                      className={`relative overflow-hidden rounded-xl border-2 ${
                        idx === coverIndex ? "border-brand" : "border-border"
                      }`}
                    >
                      <button type="button" className="block w-full" onClick={() => setCoverIndex(idx)}>
                        <img src={src} alt="" className="h-28 w-full object-cover" decoding="async" />
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
                      className="h-28 rounded-xl border-2 border-dashed border-brand/40 bg-muted animate-pulse"
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

      {step === 7 && (
        <WizardPane step={7}>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{t("wizard.property.capacityTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("wizard.property.capacityHint")}</p>
          <div className="grid sm:grid-cols-3 gap-4">
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

      {step === 8 && (
        <WizardPane step={8}>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{t("wizard.property.pricingTitle")}</h2>
          <p className="text-sm text-muted-foreground">{property_type === "hotel" ? t("wizard.property.pricingHintNight") : t("wizard.property.pricingHintDay")}</p>
          <div className="space-y-2 max-w-md">
            <Label htmlFor="price">{property_type === "hotel" ? t("wizard.property.priceXofNight") : t("wizard.property.priceXofDay")} *</Label>
            <Input
              id="price"
              type="number"
              min={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          </WizardPane>
      )}

      {step === 9 && (
        <WizardPane step={9}>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{t("wizard.property.delegateTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("wizard.property.delegateHint")}</p>
          <label className="flex items-start gap-3 rounded-2xl border-2 border-border bg-card px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-brand"
              checked={hasDelegate}
              onChange={(e) => setHasDelegate(e.target.checked)}
            />
            <span>
              <span className="font-semibold text-foreground">{t("wizard.property.delegateToggle")}</span>
              <span className="block text-sm text-muted-foreground">{t("wizard.property.delegateToggleHint")}</span>
            </span>
          </label>
          {hasDelegate && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="manager-name">{t("wizard.property.managerName")} *</Label>
                <Input id="manager-name" value={managerName} onChange={(e) => setManagerName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager-role">{t("wizard.property.managerRole")}</Label>
                <Input id="manager-role" value={managerRole} onChange={(e) => setManagerRole(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager-phone">{t("wizard.property.managerPhone")}</Label>
                <Input id="manager-phone" value={managerPhone} onChange={(e) => setManagerPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager-email">{t("wizard.property.managerEmail")}</Label>
                <Input
                  id="manager-email"
                  type="email"
                  value={managerEmail}
                  onChange={(e) => setManagerEmail(e.target.value)}
                />
              </div>
            </div>
          )}
        </WizardPane>
      )}

      {step === 10 && (
        <WizardPane step={10}>
          <h2 className="text-lg sm:text-xl font-bold text-foreground">
            {t(canPublish ? "wizard.property.reviewTitle" : "wizard.property.reviewTitleUnverified")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(canPublish ? "wizard.property.reviewHint" : "wizard.property.reviewHintUnverified")}
          </p>
          <dl className="rounded-2xl border-2 border-border divide-y text-sm">
            <ReviewRow label={t("propertyForm.propertyType")} value={t(`propertyTypes.${property_type}`)} />
            <ReviewRow label={t("propertyForm.title")} value={title} />
            <ReviewRow label={t("propertyForm.location")} value={location} />
            <ReviewRow label={t("wizard.property.bedrooms")} value={bedrooms} />
            <ReviewRow label={t("wizard.property.maxGuests")} value={max_guests} />
            <ReviewRow label={property_type === "hotel" ? t("common.perNight") : t("common.perDay")} value={formatPrice(Number(price) || 0)} />
            <ReviewRow
              label={t("wizard.property.amenitiesTitle")}
              value={
                amenities.length > 0
                  ? amenities.map((id) => t(`amenities.${id}`)).join(", ")
                  : t("wizard.property.amenitiesEmpty")
              }
            />
            <ReviewRow label={t("common.photos")} value={String(photoCount)} />
            {hasDelegate ? (
              <ReviewRow
                label={t("wizard.property.delegateTitle")}
                value={[managerName, managerRole, managerPhone, managerEmail].filter(Boolean).join(" · ")}
              />
            ) : (
              <ReviewRow label={t("wizard.property.delegateTitle")} value={t("wizard.property.delegateNone")} />
            )}
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
          variant={canPublish || step < steps.length - 1 ? "outline" : "default"}
          className={cn(
            "rounded-full",
            !canPublish && step === steps.length - 1 && "bg-brand hover:bg-brand-dark text-white ml-auto"
          )}
          disabled={loading || waitingUpload}
          onClick={() => void handleSubmit(true)}
        >
          {loading || waitingUpload
            ? uploadingPhotos
              ? t("wizard.property.uploadingPhotos")
              : t("common.saving")
            : t("wizard.property.saveDraft")}
        </Button>
        {step < steps.length - 1 ? (
          <Button type="button" className="rounded-full bg-brand hover:bg-brand-dark ml-auto" onClick={next}>
            {t("wizard.next")}
          </Button>
        ) : canPublish ? (
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
        ) : null}
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

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 p-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-right">{value}</dd>
    </div>
  );
}
