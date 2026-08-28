import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LoginPage } from "@/pages/LoginPage";
import { OwnerDashboardPage } from "@/pages/owner/OwnerDashboardPage";
import { PropertyEditPage } from "@/pages/owner/PropertyEditPage";
import { OwnerVisitsPage } from "@/pages/owner/OwnerVisitsPage";
import { OwnerSubscriptionPage } from "@/pages/owner/OwnerSubscriptionPage";
import { PaymentSuccessPage, PaymentErrorPage } from "@/pages/PaymentResultPages";
import { AppSplash } from "@/components/layout/AppSplash";
import { HostRealtimeBridge } from "@/components/realtime/HostRealtimeBridge";

function App() {
  return (
    <>
      <AppSplash />
      <HostRealtimeBridge />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route path="login" element={<AuthLayout />}>
              <Route index element={<LoginPage />} />
            </Route>
            <Route index element={<ProtectedRoute roles={["owner"]}><OwnerDashboardPage /></ProtectedRoute>} />
            <Route path="owner" element={<ProtectedRoute roles={["owner"]}><OwnerDashboardPage /></ProtectedRoute>} />
            <Route path="owner/subscription" element={<ProtectedRoute roles={["owner"]}><OwnerSubscriptionPage /></ProtectedRoute>} />
            <Route path="owner/new" element={<ProtectedRoute roles={["owner"]}><PropertyEditPage /></ProtectedRoute>} />
            <Route path="owner/edit/:id" element={<ProtectedRoute roles={["owner"]}><PropertyEditPage /></ProtectedRoute>} />
            <Route path="owner/visits" element={<ProtectedRoute roles={["owner"]}><OwnerVisitsPage /></ProtectedRoute>} />
            <Route path="payments/success" element={<ProtectedRoute roles={["owner"]}><PaymentSuccessPage /></ProtectedRoute>} />
            <Route path="payments/error" element={<ProtectedRoute roles={["owner"]}><PaymentErrorPage /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
