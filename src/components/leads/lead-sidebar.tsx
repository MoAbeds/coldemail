"use client";

import { useState } from "react";
import { useLeadCatcherStore } from "@/store/lead-catcher-store";
import {
  Inbox,
  MessageSquare,
  Eye,
  MousePointerClick,
  Sparkles,
  Flame,
  Sun,
  Snowflake,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  FolderOpen,
  SlidersHorizontal,
  Bookmark,
} from "lucide-react";

interface SavedFilter {
  id: string;
  name: string;
  filters: Record<string, string>;
}

export function LeadSidebar({
  savedFilters,
  onSaveFilter,
  onLoadFilter,
  onDeleteFilter,
}: {
  savedFilters?: SavedFilter[];
  onSaveFilter?: (name: string) => void;
  onLoadFilter?: (filters: Record<string, string>) => void;
  onDeleteFilter?: (id: string) => void;
}) {
  const {
    counts,
    activeFilter,
    temperatureFilter,
    statusFilter,
    campaignFilter,
    setActiveFilter,
    setTemperatureFilter,
    setStatusFilter,
    setCampaignFilter,
  } = useLeadCatcherStore();

  const [campaignsOpen, setCampaignsOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  if (!counts) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-8 bg-zinc-800 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  const filterItems = [
    { key: null, label: "All Leads", count: counts.filters.all, icon: Inbox },
    { key: "replied", label: "Replied", count: counts.filters.replied, icon: MessageSquare },
    { key: "opened", label: "Opened Only", count: counts.filters.openedOnly, icon: Eye },
    { key: "clicked", label: "Clicked", count: counts.filters.clicked, icon: MousePointerClick },
    { key: "new_today", label: "New Today", count: counts.filters.newToday, icon: Sparkles },
  ];

  const tempItems = [
    { key: "HOT", label: "Hot", count: counts.temperature.hot, icon: Flame, color: "text-red-400" },
    { key: "WARM", label: "Warm", count: counts.temperature.warm, icon: Sun, color: "text-amber-400" },
    { key: "COLD", label: "Cold", count: counts.temperature.cold, icon: Snowflake, color: "text-blue-400" },
  ];

  const statusItems = [
    { key: "NEW", label: "New", count: counts.status.NEW || 0 },
    { key: "CONTACTED", label: "Contacted", count: counts.status.CONTACTED || 0 },
    { key: "QUALIFIED", label: "Qualified", count: counts.status.QUALIFIED || 0 },
    { key: "WON", label: "Won", count: counts.status.WON || 0, icon: Check, color: "text-emerald-400" },
    { key: "LOST", label: "Lost", count: counts.status.LOST || 0, icon: X, color: "text-red-400" },
  ];

  return (
    <div className="py-3">
      {/* Activity Filters */}
      <div className="px-3 mb-1">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium px-2 mb-1">
          Activity
        </p>
      </div>
      <div className="space-y-0.5 px-2">
        {filterItems.map((item) => {
          const isActive =
            item.key === null
              ? !activeFilter && !temperatureFilter && !statusFilter
              : activeFilter === item.key;
          return (
            <button
              key={item.key ?? "all"}
              onClick={() => setActiveFilter(item.key)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-zinc-700 text-zinc-200" : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="my-3 mx-3 border-t border-zinc-800" />

      {/* Temperature */}
      <div className="px-3 mb-1">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium px-2 mb-1">
          Temperature
        </p>
      </div>
      <div className="space-y-0.5 px-2">
        {tempItems.map((item) => {
          const isActive = temperatureFilter === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setTemperatureFilter(isActive ? null : item.key)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              <item.icon className={`w-4 h-4 shrink-0 ${item.color}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-zinc-700 text-zinc-200" : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="my-3 mx-3 border-t border-zinc-800" />

      {/* Campaigns */}
      <div className="px-2">
        <button
          onClick={() => setCampaignsOpen(!campaignsOpen)}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {campaignsOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <FolderOpen className="w-4 h-4" />
          <span className="flex-1 text-left">Campaigns</span>
        </button>
        {campaignsOpen && (
          <div className="ml-4 space-y-0.5 mt-1">
            {counts.campaigns.length === 0 ? (
              <p className="text-xs text-zinc-600 px-2 py-1">No campaigns</p>
            ) : (
              counts.campaigns.map((c) => {
                const isActive = campaignFilter === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCampaignFilter(isActive ? null : c.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1 rounded-md text-xs transition-colors ${
                      isActive
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
                    }`}
                  >
                    <span className="flex-1 text-left truncate">{c.name}</span>
                    <span className="text-zinc-600">{c.count}</span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="my-3 mx-3 border-t border-zinc-800" />

      {/* Status */}
      <div className="px-3 mb-1">
        <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium px-2 mb-1">
          Status
        </p>
      </div>
      <div className="space-y-0.5 px-2">
        {statusItems.map((item) => {
          const isActive = statusFilter === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setStatusFilter(isActive ? null : item.key)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              {item.icon ? (
                <item.icon className={`w-4 h-4 shrink-0 ${item.color}`} />
              ) : (
                <div className="w-4 h-4 shrink-0" />
              )}
              <span className="flex-1 text-left">{item.label}</span>
              {item.count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-zinc-700 text-zinc-200" : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="my-3 mx-3 border-t border-zinc-800" />

      {/* Advanced Filters */}
      <div className="px-2">
        <button
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {advancedOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <SlidersHorizontal className="w-4 h-4" />
          <span className="flex-1 text-left">Advanced</span>
        </button>
        {advancedOpen && (
          <div className="ml-4 mt-2 space-y-3 px-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                Engagement
              </label>
              <div className="mt-1 space-y-1">
                {[
                  { label: "Has opened", param: "has_opened" },
                  { label: "Has clicked", param: "has_clicked" },
                  { label: "Has replied", param: "has_replied" },
                ].map((item) => (
                  <label key={item.param} className="flex items-center gap-2 text-xs text-zinc-400">
                    <input
                      type="checkbox"
                      className="rounded"
                      onChange={(e) => {
                        const url = new URL(window.location.href);
                        if (e.target.checked) {
                          url.searchParams.set(item.param, "yes");
                        } else {
                          url.searchParams.delete(item.param);
                        }
                        window.history.replaceState({}, "", url.toString());
                      }}
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
                Date Range
              </label>
              <div className="mt-1 space-y-1">
                <input
                  type="date"
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
                  placeholder="From"
                  onChange={(e) => {
                    const url = new URL(window.location.href);
                    if (e.target.value) url.searchParams.set("date_from", e.target.value);
                    else url.searchParams.delete("date_from");
                    window.history.replaceState({}, "", url.toString());
                  }}
                />
                <input
                  type="date"
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
                  placeholder="To"
                  onChange={(e) => {
                    const url = new URL(window.location.href);
                    if (e.target.value) url.searchParams.set("date_to", e.target.value);
                    else url.searchParams.delete("date_to");
                    window.history.replaceState({}, "", url.toString());
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="my-3 mx-3 border-t border-zinc-800" />

      {/* Saved Filters */}
      {onSaveFilter && (
        <div className="px-2">
          <button
            onClick={() => setSavedOpen(!savedOpen)}
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {savedOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <Bookmark className="w-4 h-4" />
            <span className="flex-1 text-left">Saved Filters</span>
          </button>
          {savedOpen && (
            <div className="ml-4 mt-1 space-y-0.5">
              {savedFilters?.map((sf) => (
                <div key={sf.id} className="flex items-center gap-1">
                  <button
                    onClick={() => onLoadFilter?.(sf.filters)}
                    className="flex-1 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 text-left truncate"
                  >
                    {sf.name}
                  </button>
                  <button
                    onClick={() => onDeleteFilter?.(sf.id)}
                    className="rounded p-0.5 text-zinc-600 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {(!savedFilters || savedFilters.length === 0) && (
                <p className="text-[10px] text-zinc-600 px-2">No saved filters</p>
              )}
              {showSaveInput ? (
                <div className="flex items-center gap-1 px-1 mt-1">
                  <input
                    type="text"
                    placeholder="Filter name"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-300"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && saveName) {
                        onSaveFilter(saveName);
                        setSaveName("");
                        setShowSaveInput(false);
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (saveName) {
                        onSaveFilter(saveName);
                        setSaveName("");
                        setShowSaveInput(false);
                      }
                    }}
                    className="rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSaveInput(true)}
                  className="w-full px-2 py-1 text-[10px] text-primary hover:text-primary/80 text-left"
                >
                  + Save current filters
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
