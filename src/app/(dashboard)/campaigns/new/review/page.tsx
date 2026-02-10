"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCampaignWizardStore } from "@/store/campaign-wizard-store";
import { LaunchModal } from "@/components/campaigns/launch-modal";
import {
  Settings,
  Mail,
  Calendar,
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface EmailAccountInfo {
  id: string;
  email: string;
  displayName: string;
  spfConfigured: boolean;
  dkimConfigured: boolean;
  dmarcConfigured: boolean;
  healthScore: number;
}

export default function CampaignReviewPage() {
  const router = useRouter();
  const {
    basics,
    email,
    sequence,
    schedule,
    setSchedule,
    setCurrentStep,
    reset,
  } = useCampaignWizardStore();

  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<EmailAccountInfo | null>(null);

  const fetchAccount = useCallback(async () => {
    if (!basics.emailAccountId) return;
    try {
      const res = await fetch(
        `/api/email-accounts/${basics.emailAccountId}`
      );
      if (res.ok) {
        const data = await res.json();
        setAccount(data.account);
      }
    } catch {
      // Ignore
    }
  }, [basics.emailAccountId]);

  useEffect(() => {
    setCurrentStep(4);
    fetchAccount();
  }, [setCurrentStep, fetchAccount]);

  // Deliverability checklist
  const checks = [
    {
      label: "SPF configured",
      ok: account?.spfConfigured ?? false,
    },
    {
      label: "DKIM configured",
      ok: account?.dkimConfigured ?? false,
    },
    {
      label: "DMARC configured",
      ok: account?.dmarcConfigured ?? false,
      optional: true,
    },
    {
      label: "No spam trigger words",
      ok: !email.subject.toLowerCase().match(/free|act now|urgent|buy now/),
    },
    {
      label: "Subject line set",
      ok: email.subject.length > 0,
    },
    {
      label: "Email body has content",
      ok: email.body.length >= 50,
    },
  ];

  const passedChecks = checks.filter((c) => c.ok).length;
  const totalChecks = checks.length;
  const deliverabilityScore = Math.round((passedChecks / totalChecks) * 100);

  // All emails in sequence
  const allEmails = [
    { id: "initial", subject: email.subject, body: email.body, step: 1 },
    ...sequence
      .filter((s) => s.type === "EMAIL")
      .map((s) => ({
        id: s.id,
        subject: s.subject || "",
        body: s.body || "",
        step: s.stepNumber,
      })),
  ];

  async function handleLaunch() {
    setIsLaunching(true);
    setError(null);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: basics.campaignName,
          emailAccountId: basics.emailAccountId,
          teamId: basics.teamId || undefined,
          dailyLimit: basics.dailyLimit,
          goal: basics.goal,
          email: { subject: email.subject, body: email.body },
          sequence: sequence.map((s) => ({
            type: s.type,
            subject: s.subject,
            body: s.body,
            delayDays: s.delayDays,
            delayHours: s.delayHours,
            condition: s.condition,
            taskDescription: s.taskDescription,
            stepNumber: s.stepNumber,
          })),
          schedule: {
            startHour: schedule.startHour,
            endHour: schedule.endHour,
            days: schedule.days,
            timezone: schedule.timezone,
          },
          startImmediately: schedule.startImmediately,
          scheduledDate: schedule.scheduledDate,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to launch campaign");
        setIsLaunching(false);
        return;
      }

      // Success
      reset();
      router.push("/campaigns?launched=true");
    } catch {
      setError("Something went wrong");
      setIsLaunching(false);
    }
  }

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-8 mx-auto max-w-2xl space-y-4">
      {error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* 1. Campaign Overview */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Campaign Overview</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => {
                setCurrentStep(1);
                router.push("/campaigns/new/basics");
              }}
            >
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </Button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Name:</span>{" "}
              <span className="font-medium">{basics.campaignName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Account:</span>{" "}
              <span className="font-medium">
                {account?.displayName || "Loading..."}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Daily limit:</span>{" "}
              <span className="font-medium">{basics.dailyLimit}/day</span>
            </div>
            <div>
              <span className="text-muted-foreground">Goal:</span>{" "}
              <span className="font-medium">
                {basics.goal
                  ? basics.goal.charAt(0).toUpperCase() + basics.goal.slice(1)
                  : "Not set"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Email Sequence Preview */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">
                Email Sequence ({allEmails.length} email
                {allEmails.length !== 1 ? "s" : ""}, {sequence.length} total
                step{sequence.length !== 1 ? "s" : ""})
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => {
                setCurrentStep(3);
                router.push("/campaigns/new/sequence");
              }}
            >
              <Pencil className="mr-1 h-3 w-3" />
              Edit
            </Button>
          </div>
          <div className="mt-3 space-y-2">
            {allEmails.map((em) => (
              <div key={em.id} className="rounded-md border">
                <button
                  className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent"
                  onClick={() =>
                    setExpandedEmail(
                      expandedEmail === em.id ? null : em.id
                    )
                  }
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      Step {em.step}
                    </Badge>
                    <span className="font-medium">
                      {em.subject || "No subject"}
                    </span>
                  </div>
                  {expandedEmail === em.id ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
                {expandedEmail === em.id && (
                  <div className="border-t px-3 py-3 text-sm whitespace-pre-wrap text-muted-foreground">
                    {em.body || "No content"}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 3. Sending Schedule */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Sending Schedule</h3>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              {dayLabels.map((day, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const days = schedule.days.includes(i)
                      ? schedule.days.filter((d) => d !== i)
                      : [...schedule.days, i].sort();
                    setSchedule({ days });
                  }}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                    schedule.days.includes(i)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  )}
                >
                  {day.charAt(0)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">Time:</span>
              <select
                className="rounded-md border bg-background px-2 py-1 text-sm"
                value={schedule.startHour}
                onChange={(e) =>
                  setSchedule({ startHour: Number(e.target.value) })
                }
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, "0")}:00
                  </option>
                ))}
              </select>
              <span>to</span>
              <select
                className="rounded-md border bg-background px-2 py-1 text-sm"
                value={schedule.endHour}
                onChange={(e) =>
                  setSchedule({ endHour: Number(e.target.value) })
                }
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>

            {/* Launch timing */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="launchTiming"
                    checked={schedule.startImmediately}
                    onChange={() =>
                      setSchedule({
                        startImmediately: true,
                        scheduledDate: null,
                      })
                    }
                    className="accent-primary"
                  />
                  Start immediately
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="launchTiming"
                    checked={!schedule.startImmediately}
                    onChange={() =>
                      setSchedule({ startImmediately: false })
                    }
                    className="accent-primary"
                  />
                  Schedule for later
                </label>
              </div>
              {!schedule.startImmediately && (
                <input
                  type="datetime-local"
                  className="rounded-md border bg-background px-3 py-1.5 text-sm"
                  value={schedule.scheduledDate || ""}
                  onChange={(e) =>
                    setSchedule({ scheduledDate: e.target.value })
                  }
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Deliverability Checklist */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">Deliverability Checklist</h3>
            </div>
            <span
              className={cn(
                "text-sm font-bold",
                deliverabilityScore >= 80
                  ? "text-green-600"
                  : deliverabilityScore >= 50
                    ? "text-yellow-600"
                    : "text-red-600"
              )}
            >
              {deliverabilityScore}/100
            </span>
          </div>
          <div className="space-y-1.5">
            {checks.map((check, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {check.ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                ) : check.optional ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                )}
                <span
                  className={cn(
                    check.ok
                      ? "text-foreground"
                      : check.optional
                        ? "text-yellow-600"
                        : "text-red-600"
                  )}
                >
                  {check.label}
                </span>
                {check.optional && !check.ok && (
                  <span className="text-xs text-muted-foreground">
                    (optional)
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setCurrentStep(3);
            router.push("/campaigns/new/sequence");
          }}
        >
          Back to Sequence
        </Button>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              // Save as draft via API
              handleLaunchAsDraft();
            }}
          >
            Save as Draft
          </Button>
          <Button type="button" onClick={() => setShowLaunchModal(true)}>
            Launch Campaign
          </Button>
        </div>
      </div>

      <LaunchModal
        open={showLaunchModal}
        campaignName={basics.campaignName}
        recipientCount={0}
        startImmediately={schedule.startImmediately}
        scheduledDate={schedule.scheduledDate}
        isLaunching={isLaunching}
        onClose={() => setShowLaunchModal(false)}
        onConfirm={handleLaunch}
      />
    </div>
  );

  async function handleLaunchAsDraft() {
    setError(null);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: basics.campaignName,
          emailAccountId: basics.emailAccountId,
          teamId: basics.teamId || undefined,
          dailyLimit: basics.dailyLimit,
          goal: basics.goal,
          email: { subject: email.subject, body: email.body },
          sequence: sequence.map((s) => ({
            type: s.type,
            subject: s.subject,
            body: s.body,
            delayDays: s.delayDays,
            delayHours: s.delayHours,
            condition: s.condition,
            taskDescription: s.taskDescription,
            stepNumber: s.stepNumber,
          })),
          schedule: {
            startHour: schedule.startHour,
            endHour: schedule.endHour,
            days: schedule.days,
            timezone: schedule.timezone,
          },
          status: "DRAFT",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save draft");
        return;
      }

      reset();
      router.push("/campaigns?saved=true");
    } catch {
      setError("Something went wrong");
    }
  }
}
