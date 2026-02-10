"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLeadCatcherStore } from "@/store/lead-catcher-store";
import { LeadSidebar } from "@/components/leads/lead-sidebar";
import { LeadList } from "@/components/leads/lead-list";
import { LeadDetail } from "@/components/leads/lead-detail";
import { useIsMobile, useIsDesktop } from "@/hooks/use-media-query";
import { Sheet } from "@/components/mobile/sheet";
import { Filter, ArrowLeft } from "lucide-react";

interface SavedFilter {
  id: string;
  name: string;
  filters: Record<string, string>;
}

export default function LeadCatcherPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();

  const {
    setLeads,
    setCounts,
    setLoading,
    search,
    sort,
    activeFilter,
    temperatureFilter,
    statusFilter,
    campaignFilter,
    page,
    setLastFetch,
    selectedLeadId,
    selectLead,
    setSearch,
    setSort,
    setActiveFilter,
    setTemperatureFilter,
    setStatusFilter,
    setCampaignFilter,
  } = useLeadCatcherStore();

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // Initialize filters from URL on mount
  useEffect(() => {
    const urlSearch = searchParams.get("search");
    const urlSort = searchParams.get("sort");
    const urlFilter = searchParams.get("filter");
    const urlTemp = searchParams.get("temperature");
    const urlStatus = searchParams.get("status");
    const urlCampaign = searchParams.get("campaignId");
    const urlSelected = searchParams.get("selected");

    if (urlSearch) setSearch(urlSearch);
    if (urlSort) setSort(urlSort);
    if (urlFilter) setActiveFilter(urlFilter);
    if (urlTemp) setTemperatureFilter(urlTemp);
    if (urlStatus) setStatusFilter(urlStatus);
    if (urlCampaign) setCampaignFilter(urlCampaign);
    if (urlSelected) selectLead(urlSelected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (sort !== "newest") params.set("sort", sort);
    if (activeFilter) params.set("filter", activeFilter);
    if (temperatureFilter) params.set("temperature", temperatureFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (campaignFilter) params.set("campaignId", campaignFilter);
    if (selectedLeadId) params.set("selected", selectedLeadId);
    const qs = params.toString();
    router.replace(`/leads${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [search, sort, activeFilter, temperatureFilter, statusFilter, campaignFilter, selectedLeadId, router]);

  // Fetch saved filters
  useEffect(() => {
    fetch("/api/filters?scope=leads")
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

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("sort", sort);
      if (search) params.set("search", search);
      if (activeFilter) params.set("filter", activeFilter);
      if (temperatureFilter) params.set("temperature", temperatureFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (campaignFilter) params.set("campaignId", campaignFilter);

      // Pass advanced URL params
      const urlParams = new URLSearchParams(window.location.search);
      for (const key of ["has_opened", "has_clicked", "has_replied", "date_from", "date_to", "min_opens", "min_clicks", "assigned_to"]) {
        const val = urlParams.get(key);
        if (val) params.set(key, val);
      }

      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      if (data.leads) {
        setLeads(
          data.leads,
          data.pagination.total,
          data.pagination.page < data.pagination.pages
        );
      }
      setLastFetch(Date.now());
    } finally {
      setLoading(false);
    }
  }, [
    page, sort, search, activeFilter, temperatureFilter,
    statusFilter, campaignFilter, setLeads, setLoading, setLastFetch,
  ]);

  const fetchCounts = useCallback(async () => {
    const res = await fetch("/api/leads/counts");
    const data = await res.json();
    if (data.filters) setCounts(data);
  }, [setCounts]);

  // Initial + filter-change fetch
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Poll for updates every 30s
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetchLeads();
      fetchCounts();
    }, 30_000);
    return () => clearInterval(pollRef.current);
  }, [fetchLeads, fetchCounts]);

  const sidebarProps = {
    savedFilters,
    onSaveFilter: async (name: string) => {
      const currentFilters: Record<string, string> = {};
      if (search) currentFilters.search = search;
      if (sort !== "newest") currentFilters.sort = sort;
      if (activeFilter) currentFilters.filter = activeFilter;
      if (temperatureFilter) currentFilters.temperature = temperatureFilter;
      if (statusFilter) currentFilters.status = statusFilter;
      if (campaignFilter) currentFilters.campaignId = campaignFilter;

      const res = await fetch("/api/filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, scope: "leads", filters: currentFilters }),
      });
      if (res.ok) {
        const data = await res.json();
        setSavedFilters((prev) => [
          { id: data.filter.id, name, filters: currentFilters },
          ...prev,
        ]);
      }
    },
    onLoadFilter: (f: Record<string, string>) => {
      if (f.search) setSearch(f.search);
      if (f.sort) setSort(f.sort);
      if (f.filter) setActiveFilter(f.filter);
      if (f.temperature) setTemperatureFilter(f.temperature);
      if (f.status) setStatusFilter(f.status);
      if (f.campaignId) setCampaignFilter(f.campaignId);
      setShowFilterSheet(false);
    },
    onDeleteFilter: async (id: string) => {
      await fetch(`/api/filters/${id}`, { method: "DELETE" });
      setSavedFilters((prev) => prev.filter((f) => f.id !== id));
    },
  };

  // MOBILE: Single view — list or detail
  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-56px-64px)]">
        {/* Filter sheet */}
        <Sheet open={showFilterSheet} onClose={() => setShowFilterSheet(false)} title="Filters">
          <LeadSidebar {...sidebarProps} />
        </Sheet>

        {selectedLeadId ? (
          // Detail view with back button
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-zinc-950">
              <button
                onClick={() => selectLead(null)}
                className="p-2 -ml-1 rounded-lg text-zinc-400 hover:bg-zinc-800 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-white">Lead Detail</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <LeadDetail leadId={selectedLeadId} onUpdate={() => { fetchLeads(); fetchCounts(); }} />
            </div>
          </div>
        ) : (
          // List view with filter button
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-white">Leads</h2>
              <button
                onClick={() => setShowFilterSheet(true)}
                className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden">
              <LeadList onRefresh={fetchLeads} />
            </div>
          </div>
        )}
      </div>
    );
  }

  // TABLET: 2-panel (list | detail), filter in drawer
  if (!isDesktop) {
    return (
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        {/* Filter sheet for tablet */}
        <Sheet open={showFilterSheet} onClose={() => setShowFilterSheet(false)} title="Filters">
          <LeadSidebar {...sidebarProps} />
        </Sheet>

        {/* List panel */}
        <div className="w-[320px] border-r border-zinc-800 flex-shrink-0 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
            <span className="text-xs font-medium text-zinc-400">Filters</span>
            <button
              onClick={() => setShowFilterSheet(true)}
              className="p-1.5 rounded text-zinc-500 hover:bg-zinc-800"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
          <LeadList onRefresh={fetchLeads} />
        </div>

        {/* Detail panel */}
        <div className="flex-1 overflow-y-auto">
          {selectedLeadId ? (
            <LeadDetail leadId={selectedLeadId} onUpdate={() => { fetchLeads(); fetchCounts(); }} />
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-500">
              <div className="text-center">
                <p className="text-4xl mb-3">📬</p>
                <p className="text-lg font-medium">Select a lead</p>
                <p className="text-sm mt-1">Choose a lead from the list to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // DESKTOP: 3-panel layout
  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-60 border-r border-zinc-800 flex-shrink-0 overflow-y-auto">
        <LeadSidebar {...sidebarProps} />
      </div>

      {/* Middle Panel - Lead List */}
      <div className="w-[400px] border-r border-zinc-800 flex-shrink-0 flex flex-col overflow-hidden">
        <LeadList onRefresh={fetchLeads} />
      </div>

      {/* Right Panel - Lead Detail */}
      <div className="flex-1 overflow-y-auto">
        {selectedLeadId ? (
          <LeadDetail leadId={selectedLeadId} onUpdate={() => { fetchLeads(); fetchCounts(); }} />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500">
            <div className="text-center">
              <p className="text-4xl mb-3">📬</p>
              <p className="text-lg font-medium">Select a lead</p>
              <p className="text-sm mt-1">Choose a lead from the list to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
