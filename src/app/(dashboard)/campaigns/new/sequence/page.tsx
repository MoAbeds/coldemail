"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCampaignWizardStore } from "@/store/campaign-wizard-store";
import type { SequenceStep } from "@/store/campaign-wizard-store";
import { AddStepModal } from "@/components/campaigns/add-step-modal";
import {
  Mail,
  Clock,
  GitBranch,
  ClipboardList,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

const stepTypeConfig = {
  EMAIL: {
    icon: Mail,
    color: "border-blue-200 bg-blue-50",
    iconColor: "text-blue-600",
    label: "Email",
  },
  WAIT: {
    icon: Clock,
    color: "border-gray-200 bg-gray-50",
    iconColor: "text-gray-500",
    label: "Wait",
  },
  CONDITION: {
    icon: GitBranch,
    color: "border-yellow-200 bg-yellow-50",
    iconColor: "text-yellow-600",
    label: "Condition",
  },
  TASK: {
    icon: ClipboardList,
    color: "border-purple-200 bg-purple-50",
    iconColor: "text-purple-600",
    label: "Task",
  },
};

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export default function CampaignSequencePage() {
  const router = useRouter();
  const {
    email,
    sequence,
    setCurrentStep,
    addSequenceStep,
    removeSequenceStep,
    setEmail,
  } = useCampaignWizardStore();
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    setCurrentStep(3);
  }, [setCurrentStep]);

  function handleAddStep(stepData: Omit<SequenceStep, "id" | "stepNumber">) {
    const newStep: SequenceStep = {
      ...stepData,
      id: generateId(),
      stepNumber: sequence.length + 2, // +2 because step 1 is the initial email
    };
    addSequenceStep(newStep);
  }

  function handleBack() {
    setCurrentStep(2);
    router.push("/campaigns/new/email");
  }

  function handleNext() {
    setCurrentStep(4);
    router.push("/campaigns/new/review");
  }

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-8 mx-auto max-w-2xl">
      {/* Timeline */}
      <div className="relative space-y-0">
        {/* Step 1: Initial Email (from Step 2) */}
        <div className="relative flex gap-4">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              1
            </div>
            {(sequence.length > 0) && (
              <div className="w-px flex-1 bg-border" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-6">
            <Card className={cn("border-blue-200 bg-blue-50/50")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Initial Email</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => {
                      setCurrentStep(2);
                      router.push("/campaigns/new/email");
                    }}
                  >
                    <Pencil className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                </div>
                <div className="mt-2 text-sm">
                  <span className="font-medium">Subject: </span>
                  <span className="text-muted-foreground">
                    {email.subject || "No subject set"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {email.body
                    ? email.body.substring(0, 100) +
                      (email.body.length > 100 ? "..." : "")
                    : "No body content"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Follow-up steps */}
        {sequence.map((step, i) => {
          const config = stepTypeConfig[step.type];
          const Icon = config.icon;
          const isLast = i === sequence.length - 1;

          return (
            <div key={step.id} className="relative flex gap-4">
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold",
                    step.type === "EMAIL"
                      ? "bg-blue-100 text-blue-700"
                      : step.type === "WAIT"
                        ? "bg-gray-200 text-gray-600"
                        : step.type === "CONDITION"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-purple-100 text-purple-700"
                  )}
                >
                  {i + 2}
                </div>
                {!isLast && <div className="w-px flex-1 bg-border" />}
              </div>

              {/* Content */}
              <div className="flex-1 pb-6">
                <Card className={cn(config.color, "border")}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={cn("h-4 w-4", config.iconColor)} />
                        <span className="text-sm font-medium">
                          {config.label}
                          {step.type === "WAIT" &&
                            ` — ${step.delayDays}d ${step.delayHours}h`}
                          {step.type === "CONDITION" &&
                            step.condition &&
                            ` — ${step.condition.type.replace("_", " ")}`}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        onClick={() => removeSequenceStep(step.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {step.type === "EMAIL" && (
                      <>
                        {step.delayDays > 0 || step.delayHours > 0 ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Wait {step.delayDays}d {step.delayHours}h after
                            previous step
                          </p>
                        ) : null}
                        {step.subject && (
                          <div className="mt-2 text-sm">
                            <span className="font-medium">Subject: </span>
                            <span className="text-muted-foreground">
                              {step.subject}
                            </span>
                          </div>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {step.body
                            ? step.body.substring(0, 100) +
                              (step.body.length > 100 ? "..." : "")
                            : "No body content"}
                        </p>
                      </>
                    )}

                    {step.type === "TASK" && step.taskDescription && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {step.taskDescription}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          );
        })}

        {/* Add step button */}
        <div className="relative flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-border">
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </div>
          <div className="flex-1 pb-6">
            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Follow-up Step
            </Button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-between">
        <Button type="button" variant="ghost" onClick={handleBack}>
          Back
        </Button>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => setEmail(email)}>
            Save Draft
          </Button>
          <Button type="button" onClick={handleNext}>
            Next: Review & Launch
          </Button>
        </div>
      </div>

      <AddStepModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddStep}
      />
    </div>
  );
}
