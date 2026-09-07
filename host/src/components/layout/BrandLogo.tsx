import { cn } from "@/lib/utils";
import { useTheme } from "@/context/ThemeContext";

interface BrandLogoProps {
  className?: string;
  alt?: string;
  /** `white` for the navy navbar; otherwise follows light/dark theme. */
  variant?: "auto" | "white" | "color";
}

export function BrandLogo({ className, alt = "Maresi Propriétaires", variant = "auto" }: BrandLogoProps) {
  const { resolved } = useTheme();
  const useWhite = variant === "white" || (variant === "auto" && resolved === "dark");

  return (
    <img
      src={useWhite ? "/logo-white.png" : "/logo.png"}
      alt={alt}
      className={cn("h-12 w-auto object-contain object-left", className)}
      draggable={false}
    />
  );
}
