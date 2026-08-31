import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import { NotFoundPage } from "@/pages/NotFoundPage";
import { AppSplash } from "@/components/layout/AppSplash";
import { PushPrompt } from "@/components/realtime/PushPrompt";

function AdminPage({ children }: { children: ReactNode }) {
  return <ProtectedRoute roles={["admin"]}>{children}</ProtectedRoute>;
}

function App() {
  return (
    <>
      <AppSplash />
      <PushPrompt app="admin" />
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
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
