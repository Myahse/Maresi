import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  inverted?: boolean;
  className?: string;
}

export function ThemeToggle({ inverted, className }: ThemeToggleProps) {
  const { t } = useTranslation();
  const { resolved, toggle } = useTheme();
  const isDark = resolved === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "p-2 rounded-full transition-colors",
        inverted ? "text-white hover:bg-white/15" : "text-foreground hover:bg-muted",
        className
      )}
      aria-label={isDark ? t("theme.toLight") : t("theme.toDark")}
      title={isDark ? t("theme.toLight") : t("theme.toDark")}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
