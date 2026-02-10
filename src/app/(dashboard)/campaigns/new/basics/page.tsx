"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useCampaignWizardStore } from "@/store/campaign-wizard-store";
import {
  wizardBasicsSchema,
  type WizardBasicsInput,
} from "@/lib/validations/campaign-wizard";
import {
  MessageSquare,
  CalendarCheck,
  MousePointerClick,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailAccountOption {
  id: string;
  email: string;
  displayName: string;
  provider: string;
  isVerified: boolean;
  isActive: boolean;
}

interface TeamOption {
  teamId: string;
  teamName: string;
}

const goals = [
  {
    value: "replies" as const,
    label: "Get replies",
    icon: MessageSquare,
  },
  {
    value: "meetings" as const,
    label: "Book meetings",
    icon: CalendarCheck,
  },
  {
    value: "clicks" as const,
    label: "Drive clicks",
    icon: MousePointerClick,
  },
  {
    value: "leads" as const,
    label: "Generate leads",
    icon: Users,
  },
];

export default function CampaignBasicsPage() {
  const router = useRouter();
  const { basics, setBasics, setCurrentStep } = useCampaignWizardStore();
  const [accounts, setAccounts] = useState<EmailAccountOption[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WizardBasicsInput>({
    resolver: zodResolver(wizardBasicsSchema),
    defaultValues: {
      campaignName: basics.campaignName,
      emailAccountId: basics.emailAccountId,
      goal: basics.goal,
      dailyLimit: basics.dailyLimit,
      teamId: basics.teamId,
    },
  });

  const selectedGoal = watch("goal");
  const dailyLimit = watch("dailyLimit");

  const fetchData = useCallback(async () => {
    try {
      const [accountsRes, teamsRes] = await Promise.all([
        fetch("/api/email-accounts"),
        fetch("/api/teams"),
      ]);
      const accountsData = await accountsRes.json();
      setAccounts(
        (accountsData.accounts || []).filter(
          (a: EmailAccountOption) => a.isVerified && a.isActive
        )
      );
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        setTeams(teamsData.teams || []);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCurrentStep(1);
  }, [setCurrentStep]);

  function onSubmit(data: WizardBasicsInput) {
    setBasics({
      campaignName: data.campaignName,
      emailAccountId: data.emailAccountId,
      goal: data.goal ?? null,
      dailyLimit: data.dailyLimit,
      teamId: data.teamId ?? "",
    });
    setCurrentStep(2);
    router.push("/campaigns/new/email");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="px-4 sm:px-6 py-4 sm:py-8 mx-auto max-w-2xl">
      <Card>
        <CardContent className="space-y-6 p-6">
          {/* Campaign Name */}
          <div className="space-y-2">
            <Label htmlFor="campaignName">Campaign Name *</Label>
            <Input
              id="campaignName"
              placeholder="e.g., Q1 Outreach — Series A Founders"
              maxLength={100}
              {...register("campaignName")}
            />
            {errors.campaignName && (
              <p className="text-xs text-destructive">
                {errors.campaignName.message}
              </p>
            )}
          </div>

          {/* Email Account */}
          <div className="space-y-2">
            <Label htmlFor="emailAccountId">Email Account *</Label>
            {isLoadingAccounts ? (
              <div className="h-10 animate-pulse rounded-md bg-secondary" />
            ) : accounts.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                No verified email accounts.{" "}
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => router.push("/email-accounts")}
                >
                  Connect one first
                </button>
              </div>
            ) : (
              <select
                id="emailAccountId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("emailAccountId")}
              >
                <option value="">Select an account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.displayName} ({acc.email})
                  </option>
                ))}
              </select>
            )}
            {errors.emailAccountId && (
              <p className="text-xs text-destructive">
                {errors.emailAccountId.message}
              </p>
            )}
          </div>

          {/* Campaign Goal */}
          <div className="space-y-2">
            <Label>Campaign Goal</Label>
            <p className="text-xs text-muted-foreground">
              Optional — helps optimize your sequence
            </p>
            <div className="grid grid-cols-2 gap-2">
              {goals.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() =>
                    setValue(
                      "goal",
                      selectedGoal === g.value ? null : g.value,
                      { shouldValidate: true }
                    )
                  }
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors",
                    selectedGoal === g.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  <g.icon className="h-4 w-4" />
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Daily Send Limit */}
          <div className="space-y-2">
            <Label htmlFor="dailyLimit">Daily Send Limit *</Label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={10}
                max={200}
                step={5}
                value={dailyLimit}
                onChange={(e) =>
                  setValue("dailyLimit", Number(e.target.value), {
                    shouldValidate: true,
                  })
                }
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
              />
              <Input
                id="dailyLimit"
                type="number"
                className="w-20"
                min={10}
                max={200}
                {...register("dailyLimit", { valueAsNumber: true })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {dailyLimit <= 25
                ? "Conservative — great for warming up"
                : dailyLimit <= 75
                  ? "Moderate — good for most campaigns"
                  : dailyLimit <= 150
                    ? "Aggressive — ensure good deliverability"
                    : "Very aggressive — high risk of spam flags"}
            </p>
            {errors.dailyLimit && (
              <p className="text-xs text-destructive">
                {errors.dailyLimit.message}
              </p>
            )}
          </div>

          {/* Team */}
          {teams.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="teamId">Team</Label>
              <select
                id="teamId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("teamId")}
              >
                <option value="">Personal</option>
                {teams.map((t) => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.teamName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="mt-6 flex justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/campaigns")}
        >
          Cancel
        </Button>
        <Button type="submit">Next: Write Email</Button>
      </div>
    </form>
  );
}
