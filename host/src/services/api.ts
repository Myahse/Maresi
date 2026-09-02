import type { Property, PropertyRating, RatingStats, AppNotification } from "@/types";
import {
  enqueueRequest,
  flushQueue,
  isBrowserOnline,
  isNetworkFailure,
  readCache,
  shouldCachePath,
  shouldQueuePath,
  sleep,
  writeCache,
} from "@/lib/offline";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";
/** Render free cold start often exceeds 15s; aborting looks like "Fetch is aborted". */
const REQUEST_TIMEOUT_MS = 90_000;
export const SERVER_WAKING_MESSAGE =
  "Le serveur démarre. Patientez quelques secondes et réessayez.";

export const SESSION_EXPIRED_EVENT = "maresi:session-expired";

function getToken(): string | null {
  return localStorage.getItem("token");
}

function handleUnauthorized(path: string, hadToken: boolean) {
  if (!hadToken || isAuthPath(path) || typeof window === "undefined") return;
  if (!localStorage.getItem("token") && !localStorage.getItem("user")) return;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  void import("@/lib/offline").then((m) => m.clearOfflineSession()).catch(() => undefined);
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

type Envelope = {
  hasError?: boolean;
  status?: { message?: string } | string;
  item?: unknown;
  items?: unknown;
  error?: string;
};

function envelopeMessage(data: Envelope, fallback: string): string {
  if (typeof data.status === "object" && data.status?.message) return data.status.message;
  if (typeof data.status === "string") return data.status;
  if (data.error) return data.error;
  return fallback;
}

function unwrapEnvelope<T>(data: unknown): T {
  if (!data || typeof data !== "object") return data as T;
  const env = data as Envelope;
  if (env.hasError) {
    throw new Error(envelopeMessage(env, "Request failed"));
  }
  if ("item" in env && env.item != null) return env.item as T;
  if ("items" in env && env.items != null) return env.items as T;
  return data as T;
}

function isAbortError(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "name" in error) {
    if ((error as { name: string }).name === "AbortError") return true;
  }
  const text = error instanceof Error ? error.message : String(error);
  return /abort/i.test(text);
}

export function isWakingError(error: unknown): boolean {
  if (isAbortError(error)) return true;
  const text = error instanceof Error ? error.message : String(error);
  return text === SERVER_WAKING_MESSAGE || /serveur démarre/i.test(text);
}

function toRequestError(error: unknown): Error {
  if (isAbortError(error)) return new Error(SERVER_WAKING_MESSAGE);
  return error instanceof Error ? error : new Error(String(error));
}

function isAuthPath(path: string): boolean {
  return path.startsWith("/auth/");
}

async function rawRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const attachAuth = !!token && !isAuthPath(path);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (attachAuth) headers.Authorization = `Bearer ${token}`;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers, signal: controller.signal });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && attachAuth) {
      handleUnauthorized(path, true);
      const method = (options.method || "GET").toUpperCase();
      if (method === "GET" && !path.startsWith("/users/")) {
        const retryHeaders = { ...headers };
        delete retryHeaders.Authorization;
        const retry = await fetch(`${API_BASE}${path}`, { ...options, headers: retryHeaders, signal: controller.signal });
        const retryData = await retry.json().catch(() => ({}));
        if (retry.ok && !(retryData && typeof retryData === "object" && (retryData as Envelope).hasError)) {
          return unwrapEnvelope<T>(retryData);
        }
      }
    }
    if (!res.ok || (data && typeof data === "object" && (data as Envelope).hasError)) {
      throw new Error(envelopeMessage(data as Envelope, res.statusText || "Request failed"));
    }
    return unwrapEnvelope<T>(data);
  } catch (error) {
    throw toRequestError(error);
  } finally {
    window.clearTimeout(timer);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const isRead = method === "GET";
  const attempts = isRead ? 3 : 2;
  let lastError: Error | null = null;

  for (let i = 0; i < attempts; i++) {
    try {
      const result = await rawRequest<T>(path, options);
      if (shouldCachePath(path, method)) writeCache(path, result);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const retry =
        (isRead || isAuthPath(path)) && isNetworkFailure(error) && i < attempts - 1;
      if (!retry) break;
      await sleep(800 * 2 ** i);
    }
  }

  if (isRead) {
    const cached = readCache<T>(path);
    if (cached !== undefined) return cached;
  }
  if (shouldQueuePath(path, method) && (lastError && isNetworkFailure(lastError) || !isBrowserOnline())) {
    enqueueRequest({ path, method, body: typeof options.body === "string" ? options.body : undefined });
    throw new Error("OFFLINE_QUEUED");
  }
  throw lastError ?? new Error("Request failed");
}

