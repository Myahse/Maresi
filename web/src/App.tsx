import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import { OwnerDashboardPage } from "@/pages/owner/OwnerDashboardPage";
import { PropertyEditPage } from "@/pages/owner/PropertyEditPage";
import { OwnerVisitsPage } from "@/pages/owner/OwnerVisitsPage";
import { ReservationPage } from "@/pages/ReservationPage";
import { PaymentSuccessPage, PaymentErrorPage } from "@/pages/PaymentResultPages";
import { OwnerSubscriptionPage } from "@/pages/owner/OwnerSubscriptionPage";
import { AppSplash } from "@/components/layout/AppSplash";

function App() {
  return (
    <>
      <AppSplash />
      <BrowserRouter>
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
          <Route path="properties/:id/reserve" element={<ProtectedRoute><ReservationPage /></ProtectedRoute>} />
          <Route path="dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="visits" element={<ProtectedRoute><VisitRequestsPage /></ProtectedRoute>} />
          <Route path="favorites" element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>} />
          <Route path="payments/success" element={<ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>} />
          <Route path="payments/error" element={<ProtectedRoute><PaymentErrorPage /></ProtectedRoute>} />
          <Route path="owner" element={<ProtectedRoute><OwnerDashboardPage /></ProtectedRoute>} />
          <Route path="owner/subscription" element={<ProtectedRoute><OwnerSubscriptionPage /></ProtectedRoute>} />
          <Route path="owner/new" element={<ProtectedRoute><PropertyEditPage /></ProtectedRoute>} />
          <Route path="owner/edit/:id" element={<ProtectedRoute><PropertyEditPage /></ProtectedRoute>} />
          <Route path="owner/visits" element={<ProtectedRoute><OwnerVisitsPage /></ProtectedRoute>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </>
  );
}

export default App;
