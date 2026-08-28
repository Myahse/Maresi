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
  const fullName =
    (typeof u.full_name === "string" && u.full_name) ||
    (typeof u.fullName === "string" && u.fullName) ||
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
      ...(typeof u.phone === "string" && u.phone ? { phone: u.phone } : {}),
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

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export async function register(data: {
  email: string;
  password: string;
  full_name: string;
  role?: "client" | "owner";
  phone?: string;
}): Promise<AuthResponse> {
  const payload: Record<string, unknown> = {
    email: data.email.trim(),
    password: data.password,
    fullName: data.full_name.trim(),
    full_name: data.full_name.trim(),
    role: "client",
  };
  if (data.phone?.trim()) payload.phone = data.phone.trim();

  const res = await api.post<unknown>("/auth/register", payload);
  return persistAuth(normalizeAuthResponse(res));
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
