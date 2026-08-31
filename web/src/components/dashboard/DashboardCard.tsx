import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  className?: string;
}

export function DashboardCard({ title, description, icon: Icon, onClick, className }: DashboardCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-left bg-card rounded-2xl border-2 border-border p-5 sm:p-6",
        "hover:border-brand hover:shadow-lg hover:-translate-y-1 transition-all duration-200",
        className
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-brand" />
      </div>
      <h3 className="font-bold text-foreground text-lg">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </button>
  );
}
