import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { HOST_APP_URL, hostHandoffUrl } from "@/lib/hostApp";
import { isHostAppUser } from "@/lib/hostAccess";

export function HostExitRedirect() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user || !isHostAppUser(user)) return;
    const token = localStorage.getItem("token");
    window.location.assign(token ? hostHandoffUrl({ token, user }) : HOST_APP_URL);
  }, [isAuthenticated, user]);

  return null;
}
