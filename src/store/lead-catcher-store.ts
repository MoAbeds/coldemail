import { create } from "zustand";

export interface LeadProspect {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  jobTitle: string | null;
  status: string;
  leadTemperature: string;
  currentStep: number;
  emailEvents: Array<{
    type: string;
    timestamp: string;
    eventData: unknown;
  }>;
}

export interface LeadItem {
  id: string;
  status: string;
  temperature: string;
  lastActivityAt: string | null;
  createdAt: string;
  prospect: LeadProspect;
  campaign: { id: string; name: string };
  assignedTo: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

export interface FilterCounts {
  filters: { all: number; replied: number; openedOnly: number; clicked: number; newToday: number };
  temperature: { hot: number; warm: number; cold: number };
  status: Record<string, number>;
  campaigns: Array<{ id: string; name: string; count: number }>;
}

interface LeadCatcherState {
  // Data
  leads: LeadItem[];
  selectedLeadId: string | null;
  counts: FilterCounts | null;
  loading: boolean;
  loadingMore: boolean;
  page: number;
  hasMore: boolean;
  total: number;

  // Filters
  search: string;
  sort: string;
  activeFilter: string | null;
  temperatureFilter: string | null;
  statusFilter: string | null;
  campaignFilter: string | null;

  // Bulk selection
  selectedIds: Set<string>;
  bulkMode: boolean;

  // Polling
  lastFetch: number;

  // Actions
  setLeads: (leads: LeadItem[], total: number, hasMore: boolean) => void;
  appendLeads: (leads: LeadItem[]) => void;
  selectLead: (id: string | null) => void;
  setCounts: (counts: FilterCounts) => void;
  setLoading: (loading: boolean) => void;
  setLoadingMore: (loading: boolean) => void;
  setSearch: (search: string) => void;
  setSort: (sort: string) => void;
  setActiveFilter: (filter: string | null) => void;
  setTemperatureFilter: (temp: string | null) => void;
  setStatusFilter: (status: string | null) => void;
  setCampaignFilter: (id: string | null) => void;
  setPage: (page: number) => void;
  toggleBulkSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setBulkMode: (mode: boolean) => void;
  updateLead: (id: string, data: Partial<LeadItem>) => void;
  removeLead: (id: string) => void;
  setLastFetch: (ts: number) => void;
}

export const useLeadCatcherStore = create<LeadCatcherState>((set) => ({
  leads: [],
  selectedLeadId: null,
  counts: null,
  loading: true,
  loadingMore: false,
  page: 1,
  hasMore: false,
  total: 0,
  search: "",
  sort: "newest",
  activeFilter: null,
  temperatureFilter: null,
  statusFilter: null,
  campaignFilter: null,
  selectedIds: new Set(),
  bulkMode: false,
  lastFetch: 0,

  setLeads: (leads, total, hasMore) => set({ leads, total, hasMore, page: 1 }),
  appendLeads: (newLeads) =>
    set((s) => ({ leads: [...s.leads, ...newLeads], hasMore: newLeads.length >= 30 })),
  selectLead: (id) => set({ selectedLeadId: id }),
  setCounts: (counts) => set({ counts }),
  setLoading: (loading) => set({ loading }),
  setLoadingMore: (loading) => set({ loadingMore: loading }),
  setSearch: (search) => set({ search, page: 1 }),
  setSort: (sort) => set({ sort, page: 1 }),
  setActiveFilter: (filter) =>
    set({ activeFilter: filter, temperatureFilter: null, statusFilter: null, page: 1 }),
  setTemperatureFilter: (temp) =>
    set({ temperatureFilter: temp, activeFilter: null, statusFilter: null, page: 1 }),
  setStatusFilter: (status) =>
    set({ statusFilter: status, activeFilter: null, temperatureFilter: null, page: 1 }),
  setCampaignFilter: (id) => set({ campaignFilter: id, page: 1 }),
  setPage: (page) => set({ page }),
  toggleBulkSelect: (id) =>
    set((s) => {
      const next = new Set(s.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),
  selectAll: () =>
    set((s) => ({ selectedIds: new Set(s.leads.map((l) => l.id)) })),
  clearSelection: () => set({ selectedIds: new Set(), bulkMode: false }),
  setBulkMode: (mode) => set({ bulkMode: mode, selectedIds: new Set() }),
  updateLead: (id, data) =>
    set((s) => ({
      leads: s.leads.map((l) => (l.id === id ? { ...l, ...data } : l)),
    })),
  removeLead: (id) =>
    set((s) => ({
      leads: s.leads.filter((l) => l.id !== id),
      selectedLeadId: s.selectedLeadId === id ? null : s.selectedLeadId,
    })),
  setLastFetch: (ts) => set({ lastFetch: ts }),
}));
