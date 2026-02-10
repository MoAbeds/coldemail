"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountCard } from "@/components/email-accounts/account-card";
import { AddAccountModal } from "@/components/email-accounts/add-account-modal";

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
  bounceCount: number;
  spamCount: number;
  errorCount: number;
  spfConfigured: boolean;
  dkimConfigured: boolean;
  dmarcConfigured: boolean;
  lastConnectedAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  createdAt: string;
}

function EmailAccountsContent() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<EmailAccountData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/email-accounts");
      const data = await res.json();
      setAccounts(data.accounts || []);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Handle OAuth redirect notifications
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success) {
      const messages: Record<string, string> = {
        "google-connected": "Gmail account connected successfully!",
        "microsoft-connected": "Outlook account connected successfully!",
      };
      setNotification({
        type: "success",
        message: messages[success] || "Account connected!",
      });
      // Clean URL params
      window.history.replaceState({}, "", "/email-accounts");
    }

    if (error) {
      const messages: Record<string, string> = {
        "oauth-denied": "OAuth authorization was denied.",
        "token-exchange-failed": "Failed to exchange OAuth tokens.",
        "userinfo-failed": "Failed to retrieve account info.",
        "connection-failed": "Connection failed. Please try again.",
      };
      setNotification({
        type: "error",
        message: messages[error] || "Something went wrong.",
      });
      window.history.replaceState({}, "", "/email-accounts");
    }
  }, [searchParams]);

  // Auto-dismiss notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-8 max-w-6xl mx-auto">
      {/* Notification toast */}
      {notification && (
        <div
          className={`mb-6 rounded-md border px-4 py-3 text-sm ${
            notification.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Accounts</h1>
          <p className="mt-1 text-muted-foreground">
            Connect and manage your email accounts for sending campaigns.
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Account
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-8 flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <p className="mt-4 text-muted-foreground">
            No email accounts connected.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect Gmail, Outlook, or a custom SMTP server to start sending.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setShowAddModal(true)}
          >
            Connect your first account
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onRefresh={fetchAccounts}
            />
          ))}
        </div>
      )}

      <AddAccountModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchAccounts}
      />
    </div>
  );
}

export default function EmailAccountsPage() {
  return (
    <Suspense>
      <EmailAccountsContent />
    </Suspense>
  );
}
