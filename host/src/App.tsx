import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { VerifyEmailPage } from "@/pages/VerifyEmailPage";
import { OwnerDashboardPage } from "@/pages/owner/OwnerDashboardPage";
import { HostApplicationPage } from "@/pages/owner/HostApplicationPage";
import { PropertyEditPage } from "@/pages/owner/PropertyEditPage";
import { OwnerVisitsPage } from "@/pages/owner/OwnerVisitsPage";
import { OwnerIdentityPage } from "@/pages/owner/OwnerIdentityPage";
import { OwnerSubscriptionPage } from "@/pages/owner/OwnerSubscriptionPage";
import { PaymentSuccessPage, PaymentErrorPage } from "@/pages/PaymentResultPages";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { AppSplash } from "@/components/layout/AppSplash";
import { HostRealtimeBridge } from "@/components/realtime/HostRealtimeBridge";
import { PushPrompt } from "@/components/realtime/PushPrompt";
import { LocationPrompt } from "@/components/location/LocationPrompt";

function App() {
  return (
    <>
      <AppSplash />
      <HostRealtimeBridge />
      <PushPrompt app="host" />
      <LocationPrompt />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route path="login" element={<AuthLayout />}>
              <Route index element={<LoginPage />} />
            </Route>
            <Route path="forgot-password" element={<AuthLayout />}>
              <Route index element={<ForgotPasswordPage />} />
            </Route>
            <Route path="reset-password" element={<AuthLayout />}>
              <Route index element={<ResetPasswordPage />} />
            </Route>
            <Route path="register" element={<AuthLayout />}>
              <Route index element={<RegisterPage />} />
            </Route>
            <Route path="verify-email" element={<AuthLayout />}>
              <Route index element={<VerifyEmailPage />} />
            </Route>
            <Route index element={<ProtectedRoute><OwnerDashboardPage /></ProtectedRoute>} />
            <Route path="owner" element={<ProtectedRoute><OwnerDashboardPage /></ProtectedRoute>} />
            <Route path="owner/application" element={<ProtectedRoute><HostApplicationPage /></ProtectedRoute>} />
            <Route path="owner/subscription" element={<ProtectedRoute approvedOnly><OwnerSubscriptionPage /></ProtectedRoute>} />
            <Route path="owner/new" element={<ProtectedRoute approvedOnly><PropertyEditPage /></ProtectedRoute>} />
            <Route path="owner/edit/:id" element={<ProtectedRoute approvedOnly><PropertyEditPage /></ProtectedRoute>} />
            <Route path="owner/visits" element={<ProtectedRoute approvedOnly><OwnerVisitsPage /></ProtectedRoute>} />
            <Route path="owner/account" element={<ProtectedRoute><OwnerIdentityPage /></ProtectedRoute>} />
            <Route path="payments/success" element={<PaymentSuccessPage />} />
            <Route path="payments/error" element={<PaymentErrorPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
