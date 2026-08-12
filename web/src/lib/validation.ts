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
  return new Date(checkOut) > new Date(checkIn);
}

export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\s/g, "");
  return /^\+?[\d]{8,15}$/.test(cleaned);
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
