"use client";

import { Loader2, Rocket, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  campaignName: string;
  recipientCount: number;
  startImmediately: boolean;
  scheduledDate: string | null;
  isLaunching: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function LaunchModal({
  open,
  campaignName,
  recipientCount,
  startImmediately,
  scheduledDate,
  isLaunching,
  onClose,
  onConfirm,
}: Props) {
  if (!open) return null;

  const whenText = startImmediately
    ? "immediately"
    : scheduledDate
      ? `on ${new Date(scheduledDate).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}`
      : "immediately";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Launch Campaign</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
            disabled={isLaunching}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-6 space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mx-auto">
            <Rocket className="h-6 w-6 text-primary" />
          </div>
          <p className="text-center text-sm">
            Ready to launch{" "}
            <span className="font-semibold">{campaignName}</span>?
          </p>
          <p className="text-center text-xs text-muted-foreground">
            This will send to {recipientCount} recipient
            {recipientCount !== 1 ? "s" : ""} starting {whenText}.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isLaunching}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={onConfirm}
            disabled={isLaunching}
          >
            {isLaunching && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isLaunching ? "Launching..." : "Confirm Launch"}
          </Button>
        </div>
      </div>
    </div>
  );
}
