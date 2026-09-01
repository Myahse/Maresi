import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { HOST_APP_URL, hostHandoffUrl } from "@/lib/hostApp";
import { isHostAppUser } from "@/lib/hostAccess";

function isHostWorkspacePath(pathname: string) {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export function HostExitRedirect() {
  const { user, isAuthenticated } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!isAuthenticated || !user || !isHostAppUser(user)) return;
    if (!isHostWorkspacePath(pathname)) return;
    const token = localStorage.getItem("token");
    window.location.assign(token ? hostHandoffUrl({ token, user }) : HOST_APP_URL);
  }, [isAuthenticated, user, pathname]);

  return null;
}
