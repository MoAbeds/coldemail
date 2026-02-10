import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, type Permission } from "./permissions";
import { checkRateLimit } from "./rate-limit";
import { logAuditEvent } from "./audit";
import type { TeamRole } from "@prisma/client";

/**
 * Authenticated context passed to guarded handlers.
 */
export interface AuthContext {
  userId: string;
  userEmail: string;
  userName: string | null;
}

/**
 * Team-scoped context passed to permission-guarded handlers.
 */
export interface TeamContext extends AuthContext {
  teamId: string;
  role: TeamRole;
}

type AuthHandler = (
  req: Request,
  ctx: AuthContext,
  params?: Record<string, string>
) => Promise<Response>;

type TeamHandler = (
  req: Request,
  ctx: TeamContext,
  params?: Record<string, string>
) => Promise<Response>;

/**
 * Wrap an API handler to require authentication.
 * Rejects with 401 if not authenticated.
 * Applies rate limiting per user.
 */
export function withAuth(handler: AuthHandler): (req: Request, routeCtx?: { params?: Promise<Record<string, string>> }) => Promise<Response> {
  return async (req: Request, routeCtx?: { params?: Promise<Record<string, string>> }) => {
    try {
      const session = await getSession();
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Rate limit: 100 requests/minute for reads, 30/minute for writes
      const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
      const rateLimitResult = checkRateLimit(
        `user:${session.user.id}:${isWrite ? "write" : "read"}`,
        { maxRequests: isWrite ? 30 : 100, windowMs: 60_000 }
      );

      if (!rateLimitResult.success) {
        return NextResponse.json(
          { error: "Too many requests" },
          {
            status: 429,
            headers: {
              "Retry-After": String(Math.ceil(rateLimitResult.retryAfterMs / 1000)),
              "X-RateLimit-Remaining": "0",
            },
          }
        );
      }

      const ctx: AuthContext = {
        userId: session.user.id,
        userEmail: session.user.email || "",
        userName: session.user.name || null,
      };

      const params = routeCtx?.params ? await routeCtx.params : undefined;
      return handler(req, ctx, params);
    } catch {
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

/**
 * Wrap an API handler to require team membership and a specific permission.
 * The teamId is extracted from:
 *  1. URL searchParams (teamId)
 *  2. Request body (teamId)
 *  3. A related entity (e.g. campaign.teamId)
 *
 * For routes where teamId comes from a resource, use `resolveTeamId` option.
 */
export function withPermission(
  permission: Permission,
  handler: TeamHandler,
  options?: {
    resolveTeamId?: (req: Request, params?: Record<string, string>) => Promise<string | null>;
    auditAction?: string;
    auditEntity?: string;
  }
): (req: Request, routeCtx?: { params?: Promise<Record<string, string>> }) => Promise<Response> {
  return withAuth(async (req, authCtx, params) => {
    let teamId: string | null = null;

    // Try custom resolver first
    if (options?.resolveTeamId) {
      teamId = await options.resolveTeamId(req, params);
    }

    // Try URL params
    if (!teamId) {
      const url = new URL(req.url);
      teamId = url.searchParams.get("teamId");
    }

    // Try to get from user's memberships (use first team if single-team user)
    if (!teamId) {
      const memberships = await db.teamMember.findMany({
        where: { userId: authCtx.userId },
        select: { teamId: true, role: true },
      });
      if (memberships.length === 1) {
        teamId = memberships[0].teamId;
      }
    }

    if (!teamId) {
      return NextResponse.json(
        { error: "Team context required" },
        { status: 400 }
      );
    }

    // Check membership and role
    const membership = await db.teamMember.findUnique({
      where: { userId_teamId: { userId: authCtx.userId, teamId } },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this team" },
        { status: 403 }
      );
    }

    if (!hasPermission(membership.role, permission)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const teamCtx: TeamContext = {
      ...authCtx,
      teamId,
      role: membership.role,
    };

    const result = await handler(req, teamCtx, params);

    // Audit log for write operations
    if (options?.auditAction && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      logAuditEvent({
        teamId,
        userId: authCtx.userId,
        action: options.auditAction,
        entity: options.auditEntity,
        entityId: params?.id,
        ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
        userAgent: req.headers.get("user-agent")?.slice(0, 200),
      }).catch(() => {}); // Fire-and-forget
    }

    return result;
  });
}

/**
 * Helper to resolve teamId from a campaign.
 */
export async function teamIdFromCampaign(
  _req: Request,
  params?: Record<string, string>
): Promise<string | null> {
  const campaignId = params?.id;
  if (!campaignId) return null;
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: { teamId: true },
  });
  return campaign?.teamId ?? null;
}

/**
 * Helper to resolve teamId from an integration.
 */
export async function teamIdFromIntegration(
  _req: Request,
  params?: Record<string, string>
): Promise<string | null> {
  const integrationId = params?.id;
  if (!integrationId) return null;
  const integration = await db.integration.findUnique({
    where: { id: integrationId },
    select: { teamId: true },
  });
  return integration?.teamId ?? null;
}

/**
 * Helper to resolve teamId from a lead (via its campaign).
 */
export async function teamIdFromLead(
  _req: Request,
  params?: Record<string, string>
): Promise<string | null> {
  const leadId = params?.id;
  if (!leadId) return null;
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: { campaign: { select: { teamId: true } } },
  });
  return lead?.campaign?.teamId ?? null;
}
