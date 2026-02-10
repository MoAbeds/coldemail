"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Mail,
  AlertTriangle,
  Server,
  Zap,
  ThermometerSun,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface StatusData {
  overview: {
    activeCampaigns: number;
    pausedCampaigns: number;
    draftCampaigns: number;
    emailsSentToday: number;
    emailsSentLastHour: number;
    sendingRatePerMin: number;
    errorRate: number;
    errorsToday: number;
  };
  emailAccounts: Array<{
    id: string;
    email: string;
    displayName: string;
    isActive: boolean;
    dailyLimit: number;
    sentToday: number;
    remaining: number;
    lastErrorAt: string | null;
  }>;
  leads: { hot: number; warm: number; cold: number };
  healthyAccounts: number;
  timestamp: string;
}

interface HealthData {
  status: string;
  version: string;
  uptime: number;
  checks: {
    database: { status: string; latencyMs?: number };
    redis: { status: string };
    memory: { heapUsedMB: number; heapTotalMB: number; rsseMB: number };
  };
}

export default function MonitoringPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statusRes, healthRes] = await Promise.all([
        fetch("/api/admin/status"),
        fetch("/api/health"),
      ]);
      if (statusRes.ok) setStatus(await statusRes.json());
      if (healthRes.ok) setHealth(await healthRes.json());
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30_000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading && !status) {
    return (
      <div className="px-4 sm:px-6 py-4 sm:py-8 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-zinc-800 rounded" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-zinc-800 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const healthColor =
    health?.status === "healthy"
      ? "text-emerald-400"
      : health?.status === "degraded"
      ? "text-amber-400"
      : "text-red-400";

  function formatUptime(seconds: number) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold">System Monitoring</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* System Health */}
      {health && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-4 h-4 text-zinc-400" />
            <h2 className="font-semibold">System Health</h2>
            <span className={`ml-auto text-sm font-medium ${healthColor}`}>
              {health.status.toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-zinc-500">Database</p>
              <p className="font-medium flex items-center gap-1">
                {health.checks.database.status === "connected" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                )}
                {health.checks.database.latencyMs
                  ? `${health.checks.database.latencyMs}ms`
                  : health.checks.database.status}
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Redis</p>
              <p className="font-medium flex items-center gap-1">
                {health.checks.redis.status === "connected" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-amber-400" />
                )}
                {health.checks.redis.status}
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Memory</p>
              <p className="font-medium">
                {health.checks.memory.heapUsedMB} / {health.checks.memory.heapTotalMB} MB
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Uptime</p>
              <p className="font-medium">{formatUptime(health.uptime)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      {status && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <MetricCard
              icon={Mail}
              label="Emails Sent Today"
              value={status.overview.emailsSentToday.toLocaleString()}
              sublabel={`${status.overview.sendingRatePerMin}/min`}
              color="text-blue-400"
              bg="bg-blue-400/10"
            />
            <MetricCard
              icon={Zap}
              label="Active Campaigns"
              value={status.overview.activeCampaigns}
              sublabel={`${status.overview.pausedCampaigns} paused`}
              color="text-emerald-400"
              bg="bg-emerald-400/10"
            />
            <MetricCard
              icon={AlertTriangle}
              label="Error Rate"
              value={`${status.overview.errorRate}%`}
              sublabel={`${status.overview.errorsToday} errors today`}
              color={status.overview.errorRate > 1 ? "text-red-400" : "text-emerald-400"}
              bg={status.overview.errorRate > 1 ? "bg-red-400/10" : "bg-emerald-400/10"}
            />
            <MetricCard
              icon={ThermometerSun}
              label="Hot Leads"
              value={status.leads.hot}
              sublabel={`${status.leads.warm} warm, ${status.leads.cold} cold`}
              color="text-orange-400"
              bg="bg-orange-400/10"
            />
          </div>

          {/* Email Accounts */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-zinc-400" />
              <h2 className="font-semibold">Email Account Health</h2>
              <span className="ml-auto text-xs text-zinc-500">
                {status.healthyAccounts} active
              </span>
            </div>
            <div className="space-y-3">
              {status.emailAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg"
                >
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      account.isActive ? "bg-emerald-400" : "bg-red-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{account.displayName}</p>
                    <p className="text-xs text-zinc-500 truncate">{account.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">
                      {account.sentToday} / {account.dailyLimit}
                    </p>
                    <div className="w-24 h-1.5 bg-zinc-700 rounded-full mt-1">
                      <div
                        className={`h-full rounded-full transition-all ${
                          account.remaining < 10 ? "bg-red-400" : "bg-emerald-400"
                        }`}
                        style={{
                          width: `${Math.min(
                            (account.sentToday / account.dailyLimit) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {status.emailAccounts.length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-4">
                  No email accounts configured
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sublabel,
  color,
  bg,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sublabel: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <div className={`p-2 rounded-lg ${bg} w-fit mb-2`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-zinc-500 mt-1">{sublabel}</div>
      <div className="text-xs text-zinc-400 mt-0.5">{label}</div>
    </div>
  );
}
