"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Loader2,
  PlugZap,
  RefreshCw,
  Settings2,
  Trash2,
  Webhook,
  X,
  ChevronDown,
  ChevronUp,
  Send,
  Calendar,
  MessageSquare,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

/* ---------- types ---------- */

interface Integration {
  id: string;
  provider: string;
  isActive: boolean;
  config: Record<string, unknown> | null;
  createdAt: string;
  syncLogs?: Array<{
    id: string;
    status: string;
    direction: string;
    recordsProcessed: number;
    recordsFailed: number;
    errors: unknown;
    startedAt: string;
    completedAt: string | null;
  }>;
}

interface WebhookEntry {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret?: string;
  createdAt: string;
  _count?: { deliveries: number };
  deliveries?: Array<{
    success: boolean;
    createdAt: string;
    statusCode: number | null;
  }>;
}

/* ---------- constants ---------- */

const CRM_FIELDS = [
  { key: "email", label: "Email" },
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "company", label: "Company" },
  { key: "jobTitle", label: "Job Title" },
  { key: "phone", label: "Phone" },
  { key: "website", label: "Website" },
];

const SF_FIELDS = ["Email", "FirstName", "LastName", "Company", "Title", "Phone", "Website"];
const HS_FIELDS = ["email", "firstname", "lastname", "company", "jobtitle", "phone", "website"];

const WEBHOOK_EVENTS = [
  "lead.replied",
  "lead.won",
  "campaign.completed",
  "prospect.clicked",
];

const PROVIDER_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  SALESFORCE: { label: "Salesforce", color: "bg-blue-500", icon: <Zap className="h-4 w-4" /> },
  HUBSPOT: { label: "HubSpot", color: "bg-orange-500", icon: <Send className="h-4 w-4" /> },
  SLACK: { label: "Slack", color: "bg-purple-500", icon: <MessageSquare className="h-4 w-4" /> },
  CALENDLY: { label: "Calendly", color: "bg-cyan-500", icon: <Calendar className="h-4 w-4" /> },
};

/* ---------- page ---------- */

