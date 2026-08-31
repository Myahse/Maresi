import type { ReactNode } from "react";

export function WizardPane({ children, step }: { children: ReactNode; step: number }) {
  return (
    <div key={step} className="wizard-pane space-y-4">
      {children}
    </div>
  );
}
