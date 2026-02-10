"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  BarChart3,
  MoreHorizontal,
  Pause,
  Play,
  Users,
  Mail,
  Loader2,
  Download,
} from "lucide-react";
import {
  FilterBar,
  BulkActionBar,
  Pagination,
  type ActiveFilter,
} from "@/components/search/filter-bar";

/* ---------- types ---------- */

interface Campaign {
  id: string;
  name: string;
  status: string;
  dailyLimit: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  emailAccount: { email: string; displayName: string } | null;
  createdBy: { id: string; name: string | null; email: string };
  _count: { prospects: number; emailEvents: number; leads: number };
  sequences: Array<{ id: string; stepNumber: number; type: string }>;
}

interface SavedFilter {
  id: string;
  name: string;
  filters: Record<string, string>;
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500/10 text-green-600 border-green-500/20",
  PAUSED: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  COMPLETED: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  DRAFT: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

/* ---------- page ---------- */

export default function CampaignsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  // Filters from URL
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [filters, setFilters] = useState<Record<string, string>>(() => {
    const f: Record<string, string> = {};
    if (searchParams.get("status")) f.status = searchParams.get("status")!;
    if (searchParams.get("created_by")) f.created_by = searchParams.get("created_by")!;
    if (searchParams.get("date_from")) f.date_from = searchParams.get("date_from")!;
    if (searchParams.get("date_to")) f.date_to = searchParams.get("date_to")!;
    return f;
  });
  const [sort, setSort] = useState(searchParams.get("sort") || "date");
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1", 10));

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync filters to URL
  const updateUrl = useCallback(
    (newSearch: string, newFilters: Record<string, string>, newSort: string, newPage: number) => {
      const params = new URLSearchParams();
      if (newSearch) params.set("search", newSearch);
      Object.entries(newFilters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });
      if (newSort !== "date") params.set("sort", newSort);
      if (newPage > 1) params.set("page", String(newPage));
      const qs = params.toString();
      router.replace(`/campaigns${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router]
  );

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      params.set("sort", sort);
      if (search) params.set("search", search);
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.set(k, v);
      });

      const res = await fetch(`/api/campaigns?${params}`);
      const data = await res.json();
      if (data.campaigns) {
        setCampaigns(data.campaigns);
        setPagination(data.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [page, sort, search, filters]);

  // Fetch saved filters
  useEffect(() => {
    fetch("/api/filters?scope=campaigns")
      .then((r) => r.json())
      .then((data) => {
        if (data.filters) {
          setSavedFilters(
            data.filters.map((f: { id: string; name: string; filters: Record<string, string> }) => ({
              id: f.id,
              name: f.name,
              filters: f.filters as Record<string, string>,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // Debounced fetch on filter change
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCampaigns();
      updateUrl(search, filters, sort, page);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [fetchCampaigns, updateUrl, search, filters, sort, page]);

  // Filter configurations
  const filterConfigs = [
    {
      key: "status",
      label: "Status",
      type: "select" as const,
      options: [
        { label: "Active", value: "ACTIVE" },
        { label: "Paused", value: "PAUSED" },
        { label: "Completed", value: "COMPLETED" },
        { label: "Draft", value: "DRAFT" },
      ],
    },
    {
      key: "date",
      label: "Date Created",
      type: "date-range" as const,
      options: [
        { label: "Last 7 days", value: "7" },
        { label: "Last 30 days", value: "30" },
      ],
    },
  ];

  const sortOptions = [
    { label: "Date Created", value: "date" },
    { label: "Name", value: "name" },
    { label: "Last Activity", value: "last_activity" },
    { label: "Performance", value: "performance" },
  ];

  // Build active filters list
  const activeFilters: ActiveFilter[] = [];
  if (filters.status) {
    activeFilters.push({
      key: "status",
      label: "Status",
      value: filters.status,
      displayValue: filters.status,
    });
  }
  if (filters.date_from || filters.date_to) {
    activeFilters.push({
      key: "date",
      label: "Date",
      value: "custom",
      displayValue: [
        filters.date_from ? new Date(filters.date_from).toLocaleDateString() : "",
        filters.date_to ? new Date(filters.date_to).toLocaleDateString() : "",
      ]
        .filter(Boolean)
        .join(" - "),
    });
  }
  if (filters.created_by) {
    activeFilters.push({
      key: "created_by",
      label: "Created by",
      value: filters.created_by,
      displayValue: filters.created_by,
    });
  }

  function handleFilterChange(key: string, value: string | null) {
    setPage(1);
    if (key === "date_from" || key === "date_to") {
      setFilters((f) => {
        const next = { ...f };
        if (value) next[key] = value;
        else {
          delete next.date_from;
          delete next.date_to;
        }
        return next;
      });
    } else if (key === "date") {
      // Clear date filters
      setFilters((f) => {
        const next = { ...f };
        delete next.date_from;
        delete next.date_to;
        return next;
      });
    } else {
      setFilters((f) => {
        const next = { ...f };
        if (value) next[key] = value;
        else delete next[key];
        return next;
      });
    }
  }

  async function handleBulkExport() {
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const rows = campaigns.filter((c) => ids.includes(c.id));
      const csv = [
        "Name,Status,Prospects,Events,Leads,Created",
        ...rows.map((c) =>
          [c.name, c.status, c._count.prospects, c._count.emailEvents, c._count.leads, c.createdAt].join(",")
        ),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "campaigns-export.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <div className="px-4 sm:px-6 py-4 sm:py-8 max-w-6xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold">Campaigns</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            {pagination.total} campaign{pagination.total !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/campaigns/new">
          <button className="flex items-center gap-2 rounded-lg bg-primary px-3 sm:px-4 py-2 sm:py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 whitespace-nowrap">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Campaign</span>
            <span className="sm:hidden">New</span>
          </button>
        </Link>
      </div>

      {/* Filters */}
      <FilterBar
        filters={filterConfigs}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onClearAll={() => {
          setFilters({});
          setSearch("");
          setSort("date");
          setPage(1);
        }}
        search={search}
        onSearchChange={(s) => {
          setSearch(s);
          setPage(1);
        }}
        searchPlaceholder="Search campaigns..."
        sortOptions={sortOptions}
        sort={sort}
        onSortChange={(s) => {
          setSort(s);
          setPage(1);
        }}
        savedFilters={savedFilters}
        onSaveFilter={async (name) => {
          const res = await fetch("/api/filters", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              scope: "campaigns",
              filters: { ...filters, search, sort },
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setSavedFilters((prev) => [
              { id: data.filter.id, name, filters: { ...filters, search, sort } },
              ...prev,
            ]);
          }
        }}
        onLoadFilter={(f) => {
          setFilters(f);
          if (f.search) setSearch(f.search);
          if (f.sort) setSort(f.sort);
          setPage(1);
        }}
        onDeleteFilter={async (id) => {
          await fetch(`/api/filters/${id}`, { method: "DELETE" });
          setSavedFilters((prev) => prev.filter((f) => f.id !== id));
        }}
      />

      {/* Bulk Actions */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        totalCount={campaigns.length}
        onSelectAll={() => setSelectedIds(new Set(campaigns.map((c) => c.id)))}
        onClearSelection={() => setSelectedIds(new Set())}
        loading={bulkLoading}
        actions={[
          {
            label: "Export CSV",
            icon: <Download className="h-3.5 w-3.5" />,
            onClick: handleBulkExport,
          },
        ]}
      />

      {/* Campaign List */}
      {loading && campaigns.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <p className="text-muted-foreground">
            {search || Object.keys(filters).length > 0
              ? "No campaigns match your filters."
              : "No campaigns yet."}
          </p>
          {!search && Object.keys(filters).length === 0 && (
            <Link href="/campaigns/new" className="mt-4">
              <button className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">
                Create your first campaign
              </button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {campaigns.map((campaign) => (
            <CampaignRow
              key={campaign.id}
              campaign={campaign}
              selected={selectedIds.has(campaign.id)}
              onToggleSelect={() => {
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(campaign.id)) next.delete(campaign.id);
                  else next.add(campaign.id);
                  return next;
                });
              }}
              showCheckbox={selectedIds.size > 0}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        page={pagination.page}
        pages={pagination.pages}
        total={pagination.total}
        onPageChange={setPage}
      />
    </div>
  );
}

/* ---------- Campaign Row ---------- */

function CampaignRow({
  campaign,
  selected,
  onToggleSelect,
  showCheckbox,
}: {
  campaign: Campaign;
  selected: boolean;
  onToggleSelect: () => void;
  showCheckbox: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`group rounded-lg border p-3 sm:p-4 transition-colors hover:bg-muted/50 ${
        selected ? "border-primary/50 bg-primary/5" : ""
      }`}
    >
      {/* Desktop: row layout / Mobile: card layout */}
      <div className="flex items-start sm:items-center gap-3">
        {/* Checkbox */}
        <div className={`pt-0.5 sm:pt-0 ${showCheckbox ? "block" : "hidden group-hover:block"}`}>
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="rounded min-w-[18px] min-h-[18px]"
          />
        </div>

        {/* Campaign info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/campaigns/${campaign.id}/analytics`}
              className="truncate font-medium hover:text-primary text-sm sm:text-base"
            >
              {campaign.name}
            </Link>
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${
                STATUS_COLORS[campaign.status] || STATUS_COLORS.DRAFT
              }`}
            >
              {campaign.status}
            </span>
          </div>

          {/* Meta - wraps on mobile */}
          <div className="mt-1 flex items-center gap-3 sm:gap-4 text-xs text-muted-foreground flex-wrap">
            {campaign.emailAccount && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span className="truncate max-w-[120px] sm:max-w-none">
                  {campaign.emailAccount.displayName || campaign.emailAccount.email}
                </span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {campaign._count.prospects}
            </span>
            <span className="hidden sm:inline">
              {campaign.sequences.filter((s) => s.type === "EMAIL").length} steps
            </span>
            <span className="hidden sm:inline">
              {new Date(campaign.createdAt).toLocaleDateString()}
            </span>
          </div>

          {/* Mobile-only: stats row */}
          <div className="flex items-center gap-4 mt-2 sm:hidden text-xs text-muted-foreground">
            <span>{campaign._count.emailEvents} events</span>
            <span>{campaign._count.leads} leads</span>
            <span>{campaign.sequences.filter((s) => s.type === "EMAIL").length} steps</span>
          </div>
        </div>

        {/* Desktop stats */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Events</p>
            <p className="font-medium">{campaign._count.emailEvents}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Leads</p>
            <p className="font-medium">{campaign._count.leads}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Link
            href={`/campaigns/${campaign.id}/analytics`}
            className="rounded p-2 sm:p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
            title="Analytics"
          >
            <BarChart3 className="h-4 w-4" />
          </Link>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded p-2 sm:p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-lg border bg-card py-1 shadow-lg">
                {campaign.status === "ACTIVE" && (
                  <button
                    onClick={() => {
                      fetch(`/api/campaigns/${campaign.id}/control`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "pause" }),
                      });
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted min-h-[44px]"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    Pause
                  </button>
                )}
                {campaign.status === "PAUSED" && (
                  <button
                    onClick={() => {
                      fetch(`/api/campaigns/${campaign.id}/control`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "resume" }),
                      });
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted min-h-[44px]"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Resume
                  </button>
                )}
                <Link
                  href={`/campaigns/${campaign.id}/analytics`}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted min-h-[44px]"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Analytics
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
