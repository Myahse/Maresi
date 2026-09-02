import { Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { canAccessHostApp, isApprovedHost } from "@/lib/hostAccess";

interface ProtectedRouteProps {
  children: React.ReactNode;
  approvedOnly?: boolean;
}

export function ProtectedRoute({ children, approvedOnly }: ProtectedRouteProps) {
  const { t } = useTranslation();
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!isAuthenticated || !canAccessHostApp(user)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.account_status === "suspended" && !location.pathname.startsWith("/owner/account")) {
    return <Navigate to="/owner/account" replace />;
  }

  if (approvedOnly && !isApprovedHost(user)) {
    return <Navigate to="/owner/application" replace />;
  }

  return <>{children}</>;
}
