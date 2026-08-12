import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { Property } from "@/types";
import { hasMinPropertyPhotos, MIN_PROPERTY_PHOTOS } from "@/lib/validation";

const PROPERTY_TYPES = ["apartment", "house", "studio"] as const;

interface PropertyFormProps {
  initial?: Partial<Property>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function PropertyForm({
  initial,
  onSubmit,
  onCancel,
  loading,
}: PropertyFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial?.price?.toString() ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [property_type, setPropertyType] = useState(initial?.property_type ?? "apartment");
  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title || !price || !location || !property_type) {
      setError(t("propertyForm.requiredFields"));
      return;
    }
    if (!hasMinPropertyPhotos(images)) {
      setError(t("wizard.property.errors.photosMin", { count: MIN_PROPERTY_PHOTOS }));
      return;
    }
    const formData = new FormData();
    formData.set("title", title);
    formData.set("description", description);
    formData.set("price", price);
    formData.set("location", location);
    formData.set("property_type", property_type);
    images.forEach((f) => formData.append("images", f));
    try {
      await onSubmit(formData);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("propertyForm.saveFailed"));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</p>}
      <div className="space-y-2">
        <Label htmlFor="title">{t("propertyForm.title")}</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">{t("propertyForm.description")}</Label>
        <textarea
          id="description"
          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="price">{t("common.perNight")}</Label>
        <Input
          id="price"
          type="number"
          min={0}
          step={0.01}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">{t("propertyForm.location")}</Label>
        <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="type">{t("propertyForm.propertyType")}</Label>
        <Select
          id="type"
          value={property_type}
          onChange={(e) => setPropertyType(e.target.value)}
        >
          {PROPERTY_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`propertyTypes.${type}`)}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t("common.photos")}</Label>
        <p className="text-xs text-gray-500">{t("wizard.property.mediaHint", { count: MIN_PROPERTY_PHOTOS })}</p>
        <Input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setImages(Array.from(e.target.files || []))}
        />
        {images.length > 0 && (
          <p className={`text-xs ${hasMinPropertyPhotos(images) ? "text-emerald-600" : "text-gray-500"}`}>
            {t("wizard.property.photosSelected", { count: images.length, min: MIN_PROPERTY_PHOTOS })}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? t("common.saving") : t("common.save")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
