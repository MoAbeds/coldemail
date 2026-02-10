"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Send,
  Eye,
  MousePointerClick,
  MessageSquare,
  AlertTriangle,
  UserX,
  Award,
  X,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Clock,
  Flame,
  Sun,
  Snowflake,
  RotateCcw,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface LeadDetailProps {
  leadId: string;
  onUpdate: () => void;
}

interface EmailEvent {
  id: string;
  type: string;
  timestamp: string;
  messageId: string | null;
  eventData: Record<string, unknown> | null;
  sequence: {
    stepNumber: number;
    subject: string | null;
    body: string | null;
  };
}

interface LeadData {
  lead: {
    id: string;
    status: string;
    temperature: string;
    lastActivityAt: string | null;
    createdAt: string;
    prospect: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      company: string | null;
      jobTitle: string | null;
      status: string;
      leadTemperature: string;
      currentStep: number;
      emailEvents: EmailEvent[];
    };
    campaign: {
      id: string;
      name: string;
      createdById: string;
      teamId: string;
      emailAccountId: string;
      emailAccount: { id: string; email: string; displayName: string };
    };
    assignedTo: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    } | null;
  };
  stats: {
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
  };
}

export function LeadDetail({ leadId, onUpdate }: LeadDetailProps) {
  const [data, setData] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchLead = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      const json = await res.json();
      if (json.lead) setData(json);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchLead();
    setReplyBody("");
    setExpandedEvents(new Set());
  }, [fetchLead]);

  const updateStatus = async (status: string) => {
    setStatusUpdating(true);
    try {
      await fetch(`/api/leads/${leadId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await fetchLead();
      onUpdate();
    } finally {
      setStatusUpdating(false);
      setShowMoreMenu(false);
    }
  };

  const updateTemperature = async (temperature: string) => {
    await fetch(`/api/leads/${leadId}/temperature`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ temperature }),
    });
    await fetchLead();
    onUpdate();
    setShowMoreMenu(false);
  };

  const sendReply = async () => {
    if (!replyBody.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody }),
      });
      const result = await res.json();
      if (result.success) {
        setReplyBody("");
        await fetchLead();
        onUpdate();
      }
    } finally {
      setSending(false);
    }
  };

  const toggleEvent = (id: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-16 bg-zinc-800 rounded-lg animate-pulse" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-zinc-800 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-zinc-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Lead not found
      </div>
    );
  }

  const { lead, stats } = data;
  const prospect = lead.prospect;
  const displayName =
    [prospect.firstName, prospect.lastName].filter(Boolean).join(" ") ||
    prospect.email;

  const tempConfig: Record<string, { icon: typeof Flame; color: string; bg: string }> = {
    HOT: { icon: Flame, color: "text-red-400", bg: "bg-red-400/10" },
    WARM: { icon: Sun, color: "text-amber-400", bg: "bg-amber-400/10" },
    COLD: { icon: Snowflake, color: "text-blue-400", bg: "bg-blue-400/10" },
  };

  const statusConfig: Record<string, { color: string; bg: string }> = {
    NEW: { color: "text-zinc-300", bg: "bg-zinc-700" },
    CONTACTED: { color: "text-blue-400", bg: "bg-blue-400/10" },
    QUALIFIED: { color: "text-purple-400", bg: "bg-purple-400/10" },
    WON: { color: "text-emerald-400", bg: "bg-emerald-400/10" },
    LOST: { color: "text-red-400", bg: "bg-red-400/10" },
  };

  const eventConfig: Record<string, { icon: typeof Send; color: string; bg: string; label: string }> = {
    SENT: { icon: Send, color: "text-blue-400", bg: "bg-blue-400/10", label: "Email Sent" },
    OPENED: { icon: Eye, color: "text-emerald-400", bg: "bg-emerald-400/10", label: "Opened" },
    CLICKED: { icon: MousePointerClick, color: "text-amber-400", bg: "bg-amber-400/10", label: "Clicked" },
    REPLIED: { icon: MessageSquare, color: "text-purple-400", bg: "bg-purple-400/10", label: "Replied" },
    BOUNCED: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10", label: "Bounced" },
    UNSUBSCRIBED: { icon: UserX, color: "text-zinc-400", bg: "bg-zinc-400/10", label: "Unsubscribed" },
  };

  const TempIcon = tempConfig[lead.temperature]?.icon || Snowflake;
  const sConf = statusConfig[lead.status] || statusConfig.NEW;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-start gap-4">
          {/* Large Avatar */}
          <div className="w-14 h-14 rounded-full bg-zinc-700 flex items-center justify-center text-xl font-medium shrink-0">
            {(prospect.firstName?.[0] || prospect.email[0]).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold truncate">{displayName}</h1>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${sConf.bg} ${sConf.color}`}>
                {lead.status}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${tempConfig[lead.temperature]?.bg} ${tempConfig[lead.temperature]?.color}`}>
                <TempIcon className="w-3 h-3" />
                {lead.temperature}
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-0.5">
              {prospect.email}
              {prospect.company && ` · ${prospect.company}`}
              {prospect.jobTitle && ` · ${prospect.jobTitle}`}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Campaign: {lead.campaign.name}
              {lead.assignedTo && (
                <> · Assigned to {lead.assignedTo.name || lead.assignedTo.email}</>
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => document.getElementById("reply-composer")?.focus()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              Reply
            </button>
            {lead.status !== "WON" && (
              <button
                onClick={() => updateStatus("WON")}
                disabled={statusUpdating}
                className="px-3 py-2 border border-emerald-600 text-emerald-400 hover:bg-emerald-400/10 text-sm rounded-lg transition-colors"
              >
                <Award className="w-4 h-4" />
              </button>
            )}
            {lead.status !== "LOST" && (
              <button
                onClick={() => updateStatus("LOST")}
                disabled={statusUpdating}
                className="px-3 py-2 border border-red-600 text-red-400 hover:bg-red-400/10 text-sm rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="p-2 border border-zinc-700 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {showMoreMenu && (
                <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 py-1 w-48">
                  <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-zinc-500">
                    Status
                  </p>
                  {["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"].map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(s)}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-700 ${
                        lead.status === s ? "text-white font-medium" : "text-zinc-400"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                  <div className="border-t border-zinc-700 my-1" />
                  <p className="px-3 py-1 text-[10px] uppercase tracking-wider text-zinc-500">
                    Temperature
                  </p>
                  {[
                    { key: "HOT", icon: Flame, color: "text-red-400" },
                    { key: "WARM", icon: Sun, color: "text-amber-400" },
                    { key: "COLD", icon: Snowflake, color: "text-blue-400" },
                  ].map((t) => (
                    <button
                      key={t.key}
                      onClick={() => updateTemperature(t.key)}
                      className={`w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-700 flex items-center gap-2 ${
                        lead.temperature === t.key ? "font-medium" : ""
                      } ${t.color}`}
                    >
                      <t.icon className="w-3.5 h-3.5" />
                      {t.key}
                    </button>
                  ))}
                  {(lead.status === "WON" || lead.status === "LOST") && (
                    <>
                      <div className="border-t border-zinc-700 my-1" />
                      <button
                        onClick={() => updateStatus("NEW")}
                        className="w-full text-left px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-700 flex items-center gap-2"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reopen Lead
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3 p-6 border-b border-zinc-800">
        {[
          { label: "Sent", value: stats.sent, icon: Send, color: "text-blue-400" },
          { label: "Opened", value: stats.opened, icon: Eye, color: "text-emerald-400" },
          { label: "Clicked", value: stats.clicked, icon: MousePointerClick, color: "text-amber-400" },
          { label: "Replied", value: stats.replied, icon: MessageSquare, color: "text-purple-400" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center"
          >
            <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
            <div className="text-lg font-bold">{s.value}</div>
            <div className="text-[10px] text-zinc-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        {/* Activity Timeline */}
        <div className="p-6">
          <h3 className="font-semibold mb-4">Activity Timeline</h3>
          {prospect.emailEvents.length === 0 ? (
            <p className="text-sm text-zinc-500">No activity yet.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-5 top-0 bottom-0 w-px bg-zinc-800" />
              <div className="space-y-3">
                {prospect.emailEvents.map((event) => {
                  const conf = eventConfig[event.type] || eventConfig.SENT;
                  const Icon = conf.icon;
                  const isExpanded = expandedEvents.has(event.id);
                  const hasContent =
                    event.type === "SENT" || event.type === "REPLIED";
                  const isReply = event.type === "REPLIED";
                  const isManualReply =
                    event.type === "SENT" &&
                    (event.eventData as Record<string, unknown>)?.isManualReply;
                  const clickUrl =
                    event.type === "CLICKED"
                      ? (event.eventData as Record<string, unknown>)?.url
                      : null;

                  return (
                    <div key={event.id} className="relative flex items-start gap-3 pl-1">
                      <div className={`relative z-10 p-2 rounded-lg ${conf.bg} shrink-0`}>
                        <Icon className={`w-4 h-4 ${conf.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {hasContent ? (
                            <button
                              onClick={() => toggleEvent(event.id)}
                              className="flex items-center gap-1 text-sm font-medium hover:text-zinc-200 transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3 h-3" />
                              ) : (
                                <ChevronRight className="w-3 h-3" />
                              )}
                              {isReply
                                ? "Reply Received"
                                : isManualReply
                                ? "Manual Reply Sent"
                                : conf.label}
                            </button>
                          ) : (
                            <span className="text-sm font-medium">
                              {conf.label}
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-600">
                            Step #{event.sequence.stepNumber}
                          </span>
                        </div>

                        {event.sequence.subject && (
                          <p className="text-xs text-zinc-500 truncate mt-0.5">
                            {event.sequence.subject}
                          </p>
                        )}

                        {clickUrl != null ? (
                          <p className="text-xs text-blue-400 truncate mt-0.5">
                            {String(clickUrl)}
                          </p>
                        ) : null}

                        <p className="text-[10px] text-zinc-600 mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(event.timestamp), "MMM d, yyyy · h:mm a")}
                          {" · "}
                          {formatDistanceToNow(new Date(event.timestamp), {
                            addSuffix: true,
                          })}
                        </p>

                        {/* Expanded content */}
                        {isExpanded && event.sequence.body && (
                          <div
                            className={`mt-2 p-3 rounded-lg text-sm ${
                              isReply
                                ? "bg-purple-400/5 border border-purple-400/20"
                                : "bg-zinc-800/50 border border-zinc-700"
                            }`}
                          >
                            <div
                              className="text-zinc-300 prose prose-sm prose-invert max-w-none"
                              dangerouslySetInnerHTML={{
                                __html: event.sequence.body,
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Reply Composer */}
        <div className="p-6 border-t border-zinc-800">
          <h3 className="font-semibold mb-3">Reply</h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-zinc-800 text-xs text-zinc-500">
              From: {lead.campaign.emailAccount.displayName} &lt;{lead.campaign.emailAccount.email}&gt;
              <br />
              To: {prospect.email}
            </div>
            <textarea
              id="reply-composer"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write your reply..."
              rows={6}
              className="w-full bg-transparent px-4 py-3 text-sm resize-none focus:outline-none placeholder:text-zinc-600"
            />
            <div className="flex items-center justify-between p-3 border-t border-zinc-800">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                {lead.prospect.emailEvents.some((e) => e.messageId) && (
                  <span>Thread will be preserved</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={sendReply}
                  disabled={sending || !replyBody.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {sending ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
