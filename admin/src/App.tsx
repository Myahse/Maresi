import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { MainLayout } from "@/layouts/MainLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LoginPage } from "@/pages/LoginPage";
import { AdminOverviewPage } from "@/pages/AdminOverviewPage";
import { AdminApplicationsPage } from "@/pages/AdminApplicationsPage";
import { AdminUsersPage } from "@/pages/AdminUsersPage";
import { AdminPaymentsPage } from "@/pages/AdminPaymentsPage";
import { AdminSubscriptionsPage } from "@/pages/AdminSubscriptionsPage";
import { AppSplash } from "@/components/layout/AppSplash";

function AdminPage({ children }: { children: ReactNode }) {
  return <ProtectedRoute roles={["admin"]}>{children}</ProtectedRoute>;
}

function App() {
  return (
    <>
      <AppSplash />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route path="login" element={<AuthLayout />}>
              <Route index element={<LoginPage />} />
            </Route>
            <Route index element={<AdminPage><AdminOverviewPage /></AdminPage>} />
            <Route path="applications" element={<AdminPage><AdminApplicationsPage /></AdminPage>} />
            <Route path="users" element={<AdminPage><AdminUsersPage /></AdminPage>} />
            <Route path="payments" element={<AdminPage><AdminPaymentsPage /></AdminPage>} />
            <Route path="subscriptions" element={<AdminPage><AdminSubscriptionsPage /></AdminPage>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
