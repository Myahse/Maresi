import { Outlet } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BottomNav } from "@/components/layout/BottomNav";
import { DocumentTitle } from "@/components/layout/DocumentTitle";

export function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <DocumentTitle />
      <Header />
      <main className="flex-1 overflow-x-clip pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
