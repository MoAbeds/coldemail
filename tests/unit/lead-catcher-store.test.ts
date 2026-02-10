import { useLeadCatcherStore } from "@/store/lead-catcher-store";
import { createTestLead } from "../fixtures/factories";
import type { LeadItem } from "@/store/lead-catcher-store";

describe("useLeadCatcherStore", () => {
  beforeEach(() => {
    // Reset store between tests
    useLeadCatcherStore.setState({
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
    });
  });

  it("has correct initial state", () => {
    const state = useLeadCatcherStore.getState();
    expect(state.leads).toEqual([]);
    expect(state.selectedLeadId).toBeNull();
    expect(state.loading).toBe(true);
    expect(state.sort).toBe("newest");
    expect(state.page).toBe(1);
  });

  describe("setLeads", () => {
    it("sets leads, total, and hasMore", () => {
      const leads = [createTestLead({ id: "l1" }), createTestLead({ id: "l2" })] as LeadItem[];
      useLeadCatcherStore.getState().setLeads(leads, 10, true);

      const state = useLeadCatcherStore.getState();
      expect(state.leads).toHaveLength(2);
      expect(state.total).toBe(10);
      expect(state.hasMore).toBe(true);
      expect(state.page).toBe(1);
    });
  });

  describe("appendLeads", () => {
    it("appends leads to existing list", () => {
      const initial = [createTestLead({ id: "l1" })] as LeadItem[];
      useLeadCatcherStore.getState().setLeads(initial, 10, true);

      const more = [createTestLead({ id: "l2" })] as LeadItem[];
      useLeadCatcherStore.getState().appendLeads(more);

      expect(useLeadCatcherStore.getState().leads).toHaveLength(2);
    });
  });

  describe("selectLead", () => {
    it("sets selected lead id", () => {
      useLeadCatcherStore.getState().selectLead("l1");
      expect(useLeadCatcherStore.getState().selectedLeadId).toBe("l1");
    });

    it("clears selection with null", () => {
      useLeadCatcherStore.getState().selectLead("l1");
      useLeadCatcherStore.getState().selectLead(null);
      expect(useLeadCatcherStore.getState().selectedLeadId).toBeNull();
    });
  });

  describe("filters", () => {
    it("setSearch resets page to 1", () => {
      useLeadCatcherStore.setState({ page: 3 });
      useLeadCatcherStore.getState().setSearch("test");
      expect(useLeadCatcherStore.getState().search).toBe("test");
      expect(useLeadCatcherStore.getState().page).toBe(1);
    });

    it("setSort resets page to 1", () => {
      useLeadCatcherStore.setState({ page: 3 });
      useLeadCatcherStore.getState().setSort("hottest");
      expect(useLeadCatcherStore.getState().sort).toBe("hottest");
      expect(useLeadCatcherStore.getState().page).toBe(1);
    });

    it("setActiveFilter clears temperature and status filters", () => {
      useLeadCatcherStore.setState({ temperatureFilter: "HOT", statusFilter: "NEW" });
      useLeadCatcherStore.getState().setActiveFilter("replied");
      const state = useLeadCatcherStore.getState();
      expect(state.activeFilter).toBe("replied");
      expect(state.temperatureFilter).toBeNull();
      expect(state.statusFilter).toBeNull();
    });

    it("setTemperatureFilter clears active and status filters", () => {
      useLeadCatcherStore.setState({ activeFilter: "replied", statusFilter: "NEW" });
      useLeadCatcherStore.getState().setTemperatureFilter("HOT");
      const state = useLeadCatcherStore.getState();
      expect(state.temperatureFilter).toBe("HOT");
      expect(state.activeFilter).toBeNull();
      expect(state.statusFilter).toBeNull();
    });

    it("setStatusFilter clears active and temperature filters", () => {
      useLeadCatcherStore.setState({ activeFilter: "replied", temperatureFilter: "HOT" });
      useLeadCatcherStore.getState().setStatusFilter("NEW");
      const state = useLeadCatcherStore.getState();
      expect(state.statusFilter).toBe("NEW");
      expect(state.activeFilter).toBeNull();
      expect(state.temperatureFilter).toBeNull();
    });

    it("setCampaignFilter resets page", () => {
      useLeadCatcherStore.setState({ page: 5 });
      useLeadCatcherStore.getState().setCampaignFilter("c1");
      expect(useLeadCatcherStore.getState().campaignFilter).toBe("c1");
      expect(useLeadCatcherStore.getState().page).toBe(1);
    });
  });

  describe("bulk selection", () => {
    it("toggleBulkSelect adds and removes ids", () => {
      useLeadCatcherStore.getState().toggleBulkSelect("l1");
      expect(useLeadCatcherStore.getState().selectedIds.has("l1")).toBe(true);

      useLeadCatcherStore.getState().toggleBulkSelect("l1");
      expect(useLeadCatcherStore.getState().selectedIds.has("l1")).toBe(false);
    });

    it("selectAll selects all lead ids", () => {
      const leads = [createTestLead({ id: "l1" }), createTestLead({ id: "l2" })] as LeadItem[];
      useLeadCatcherStore.getState().setLeads(leads, 2, false);
      useLeadCatcherStore.getState().selectAll();

      const selected = useLeadCatcherStore.getState().selectedIds;
      expect(selected.size).toBe(2);
      expect(selected.has("l1")).toBe(true);
      expect(selected.has("l2")).toBe(true);
    });

    it("clearSelection clears ids and disables bulk mode", () => {
      useLeadCatcherStore.setState({ selectedIds: new Set(["l1", "l2"]), bulkMode: true });
      useLeadCatcherStore.getState().clearSelection();
      expect(useLeadCatcherStore.getState().selectedIds.size).toBe(0);
      expect(useLeadCatcherStore.getState().bulkMode).toBe(false);
    });
  });

  describe("updateLead", () => {
    it("updates a specific lead", () => {
      const leads = [createTestLead({ id: "l1", status: "NEW" })] as LeadItem[];
      useLeadCatcherStore.getState().setLeads(leads, 1, false);
      useLeadCatcherStore.getState().updateLead("l1", { status: "QUALIFIED" });

      expect(useLeadCatcherStore.getState().leads[0].status).toBe("QUALIFIED");
    });

    it("does not affect other leads", () => {
      const leads = [
        createTestLead({ id: "l1", status: "NEW" }),
        createTestLead({ id: "l2", status: "CONTACTED" }),
      ] as LeadItem[];
      useLeadCatcherStore.getState().setLeads(leads, 2, false);
      useLeadCatcherStore.getState().updateLead("l1", { status: "QUALIFIED" });

      expect(useLeadCatcherStore.getState().leads[1].status).toBe("CONTACTED");
    });
  });

  describe("removeLead", () => {
    it("removes a lead from the list", () => {
      const leads = [createTestLead({ id: "l1" }), createTestLead({ id: "l2" })] as LeadItem[];
      useLeadCatcherStore.getState().setLeads(leads, 2, false);
      useLeadCatcherStore.getState().removeLead("l1");

      expect(useLeadCatcherStore.getState().leads).toHaveLength(1);
      expect(useLeadCatcherStore.getState().leads[0].id).toBe("l2");
    });

    it("clears selection if removed lead was selected", () => {
      const leads = [createTestLead({ id: "l1" })] as LeadItem[];
      useLeadCatcherStore.getState().setLeads(leads, 1, false);
      useLeadCatcherStore.getState().selectLead("l1");
      useLeadCatcherStore.getState().removeLead("l1");

      expect(useLeadCatcherStore.getState().selectedLeadId).toBeNull();
    });
  });
});
