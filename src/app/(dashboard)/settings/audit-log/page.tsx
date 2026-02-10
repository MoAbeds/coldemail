"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Shield,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  User,
  Calendar,
  Activity,
} from "lucide-react";

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const ACTION_LABELS: Record<string, string> = {
  "campaign.started": "Started campaign",
  "campaign.paused": "Paused campaign",
  "campaign.resumed": "Resumed campaign",
  "campaign.created": "Created campaign",
  "campaign.deleted": "Deleted campaign",
  "lead.assigned": "Assigned lead",
  "lead.status_changed": "Changed lead status",
  "webhook.created": "Created webhook",
  "webhook.deleted": "Deleted webhook",
  "team.member_added": "Added team member",
  "team.member_removed": "Removed team member",
  "team.member_role_changed": "Changed member role",
  "integration.connected": "Connected integration",
  "integration.disconnected": "Disconnected integration",
};

function formatAction(action: string): string {
  return ACTION_LABELS[action] || action.replace(/[._]/g, " ");
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");
      if (actionFilter) params.set("action", actionFilter);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const res = await fetch(`/api/audit-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setPagination(data.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [actionFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = searchUser
    ? logs.filter(
        (l) =>
          l.user?.name?.toLowerCase().includes(searchUser.toLowerCase()) ||
          l.user?.email?.toLowerCase().includes(searchUser.toLowerCase())
      )
    : logs;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-zinc-800 rounded-lg">
          <Shield className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Log</h1>
          <p className="text-zinc-400 text-sm">
            Track all security-relevant actions in your team
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-3 text-zinc-400 text-sm">
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* User search */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by user..."
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Action filter */}
          <div className="relative">
            <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
            >
              <option value="">All actions</option>
              <option value="campaign">Campaign actions</option>
              <option value="lead">Lead actions</option>
              <option value="webhook">Webhook actions</option>
              <option value="team">Team actions</option>
              <option value="integration">Integration actions</option>
            </select>
          </div>

          {/* Date from */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Date to */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Log entries */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">
            <div className="animate-spin w-6 h-6 border-2 border-zinc-600 border-t-blue-400 rounded-full mx-auto mb-2" />
            Loading audit logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            <Search className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
            <p>No audit log entries found</p>
            <p className="text-sm mt-1">
              Actions will appear here as team members perform operations
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="px-4 py-3 hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    {/* User avatar */}
                    <div className="flex-shrink-0">
                      {log.user?.image ? (
                        <img
                          src={log.user.image}
                          alt=""
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-300">
                          {log.user?.name?.[0] || log.user?.email?.[0] || "?"}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white">
                          {log.user?.name || log.user?.email || "System"}
                        </span>
                        <span className="text-sm text-zinc-400">
                          {formatAction(log.action)}
                        </span>
                        {log.entity && (
                          <span className="text-xs px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded">
                            {log.entity}
                            {log.entityId ? ` #${log.entityId.slice(0, 8)}` : ""}
                          </span>
                        )}
                      </div>
                      {log.ipAddress && (
                        <p className="text-xs text-zinc-600 mt-0.5">
                          IP: {log.ipAddress}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-xs text-zinc-500 flex-shrink-0">
                    {formatTimeAgo(log.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
            <span className="text-sm text-zinc-500">
              {pagination.total} entries
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchLogs(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="p-1.5 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-zinc-400">
                {pagination.page} / {pagination.pages}
              </span>
              <button
                onClick={() => fetchLogs(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="p-1.5 rounded hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-400"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
