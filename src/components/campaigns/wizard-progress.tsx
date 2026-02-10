"use client";

import { cn } from "@/lib/utils";

const steps = [
  { number: 1, label: "Basics" },
  { number: 2, label: "Email" },
  { number: 3, label: "Sequence" },
  { number: 4, label: "Review" },
];

interface Props {
  currentStep: number;
}

export function WizardProgress({ currentStep }: Props) {
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, i) => (
        <div key={step.number} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                currentStep === step.number
                  ? "bg-primary text-primary-foreground"
                  : currentStep > step.number
                    ? "bg-primary/20 text-primary"
                    : "bg-secondary text-muted-foreground"
              )}
            >
              {currentStep > step.number ? (
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                step.number
              )}
            </div>
            <span
              className={cn(
                "hidden text-sm sm:inline",
                currentStep === step.number
                  ? "font-medium text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "h-px w-8 sm:w-12",
                currentStep > step.number ? "bg-primary/30" : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
