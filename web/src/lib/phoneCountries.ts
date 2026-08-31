export type PhoneCountry = {
  iso: string;
  name: string;
  dial: string;
  flag: string;
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: "CI", name: "Côte d'Ivoire", dial: "+225", flag: "🇨🇮" },
  { iso: "SN", name: "Sénégal", dial: "+221", flag: "🇸🇳" },
  { iso: "ML", name: "Mali", dial: "+223", flag: "🇲🇱" },
  { iso: "BF", name: "Burkina Faso", dial: "+226", flag: "🇧🇫" },
  { iso: "GN", name: "Guinée", dial: "+224", flag: "🇬🇳" },
  { iso: "GH", name: "Ghana", dial: "+233", flag: "🇬🇭" },
  { iso: "NG", name: "Nigeria", dial: "+234", flag: "🇳🇬" },
  { iso: "TG", name: "Togo", dial: "+228", flag: "🇹🇬" },
  { iso: "BJ", name: "Bénin", dial: "+229", flag: "🇧🇯" },
  { iso: "LR", name: "Liberia", dial: "+231", flag: "🇱🇷" },
  { iso: "SL", name: "Sierra Leone", dial: "+232", flag: "🇸🇱" },
  { iso: "GM", name: "Gambie", dial: "+220", flag: "🇬🇲" },
  { iso: "FR", name: "France", dial: "+33", flag: "🇫🇷" },
  { iso: "US", name: "États-Unis", dial: "+1", flag: "🇺🇸" },
  { iso: "GB", name: "Royaume-Uni", dial: "+44", flag: "🇬🇧" },
  { iso: "MA", name: "Maroc", dial: "+212", flag: "🇲🇦" },
  { iso: "CM", name: "Cameroun", dial: "+237", flag: "🇨🇲" },
];

export function splitPhone(value?: string): { iso: string; national: string } {
  const digits = (value ?? "").replace(/\D/g, "");
  const withPlus = value?.trim().startsWith("+") ? `+${digits}` : digits ? `+${digits}` : "";
  const match = PHONE_COUNTRIES.slice()
    .sort((a, b) => b.dial.length - a.dial.length)
    .find((c) => withPlus.startsWith(c.dial));
  if (match) {
    return { iso: match.iso, national: withPlus.slice(match.dial.length) };
  }
  return { iso: "CI", national: digits };
}

export function joinPhone(iso: string, national: string): string {
  const country = PHONE_COUNTRIES.find((c) => c.iso === iso) ?? PHONE_COUNTRIES[0];
  const digits = national.replace(/\D/g, "");
  return digits ? `${country.dial}${digits}` : "";
}

export function isCompletePhone(value?: string): boolean {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}