function wakeApi() {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  void fetch(`${API_BASE}/health`, { method: "GET", cache: "no-store", signal: controller.signal })
    .catch(() => undefined)
    .finally(() => window.clearTimeout(timer));
}

function startQueueFlush() {
  void flushQueue((item) => rawRequest(item.path, { method: item.method, body: item.body }));
}

if (typeof window !== "undefined") {
  window.addEventListener("online", startQueueFlush);
  startQueueFlush();
  wakeApi();
}

function wrapBody(body: unknown): string {
  if (body && typeof body === "object" && !Array.isArray(body) && "data" in (body as object)) {
    return JSON.stringify(body);
  }
  return JSON.stringify({ data: body ?? {} });
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown = {}) =>
    request<T>(path, { method: "POST", body: wrapBody(body) }),
  put: <T>(path: string, body: unknown = {}) =>
    request<T>(path, { method: "PUT", body: wrapBody(body) }),
  patch: <T>(path: string, body: unknown = {}) =>
    request<T>(path, { method: "PATCH", body: wrapBody(body) }),
  delete: (path: string) => request(path, { method: "DELETE" }),
};

function emptyRatingStats(): RatingStats {
  return {
    average: 0,
    count: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };
}

async function parseFormResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) handleUnauthorized("/users/me", true);
  if (!res.ok) {
    throw new Error(envelopeMessage(data as Envelope, "Failed"));
  }
  return unwrapEnvelope<T>(data);
}

export function getProperties(params?: {
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  property_type?: string;
  mine?: boolean;
}) {
  const q = new URLSearchParams();
  if (params?.location) q.set("location", params.location);
  if (params?.minPrice != null) q.set("minPrice", String(params.minPrice));
  if (params?.maxPrice != null) q.set("maxPrice", String(params.maxPrice));
  if (params?.property_type) q.set("property_type", params.property_type);
  if (params?.mine) q.set("mine", "true");
  const query = q.toString();
  return api.get<Property[]>(`/properties${query ? `?${query}` : ""}`);
}

export function getMyProfile() {
  return api.get<import("@/types").UserProfile>("/users/me");
}

export function updateMyIdentity(formData: FormData) {
  const token = getToken();
  return fetch(`${API_BASE}/users/me/identity`, {
    method: "PATCH",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  }).then((res) => parseFormResponse<import("@/types").UserProfile>(res));
}

export function getProperty(id: string) {
  return api.get<Property>(`/properties/${id}`);
}

/** Soft-fail: ratings REST is not implemented on Spring yet. */
export async function getPropertyRatings(propertyId: string) {
  try {
    const data = await api.get<{ ratings?: PropertyRating[]; statistics?: RatingStats } | PropertyRating[]>(
      `/properties/${propertyId}/ratings`
    );
    if (Array.isArray(data)) {
      return { ratings: data, statistics: emptyRatingStats() };
    }
    return {
      ratings: data.ratings ?? [],
      statistics: data.statistics ?? emptyRatingStats(),
    };
  } catch {
    return { ratings: [] as PropertyRating[], statistics: emptyRatingStats() };
  }
}

export function submitPropertyRating(propertyId: string, score: number, comment?: string) {
  return api.post<PropertyRating>(`/properties/${propertyId}/ratings`, {
    score,
    comment,
  });
}

export function uploadPropertyImages(files: File[]) {
  const token = getToken();
  const formData = new FormData();
  files.forEach((file) => formData.append("images", file));
  return fetch(`${API_BASE}/uploads/images`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  }).then((res) => parseFormResponse<{ urls: string[] }>(res));
}

export function createProperty(formData: FormData) {
  const token = getToken();
  return fetch(`${API_BASE}/properties`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  }).then((res) => parseFormResponse<Property>(res));
}

export function updateProperty(id: string, formData: FormData) {
  const token = getToken();
  return fetch(`${API_BASE}/properties/${id}`, {
    method: "PUT",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  }).then((res) => parseFormResponse<Property>(res));
}

export function deleteProperty(id: string) {
  return api.delete(`/properties/${id}`);
}

export function getFavorites() {
  return api.get<import("@/types").Favorite[]>(`/favorites`);
}

export function addFavorite(propertyId: string) {
  return api.post<{ propertyId: string }>(`/favorites`, { propertyId });
}

