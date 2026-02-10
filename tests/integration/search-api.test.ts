/**
 * @jest-environment node
 */

/**
 * Integration tests for /api/search endpoint.
 */
import "../mocks/prisma";
import { mockDb } from "../mocks/prisma";

jest.mock("@/lib/auth", () => ({
  getSession: jest.fn().mockResolvedValue({
    user: { id: "user-1", email: "test@example.com", name: "Test User" },
  }),
}));

describe("GET /api/search", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.teamMember.findMany.mockResolvedValue([{ teamId: "team-1" }]);
  });

  it("returns empty results for short query", async () => {
    const { GET } = await import("@/app/api/search/route");
    const req = new Request("http://localhost:3000/api/search?q=a");
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toEqual({});
  });

  it("returns empty results for missing query", async () => {
    const { GET } = await import("@/app/api/search/route");
    const req = new Request("http://localhost:3000/api/search");
    const response = await GET(req);
    const data = await response.json();

    expect(data.results).toEqual({});
  });

  it("searches campaigns by name", async () => {
    mockDb.campaign.findMany.mockResolvedValue([
      { id: "c1", name: "Welcome Series", status: "ACTIVE", _count: { prospects: 50 } },
    ]);
    mockDb.prospect.findMany.mockResolvedValue([]);
    mockDb.lead.findMany.mockResolvedValue([]);
    mockDb.emailTemplate.findMany.mockResolvedValue([]);

    const { GET } = await import("@/app/api/search/route");
    const req = new Request("http://localhost:3000/api/search?q=welcome&type=all&limit=5");
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results.campaigns).toHaveLength(1);
    expect(data.results.campaigns[0].name).toBe("Welcome Series");
  });

  it("searches by specific type", async () => {
    mockDb.campaign.findMany.mockResolvedValue([
      { id: "c1", name: "Test", status: "ACTIVE", _count: { prospects: 10 } },
    ]);

    const { GET } = await import("@/app/api/search/route");
    const req = new Request("http://localhost:3000/api/search?q=test&type=campaigns");
    const response = await GET(req);
    const data = await response.json();

    expect(data.results.campaigns).toBeDefined();
    // Other types should not be queried
    expect(mockDb.prospect.findMany).not.toHaveBeenCalled();
    expect(mockDb.lead.findMany).not.toHaveBeenCalled();
  });

  it("returns 401 for unauthenticated user", async () => {
    const { getSession } = require("@/lib/auth");
    getSession.mockResolvedValueOnce(null);

    const { GET } = await import("@/app/api/search/route");
    const req = new Request("http://localhost:3000/api/search?q=test");
    const response = await GET(req);

    expect(response.status).toBe(401);
  });
});
