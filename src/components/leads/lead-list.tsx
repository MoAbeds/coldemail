"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { useLeadCatcherStore, type LeadItem } from "@/store/lead-catcher-store";
import {
  Search,
  ChevronDown,
  CheckSquare,
  Square,
  Flame,
  Sun,
  Snowflake,
  Users,
  Award,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface LeadListProps {
  onRefresh: () => void;
}

export function LeadList({ onRefresh }: LeadListProps) {
  const {
    leads,
    loading,
    loadingMore,
    hasMore,
    total,
    search,
    sort,
    selectedLeadId,
    bulkMode,
    selectedIds,
    setSearch,
    setSort,
    selectLead,
    setBulkMode,
    toggleBulkSelect,
    selectAll,
    clearSelection,
    setPage,
    page,
    setLoadingMore,
    appendLeads,
  } = useLeadCatcherStore();

  const [searchInput, setSearchInput] = useState(search);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced search
  const handleSearch = (value: string) => {
    setSearchInput(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(value), 300);
  };

  // Infinite scroll
  const handleScroll = useCallback(async () => {
    const el = scrollRef.current;
    if (!el || loadingMore || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      setLoadingMore(true);
      try {
        const nextPage = page + 1;
        const params = new URLSearchParams();
        params.set("page", String(nextPage));
        params.set("sort", sort);
        if (search) params.set("search", search);
        const res = await fetch(`/api/leads?${params}`);
        const data = await res.json();
        if (data.leads) {
          appendLeads(data.leads);
          setPage(nextPage);
        }
      } finally {
        setLoadingMore(false);
      }
    }
  }, [loadingMore, hasMore, page, sort, search, setLoadingMore, appendLeads, setPage]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.addEventListener("scroll", handleScroll);
    return () => el?.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Bulk actions
  const handleBulkAction = async (action: string, data?: Record<string, string>) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (action === "export") {
      const res = await fetch("/api/leads/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: ids, action: "export" }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "leads_export.csv";
      a.click();
      URL.revokeObjectURL(url);
    } else {
      await fetch("/api/leads/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: ids, action, data }),
      });
      onRefresh();
    }
    clearSelection();
    setShowBulkMenu(false);
  };

  const tempBorder: Record<string, string> = {
    HOT: "border-l-red-400",
    WARM: "border-l-amber-400",
    COLD: "border-l-blue-400",
  };

  const tempIcon: Record<string, typeof Flame> = {
    HOT: Flame,
    WARM: Sun,
    COLD: Snowflake,
  };

  return (
    <>
      {/* Search + Sort Header */}
      <div className="p-3 border-b border-zinc-800 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className={`p-1.5 rounded transition-colors ${
                bulkMode ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
              title="Bulk select"
            >
              <CheckSquare className="w-4 h-4" />
            </button>
            {bulkMode && selectedIds.size > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowBulkMenu(!showBulkMenu)}
                  className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-600 text-white rounded"
                >
                  {selectedIds.size} selected <ChevronDown className="w-3 h-3" />
                </button>
                {showBulkMenu && (
                  <div className="absolute top-full left-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 py-1 w-44">
                    <button
                      onClick={() => handleBulkAction("status", { status: "WON" })}
                      className="w-full text-left px-3 py-1.5 text-sm text-emerald-400 hover:bg-zinc-700 flex items-center gap-2"
                    >
                      <Award className="w-3.5 h-3.5" /> Mark as Won
                    </button>
                    <button
                      onClick={() => handleBulkAction("status", { status: "LOST" })}
                      className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2"
                    >
                      <X className="w-3.5 h-3.5" /> Mark as Lost
                    </button>
                    <div className="border-t border-zinc-700 my-1" />
                    <button
                      onClick={() => handleBulkAction("temperature", { temperature: "HOT" })}
                      className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2"
                    >
                      <Flame className="w-3.5 h-3.5" /> Set Hot
                    </button>
                    <button
                      onClick={() => handleBulkAction("temperature", { temperature: "WARM" })}
                      className="w-full text-left px-3 py-1.5 text-sm text-amber-400 hover:bg-zinc-700 flex items-center gap-2"
                    >
                      <Sun className="w-3.5 h-3.5" /> Set Warm
                    </button>
                    <div className="border-t border-zinc-700 my-1" />
                    <button
                      onClick={() => handleBulkAction("export")}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-700 flex items-center gap-2"
                    >
                      <Users className="w-3.5 h-3.5" /> Export CSV
                    </button>
                  </div>
                )}
              </div>
            )}
            {bulkMode && (
              <button
                onClick={selectAll}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Select all
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">{total} leads</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded text-xs px-2 py-1"
            >
              <option value="newest">Newest</option>
              <option value="last_activity">Last Activity</option>
              <option value="hottest">Hottest</option>
              <option value="replied">Replied</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lead List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 bg-zinc-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">
            No leads found
          </div>
        ) : (
          <div>
            {leads.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                isSelected={selectedLeadId === lead.id}
                isBulkSelected={selectedIds.has(lead.id)}
                bulkMode={bulkMode}
                onSelect={() => selectLead(lead.id)}
                onBulkToggle={() => toggleBulkSelect(lead.id)}
                tempBorder={tempBorder}
                tempIcon={tempIcon}
              />
            ))}
            {loadingMore && (
              <div className="p-4 text-center text-zinc-500 text-xs">
                Loading more...
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function LeadRow({
  lead,
  isSelected,
  isBulkSelected,
  bulkMode,
  onSelect,
  onBulkToggle,
  tempBorder,
  tempIcon,
}: {
  lead: LeadItem;
  isSelected: boolean;
  isBulkSelected: boolean;
  bulkMode: boolean;
  onSelect: () => void;
  onBulkToggle: () => void;
  tempBorder: Record<string, string>;
  tempIcon: Record<string, typeof Flame>;
}) {
  const name =
    [lead.prospect.firstName, lead.prospect.lastName].filter(Boolean).join(" ") ||
    lead.prospect.email;
  const lastEvent = lead.prospect.emailEvents?.[0];
  const TempIcon = tempIcon[lead.temperature] || Snowflake;
  const borderClass = tempBorder[lead.temperature] || "border-l-zinc-700";

  return (
    <div
      onClick={bulkMode ? onBulkToggle : onSelect}
      className={`flex items-start gap-3 px-3 py-3 border-l-2 cursor-pointer transition-colors ${borderClass} ${
        isSelected && !bulkMode
          ? "bg-blue-600/10 border-l-blue-500"
          : isBulkSelected
          ? "bg-blue-600/5"
          : "hover:bg-zinc-800/50"
      }`}
    >
      {bulkMode && (
        <div className="pt-1">
          {isBulkSelected ? (
            <CheckSquare className="w-4 h-4 text-blue-400" />
          ) : (
            <Square className="w-4 h-4 text-zinc-600" />
          )}
        </div>
      )}

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-medium shrink-0 mt-0.5">
        {(lead.prospect.firstName?.[0] || lead.prospect.email[0]).toUpperCase()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-medium text-sm truncate">{name}</span>
            <TempIcon
              className={`w-3 h-3 shrink-0 ${
                lead.temperature === "HOT"
                  ? "text-red-400"
                  : lead.temperature === "WARM"
                  ? "text-amber-400"
                  : "text-blue-400"
              }`}
            />
          </div>
          <span className="text-[10px] text-zinc-600 shrink-0">
            {lastEvent
              ? formatDistanceToNow(new Date(lastEvent.timestamp), { addSuffix: true })
              : ""}
          </span>
        </div>
        {lead.prospect.company && (
          <p className="text-xs text-zinc-500 truncate">{lead.prospect.company}</p>
        )}
        <p className="text-xs text-zinc-600 mt-0.5 line-clamp-2">
          {lastEvent
            ? `${lastEvent.type === "REPLIED" ? "Replied" : lastEvent.type === "SENT" ? "Email sent" : lastEvent.type === "OPENED" ? "Opened email" : lastEvent.type === "CLICKED" ? "Clicked link" : lastEvent.type}`
            : "No activity yet"}
          {lead.campaign?.name ? ` · ${lead.campaign.name}` : ""}
        </p>
      </div>

      {/* Unread indicator for replied */}
      {lastEvent?.type === "REPLIED" && (
        <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 shrink-0" />
      )}
    </div>
  );
}
