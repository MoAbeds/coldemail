/**
 * MSW request handlers for API mocking in tests.
 */
import { http, HttpResponse } from "msw";
import {
  createTestCampaign,
  createTestLead,
  createTestProspect,
} from "../fixtures/factories";

const BASE_URL = "http://localhost:3000";

export const handlers = [
  // GET /api/campaigns
  http.get(`${BASE_URL}/api/campaigns`, () => {
    const campaigns = [
      createTestCampaign({ id: "c1", name: "Welcome Series", status: "ACTIVE" }),
      createTestCampaign({ id: "c2", name: "Re-engagement", status: "DRAFT" }),
    ];
    return HttpResponse.json({
      campaigns,
      pagination: { page: 1, limit: 20, total: 2, pages: 1 },
    });
  }),

  // POST /api/campaigns
  http.post(`${BASE_URL}/api/campaigns`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const campaign = createTestCampaign({
      name: (body.name as string) || "New Campaign",
      status: "DRAFT",
    });
    return HttpResponse.json({ campaign }, { status: 201 });
  }),

  // GET /api/leads
  http.get(`${BASE_URL}/api/leads`, () => {
    const leads = [
      createTestLead({ id: "l1", status: "NEW", temperature: "HOT" }),
      createTestLead({ id: "l2", status: "CONTACTED", temperature: "WARM" }),
    ];
    return HttpResponse.json({
      leads,
      pagination: { page: 1, limit: 30, total: 2, pages: 1 },
    });
  }),

  // GET /api/leads/counts
  http.get(`${BASE_URL}/api/leads/counts`, () => {
    return HttpResponse.json({
      filters: { all: 10, replied: 3, openedOnly: 4, clicked: 2, newToday: 1 },
      temperature: { hot: 3, warm: 4, cold: 3 },
      status: { NEW: 5, CONTACTED: 3, QUALIFIED: 2 },
      campaigns: [{ id: "c1", name: "Test Campaign", count: 10 }],
    });
  }),

  // GET /api/search
  http.get(`${BASE_URL}/api/search`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get("q") || "";
    if (q.length < 2) return HttpResponse.json({ results: {} });

    return HttpResponse.json({
      results: {
        campaigns: [
          { id: "c1", name: "Matching Campaign", status: "ACTIVE", _count: { prospects: 50 } },
        ],
        prospects: [
          createTestProspect({ firstName: q, lastName: "Result" }),
        ],
        leads: [],
        templates: [],
        members: [],
      },
    });
  }),

  // GET /api/dashboard/stats
  http.get(`${BASE_URL}/api/dashboard/stats`, () => {
    return HttpResponse.json({
      overview: {
        totalCampaigns: 5,
        activeCampaigns: 2,
        totalProspects: 1000,
        totalSent: 500,
        totalOpened: 250,
        totalClicked: 100,
        totalReplied: 50,
        openRate: 50,
        replyRate: 10,
      },
      dailyTimeline: [
        { date: "2025-01-01", sent: 10, opened: 5, replied: 1 },
        { date: "2025-01-02", sent: 15, opened: 8, replied: 2 },
      ],
      topCampaigns: [],
      teamMembers: [],
    });
  }),

  // GET /api/filters
  http.get(`${BASE_URL}/api/filters`, () => {
    return HttpResponse.json({ filters: [] });
  }),

  // GET /api/permissions
  http.get(`${BASE_URL}/api/permissions`, () => {
    return HttpResponse.json({
      role: "OWNER",
      permissions: [
        "manage_billing", "delete_team", "manage_team_members",
        "manage_all_campaigns", "create_campaign", "edit_own_campaign",
      ],
    });
  }),
];
