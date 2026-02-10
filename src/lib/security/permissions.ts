import type { TeamRole } from "@prisma/client";

/**
 * Permission definitions for the role-based access control system.
 */

export type Permission =
  | "manage_billing"
  | "delete_team"
  | "manage_team_members"
  | "manage_all_campaigns"
  | "manage_integrations"
  | "manage_webhooks"
  | "view_all_analytics"
  | "create_campaign"
  | "edit_own_campaign"
  | "view_team_campaigns"
  | "view_own_analytics"
  | "manage_own_leads"
  | "manage_all_leads"
  | "export_data"
  | "view_audit_log";

const ROLE_PERMISSIONS: Record<TeamRole, Permission[]> = {
  OWNER: [
    "manage_billing",
    "delete_team",
    "manage_team_members",
    "manage_all_campaigns",
    "manage_integrations",
    "manage_webhooks",
    "view_all_analytics",
    "create_campaign",
    "edit_own_campaign",
    "view_team_campaigns",
    "view_own_analytics",
    "manage_own_leads",
    "manage_all_leads",
    "export_data",
    "view_audit_log",
  ],
  ADMIN: [
    "manage_team_members",
    "manage_all_campaigns",
    "manage_integrations",
    "manage_webhooks",
    "view_all_analytics",
    "create_campaign",
    "edit_own_campaign",
    "view_team_campaigns",
    "view_own_analytics",
    "manage_own_leads",
    "manage_all_leads",
    "export_data",
    "view_audit_log",
  ],
  MEMBER: [
    "create_campaign",
    "edit_own_campaign",
    "view_team_campaigns",
    "view_own_analytics",
    "manage_own_leads",
    "export_data",
  ],
  VIEWER: [
    "view_team_campaigns",
    "view_all_analytics",
  ],
};

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: TeamRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has ALL of the specified permissions.
 */
export function hasAllPermissions(role: TeamRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check if a role has ANY of the specified permissions.
 */
export function hasAnyPermission(role: TeamRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Get all permissions for a given role.
 */
export function getPermissions(role: TeamRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Role hierarchy: higher index = more powerful.
 */
const ROLE_HIERARCHY: TeamRole[] = ["VIEWER", "MEMBER", "ADMIN", "OWNER"];

/**
 * Check if roleA outranks roleB.
 */
export function outranks(roleA: TeamRole, roleB: TeamRole): boolean {
  return ROLE_HIERARCHY.indexOf(roleA) > ROLE_HIERARCHY.indexOf(roleB);
}

/**
 * Check if a role can manage (add/remove/change) another role.
 * Owners can manage anyone. Admins can manage Members and Viewers.
 * Nobody can demote or remove an Owner (except themselves).
 */
export function canManageRole(actorRole: TeamRole, targetRole: TeamRole): boolean {
  if (actorRole === "OWNER") return true;
  if (actorRole === "ADMIN" && (targetRole === "MEMBER" || targetRole === "VIEWER")) return true;
  return false;
}