export default function IntegrationsSettingsPage() {
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamId, setTeamId] = useState<string | null>(null);

  // Toast-like status messages
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Expanded panels
  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(null);
  const [showWebhookForm, setShowWebhookForm] = useState(false);

  // New webhook form state
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([]);

  // Slack connect form
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [slackChannel, setSlackChannel] = useState("");
  const [connectingSlack, setConnectingSlack] = useState(false);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Check for OAuth callback results
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success) showToast("success", `${success} connected successfully!`);
    if (error) showToast("error", `Connection failed: ${error}`);
  }, [searchParams, showToast]);

  const fetchData = useCallback(async () => {
    try {
      const [intRes, whRes] = await Promise.all([
        fetch("/api/integrations"),
        fetch("/api/webhooks"),
      ]);
      if (intRes.ok) {
        const json = await intRes.json();
        const data = json.integrations || json;
        setIntegrations(Array.isArray(data) ? data : []);
        // Extract teamId from first integration
        if (Array.isArray(data) && data.length > 0 && data[0].teamId) {
          setTeamId(data[0].teamId);
        }
      }
      if (whRes.ok) setWebhooks(await whRes.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch teamId if not from integrations
  useEffect(() => {
    if (!teamId) {
      fetch("/api/teams")
        .then((r) => r.json())
        .then((teams) => {
          if (teams?.[0]?.id) setTeamId(teams[0].id);
        })
        .catch(() => {});
    }
  }, [teamId]);

  /* ---------- actions ---------- */

  async function disconnectIntegration(id: string) {
    const res = await fetch(`/api/integrations/${id}/disconnect`, { method: "DELETE" });
    if (res.ok) {
      showToast("success", "Integration disconnected");
      fetchData();
    } else {
      showToast("error", "Failed to disconnect");
    }
  }

  async function triggerSync(id: string) {
    const res = await fetch(`/api/integrations/${id}/sync-now`, { method: "POST" });
    if (res.ok) {
      showToast("success", "Sync started");
      // Refresh after a delay to show updated logs
      setTimeout(fetchData, 3000);
    } else {
      showToast("error", "Sync failed");
    }
  }

  async function saveFieldMapping(id: string, mappings: Record<string, string>) {
    const integration = integrations.find((i) => i.id === id);
    const config = (integration?.config || {}) as Record<string, unknown>;

    const res = await fetch(`/api/integrations/${id}/config`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fieldMappings: mappings,
        syncSettings: config.syncSettings || {},
      }),
    });
    if (res.ok) {
      showToast("success", "Field mappings saved");
      fetchData();
    } else {
      showToast("error", "Failed to save mappings");
    }
  }

  async function connectSlack() {
    if (!slackWebhookUrl || !teamId) return;
    setConnectingSlack(true);
    try {
      const res = await fetch("/api/integrations/slack/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, webhookUrl: slackWebhookUrl, channel: slackChannel }),
      });
      if (res.ok) {
        showToast("success", "Slack connected!");
        setSlackWebhookUrl("");
        setSlackChannel("");
        fetchData();
      } else {
        showToast("error", "Failed to connect Slack");
      }
    } finally {
      setConnectingSlack(false);
    }
  }

  async function createWebhook() {
    if (!newWebhookUrl || !newWebhookEvents.length || !teamId) return;
    const res = await fetch("/api/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, url: newWebhookUrl, events: newWebhookEvents }),
    });
    if (res.ok) {
      const data = await res.json();
      showToast("success", `Webhook created! Secret: ${data.secret?.slice(0, 12)}...`);
      setNewWebhookUrl("");
      setNewWebhookEvents([]);
      setShowWebhookForm(false);
      fetchData();
    } else {
      showToast("error", "Failed to create webhook");
    }
  }

  async function deleteWebhook(id: string) {
    const res = await fetch(`/api/webhooks/${id}`, { method: "DELETE" });
    if (res.ok) {
      showToast("success", "Webhook deleted");
      fetchData();
    } else {
      showToast("error", "Failed to delete webhook");
    }
  }

  async function testWebhook(id: string) {
    const res = await fetch("/api/webhooks/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webhookId: id }),
    });
    if (res.ok) {
      const data = await res.json();
      showToast(data.success ? "success" : "error",
        data.success ? `Test delivered (${data.statusCode})` : `Test failed: ${data.response?.slice(0, 100)}`
      );
      fetchData();
    } else {
      showToast("error", "Failed to send test");
    }
  }

  /* ---------- render ---------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const connectedProviders = integrations.map((i) => i.provider);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 sm:px-6 py-4 sm:py-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings" className="rounded-lg p-2 hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Integrations</h1>
          <p className="text-sm text-muted-foreground">
            Connect your CRM, Slack, and other tools.
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success"
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {/* CRM Integrations */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">CRM Integrations</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Salesforce */}
          <IntegrationCard
            provider="SALESFORCE"
            connected={connectedProviders.includes("SALESFORCE")}
            integration={integrations.find((i) => i.provider === "SALESFORCE")}
            expanded={expandedIntegration === "SALESFORCE"}
            onToggleExpand={() =>
              setExpandedIntegration(expandedIntegration === "SALESFORCE" ? null : "SALESFORCE")
            }
            onConnect={() => {
              window.location.href = `/api/integrations/salesforce/connect?teamId=${teamId}`;
            }}
            onDisconnect={(id) => disconnectIntegration(id)}
            onSync={(id) => triggerSync(id)}
            onSaveMapping={(id, m) => saveFieldMapping(id, m)}
            crmFields={SF_FIELDS}
            teamId={teamId}
          />

          {/* HubSpot */}
          <IntegrationCard
            provider="HUBSPOT"
            connected={connectedProviders.includes("HUBSPOT")}
            integration={integrations.find((i) => i.provider === "HUBSPOT")}
            expanded={expandedIntegration === "HUBSPOT"}
            onToggleExpand={() =>
              setExpandedIntegration(expandedIntegration === "HUBSPOT" ? null : "HUBSPOT")
            }
            onConnect={() => {
              window.location.href = `/api/integrations/hubspot/connect?teamId=${teamId}`;
            }}
            onDisconnect={(id) => disconnectIntegration(id)}
            onSync={(id) => triggerSync(id)}
            onSaveMapping={(id, m) => saveFieldMapping(id, m)}
            crmFields={HS_FIELDS}
            teamId={teamId}
          />
        </div>
      </section>

      {/* Slack */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Slack Notifications</h2>
        {connectedProviders.includes("SLACK") ? (
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500 text-white">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Slack Connected</p>
                  <p className="text-sm text-muted-foreground">
                    Notifications are being sent to your channel.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  const sl = integrations.find((i) => i.provider === "SLACK");
                  if (sl) disconnectIntegration(sl.id);
                }}
                className="rounded-lg border px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect Slack to receive notifications for replies, milestones, and daily digests.
            </p>
            <input
              type="url"
              placeholder="Slack Incoming Webhook URL"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={slackWebhookUrl}
              onChange={(e) => setSlackWebhookUrl(e.target.value)}
            />
            <input
              type="text"
              placeholder="Channel name (optional)"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={slackChannel}
              onChange={(e) => setSlackChannel(e.target.value)}
            />
            <button
              onClick={connectSlack}
              disabled={!slackWebhookUrl || connectingSlack}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {connectingSlack ? "Connecting..." : "Connect Slack"}
            </button>
          </div>
        )}
      </section>

      {/* Calendly */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Calendly</h2>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500 text-white">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Calendly Meeting Tracking</p>
              <p className="text-sm text-muted-foreground">
                Configure your Calendly webhook to point to:
              </p>
              <code className="mt-1 block rounded bg-muted px-2 py-1 text-xs">
                {typeof window !== "undefined" ? window.location.origin : ""}/api/integrations/calendly/webhook
              </code>
              <p className="mt-2 text-xs text-muted-foreground">
                When prospects book meetings through Calendly links with UTM tracking,
                they&apos;ll automatically be marked as hot leads.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Webhooks */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Webhooks</h2>
          <button
            onClick={() => setShowWebhookForm(!showWebhookForm)}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Webhook className="h-4 w-4" />
            Add Webhook
          </button>
        </div>

        {showWebhookForm && (
          <div className="rounded-lg border p-4 space-y-3">
            <input
              type="url"
              placeholder="Webhook URL (https://...)"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={newWebhookUrl}
              onChange={(e) => setNewWebhookUrl(e.target.value)}
            />
            <div className="space-y-2">
              <p className="text-sm font-medium">Events</p>
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map((evt) => (
                  <label key={evt} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={newWebhookEvents.includes(evt)}
                      onChange={(e) =>
                        setNewWebhookEvents(
                          e.target.checked
                            ? [...newWebhookEvents, evt]
                            : newWebhookEvents.filter((e2) => e2 !== evt)
                        )
                      }
                      className="rounded"
                    />
                    {evt}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={createWebhook}
                disabled={!newWebhookUrl || !newWebhookEvents.length}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Create Webhook
              </button>
              <button
                onClick={() => setShowWebhookForm(false)}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {webhooks.length === 0 && !showWebhookForm ? (
          <p className="text-sm text-muted-foreground">
            No webhooks configured. Add one to receive real-time events.
          </p>
        ) : (
          <div className="space-y-2">
            {webhooks.map((wh) => (
              <div key={wh.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{wh.url}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {wh.events.map((e) => (
                        <span key={e} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {e}
                        </span>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {wh._count?.deliveries ?? 0} deliveries
                      {wh.deliveries?.[0] && (
                        <> &middot; Last: {wh.deliveries[0].success ? "OK" : "Failed"} ({wh.deliveries[0].statusCode})</>
                      )}
                    </p>
                  </div>
                  <div className="ml-3 flex items-center gap-1">
                    <button
                      onClick={() => testWebhook(wh.id)}
                      title="Send test"
                      className="rounded p-1.5 hover:bg-muted"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteWebhook(wh.id)}
                      title="Delete"
                      className="rounded p-1.5 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------- Integration Card Component ---------- */

function IntegrationCard({
  provider,
  connected,
  integration,
  expanded,
  onToggleExpand,
  onConnect,
  onDisconnect,
  onSync,
  onSaveMapping,
  crmFields,
  teamId,
}: {
  provider: string;
  connected: boolean;
  integration?: Integration;
  expanded: boolean;
  onToggleExpand: () => void;
  onConnect: () => void;
  onDisconnect: (id: string) => void;
  onSync: (id: string) => void;
  onSaveMapping: (id: string, mappings: Record<string, string>) => void;
  crmFields: string[];
  teamId: string | null;
}) {
  const meta = PROVIDER_META[provider] || { label: provider, color: "bg-gray-500", icon: <PlugZap className="h-4 w-4" /> };
  const config = (integration?.config || {}) as Record<string, unknown>;
  const fieldMappings = (config.fieldMappings || {}) as Record<string, string>;

  const [localMappings, setLocalMappings] = useState<Record<string, string>>(fieldMappings);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setLocalMappings(fieldMappings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integration?.id]);

  const lastSync = integration?.syncLogs?.[0];

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-white ${meta.color}`}>
            {meta.icon}
          </div>
          <div>
            <p className="font-medium">{meta.label}</p>
            {connected ? (
              <p className="text-xs text-green-600">Connected</p>
            ) : (
              <p className="text-xs text-muted-foreground">Not connected</p>
            )}
          </div>
        </div>
        {connected ? (
          <button onClick={onToggleExpand} className="rounded p-1.5 hover:bg-muted">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        ) : (
          <button
            onClick={onConnect}
            disabled={!teamId}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Connect
          </button>
        )}
      </div>

      {connected && expanded && integration && (
        <div className="border-t p-4 space-y-4">
          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setSyncing(true);
                await onSync(integration.id);
                setSyncing(false);
              }}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              Sync Now
            </button>
            <button
              onClick={() => onDisconnect(integration.id)}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Disconnect
            </button>
          </div>

          {/* Last sync info */}
          {lastSync && (
            <div className="rounded bg-muted/50 p-2 text-xs">
              <p>
                Last sync: <span className={lastSync.status === "SUCCESS" ? "text-green-600" : "text-red-600"}>{lastSync.status}</span>
                {" "}&middot; {lastSync.recordsProcessed} processed, {lastSync.recordsFailed} failed
                {" "}&middot; {new Date(lastSync.startedAt).toLocaleString()}
              </p>
            </div>
          )}

          {/* Field Mapping */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Field Mapping</p>
            </div>
            <div className="space-y-1.5">
              {CRM_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-2">
                  <span className="w-24 text-xs text-muted-foreground">{field.label}</span>
                  <span className="text-xs text-muted-foreground">&rarr;</span>
                  <select
                    value={localMappings[field.key] || ""}
                    onChange={(e) =>
                      setLocalMappings({ ...localMappings, [field.key]: e.target.value })
                    }
                    className="flex-1 rounded border px-2 py-1 text-xs"
                  >
                    <option value="">— skip —</option>
                    {crmFields.map((cf) => (
                      <option key={cf} value={cf}>
                        {cf}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <button
              onClick={() => onSaveMapping(integration.id, localMappings)}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              Save Mappings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
