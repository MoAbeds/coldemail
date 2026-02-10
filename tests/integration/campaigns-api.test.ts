/**
 * @jest-environment node
 */

/**
 * Integration tests for /api/campaigns endpoints.
 * Uses mocked Prisma client to test handler logic.
 */
import "../mocks/prisma";
import { mockDb } from "../mocks/prisma";
import { createTestCampaign } from "../fixtures/factories";

// Mock auth
jest.mock("@/lib/auth", () => ({
  getSession: jest.fn().mockResolvedValue({
    user: { id: "user-1", email: "test@example.com", name: "Test User" },
  }),
}));

describe("GET /api/campaigns", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns campaigns for authenticated user", async () => {
    const campaigns = [
      createTestCampaign({ id: "c1", name: "Campaign 1" }),
      createTestCampaign({ id: "c2", name: "Campaign 2" }),
    ];

    mockDb.teamMember.findMany.mockResolvedValue([{ teamId: "team-1" }]);
    mockDb.campaign.findMany.mockResolvedValue(campaigns);
    mockDb.campaign.count.mockResolvedValue(2);

    // Dynamic import to pick up mocks
    const { GET } = await import("@/app/api/campaigns/route");
    const req = new Request("http://localhost:3000/api/campaigns?page=1&limit=20");
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.campaigns).toHaveLength(2);
    expect(data.pagination.total).toBe(2);
  });

  it("returns 401 for unauthenticated user", async () => {
    const { getSession } = require("@/lib/auth");
    getSession.mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/campaigns/route");
    const req = new Request("http://localhost:3000/api/campaigns");
    const response = await GET(req);

    expect(response.status).toBe(401);
  });

  it("supports search filter", async () => {
    mockDb.teamMember.findMany.mockResolvedValue([]);
    mockDb.campaign.findMany.mockResolvedValue([]);
    mockDb.campaign.count.mockResolvedValue(0);

    const { GET } = await import("@/app/api/campaigns/route");
    const req = new Request("http://localhost:3000/api/campaigns?search=welcome");
    await GET(req);

    expect(mockDb.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: { contains: "welcome", mode: "insensitive" },
        }),
      })
    );
  });

  it("supports status filter", async () => {
    mockDb.teamMember.findMany.mockResolvedValue([]);
    mockDb.campaign.findMany.mockResolvedValue([]);
    mockDb.campaign.count.mockResolvedValue(0);

    const { GET } = await import("@/app/api/campaigns/route");
    const req = new Request("http://localhost:3000/api/campaigns?status=ACTIVE");
    await GET(req);

    expect(mockDb.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "ACTIVE",
        }),
      })
    );
  });

  it("supports pagination", async () => {
    mockDb.teamMember.findMany.mockResolvedValue([]);
    mockDb.campaign.findMany.mockResolvedValue([]);
    mockDb.campaign.count.mockResolvedValue(50);

    const { GET } = await import("@/app/api/campaigns/route");
    const req = new Request("http://localhost:3000/api/campaigns?page=2&limit=10");
    const response = await GET(req);
    const data = await response.json();

    expect(data.pagination.pages).toBe(5);
    expect(mockDb.campaign.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      })
    );
  });
});

describe("POST /api/campaigns", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { getSession } = require("@/lib/auth");
    getSession.mockResolvedValue({
      user: { id: "user-1", email: "test@example.com", name: "Test User" },
    });
  });

  it("creates a campaign with valid data", async () => {
    const newCampaign = createTestCampaign({ id: "new-c1", name: "New Campaign" });
    mockDb.emailAccount.findFirst.mockResolvedValue({ id: "acc-1", email: "sender@test.com" });
    mockDb.teamMember.findFirst.mockResolvedValue({ teamId: "team-1" });
    mockDb.campaign.create.mockResolvedValue({ ...newCampaign, sequences: [] });

    const { POST } = await import("@/app/api/campaigns/route");
    const req = new Request("http://localhost:3000/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "New Campaign",
        emailAccountId: "acc-1",
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(201);

    const data = await response.json();
    expect(data.campaign).toBeDefined();
  });

  it("returns 400 without required fields", async () => {
    const { POST } = await import("@/app/api/campaigns/route");
    const req = new Request("http://localhost:3000/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  it("returns 404 when email account not found", async () => {
    mockDb.emailAccount.findFirst.mockResolvedValue(null);

    const { POST } = await import("@/app/api/campaigns/route");
    const req = new Request("http://localhost:3000/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", emailAccountId: "nonexistent" }),
    });

    const response = await POST(req);
    expect(response.status).toBe(404);
  });

  it("returns 401 for unauthenticated user", async () => {
    const { getSession } = require("@/lib/auth");
    getSession.mockResolvedValueOnce(null);

    const { POST } = await import("@/app/api/campaigns/route");
    const req = new Request("http://localhost:3000/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", emailAccountId: "acc-1" }),
    });

    const response = await POST(req);
    expect(response.status).toBe(401);
  });
});
