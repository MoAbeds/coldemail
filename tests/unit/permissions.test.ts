import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getPermissions,
  outranks,
  canManageRole,
} from "@/lib/security/permissions";
import type { Permission } from "@/lib/security/permissions";

// Use string casts to work around Prisma enum import in test env
type Role = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

describe("hasPermission", () => {
  it("OWNER has manage_billing", () => {
    expect(hasPermission("OWNER" as Role, "manage_billing")).toBe(true);
  });

  it("ADMIN does not have manage_billing", () => {
    expect(hasPermission("ADMIN" as Role, "manage_billing")).toBe(false);
  });

  it("ADMIN has manage_team_members", () => {
    expect(hasPermission("ADMIN" as Role, "manage_team_members")).toBe(true);
  });

  it("MEMBER has create_campaign", () => {
    expect(hasPermission("MEMBER" as Role, "create_campaign")).toBe(true);
  });

  it("MEMBER does not have manage_all_campaigns", () => {
    expect(hasPermission("MEMBER" as Role, "manage_all_campaigns")).toBe(false);
  });

  it("VIEWER has view_team_campaigns", () => {
    expect(hasPermission("VIEWER" as Role, "view_team_campaigns")).toBe(true);
  });

  it("VIEWER does not have create_campaign", () => {
    expect(hasPermission("VIEWER" as Role, "create_campaign")).toBe(false);
  });

  it("VIEWER does not have export_data", () => {
    expect(hasPermission("VIEWER" as Role, "export_data")).toBe(false);
  });
});

describe("hasAllPermissions", () => {
  it("returns true when role has all permissions", () => {
    expect(
      hasAllPermissions("OWNER" as Role, ["manage_billing", "delete_team", "manage_team_members"])
    ).toBe(true);
  });

  it("returns false when role lacks one permission", () => {
    expect(
      hasAllPermissions("ADMIN" as Role, ["manage_team_members", "manage_billing"])
    ).toBe(false);
  });

  it("returns true for empty permission list", () => {
    expect(hasAllPermissions("VIEWER" as Role, [])).toBe(true);
  });
});

describe("hasAnyPermission", () => {
  it("returns true when role has at least one permission", () => {
    expect(
      hasAnyPermission("MEMBER" as Role, ["manage_billing", "create_campaign"])
    ).toBe(true);
  });

  it("returns false when role has none of the permissions", () => {
    expect(
      hasAnyPermission("VIEWER" as Role, ["manage_billing", "create_campaign"])
    ).toBe(false);
  });
});

describe("getPermissions", () => {
  it("returns all permissions for OWNER", () => {
    const perms = getPermissions("OWNER" as Role);
    expect(perms).toContain("manage_billing");
    expect(perms).toContain("delete_team");
    expect(perms.length).toBeGreaterThanOrEqual(14);
  });

  it("returns limited permissions for VIEWER", () => {
    const perms = getPermissions("VIEWER" as Role);
    expect(perms).toContain("view_team_campaigns");
    expect(perms).toContain("view_all_analytics");
    expect(perms.length).toBe(2);
  });

  it("MEMBER has 6 permissions", () => {
    expect(getPermissions("MEMBER" as Role).length).toBe(6);
  });
});

describe("outranks", () => {
  it("OWNER outranks ADMIN", () => {
    expect(outranks("OWNER" as Role, "ADMIN" as Role)).toBe(true);
  });

  it("ADMIN outranks MEMBER", () => {
    expect(outranks("ADMIN" as Role, "MEMBER" as Role)).toBe(true);
  });

  it("MEMBER outranks VIEWER", () => {
    expect(outranks("MEMBER" as Role, "VIEWER" as Role)).toBe(true);
  });

  it("ADMIN does not outrank OWNER", () => {
    expect(outranks("ADMIN" as Role, "OWNER" as Role)).toBe(false);
  });

  it("same role does not outrank itself", () => {
    expect(outranks("ADMIN" as Role, "ADMIN" as Role)).toBe(false);
  });
});

describe("canManageRole", () => {
  it("OWNER can manage anyone", () => {
    expect(canManageRole("OWNER" as Role, "ADMIN" as Role)).toBe(true);
    expect(canManageRole("OWNER" as Role, "MEMBER" as Role)).toBe(true);
    expect(canManageRole("OWNER" as Role, "VIEWER" as Role)).toBe(true);
    expect(canManageRole("OWNER" as Role, "OWNER" as Role)).toBe(true);
  });

  it("ADMIN can manage MEMBER and VIEWER", () => {
    expect(canManageRole("ADMIN" as Role, "MEMBER" as Role)).toBe(true);
    expect(canManageRole("ADMIN" as Role, "VIEWER" as Role)).toBe(true);
  });

  it("ADMIN cannot manage ADMIN or OWNER", () => {
    expect(canManageRole("ADMIN" as Role, "ADMIN" as Role)).toBe(false);
    expect(canManageRole("ADMIN" as Role, "OWNER" as Role)).toBe(false);
  });

  it("MEMBER cannot manage anyone", () => {
    expect(canManageRole("MEMBER" as Role, "VIEWER" as Role)).toBe(false);
  });

  it("VIEWER cannot manage anyone", () => {
    expect(canManageRole("VIEWER" as Role, "MEMBER" as Role)).toBe(false);
  });
});
