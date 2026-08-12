import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

const PROPERTY_TYPES = ["apartment", "house", "studio"] as const;

export interface FilterValues {
  location: string;
  minPrice: string;
  maxPrice: string;
  property_type: string;
}

interface PropertyFiltersProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  onApply: () => void;
  onReset: () => void;
}

export function PropertyFilters({ values, onChange, onApply, onReset }: PropertyFiltersProps) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 items-end">
      <div className="space-y-2">
        <Label>{t("filters.location")}</Label>
        <Input
          placeholder={t("filters.locationPlaceholder")}
          value={values.location}
          onChange={(e) => onChange({ ...values, location: e.target.value })}
        />
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
      <Button onClick={onApply} className="bg-brand hover:bg-brand-dark rounded-full font-semibold">
        {t("common.search")}
      </Button>
      <Button variant="outline" onClick={onReset} className="rounded-full border-2">
        {t("common.reset")}
      </Button>
    </div>
  );
}
