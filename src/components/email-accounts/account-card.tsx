"use client";

import { useState } from "react";
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MoreVertical,
  Loader2,
  Shield,
  Trash2,
  RefreshCw,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmailAccountData {
  id: string;
  email: string;
  displayName: string;
  provider: "GMAIL" | "OUTLOOK" | "SMTP";
  isVerified: boolean;
  isActive: boolean;
  dailyLimit: number;
  sentToday: number;
  healthScore: number;
  spfConfigured: boolean;
  dkimConfigured: boolean;
  dmarcConfigured: boolean;
  lastConnectedAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
}

interface Props {
  account: EmailAccountData;
  onRefresh: () => void;
}

export function AccountCard({ account, onRefresh }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDns, setShowDns] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCheckingDns, setIsCheckingDns] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [dnsResults, setDnsResults] = useState<{
    spf: { configured: boolean; details: string };
    dkim: { configured: boolean; details: string };
    dmarc: { configured: boolean; details: string };
  } | null>(null);

  const hasError = !!account.lastError;
  const status = !account.isActive
    ? "disconnected"
    : hasError
      ? "error"
      : "connected";

  const statusConfig = {
    connected: {
      label: "Connected",
      color: "text-green-600",
      bg: "bg-green-50",
      icon: CheckCircle2,
    },
    error: {
      label: "Error",
      color: "text-red-600",
      bg: "bg-red-50",
      icon: AlertCircle,
    },
    disconnected: {
      label: "Disconnected",
      color: "text-gray-400",
      bg: "bg-gray-50",
      icon: XCircle,
    },
  };

  const s = statusConfig[status];
  const providerLabels = { GMAIL: "Gmail", OUTLOOK: "Outlook", SMTP: "SMTP" };

  const healthColor =
    account.healthScore >= 80
      ? "text-green-600"
      : account.healthScore >= 50
        ? "text-yellow-600"
        : "text-red-600";

  async function handleTest() {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/email-accounts/${account.id}/test`, {
        method: "POST",
      });
      const data = await res.json();
      setTestResult({
        success: data.success ?? res.ok,
        message: data.message || data.error || "Test completed",
      });
      if (data.success) onRefresh();
    } catch {
      setTestResult({ success: false, message: "Test failed" });
    } finally {
      setIsTesting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to remove this email account?")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/email-accounts/${account.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete");
      }
    } catch {
      alert("Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleCheckDns() {
    setIsCheckingDns(true);
    setShowDns(true);
    try {
      const res = await fetch(
        `/api/email-accounts/${account.id}/verify-dns`
      );
      const data = await res.json();
      if (data.dns) {
        setDnsResults(data.dns);
        onRefresh();
      }
    } catch {
      // Ignore
    } finally {
      setIsCheckingDns(false);
    }
  }

  async function handleToggleActive() {
    try {
      await fetch(`/api/email-accounts/${account.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !account.isActive }),
      });
      onRefresh();
    } catch {
      // Ignore
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                s.bg
              )}
            >
              <Mail className={cn("h-5 w-5", s.color)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{account.displayName}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {providerLabels[account.provider]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{account.email}</p>
            </div>
          </div>

          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowMenu(!showMenu)}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 z-20 mt-1 w-48 rounded-md border bg-card py-1 shadow-lg">
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                    onClick={() => {
                      handleTest();
                      setShowMenu(false);
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Test Connection
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                    onClick={() => {
                      handleCheckDns();
                      setShowMenu(false);
                    }}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Verify DNS
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                    onClick={() => {
                      handleToggleActive();
                      setShowMenu(false);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {account.isActive ? "Disable" : "Enable"}
                  </button>
                  <hr className="my-1" />
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent"
                    onClick={() => {
                      handleDelete();
                      setShowMenu(false);
                    }}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1.5">
            <s.icon className={cn("h-3.5 w-3.5", s.color)} />
            <span className={s.color}>{s.label}</span>
          </div>

          <div>
            <span className={healthColor}>{account.healthScore}</span>
            <span className="text-muted-foreground">/100 health</span>
          </div>

          <div>
            <span className="font-medium">{account.sentToday}</span>
            <span className="text-muted-foreground">
              /{account.dailyLimit} sent today
            </span>
          </div>
        </div>

        {/* Send limit bar */}
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                account.sentToday / account.dailyLimit > 0.9
                  ? "bg-red-500"
                  : account.sentToday / account.dailyLimit > 0.7
                    ? "bg-yellow-500"
                    : "bg-primary"
              )}
              style={{
                width: `${Math.min(100, (account.sentToday / account.dailyLimit) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* DNS badges */}
        <div className="mt-3 flex gap-2">
          <DnsBadge label="SPF" configured={account.spfConfigured} />
          <DnsBadge label="DKIM" configured={account.dkimConfigured} />
          <DnsBadge label="DMARC" configured={account.dmarcConfigured} />
        </div>

        {/* Error display */}
        {account.lastError && (
          <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {account.lastError}
          </div>
        )}

        {/* Test result */}
        {isTesting && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Testing connection...
          </div>
        )}
        {testResult && !isTesting && (
          <div
            className={cn(
              "mt-3 rounded-md px-3 py-2 text-xs",
              testResult.success
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            )}
          >
            {testResult.message}
          </div>
        )}

        {/* DNS check results */}
        {showDns && (
          <div className="mt-3 space-y-2 rounded-md border p-3">
            <p className="text-xs font-medium">DNS Verification</p>
            {isCheckingDns ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Checking DNS records...
              </div>
            ) : dnsResults ? (
              <div className="space-y-1.5">
                <DnsRow label="SPF" result={dnsResults.spf} />
                <DnsRow label="DKIM" result={dnsResults.dkim} />
                <DnsRow label="DMARC" result={dnsResults.dmarc} />
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DnsBadge({
  label,
  configured,
}: {
  label: string;
  configured: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        configured
          ? "bg-green-50 text-green-700"
          : "bg-gray-100 text-gray-500"
      )}
    >
      {configured ? (
        <CheckCircle2 className="h-2.5 w-2.5" />
      ) : (
        <XCircle className="h-2.5 w-2.5" />
      )}
      {label}
    </span>
  );
}

function DnsRow({
  label,
  result,
}: {
  label: string;
  result: { configured: boolean; details: string };
}) {
  return (
    <div className="flex items-start gap-2 text-xs">
      {result.configured ? (
        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green-600" />
      ) : (
        <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
      )}
      <div>
        <span className="font-medium">{label}:</span>{" "}
        <span className="text-muted-foreground">{result.details}</span>
      </div>
    </div>
  );
}
