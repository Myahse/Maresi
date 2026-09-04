export const MIN_PROPERTY_PHOTOS = 12;

export function hasMinPropertyPhotos(files: File[]): boolean {
  return files.length >= MIN_PROPERTY_PHOTOS;
}

export function isFutureDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
}

export function isValidDateRange(checkIn: string, checkOut: string): boolean {
  if (!checkIn || !checkOut) return false;
  return new Date(checkOut) >= new Date(checkIn);
}

export const TIME_STEP_MINUTES = 15;

export function parseClockMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatClockMinutes(total: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 45, total));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Same-day stay: arrival must be at least one 15-min slot before departure. */
export function orderSameDayTimes(arrival: string, departure: string): { arrival: string; departure: string } {
  const arrivalMins = parseClockMinutes(arrival) ?? 14 * 60;
  const departureMins = parseClockMinutes(departure) ?? 12 * 60;
  if (arrivalMins < departureMins) {
    return { arrival: formatClockMinutes(arrivalMins), departure: formatClockMinutes(departureMins) };
  }
  if (arrivalMins + TIME_STEP_MINUTES <= 23 * 60 + 45) {
    return {
      arrival: formatClockMinutes(arrivalMins),
      departure: formatClockMinutes(arrivalMins + TIME_STEP_MINUTES),
    };
  }
  return { arrival: "23:30", departure: "23:45" };
}

export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\s/g, "");
  return /^\+?[\d]{8,15}$/.test(cleaned);
}

export const MIN_REGISTER_AGE = 18;

export function maxAdultBirthDate(minAge = MIN_REGISTER_AGE): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - minAge);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function isAdultBirthDate(iso: string, minAge = MIN_REGISTER_AGE): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [year, month, day] = iso.split("-").map(Number);
  const birth = new Date(year, month - 1, day);
  if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) {
    return false;
  }
  const limit = new Date();
  limit.setHours(0, 0, 0, 0);
  limit.setFullYear(limit.getFullYear() - minAge);
  return birth <= limit;
}

export function isValidIdCard(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 5) return false;
  return /^[A-Za-z0-9\-/\s]+$/.test(trimmed);
}

export function isPositiveInt(value: string | number, min = 1): boolean {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isInteger(n) && n >= min;
}

export function isValidPrice(value: string): boolean {
  const n = Number(value);
  return !Number.isNaN(n) && n > 0;
}

export function isValidUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