export function removeFavorite(propertyId: string) {
  return api.delete(`/favorites/${propertyId}`);
}

export function requestVisit(payload: import("@/types").VisitRequestPayload) {
  return api.post<import("@/types").VisitRequest>(`/visit-requests`, payload);
}

export function getMyVisitRequests() {
  return api.get<import("@/types").VisitRequest[]>(`/visit-requests`);
}

export function getOwnerVisitRequests() {
  return api.get<import("@/types").VisitRequest[]>(`/visit-requests/owner`);
}

export function confirmVisitKey(id: string, code: string) {
  return api.post<import("@/types").VisitRequest>(`/visit-requests/${id}/key`, { code });
}

export function signHostAgreement(id: string, fullName: string) {
  return api.post<import("@/types").VisitRequest>(`/visit-requests/${id}/host-agreement`, {
    full_name: fullName,
    accepted: true,
  });
}

export function getVisitRequest(id: string) {
  return api.get<import("@/types").VisitRequest>(`/visit-requests/${id}`);
}

export function getNotifications() {
  return api.get<AppNotification[]>(`/notifications`);
}

export function markNotificationsRead() {
  return api.patch(`/notifications/read-all`);
}

export function changeMyPassword(currentPassword: string, newPassword: string) {
  return api.patch(`/users/me/password`, {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export function decideStayExtension(id: string, status: "approved" | "declined", note?: string) {
  return api.post<import("@/types").VisitRequest>(`/visit-requests/${id}/extension/decision`, {
    status,
    note,
  });
}

export function billStayOverstay(id: string, checkOut: string) {
  return api.post<import("@/types").VisitRequest>(`/visit-requests/${id}/overstay`, {
    check_out: checkOut,
  });
}

export function closeStay(id: string, score: number, note?: string) {
  return api.post<import("@/types").VisitRequest>(`/visit-requests/${id}/close`, {
    score,
    note,
  });
}

export function confirmStayExtensionPayment(id: string) {
  return api.post<import("@/types").VisitRequest>(`/visit-requests/${id}/extension/confirm`, {});
}

export function updateVisitRequestStatus(
  id: string,
  status: import("@/types").VisitRequestStatus,
  ownerNote?: string
) {
  return api.patch<import("@/types").VisitRequest>(`/visit-requests/${id}/status`, {
    status,
    ownerNote,
  });
}

export function getMySubscription() {
  return api.get<import("@/types").OwnerSubscription>(`/subscriptions/me`);
}

export function startSubscriptionPayment() {
  return api.post<import("@/types").Payment>(`/payments/subscription`, {});
}

export function startCommissionSettlement() {
  return api.post<import("@/types").Payment>(`/payments/commission`, {});
}

export function startWalletTopup(amount: number) {
  return api.post<import("@/types").Payment>(`/payments/wallet-topup`, { amount });
}

export function startWalletPayout(payload: {
  amount: number;
  provider: "wave" | "orange_money";
  phone: string;
}) {
  return api.post<import("@/types").Payment>(`/payments/payout`, payload);
}

export function startReservationPayment(visitRequestId: string) {
  return api.post<import("@/types").Payment>(`/payments/reservation`, { visitRequestId });
}

export function confirmPayment(reference: string) {
  return api.post<import("@/types").Payment>(`/payments/confirm`, { reference });
}

export function submitHostApplication(payload: {
  full_name: string;
  phone: string;
  city?: string;
  message?: string;
  id_card?: string;
}) {
  return api.post<import("@/types").HostApplication>(`/host-applications`, {
    full_name: payload.full_name,
    fullName: payload.full_name,
    phone: payload.phone,
    city: payload.city,
    message: payload.message,
    id_card: payload.id_card,
  });
}

export function getVapidPublicKey() {
  return api.get<{ public_key: string }>(`/push/vapid`);
}

export function subscribePush(payload: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  app: "web" | "host" | "admin";
}) {
  return api.post<{ id: string }>(`/push/subscribe`, payload);
}

export function getMyHostApplication() {
  return api.get<import("@/types").HostApplication>(`/host-applications/me`);
}

export function getAdminHostApplications(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return api.get<import("@/types").HostApplication[]>(`/admin/host-applications${q}`);
}

export function reviewHostApplication(
  id: string,
  status: "approved" | "rejected",
  adminNote?: string
) {
  return api.patch<import("@/types").HostApplication>(`/admin/host-applications/${id}`, {
    status,
    admin_note: adminNote,
    adminNote,
  });
}
