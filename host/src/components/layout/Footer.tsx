import { BrandLogo } from "@/components/layout/BrandLogo";

export function Footer() {
  return (
    <footer className="hidden lg:block py-6 text-center text-sm text-muted-foreground">
      <BrandLogo className="h-12 mx-auto mb-2 object-center" />
    </footer>
  );
}
