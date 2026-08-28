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
  return (
    <nav aria-label="Progress" className={cn("w-full", className)}>
      <ol className="flex items-center justify-between gap-1 sm:gap-2">
        {steps.map((step, index) => {
          const done = index < currentStep;
          const active = index === currentStep;
          return (
            <li key={step.id} className="flex-1 flex flex-col items-center min-w-0">
              <div className="flex items-center w-full">
                {index > 0 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-colors",
                      done || active ? "bg-brand" : "bg-gray-200"
                    )}
                  />
                )}
                <div
                  className={cn(
                    "flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs sm:text-sm font-bold transition-colors",
                    done && "bg-brand border-brand text-white",
                    active && !done && "border-brand text-brand bg-brand/10",
                    !done && !active && "border-gray-300 text-gray-400 bg-white"
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1 transition-colors",
                      done ? "bg-brand" : "bg-gray-200"
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-[10px] sm:text-xs font-semibold text-center truncate w-full px-0.5",
                  active ? "text-brand" : done ? "text-gray-700" : "text-gray-400"
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
