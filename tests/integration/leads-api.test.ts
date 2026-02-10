/**
 * @jest-environment node
 */

/**
 * Integration tests for /api/leads endpoint.
 */
import "../mocks/prisma";
import { mockDb } from "../mocks/prisma";
import { createTestLead } from "../fixtures/factories";

jest.mock("@/lib/auth", () => ({
  getSession: jest.fn().mockResolvedValue({
    user: { id: "user-1", email: "test@example.com", name: "Test User" },
  }),
}));

describe("GET /api/leads", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.teamMember.findMany.mockResolvedValue([{ teamId: "team-1" }]);
  });

  it("returns leads with pagination", async () => {
    const leads = [createTestLead({ id: "l1" }), createTestLead({ id: "l2" })];
    mockDb.lead.findMany.mockResolvedValue(leads);
    mockDb.lead.count.mockResolvedValue(2);

    const { GET } = await import("@/app/api/leads/route");
    const req = new Request("http://localhost:3000/api/leads?page=1");
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.leads).toHaveLength(2);
    expect(data.pagination.total).toBe(2);
  });

  it("returns 401 for unauthenticated user", async () => {
    const { getSession } = require("@/lib/auth");
    getSession.mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/leads/route");
    const req = new Request("http://localhost:3000/api/leads");
    const response = await GET(req);

    expect(response.status).toBe(401);
  });

  it("supports status filter", async () => {
    mockDb.lead.findMany.mockResolvedValue([]);
    mockDb.lead.count.mockResolvedValue(0);

    const { GET } = await import("@/app/api/leads/route");
    const req = new Request("http://localhost:3000/api/leads?status=NEW");
    await GET(req);

    expect(mockDb.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "NEW",
        }),
      })
    );
  });

  it("supports temperature filter", async () => {
    mockDb.lead.findMany.mockResolvedValue([]);
    mockDb.lead.count.mockResolvedValue(0);

    const { GET } = await import("@/app/api/leads/route");
    const req = new Request("http://localhost:3000/api/leads?temperature=HOT");
    await GET(req);

    expect(mockDb.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          temperature: "HOT",
        }),
      })
    );
  });

  it("supports campaign filter", async () => {
    mockDb.lead.findMany.mockResolvedValue([]);
    mockDb.lead.count.mockResolvedValue(0);

    const { GET } = await import("@/app/api/leads/route");
    const req = new Request("http://localhost:3000/api/leads?campaignId=c1");
    await GET(req);

    expect(mockDb.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          campaignId: "c1",
        }),
      })
    );
  });

  it("supports sort by newest", async () => {
    mockDb.lead.findMany.mockResolvedValue([]);
    mockDb.lead.count.mockResolvedValue(0);

    const { GET } = await import("@/app/api/leads/route");
    const req = new Request("http://localhost:3000/api/leads?sort=newest");
    await GET(req);

    expect(mockDb.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      })
    );
  });

  it("supports search across prospect fields", async () => {
    mockDb.lead.findMany.mockResolvedValue([]);
    mockDb.lead.count.mockResolvedValue(0);

    const { GET } = await import("@/app/api/leads/route");
    const req = new Request("http://localhost:3000/api/leads?search=jane");
    await GET(req);

    expect(mockDb.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          prospect: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ email: { contains: "jane", mode: "insensitive" } }),
              expect.objectContaining({ firstName: { contains: "jane", mode: "insensitive" } }),
            ]),
          }),
        }),
      })
    );
  });

  it("supports multiple statuses (comma-separated)", async () => {
    mockDb.lead.findMany.mockResolvedValue([]);
    mockDb.lead.count.mockResolvedValue(0);

    const { GET } = await import("@/app/api/leads/route");
    const req = new Request("http://localhost:3000/api/leads?status=NEW,CONTACTED");
    await GET(req);

    expect(mockDb.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ["NEW", "CONTACTED"] },
        }),
      })
    );
  });
});
