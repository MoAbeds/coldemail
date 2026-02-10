"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Eye,
  MousePointerClick,
  MessageSquare,
  AlertTriangle,
  UserX,
  CheckCircle,
  Clock,
  Briefcase,
  Flame,
} from "lucide-react";

interface ProspectInfo {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  jobTitle: string | null;
  status: string;
  currentStep: number;
  leadTemperature: string;
  leadStatus: string;
}

interface TimelineEntry {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface Summary {
  totalEvents: number;
  emailsSent: number;
  opens: number;
  clicks: number;
  replies: number;
}

interface TimelineData {
  prospect: ProspectInfo;
  campaign: { id: string; name: string };
  timeline: TimelineEntry[];
  summary: Summary;
}

const eventConfig: Record<
  string,
  { icon: typeof Send; color: string; bg: string; label: string }
> = {
  "email.sent": {
    icon: Send,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    label: "Email Sent",
  },
  "email.opened": {
    icon: Eye,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    label: "Email Opened",
  },
  "email.clicked": {
    icon: MousePointerClick,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    label: "Link Clicked",
  },
  "email.replied": {
    icon: MessageSquare,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    label: "Reply Received",
  },
  "email.bounced": {
    icon: AlertTriangle,
    color: "text-red-400",
    bg: "bg-red-400/10",
    label: "Email Bounced",
  },
  "email.unsubscribed": {
    icon: UserX,
    color: "text-zinc-400",
    bg: "bg-zinc-400/10",
    label: "Unsubscribed",
  },
  "lead.created": {
    icon: Flame,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    label: "Lead Created",
  },
  "task.pending": {
    icon: Clock,
    color: "text-zinc-400",
    bg: "bg-zinc-400/10",
    label: "Task Created",
  },
  "task.completed": {
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    label: "Task Completed",
  },
};

export default function ProspectTimelinePage() {
  const params = useParams();
  const router = useRouter();
  const prospectId = params.id as string;

  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/prospects/${prospectId}/timeline`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [prospectId]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-zinc-800 rounded" />
          <div className="h-24 bg-zinc-800 rounded-lg" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-zinc-800 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-zinc-400">
        Prospect not found.
      </div>
    );
  }

  const { prospect, campaign, timeline, summary } = data;
  const displayName =
    [prospect.firstName, prospect.lastName].filter(Boolean).join(" ") ||
    prospect.email;

  const tempColors: Record<string, string> = {
    HOT: "text-red-400 bg-red-400/10",
    WARM: "text-amber-400 bg-amber-400/10",
    COLD: "text-blue-400 bg-blue-400/10",
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold">{displayName}</h1>
          <p className="text-sm text-zinc-400">
            {prospect.email}
            {prospect.company && ` · ${prospect.company}`}
          </p>
        </div>
      </div>

      {/* Prospect Summary Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <div className="text-xs text-zinc-500 mb-1">Status</div>
            <span
              className={`text-sm font-medium px-2 py-0.5 rounded ${
                prospect.status === "COMPLETED"
                  ? "bg-emerald-400/10 text-emerald-400"
                  : prospect.status === "BOUNCED"
                  ? "bg-red-400/10 text-red-400"
                  : "bg-zinc-700 text-zinc-300"
              }`}
            >
              {prospect.status}
            </span>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1">Temperature</div>
            <span
              className={`text-sm font-medium px-2 py-0.5 rounded ${tempColors[prospect.leadTemperature] || ""}`}
            >
              {prospect.leadTemperature}
            </span>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1">Campaign</div>
            <button
              onClick={() => router.push(`/campaigns/${campaign.id}/analytics`)}
              className="text-sm text-blue-400 hover:underline"
            >
              {campaign.name}
            </button>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1">Current Step</div>
            <div className="text-sm font-medium">{prospect.currentStep}</div>
          </div>
          <div>
            <div className="text-xs text-zinc-500 mb-1">Job Title</div>
            <div className="text-sm text-zinc-300">
              {prospect.jobTitle || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Engagement Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Sent", value: summary.emailsSent, icon: Send, color: "text-blue-400" },
          { label: "Opens", value: summary.opens, icon: Eye, color: "text-emerald-400" },
          { label: "Clicks", value: summary.clicks, icon: MousePointerClick, color: "text-amber-400" },
          { label: "Replies", value: summary.replies, icon: MessageSquare, color: "text-purple-400" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center"
          >
            <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
            <div className="text-lg font-bold">{s.value}</div>
            <div className="text-xs text-zinc-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="font-semibold mb-4">Activity Timeline</h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-zinc-500">No activity yet.</p>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-zinc-800" />

            <div className="space-y-4">
              {timeline.map((entry, i) => {
                const config =
                  eventConfig[entry.type] || eventConfig["task.pending"]!;
                const Icon = config.icon || Briefcase;
                const ts = new Date(entry.timestamp);

                return (
                  <div key={i} className="relative flex items-start gap-4 pl-2">
                    <div
                      className={`relative z-10 p-2 rounded-lg ${config.bg}`}
                    >
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {config.label}
                        </span>
                        {entry.data.stepNumber != null ? (
                          <span className="text-xs text-zinc-500">
                            Step #{String(entry.data.stepNumber)}
                          </span>
                        ) : null}
                      </div>
                      {entry.data.subject != null ? (
                        <p className="text-sm text-zinc-400 truncate">
                          {String(entry.data.subject)}
                        </p>
                      ) : null}
                      {entry.data.title != null ? (
                        <p className="text-sm text-zinc-400">
                          {String(entry.data.title)}
                        </p>
                      ) : null}
                      <p className="text-xs text-zinc-600 mt-0.5">
                        {ts.toLocaleDateString()}{" "}
                        {ts.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
