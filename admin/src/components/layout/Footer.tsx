import { BrandLogo } from "@/components/layout/BrandLogo";

export function Footer() {
  return (
    <footer className="hidden lg:block py-6 text-center text-sm text-gray-500">
      <BrandLogo className="h-12 mx-auto object-center" />
    </footer>
  );
}
