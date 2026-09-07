import { Outlet, useLocation } from "react-router-dom";
import { BrandLogo } from "@/components/layout/BrandLogo";

export function AuthLayout() {
  const { pathname } = useLocation();
  const wide = pathname.includes("register");

  return (
    <div className="min-h-[calc(100dvh-8rem)] bg-background px-4 py-6 sm:py-10 font-jakarta">
      <div className={wide ? "mx-auto w-full max-w-2xl" : "mx-auto w-full max-w-md"}>
        <BrandLogo className="mx-auto mb-6 h-20 object-center" />
        <Outlet />
      </div>
    </div>
  );
}
