import { Outlet, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { DocumentTitle } from "@/components/layout/DocumentTitle";
import { OfflineBanner } from "@/components/layout/OfflineBanner";

export function MainLayout() {
  const { pathname } = useLocation();
  const hideFooter = pathname === "/properties";

  return (
    <div className="min-h-screen flex flex-col">
      <DocumentTitle />
      <OfflineBanner />
      <Header />
      <main
        className={
          hideFooter
            ? "flex-1 overflow-x-clip md:overflow-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0"
            : "flex-1 overflow-x-clip pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0"
        }
      >
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
      <BottomNav />
    </div>
  );
}
