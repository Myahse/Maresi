import { api } from "./api";
import type { User, UserRole } from "@/types";

const TOKEN_KEY = "token";
const USER_KEY = "user";

export interface AuthResponse {
  user: User;
  token: string;
}

function isRole(value: unknown): value is UserRole {
  return value === "client" || value === "owner" || value === "admin";
}

/** Normalize backend auth payload (UUID ids, snake/camel name fields). */
export function normalizeAuthResponse(raw: unknown): AuthResponse {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid auth response");
  }
  const data = raw as Record<string, unknown>;
  const token = typeof data.token === "string" ? data.token : "";
  const userRaw = data.user;
  if (!token || !userRaw || typeof userRaw !== "object") {
    throw new Error("Invalid auth response");
  }
  const u = userRaw as Record<string, unknown>;
  const firstName = typeof u.first_name === "string" ? u.first_name : typeof u.firstName === "string" ? u.firstName : "";
  const lastName = typeof u.last_name === "string" ? u.last_name : typeof u.lastName === "string" ? u.lastName : "";
  const fullName =
    (typeof u.full_name === "string" && u.full_name) ||
    (typeof u.fullName === "string" && u.fullName) ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    "";
  const email = typeof u.email === "string" ? u.email : "";
  const id = u.id != null ? String(u.id) : "";
  const role = isRole(u.role) ? u.role : "client";
  if (!id || !email) {
    throw new Error("Invalid auth response");
  }
  return {
    token,
    user: {
      id,
      email,
      full_name: fullName || email,
      role,
      ...(firstName ? { first_name: firstName } : {}),
      ...(lastName ? { last_name: lastName } : {}),
      ...(typeof u.birth_date === "string" && u.birth_date ? { birth_date: u.birth_date } : {}),
      ...(typeof u.gender === "string" && u.gender ? { gender: u.gender } : {}),
      ...(typeof u.phone === "string" && u.phone ? { phone: u.phone } : {}),
      ...(typeof u.account_status === "string" && u.account_status ? { account_status: u.account_status as User["account_status"] } : {}),
      ...(typeof u.review_message === "string" && u.review_message ? { review_message: u.review_message } : {}),
    } as User,
  };
}

function persistAuth(res: AuthResponse): AuthResponse {
  localStorage.setItem(TOKEN_KEY, res.token);
  localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  return res;
}

export function applySession(res: AuthResponse): AuthResponse {
  return persistAuth(res);
}

export function consumeHandoff(): AuthResponse | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
  if (!hash.startsWith("handoff=")) return null;
  try {
    const raw = decodeURIComponent(hash.slice("handoff=".length));
    const parsed = normalizeAuthResponse(JSON.parse(raw));
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    return persistAuth(parsed);
  } catch {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    return null;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export type RegisterResult = AuthResponse | { needsEmailVerification: true; email: string };

export async function forgotPassword(email: string, app: "guest" | "host" = "guest"): Promise<void> {
  await api.post("/auth/forgot-password", { email: email.trim(), app });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await api.post("/auth/reset-password", { token, password });
}

export async function verifyEmail(token: string): Promise<{
  verified?: boolean;
  role?: string;
  email?: string;
  host_application?: boolean;
}> {
  return api.post("/auth/verify-email", { token });
}

export async function resendVerification(email: string): Promise<void> {
  await api.post("/auth/resend-verification", { email: email.trim() });
}

export async function register(data: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender: string;
  role?: "client" | "owner";
  phone: string;
  id_card: string;
  selfie: File;
  id_card_photo: File;
  id_card_back?: File;
}): Promise<RegisterResult> {
  const firstName = data.first_name.trim();
  const lastName = data.last_name.trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const form = new FormData();
  form.append("email", data.email.trim());
  form.append("password", data.password);
  form.append("first_name", firstName);
  form.append("last_name", lastName);
  form.append("birth_date", data.birth_date);
  form.append("gender", data.gender);
  form.append("fullName", fullName);
  form.append("full_name", fullName);
  form.append("role", data.role === "owner" ? "owner" : "client");
  form.append("id_card", data.id_card.trim());
  form.append("phone", data.phone.trim());
  form.append("selfie", data.selfie);
  form.append("id_card_photo", data.id_card_photo);
  if (data.id_card_back) form.append("id_card_back", data.id_card_back);

  const res = await fetch(`${import.meta.env.VITE_API_URL ?? "/api"}/auth/register`, {
    method: "POST",
    body: form,
  });
  const dataJson = await res.json().catch(() => ({}));
  if (!res.ok || (dataJson && typeof dataJson === "object" && dataJson.hasError)) {
    const status = dataJson?.status;
    const message =
      (typeof status === "object" && status?.message) ||
      (typeof status === "string" && status) ||
      dataJson?.error ||
      "Registration failed";
    throw new Error(message);
  }
  const payload = dataJson?.item ?? dataJson;
  if (payload && typeof payload === "object" && payload.needs_email_verification) {
    return {
      needsEmailVerification: true,
      email: typeof payload.email === "string" ? payload.email : data.email.trim(),
    };
  }
  return persistAuth(normalizeAuthResponse(payload));
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post<unknown>("/auth/login", {
    email: email.trim(),
    password,
  });
  return persistAuth(normalizeAuthResponse(res));
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  void import("@/lib/offline").then((m) => m.clearOfflineSession()).catch(() => undefined);
}

export function mergeStoredUser(partial: Partial<User>): User | null {
  const current = getStoredUser();
  if (!current) return null;
  const next = { ...current, ...partial };
  if (!partial.review_message) delete next.review_message;
  localStorage.setItem(USER_KEY, JSON.stringify(next));
  return next;
}

export function getStoredUser(): User | null {
  try {
    const token = getToken();
    const raw = localStorage.getItem(USER_KEY);
    if (!token || !raw) {
      if (token || raw) logout();
      return null;
    }
    // Drop leftover frontend-only mock sessions
    if (token === "frontend-only-token") {
      logout();
      return null;
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const normalized = normalizeAuthResponse({ token, user: parsed });
    return normalized.user;
  } catch {
    logout();
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken() && !!getStoredUser();
}
