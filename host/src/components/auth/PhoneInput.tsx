import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { PHONE_COUNTRIES, joinPhone, splitPhone } from "@/lib/phoneCountries";

export function PhoneInput({
  id,
  value,
  onChange,
  required,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  required?: boolean;
}) {
  const parsed = useMemo(() => splitPhone(value), [value]);
  const country = PHONE_COUNTRIES.find((c) => c.iso === parsed.iso) ?? PHONE_COUNTRIES[0];

  return (
    <div className="flex gap-2">
      <label className="sr-only" htmlFor={`${id ?? "phone"}-cc`}>
        Indicatif
      </label>
      <select
        id={`${id ?? "phone"}-cc`}
        className="h-10 w-[8.5rem] shrink-0 rounded-md border border-input bg-background px-2 text-sm"
        value={parsed.iso}
        onChange={(e) => onChange(joinPhone(e.target.value, parsed.national))}
      >
        {PHONE_COUNTRIES.map((c) => (
          <option key={c.iso} value={c.iso}>
            {c.flag} {c.dial}
          </option>
        ))}
      </select>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        required={required}
        value={parsed.national}
        placeholder={country.iso === "CI" ? "07 00 00 00 00" : ""}
        onChange={(e) => onChange(joinPhone(parsed.iso, e.target.value))}
      />
    </div>
  );
}
