import { Outlet } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DocumentTitle } from "@/components/layout/DocumentTitle";

export function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <DocumentTitle />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
