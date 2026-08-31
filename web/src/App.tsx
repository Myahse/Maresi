import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { AllPropertiesPage } from "@/pages/AllPropertiesPage";
import { PropertyDetailsPage } from "@/pages/PropertyDetailsPage";
import { FavoritesPage } from "@/pages/FavoritesPage";
import { VisitRequestsPage } from "@/pages/VisitRequestsPage";
import { ReservationPage } from "@/pages/ReservationPage";
import { PaymentSuccessPage, PaymentErrorPage } from "@/pages/PaymentResultPages";
import { BecomeHostPage } from "@/pages/BecomeHostPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { AppSplash } from "@/components/layout/AppSplash";
import { ClientRealtimeBridge } from "@/components/realtime/ClientRealtimeBridge";
import { PushPrompt } from "@/components/realtime/PushPrompt";
import { LocationPrompt } from "@/components/location/LocationPrompt";
import { AuthModalProvider } from "@/context/AuthModalContext";

function App() {
  return (
    <>
      <AppSplash />
      <ClientRealtimeBridge />
      <PushPrompt app="web" />
      <LocationPrompt />
      <BrowserRouter>
        <AuthModalProvider>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<LandingPage />} />
              <Route path="login" element={<AuthLayout />}>
                <Route index element={<LoginPage />} />
              </Route>
              <Route path="register" element={<AuthLayout />}>
                <Route index element={<RegisterPage />} />
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
                path="favorites"
                element={
                  <ProtectedRoute>
                    <FavoritesPage />
                  </ProtectedRoute>
                }
              />
              <Route path="payments/success" element={<PaymentSuccessPage />} />
              <Route path="payments/error" element={<PaymentErrorPage />} />
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
