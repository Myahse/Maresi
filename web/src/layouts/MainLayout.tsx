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
            ? "flex-1 overflow-x-hidden overflow-y-auto md:overflow-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0"
            : "flex-1 overflow-x-hidden pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0"
        }
      >
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
      <BottomNav />
    </div>
  );
}
