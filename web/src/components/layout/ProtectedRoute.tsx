import { Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { t } = useTranslation();
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Dev-only shortcut: skip auth redirects so you can navigate directly.
  // In production builds, this will be false and auth remains enforced.
  const bypassAuth = import.meta.env.DEV;
  if (bypassAuth) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
