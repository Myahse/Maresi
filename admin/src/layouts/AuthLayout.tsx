import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center bg-background p-4 font-jakarta">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
