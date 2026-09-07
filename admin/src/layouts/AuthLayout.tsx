import { Outlet } from "react-router-dom";
import { BrandLogo } from "@/components/layout/BrandLogo";

export function AuthLayout() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center bg-background p-4 font-jakarta">
      <div className="w-full max-w-md">
        <BrandLogo className="mx-auto mb-6 h-20 object-center" />
        <Outlet />
      </div>
    </div>
  );
}
