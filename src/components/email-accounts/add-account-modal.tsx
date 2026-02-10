"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { emailAccountSchema } from "@/lib/validations/campaign";
import type { z } from "zod";

type SmtpFormValues = z.input<typeof emailAccountSchema>;
type Step = "choose-provider" | "smtp-form";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddAccountModal({ open, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<Step>("choose-provider");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SmtpFormValues>({
    resolver: zodResolver(emailAccountSchema),
    defaultValues: {
      provider: "SMTP",
      smtpPort: 587,
      dailyLimit: 50,
    },
  });

  function handleClose() {
    setStep("choose-provider");
    setError(null);
    reset();
    onClose();
  }

  async function handleOAuth(provider: "google" | "microsoft") {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/email-accounts/connect/${provider}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to initiate connection");
        return;
      }

      // Redirect to OAuth provider
      window.location.href = data.url;
    } catch {
      setError("Failed to start OAuth flow");
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmitSmtp(data: SmtpFormValues) {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/email-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Failed to connect account");
        return;
      }

      handleClose();
      onSuccess();
    } catch {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {step === "choose-provider"
              ? "Connect Email Account"
              : "SMTP Configuration"}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {step === "choose-provider" && (
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 py-6"
              onClick={() => handleOAuth("google")}
              disabled={isLoading}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-50">
                <Mail className="h-4 w-4 text-red-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">Gmail / Google Workspace</div>
                <div className="text-xs text-muted-foreground">
                  Connect via Google OAuth
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 py-6"
              onClick={() => handleOAuth("microsoft")}
              disabled={isLoading}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50">
                <Mail className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">Outlook / Office 365</div>
                <div className="text-xs text-muted-foreground">
                  Connect via Microsoft OAuth
                </div>
              </div>
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 py-6"
              onClick={() => setStep("smtp-form")}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100">
                <Mail className="h-4 w-4 text-gray-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">Custom SMTP</div>
                <div className="text-xs text-muted-foreground">
                  Connect with SMTP credentials
                </div>
              </div>
            </Button>
          </div>
        )}

        {step === "smtp-form" && (
          <form onSubmit={handleSubmit(onSubmitSmtp)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="Your Name"
                  {...register("displayName")}
                />
                {errors.displayName && (
                  <p className="text-xs text-destructive">
                    {errors.displayName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTP Host</Label>
                <Input
                  id="smtpHost"
                  placeholder="smtp.example.com"
                  {...register("smtpHost")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtpPort">SMTP Port</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  placeholder="587"
                  {...register("smtpPort", { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtpUser">Username</Label>
                <Input
                  id="smtpUser"
                  placeholder="username"
                  {...register("smtpUser")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtpPassword">Password</Label>
                <Input
                  id="smtpPassword"
                  type="password"
                  placeholder="••••••••"
                  {...register("smtpPassword")}
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="dailyLimit">Daily Send Limit</Label>
                <Input
                  id="dailyLimit"
                  type="number"
                  placeholder="50"
                  {...register("dailyLimit", { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setStep("choose-provider")}
              >
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Testing..." : "Connect & Test"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
