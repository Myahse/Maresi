import { api } from "./api";
import type { User } from "@/types";

const TOKEN_KEY = "token";
const USER_KEY = "user";
const FRONTEND_ONLY = true;

export interface AuthResponse {
  user: User;
  token: string;
}

export async function register(data: {
  email: string;
  password: string;
  full_name: string;
  role?: "client" | "owner";
  phone?: string;
}): Promise<AuthResponse> {
  if (FRONTEND_ONLY) {
    const mock: AuthResponse = {
      user: {
        id: "web-dev-user",
        email: data.email,
        full_name: data.full_name,
        role: data.role ?? "client",
      },
      token: "frontend-only-token",
    };
    localStorage.setItem(TOKEN_KEY, mock.token);
    localStorage.setItem(USER_KEY, JSON.stringify(mock.user));
    return mock;
  }
  const res = await api.post<AuthResponse>("/auth/register", data);
  if (res.token) localStorage.setItem(TOKEN_KEY, res.token);
  if (res.user) localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  return res;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  if (FRONTEND_ONLY) {
    const mock: AuthResponse = {
      user: {
        id: "web-dev-user",
        email,
        full_name: "Frontend User",
        role: "client",
      },
      token: "frontend-only-token",
    };
    localStorage.setItem(TOKEN_KEY, mock.token);
    localStorage.setItem(USER_KEY, JSON.stringify(mock.user));
    return mock;
  }
  const res = await api.post<AuthResponse>("/auth/login", { email, password });
  if (res.token) localStorage.setItem(TOKEN_KEY, res.token);
  if (res.user) localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  return res;
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem(TOKEN_KEY);
}
