import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { VerifyEmailPage } from "@/pages/VerifyEmailPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { AllPropertiesPage } from "@/pages/AllPropertiesPage";
import { PropertyDetailsPage } from "@/pages/PropertyDetailsPage";
import { FavoritesPage } from "@/pages/FavoritesPage";
import { VisitRequestsPage } from "@/pages/VisitRequestsPage";
import { StayAgreementPage } from "@/pages/StayAgreementPage";
import { VisitChatPage } from "@/pages/VisitChatPage";
import { ReservationPage } from "@/pages/ReservationPage";
import { PaymentSuccessPage, PaymentErrorPage } from "@/pages/PaymentResultPages";
import { BecomeHostPage } from "@/pages/BecomeHostPage";
import {
  AccountHubPage,
  AccountPersonalPage,
  AccountDocumentsPage,
  AccountAlertsPage,
  AccountNotificationsPage,
  AccountSecurityPage,
  AccountLanguagePage,
  AccountSystemPage,
  AccountLegalPage,
  AccountSupportPage,
} from "@/pages/account/AccountPages";
import { TermsPage } from "@/pages/TermsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { AppSplash } from "@/components/layout/AppSplash";
import { ClientRealtimeBridge } from "@/components/realtime/ClientRealtimeBridge";
import { PushPrompt } from "@/components/realtime/PushPrompt";
import { LocationPrompt } from "@/components/location/LocationPrompt";
import { AuthModalProvider } from "@/context/AuthModalContext";
import { HostExitRedirect } from "@/components/HostExitRedirect";

function App() {
  return (
    <>
      <AppSplash />
      <ClientRealtimeBridge />
      <PushPrompt app="web" />
      <LocationPrompt />
      <BrowserRouter>
        <AuthModalProvider>
          <HostExitRedirect />
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<LandingPage />} />
              <Route path="login" element={<AuthLayout />}>
                <Route index element={<LoginPage />} />
              </Route>
              <Route path="register" element={<AuthLayout />}>
                <Route index element={<RegisterPage />} />
              </Route>
              <Route path="forgot-password" element={<AuthLayout />}>
                <Route index element={<ForgotPasswordPage />} />
              </Route>
              <Route path="reset-password" element={<AuthLayout />}>
                <Route index element={<ResetPasswordPage />} />
              </Route>
              <Route path="verify-email" element={<AuthLayout />}>
                <Route index element={<VerifyEmailPage />} />
              </Route>
              <Route path="properties" element={<AllPropertiesPage />} />
              <Route path="properties/:id" element={<PropertyDetailsPage />} />
              <Route
                path="properties/:id/reserve"
                element={
                  <ProtectedRoute>
                    <ReservationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="visits"
                element={
                  <ProtectedRoute>
                    <VisitRequestsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="visits/:id/agreement"
                element={
                  <ProtectedRoute>
                    <StayAgreementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="visits/:id/chat"
                element={
                  <ProtectedRoute>
                    <VisitChatPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="favorites"
                element={
                  <ProtectedRoute>
                    <FavoritesPage />
                  </ProtectedRoute>
                }
              />
              <Route path="payments/success" element={<PaymentSuccessPage />} />
              <Route path="payments/error" element={<PaymentErrorPage />} />
              <Route path="terms" element={<TermsPage />} />
              <Route
                path="account"
                element={
                  <ProtectedRoute>
                    <AccountHubPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="account/personal"
                element={
                  <ProtectedRoute>
                    <AccountPersonalPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="account/documents"
                element={
                  <ProtectedRoute>
                    <AccountDocumentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="account/alerts"
                element={
                  <ProtectedRoute>
                    <AccountAlertsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="account/notifications"
                element={
                  <ProtectedRoute>
                    <AccountNotificationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="account/security"
                element={
                  <ProtectedRoute>
                    <AccountSecurityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="account/language"
                element={
                  <ProtectedRoute>
                    <AccountLanguagePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="account/system"
                element={
                  <ProtectedRoute>
                    <AccountSystemPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="account/legal"
                element={
                  <ProtectedRoute>
                    <AccountLegalPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="account/support"
                element={
                  <ProtectedRoute>
                    <AccountSupportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="become-host"
                element={
                  <ProtectedRoute>
                    <BecomeHostPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AuthModalProvider>
      </BrowserRouter>
    </>
  );
}

export default App;
