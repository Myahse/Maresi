import type { User } from "@/types";

export function isHostAppUser(user: Pick<User, "role" | "host_status"> | null | undefined): boolean {
  if (!user) return false;
  if (user.role === "owner") return true;
  return user.host_status === "pending" || user.host_status === "rejected" || user.host_status === "approved";
}
