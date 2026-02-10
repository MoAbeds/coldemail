"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Eye,
  MessageSquare,
  Users,
  BarChart3,
  Zap,
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
  Legend,
} from "recharts";

interface Overview {
  totalCampaigns: number;
  activeCampaigns: number;
  totalProspects: number;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalReplied: number;
  openRate: number;
  replyRate: number;
}

interface TopCampaign {
  id: string;
  name: string;
  status: string;
  sent: number;
  openRate: number;
  replyRate: number;
}

interface TeamMember {
  id: string;
  name: string;
  image: string | null;
  role: string;
  sent: number;
  replied: number;
  replyRate: number;
}

interface DashboardData {
  overview: Overview;
  dailyTimeline: Array<Record<string, unknown>>;
  topCampaigns: TopCampaign[];
  teamMembers: TeamMember[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard/stats?days=${days}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return (
      <div className="p-4 sm:p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-zinc-800 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-zinc-800 rounded-lg" />
            ))}
          </div>
          <div className="h-56 sm:h-72 bg-zinc-800 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-zinc-400">
        Failed to load dashboard.
      </div>
    );
  }

  const { overview } = data;

  const statCards = [
    {
      label: "Emails Sent",
      value: overview.totalSent.toLocaleString(),
      icon: Send,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: "Open Rate",
      value: `${overview.openRate}%`,
      sublabel: `${overview.totalOpened.toLocaleString()} opens`,
      icon: Eye,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
    {
      label: "Reply Rate",
      value: `${overview.replyRate}%`,
      sublabel: `${overview.totalReplied.toLocaleString()} replies`,
      icon: MessageSquare,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
    {
      label: "Active Campaigns",
      value: overview.activeCampaigns,
      sublabel: `${overview.totalCampaigns} total`,
      icon: Zap,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
    },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold">Dashboard</h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            {overview.totalProspects.toLocaleString()} total prospects across{" "}
            {overview.totalCampaigns} campaigns
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm w-full sm:w-auto"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-5"
          >
            <div className={`p-2 rounded-lg ${card.bg} w-fit mb-2 sm:mb-3`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <div className="text-xl sm:text-2xl font-bold">{card.value}</div>
            <div className="text-xs text-zinc-500 mt-1">
              {card.sublabel || card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Activity Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-zinc-400" />
          <h2 className="font-semibold text-sm sm:text-base">Email Activity</h2>
        </div>
        <div className="h-48 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.dailyTimeline}>
              <defs>
                <linearGradient id="dashSentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dashOpenGrad" x1="0" y1="0" x2="0" y2="1">
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
                fill="url(#dashSentGrad)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="opened"
                stroke="#10b981"
                fill="url(#dashOpenGrad)"
                strokeWidth={2}
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

      {/* Top Campaigns + Team Members */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Top Campaigns */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-zinc-400" />
            <h2 className="font-semibold">Top Campaigns</h2>
          </div>
          {data.topCampaigns.length === 0 ? (
            <p className="text-sm text-zinc-500">No active campaigns yet.</p>
          ) : (
            <div className="space-y-3">
              {data.topCampaigns.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/campaigns/${c.id}/analytics`)}
                  className="w-full text-left p-3 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {c.name}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Send className="w-3 h-3" /> {c.sent}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" /> {c.openRate}%
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> {c.replyRate}%
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        c.status === "ACTIVE"
                          ? "bg-emerald-400/10 text-emerald-400"
                          : "bg-zinc-700 text-zinc-400"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Team Members */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-zinc-400" />
            <h2 className="font-semibold">Team Performance</h2>
          </div>
          {data.teamMembers.length === 0 ? (
            <p className="text-sm text-zinc-500">No team members yet.</p>
          ) : (
            <div className="space-y-3">
              {data.teamMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-3 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-medium shrink-0">
                    {m.image ? (
                      <img
                        src={m.image}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      m.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {m.name}
                    </div>
                    <div className="text-xs text-zinc-500">{m.role}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{m.sent} sent</div>
                    <div className="text-xs text-zinc-500">
                      {m.replyRate}% reply rate
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
