"use client";

import { useSearchParams } from "next/navigation";
import { Mail, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser } from "@/hooks/use-auth";
import { useState, Suspense } from "react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const { user, isEmailVerified, refreshSession } = useUser();
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const success = searchParams.get("success") === "true";
  const error = searchParams.get("error");

  // User just verified via the link
  if (success) {
    // Refresh session so emailVerified updates in the JWT
    refreshSession();

    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <CardTitle className="text-xl">Email verified</CardTitle>
          <CardDescription>
            Your email has been verified. You can now access all features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => window.location.href = "/dashboard"}>
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Error verifying
  if (error) {
    const errorMessages: Record<string, string> = {
      "invalid-token": "This verification link is invalid or has expired.",
      "missing-params": "Invalid verification link.",
      "server-error": "Something went wrong. Please try again.",
    };

    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
            <XCircle className="h-5 w-5 text-destructive" />
          </div>
          <CardTitle className="text-xl">Verification failed</CardTitle>
          <CardDescription>
            {errorMessages[error] || "Something went wrong."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            variant="outline"
            disabled={isResending}
            onClick={handleResend}
          >
            {isResending ? "Sending..." : "Resend verification email"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Already verified
  if (isEmailVerified) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <CardTitle className="text-xl">Already verified</CardTitle>
          <CardDescription>
            Your email is already verified.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={() => window.location.href = "/dashboard"}>
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  async function handleResend() {
    setIsResending(true);
    setResendMessage(null);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setResendMessage(data.message || "Failed to resend");
      } else {
        setResendMessage("Verification email sent! Check your inbox.");
      }
    } catch {
      setResendMessage("Failed to resend. Please try again.");
    } finally {
      setIsResending(false);
    }
  }

  // Default: waiting for verification
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <CardTitle className="text-xl">Check your email</CardTitle>
        <CardDescription>
          We sent a verification link to{" "}
          <span className="font-medium text-foreground">
            {user?.email || "your email"}
          </span>
          . Click the link to verify your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          className="w-full"
          variant="outline"
          disabled={isResending}
          onClick={handleResend}
        >
          {isResending ? "Sending..." : "Resend verification email"}
        </Button>
        {resendMessage && (
          <p className="text-center text-sm text-muted-foreground">
            {resendMessage}
          </p>
        )}
        <p className="text-center text-xs text-muted-foreground">
          Didn&apos;t receive it? Check your spam folder.
        </p>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
