import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepperStep {
  id: string;
  label: string;
}

interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  const current = steps[currentStep];
  const progress = ((currentStep + 1) / Math.max(steps.length, 1)) * 100;

  return (
    <nav aria-label="Progress" className={cn("w-full space-y-3", className)}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {currentStep + 1} / {steps.length}
          </p>
          <p className="text-base sm:text-lg font-bold text-foreground">{current?.label}</p>
        </div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
      </div>
      <ol className="hidden lg:flex items-center justify-between gap-1">
        {steps.map((step, index) => {
          const done = index < currentStep;
          const active = index === currentStep;
          return (
            <li key={step.id} className="flex-1 flex flex-col items-center min-w-0">
              <div className="flex items-center w-full">
                {index > 0 && (
                  <div className={cn("h-0.5 flex-1", done || active ? "bg-brand" : "bg-border")} />
                )}
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                    done && "bg-brand border-brand text-white",
                    active && !done && "border-brand text-brand bg-brand/10",
                    !done && !active && "border-border text-muted-foreground bg-card"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className={cn("h-0.5 flex-1", done ? "bg-brand" : "bg-border")} />
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-[10px] font-semibold text-center truncate w-full px-0.5",
                  active ? "text-brand" : done ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
