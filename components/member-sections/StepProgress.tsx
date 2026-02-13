// components/StepProgress.tsx
// Reusable step progress indicator with navigation

"use client";

import { LucideIcon } from "lucide-react";

export interface Step {
  num: number;
  title: string;
  icon: LucideIcon;
}

interface StepProgressProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepNum: number) => void;
  mode?: "create" | "edit" | "renew";
}

export default function StepProgress({
  steps,
  currentStep,
  onStepClick,
  mode = "edit",
}: StepProgressProps) {
  const handleStepClick = (stepNum: number) => {
    // Only allow navigation in edit/renew modes, not in create mode
    if (mode !== "create" && onStepClick) {
      onStepClick(stepNum);
    }
  };

  const isClickable = mode !== "create";

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
      <div className="flex justify-between items-center">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.num;
          const isComplete = currentStep > step.num;
          const isPast = currentStep > step.num;

          return (
            <div key={step.num} className="flex-1 relative">
              {/* Connecting Line (except for last item) */}
              {index < steps.length - 1 && (
                <div className="absolute left-1/2 top-6 w-full h-1 -z-10">
                  <div
                    className={`h-full transition-all ${
                      isComplete ? "bg-purple-500" : "bg-slate-200"
                    }`}
                  />
                </div>
              )}

              {/* Step Item */}
              <button
                onClick={() => handleStepClick(step.num)}
                disabled={!isClickable}
                className={`flex flex-col items-center gap-2 w-full transition-all ${
                  isClickable ? "cursor-pointer" : "cursor-default"
                } ${isClickable && !isActive ? "hover:scale-105" : ""}`}
              >
                {/* Icon Circle */}
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-black transition-all ${
                    isActive
                      ? "bg-purple-600 text-white shadow-lg scale-110"
                      : isComplete
                        ? "bg-green-500 text-white"
                        : "bg-slate-200 text-slate-400"
                  } ${isClickable && !isActive ? "hover:bg-purple-500 hover:text-white" : ""}`}
                >
                  {isComplete && mode !== "create" ? (
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <Icon size={20} />
                  )}
                </div>

                {/* Step Title */}
                <p
                  className={`text-xs font-bold text-center transition-all ${
                    isActive
                      ? "text-purple-600 scale-105"
                      : isPast && isClickable
                        ? "text-green-600"
                        : "text-slate-400"
                  }`}
                >
                  {step.title}
                </p>
              </button>
            </div>
          );
        })}
      </div>

      {/* Mode Indicator (optional) */}
      {mode === "renew" && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className="text-center text-sm text-purple-600 font-bold">
            💡 Click any step to jump directly to that section
          </p>
        </div>
      )}
    </div>
  );
}
