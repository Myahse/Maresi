import { Outlet, useLocation } from "react-router-dom";

export function AuthLayout() {
  const { pathname } = useLocation();
  const wide = pathname.includes("register");

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center bg-background p-4 font-jakarta">
      <div className={wide ? "w-full max-w-2xl" : "w-full max-w-md"}>
        <Outlet />
      </div>
    </div>
  );
}
