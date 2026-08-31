import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useUserLocation } from "@/context/LocationContext";
import { reverseGeocode } from "@/lib/mapbox";
import { PROPERTY_TYPES } from "@/lib/amenities";

export interface FilterValues {
  location: string;
  minPrice: string;
  maxPrice: string;
  property_type: string;
}

interface PropertyFiltersProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onApply: (next?: FilterValues) => void;
  onReset: () => void;
}

export function PropertyFilters({ values, onChange, onApply, onReset }: PropertyFiltersProps) {
  const { t, i18n } = useTranslation();
  const { coords, status, requestAccess } = useUserLocation();
  const pendingNear = useRef(false);

  const applyNearMe = async (from = coords) => {
    if (!from) return;
    const place = await reverseGeocode(from.longitude, from.latitude, i18n.language);
    const label = place?.city || place?.label || t("location.nearMe");
    const next = { ...values, location: label };
    onChange(next);
    onApply(next);
  };

  const useNearMe = async () => {
    if (status !== "granted" || !coords) {
      pendingNear.current = true;
      requestAccess();
      return;
    }
    await applyNearMe(coords);
  };

  useEffect(() => {
    if (!pendingNear.current || !coords) return;
    pendingNear.current = false;
    void applyNearMe(coords);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 items-end">
      <div className="space-y-2">
        <Label>{t("filters.location")}</Label>
        <div className="flex gap-2">
          <Input
            placeholder={t("filters.locationPlaceholder")}
            value={values.location}
            onChange={(e) => onChange({ ...values, location: e.target.value })}
          />
          <Button
            type="button"
            variant="outline"
            className="rounded-full shrink-0 border-2"
            onClick={() => void useNearMe()}
          >
            {t("location.nearMe")}
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t("filters.type")}</Label>
        <Select
          value={values.property_type}
          onChange={(e) => onChange({ ...values, property_type: e.target.value })}
        >
          <option value="">{t("common.any")}</option>
          {PROPERTY_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`propertyTypes.${type}`)}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label>{t("filters.minPrice")}</Label>
        <Input
          type="number"
          min={0}
          placeholder="0"
          value={values.minPrice}
          onChange={(e) => onChange({ ...values, minPrice: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>{t("filters.maxPrice")}</Label>
        <Input
          type="number"
          min={0}
          placeholder={t("filters.maxPlaceholder")}
          value={values.maxPrice}
          onChange={(e) => onChange({ ...values, maxPrice: e.target.value })}
        />
      </div>
      <Button onClick={() => onApply()} className="bg-brand hover:bg-brand-dark rounded-full font-semibold">
        {t("common.search")}
      </Button>
      <Button variant="outline" onClick={onReset} className="rounded-full border-2">
        {t("common.reset")}
      </Button>
    </div>
  );
}
