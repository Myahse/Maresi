import { Outlet, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DocumentTitle } from "@/components/layout/DocumentTitle";

export function MainLayout() {
  const { pathname } = useLocation();
  // Full-height map browse only — property detail pages keep the footer
  const hideFooter = pathname === "/properties";

  return (
    <div className="min-h-screen flex flex-col">
      <DocumentTitle />
      <Header />
      <main className={hideFooter ? "flex-1 overflow-hidden" : "flex-1"}>
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}
