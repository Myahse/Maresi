import type { User } from "@/types";

export function isApprovedHost(user: Pick<User, "role" | "host_status"> | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.host_status === "approved";
}

export function canAccessHostApp(user: Pick<User, "role" | "host_status"> | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "owner" || user.role === "admin") return true;
  return user.host_status === "pending" || user.host_status === "rejected";
}
