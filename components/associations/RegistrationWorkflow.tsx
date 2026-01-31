// components/RegistrationWorkflow.tsx
// Main registration workflow component showing progress and next steps

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  ChevronRight,
  Shield,
  Building2,
  Users,
  Award,
  ExternalLink,
} from "lucide-react";

interface RegistrationWorkflowProps {
  memberId: string;
}

interface WorkflowState {
  associationRegistrationComplete: boolean;
  clubRegistrationComplete: boolean;
  currentStep: "association" | "club" | "complete";
  nextAction?: {
    type:
      | "register-association"
      | "register-club"
      | "await-approval"
      | "complete";
    description: string;
    actionUrl?: string;
  };
  associationStatus?: string;
  clubStatus?: string;
  canJoinTeams: boolean;
  eligibilityMessage?: string;
}

export default function RegistrationWorkflow({
  memberId,
}: RegistrationWorkflowProps) {
  const [workflow, setWorkflow] = useState<WorkflowState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWorkflowState();
  }, [memberId]);

  const fetchWorkflowState = async () => {
    try {
      const res = await fetch(`/api/members/${memberId}/registration-status`);
      if (!res.ok) throw new Error("Failed to fetch workflow state");

      const data = await res.json();
      setWorkflow(data);
    } catch (error) {
      console.error("Error fetching workflow:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#06054e]"></div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="bg-red-50 border-4 border-red-500 rounded-2xl p-6">
        <p className="text-red-800 font-bold">
          Failed to load registration status
        </p>
      </div>
    );
  }

  const steps = [
    {
      id: "association",
      title: "Association Registration",
      description: "Register with Brisbane Hockey Association",
      icon: Shield,
      complete: workflow.associationRegistrationComplete,
      status: workflow.associationStatus,
    },
    {
      id: "club",
      title: "Club Registration",
      description: "Register with your club",
      icon: Building2,
      complete: workflow.clubRegistrationComplete,
      status: workflow.clubStatus,
    },
    {
      id: "teams",
      title: "Join Teams",
      description: "Ready to join teams",
      icon: Users,
      complete: workflow.canJoinTeams,
      status: workflow.canJoinTeams ? "complete" : "incomplete",
    },
  ];

  const currentStepIndex = steps.findIndex(
    (s) =>
      s.id === workflow.currentStep ||
      (!workflow.canJoinTeams && s.id === "teams")
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#06054e] to-blue-900 rounded-[2rem] shadow-xl p-8 text-white">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
            {workflow.canJoinTeams ? (
              <CheckCircle2 size={32} className="text-green-300" />
            ) : (
              <Clock size={32} className="text-yellow-300" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-black mb-2">Registration Status</h1>
            <p className="text-lg font-bold text-white/90">
              {workflow.eligibilityMessage ||
                "Complete your registration to join teams"}
            </p>
          </div>
        </div>
      </div>

      {/* Eligibility Banner */}
      {workflow.canJoinTeams ? (
        <div className="bg-green-50 border-4 border-green-500 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 size={32} className="text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-xl font-black text-green-800 mb-2">
                🎉 Registration Complete!
              </h3>
              <p className="text-green-700 font-bold mb-4">
                You're all set! You can now join teams and participate in
                competitions.
              </p>
              <Link
                href="/clubs"
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-black hover:bg-green-700 transition-all"
              >
                <Users size={20} />
                Browse Teams
                <ChevronRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border-4 border-yellow-500 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle size={32} className="text-yellow-600 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-xl font-black text-yellow-800 mb-2">
                Registration In Progress
              </h3>
              <p className="text-yellow-700 font-bold">
                Complete the steps below to become eligible for teams.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8">
        <h2 className="text-2xl font-black text-[#06054e] mb-6">
          Registration Steps
        </h2>

        <div className="space-y-6">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStepIndex;
            const isPast = index < currentStepIndex;
            const isFuture = index > currentStepIndex;

            return (
              <div key={step.id} className="relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div
                    className={`absolute left-8 top-16 bottom-0 w-1 ${
                      step.complete ? "bg-green-500" : "bg-slate-200"
                    }`}
                    style={{ transform: "translateX(-50%)", height: "100%" }}
                  />
                )}

                <div
                  className={`flex items-start gap-4 p-6 rounded-2xl border-2 transition-all ${
                    step.complete
                      ? "bg-green-50 border-green-500"
                      : isActive
                      ? "bg-yellow-50 border-yellow-400"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      step.complete
                        ? "bg-green-500 text-white"
                        : isActive
                        ? "bg-yellow-400 text-[#06054e]"
                        : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {step.complete ? (
                      <CheckCircle2 size={32} />
                    ) : isActive ? (
                      <Clock size={32} />
                    ) : (
                      <StepIcon size={32} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-black text-slate-800">
                          {step.title}
                        </h3>
                        <p className="text-sm font-bold text-slate-600 mt-1">
                          {step.description}
                        </p>
                      </div>

                      {/* Status badge */}
                      <div>
                        {step.complete ? (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-bold">
                            Complete
                          </span>
                        ) : step.status === "pending" ? (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-bold">
                            Pending
                          </span>
                        ) : isActive ? (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold">
                            Current
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-sm font-bold">
                            Not Started
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action button */}
                    {isActive && workflow.nextAction && (
                      <div className="mt-4">
                        {workflow.nextAction.actionUrl ? (
                          <Link
                            href={workflow.nextAction.actionUrl}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all"
                          >
                            {workflow.nextAction.description}
                            <ChevronRight size={20} />
                          </Link>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-600 font-bold">
                            <Clock size={20} />
                            {workflow.nextAction.description}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Additional info for pending states */}
                    {step.status === "pending" && (
                      <div className="mt-3 p-3 bg-yellow-100 rounded-lg border border-yellow-200">
                        <p className="text-sm font-bold text-yellow-800">
                          ⏳ Your registration is being reviewed. You'll be
                          notified once approved.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <Award size={24} className="text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-black text-blue-800 mb-2">Need Help?</h3>
            <p className="text-sm font-bold text-blue-700 mb-3">
              If you have questions about the registration process, please
              contact:
            </p>
            <div className="space-y-2 text-sm font-bold text-blue-700">
              <div>
                📧 Email:{" "}
                <a
                  href="mailto:registrations@brisbanehockey.org.au"
                  className="text-blue-800 hover:underline"
                >
                  registrations@bha.org.au
                </a>
              </div>
              <div>
                📞 Phone:{" "}
                <a
                  href="tel:+61712345678"
                  className="text-blue-800 hover:underline"
                >
                  (07) 1234 5678
                </a>
              </div>
              <div>
                🌐 Website:{" "}
                <a
                  href="https://bha.org.au"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-800 hover:underline inline-flex items-center gap-1"
                >
                  brisbanehockey.org.au
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
