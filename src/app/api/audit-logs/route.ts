export const dynamic = "force-dynamic";

import { withPermission } from "@/lib/security/guards";
import { getAuditLogs } from "@/lib/security/audit";
import { NextResponse } from "next/server";

// GET /api/audit-logs — List audit logs for a team
export const GET = withPermission(
  "view_audit_log",
  async (req, ctx) => {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const userId = searchParams.get("userId") || undefined;
    const action = searchParams.get("action") || undefined;
    const entity = searchParams.get("entity") || undefined;
    const entityId = searchParams.get("entityId") || undefined;
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    const result = await getAuditLogs({
      teamId: ctx.teamId,
      userId,
      action,
      entity,
      entityId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page,
      limit: Math.min(limit, 100),
    });

    return NextResponse.json(result);
  }
);
