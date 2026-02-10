"use client";

import { useState } from "react";
import { Mail, Clock, GitBranch, ClipboardList, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SequenceStepType } from "@/store/campaign-wizard-store";
import { cn } from "@/lib/utils";

const stepTypes = [
  {
    type: "EMAIL" as const,
    label: "Follow-up Email",
    description: "Send another email",
    icon: Mail,
    color: "text-blue-600 bg-blue-50",
  },
  {
    type: "WAIT" as const,
    label: "Wait Period",
    description: "Pause before next step",
    icon: Clock,
    color: "text-gray-600 bg-gray-100",
  },
  {
    type: "CONDITION" as const,
    label: "Conditional Split",
    description: "Branch based on prospect action",
    icon: GitBranch,
    color: "text-yellow-600 bg-yellow-50",
  },
  {
    type: "TASK" as const,
    label: "Manual Task",
    description: "Reminder for a manual action",
    icon: ClipboardList,
    color: "text-purple-600 bg-purple-50",
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (step: {
    type: SequenceStepType;
    subject?: string;
    body?: string;
    delayDays: number;
    delayHours: number;
    condition?: {
      type: "link_clicked" | "no_reply" | "opened";
    };
    taskDescription?: string;
  }) => void;
}

export function AddStepModal({ open, onClose, onAdd }: Props) {
  const [selectedType, setSelectedType] = useState<SequenceStepType | null>(
    null
  );
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [delayDays, setDelayDays] = useState(2);
  const [delayHours, setDelayHours] = useState(0);
  const [conditionType, setConditionType] = useState<
    "link_clicked" | "no_reply" | "opened"
  >("no_reply");
  const [taskDescription, setTaskDescription] = useState("");

  if (!open) return null;

  function handleAdd() {
    if (!selectedType) return;

    onAdd({
      type: selectedType,
      subject: selectedType === "EMAIL" ? subject : undefined,
      body: selectedType === "EMAIL" ? body : undefined,
      delayDays,
      delayHours,
      condition:
        selectedType === "CONDITION" ? { type: conditionType } : undefined,
      taskDescription: selectedType === "TASK" ? taskDescription : undefined,
    });

    // Reset
    setSelectedType(null);
    setSubject("");
    setBody("");
    setDelayDays(2);
    setDelayHours(0);
    setTaskDescription("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            {selectedType ? "Configure Step" : "Add Step"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step type selection */}
        {!selectedType && (
          <div className="grid grid-cols-2 gap-3">
            {stepTypes.map((st) => (
              <button
                key={st.type}
                onClick={() => setSelectedType(st.type)}
                className="flex items-center gap-3 rounded-md border p-3 text-left hover:border-primary/30 transition-colors"
              >
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    st.color
                  )}
                >
                  <st.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-medium">{st.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {st.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Email config */}
        {selectedType === "EMAIL" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Wait before sending</Label>
              <div className="flex gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={delayDays}
                    onChange={(e) => setDelayDays(Number(e.target.value))}
                    className="w-16"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={delayHours}
                    onChange={(e) => setDelayHours(Number(e.target.value))}
                    className="w-16"
                  />
                  <span className="text-sm text-muted-foreground">hours</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input
                placeholder="Re: {{PreviousSubject}} or new subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email Body</Label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                placeholder="Hi {{FirstName}}, just following up..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Wait config */}
        {selectedType === "WAIT" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Wait Duration</Label>
              <div className="flex gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={30}
                    value={delayDays}
                    onChange={(e) => setDelayDays(Number(e.target.value))}
                    className="w-16"
                  />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={delayHours}
                    onChange={(e) => setDelayHours(Number(e.target.value))}
                    className="w-16"
                  />
                  <span className="text-sm text-muted-foreground">hours</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Condition config */}
        {selectedType === "CONDITION" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Condition Type</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={conditionType}
                onChange={(e) =>
                  setConditionType(
                    e.target.value as "link_clicked" | "no_reply" | "opened"
                  )
                }
              >
                <option value="no_reply">If no reply</option>
                <option value="link_clicked">If link clicked</option>
                <option value="opened">If email opened</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Wait before checking</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={delayDays}
                  onChange={(e) => setDelayDays(Number(e.target.value))}
                  className="w-16"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </div>
          </div>
        )}

        {/* Task config */}
        {selectedType === "TASK" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Task Description</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                placeholder="e.g., Connect on LinkedIn, Call prospect..."
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Schedule after</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={delayDays}
                  onChange={(e) => setDelayDays(Number(e.target.value))}
                  className="w-16"
                />
                <span className="text-sm text-muted-foreground">days</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        {selectedType && (
          <div className="mt-6 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setSelectedType(null)}
            >
              Back
            </Button>
            <Button type="button" className="flex-1" onClick={handleAdd}>
              Add Step
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
