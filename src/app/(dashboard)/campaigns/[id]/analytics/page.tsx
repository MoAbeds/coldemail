"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  Eye,
  MousePointerClick,
  MessageSquare,
  AlertTriangle,
  Download,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface Metrics {
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  bounceRate: number;
}

interface Trends {
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
}

interface AnalyticsData {
  campaign: { id: string; name: string; status: string; startedAt: string | null };
  metrics: Metrics;
  trends: Trends;
  prospectStatuses: Record<string, number>;
  totalProspects: number;
  dailyTimeline: Array<Record<string, unknown>>;
}

interface FunnelStep {
  stepNumber: number;
  subject: string;
  sent: number;
  opened: number;
  clicked: number;
  replied: number;
  bounced: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
}

export default function CampaignAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/campaigns/${campaignId}/analytics?days=${days}`).then((r) => r.json()),
      fetch(`/api/campaigns/${campaignId}/funnel`).then((r) => r.json()),
    ])
      .then(([analytics, funnelData]) => {
        setData(analytics);
        setFunnel(funnelData.steps || []);
      })
      .finally(() => setLoading(false));
  }, [campaignId, days]);

  const handleExport = () => {
    window.open(`/api/campaigns/${campaignId}/export`, "_blank");
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-zinc-800 rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-zinc-800 rounded-lg" />
            ))}
          </div>
          <div className="h-80 bg-zinc-800 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-zinc-400">
        Failed to load analytics.
      </div>
    );
  }

  const metricCards = [
    {
      label: "Emails Sent",
      value: data.metrics.sent,
      trend: data.trends.sent,
      icon: Send,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
    },
    {
      label: "Open Rate",
      value: `${data.metrics.openRate}%`,
      sublabel: `${data.metrics.opened} opens`,
      trend: data.trends.opened,
      icon: Eye,
      color: "text-emerald-400",
      bgColor: "bg-emerald-400/10",
    },
    {
      label: "Click Rate",
      value: `${data.metrics.clickRate}%`,
      sublabel: `${data.metrics.clicked} clicks`,
      trend: data.trends.clicked,
      icon: MousePointerClick,
      color: "text-amber-400",
      bgColor: "bg-amber-400/10",
    },
    {
      label: "Reply Rate",
      value: `${data.metrics.replyRate}%`,
      sublabel: `${data.metrics.replied} replies`,
      trend: data.trends.replied,
      icon: MessageSquare,
      color: "text-purple-400",
      bgColor: "bg-purple-400/10",
    },
  ];

  const statusColors: Record<string, string> = {
    PENDING: "bg-zinc-600",
    SENDING: "bg-blue-500",
    COMPLETED: "bg-emerald-500",
    PAUSED: "bg-amber-500",
    BOUNCED: "bg-red-500",
    UNSUBSCRIBED: "bg-zinc-500",
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold">{data.campaign.name}</h1>
            <p className="text-sm text-zinc-400">
              Campaign Analytics
              {data.campaign.status && (
                <span
                  className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                    data.campaign.status === "ACTIVE"
                      ? "bg-emerald-400/10 text-emerald-400"
                      : data.campaign.status === "PAUSED"
                      ? "bg-amber-400/10 text-amber-400"
                      : "bg-zinc-700 text-zinc-300"
                  }`}
                >
                  {data.campaign.status}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card) => (
          <div
            key={card.label}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              {card.trend !== 0 && (
                <span
                  className={`flex items-center text-xs font-medium ${
                    card.trend > 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {card.trend > 0 ? (
                    <ArrowUpRight className="w-3 h-3 mr-0.5" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 mr-0.5" />
                  )}
                  {Math.abs(card.trend)}%
                </span>
              )}
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="text-xs text-zinc-500 mt-1">
              {card.sublabel || card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Bounce & Unsubscribe Warnings */}
      {(data.metrics.bounceRate > 5 || data.metrics.unsubscribed > 0) && (
        <div className="flex gap-4">
          {data.metrics.bounceRate > 5 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-400/10 border border-red-400/20 rounded-lg text-sm text-red-400">
              <AlertTriangle className="w-4 h-4" />
              High bounce rate: {data.metrics.bounceRate}% ({data.metrics.bounced} bounces)
            </div>
          )}
          {data.metrics.unsubscribed > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-400/10 border border-amber-400/20 rounded-lg text-sm text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              {data.metrics.unsubscribed} unsubscribe{data.metrics.unsubscribed > 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}

      {/* Performance Over Time Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-zinc-400" />
          <h2 className="font-semibold">Performance Over Time</h2>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.dailyTimeline}>
              <defs>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="openedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                stroke="#71717a"
                fontSize={12}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis stroke="#71717a" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              />
              <Area
                type="monotone"
                dataKey="sent"
                stroke="#3b82f6"
                fill="url(#sentGrad)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="opened"
                stroke="#10b981"
                fill="url(#openedGrad)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="clicked"
                stroke="#f59e0b"
                fill="transparent"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
              <Area
                type="monotone"
                dataKey="replied"
                stroke="#a855f7"
                fill="transparent"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Funnel and Prospect Status side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Funnel */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="font-semibold mb-4">Sequence Funnel</h2>
          {funnel.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis type="number" stroke="#71717a" fontSize={12} />
                  <YAxis
                    dataKey="subject"
                    type="category"
                    stroke="#71717a"
                    fontSize={12}
                    width={120}
                    tickFormatter={(v) =>
                      v.length > 18 ? v.slice(0, 18) + "..." : v
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  />
                  <Bar dataKey="sent" fill="#3b82f6" name="Sent" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="opened" fill="#10b981" name="Opened" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="replied" fill="#a855f7" name="Replied" radius={[0, 4, 4, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No sequence data yet.</p>
          )}

          {/* Step detail table */}
          {funnel.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800">
                    <th className="text-left py-2 font-medium">Step</th>
                    <th className="text-right py-2 font-medium">Sent</th>
                    <th className="text-right py-2 font-medium">Open %</th>
                    <th className="text-right py-2 font-medium">Click %</th>
                    <th className="text-right py-2 font-medium">Reply %</th>
                  </tr>
                </thead>
                <tbody>
                  {funnel.map((step) => (
                    <tr key={step.stepNumber} className="border-b border-zinc-800/50">
                      <td className="py-2 text-zinc-300">
                        <span className="text-zinc-500 mr-2">#{step.stepNumber}</span>
                        {step.subject.length > 30
                          ? step.subject.slice(0, 30) + "..."
                          : step.subject}
                      </td>
                      <td className="text-right py-2">{step.sent}</td>
                      <td className="text-right py-2 text-emerald-400">{step.openRate}%</td>
                      <td className="text-right py-2 text-amber-400">{step.clickRate}%</td>
                      <td className="text-right py-2 text-purple-400">{step.replyRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Prospect Status Breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="font-semibold mb-4">Prospect Status</h2>
          <div className="space-y-3">
            {Object.entries(data.prospectStatuses).map(([status, count]) => {
              const pct =
                data.totalProspects > 0
                  ? Math.round((count / data.totalProspects) * 100)
                  : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-zinc-400">{status}</span>
                    <span>
                      {count}{" "}
                      <span className="text-zinc-500">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${statusColors[status] || "bg-zinc-600"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-800 text-sm text-zinc-400">
            Total: {data.totalProspects} prospects
          </div>
        </div>
      </div>
    </div>
  );
}
