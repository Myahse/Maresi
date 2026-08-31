import { Outlet, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { DocumentTitle } from "@/components/layout/DocumentTitle";

export function MainLayout() {
  const { pathname } = useLocation();
  const hideFooter = pathname === "/properties";

  return (
    <div className="min-h-screen flex flex-col">
      <DocumentTitle />
      <Header />
      <main
        className={
          hideFooter
            ? "flex-1 overflow-hidden pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0"
            : "flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0"
        }
      >
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
      <BottomNav />
    </div>
  );
}
