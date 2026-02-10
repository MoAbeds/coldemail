import { db } from "@/lib/db";

interface AuditEventInput {
  teamId: string;
  userId: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Log an audit event to the database.
 * Designed to be fire-and-forget (caller should .catch(() => {})).
 */
export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  await db.auditLog.create({
    data: {
      teamId: input.teamId,
      userId: input.userId,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId,
      metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

/**
 * Query audit logs with filters and pagination.
 */
export async function getAuditLogs(options: {
  teamId: string;
  userId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}) {
  const {
    teamId,
    userId,
    action,
    entity,
    entityId,
    dateFrom,
    dateTo,
    page = 1,
    limit = 50,
  } = options;

  const where: {
    teamId: string;
    userId?: string;
    action?: { startsWith: string };
    entity?: string;
    entityId?: string;
    createdAt?: { gte?: Date; lte?: Date };
  } = { teamId };

  if (userId) where.userId = userId;
  if (action) where.action = { startsWith: action };
  if (entity) where.entity = entity;
  if (entityId) where.entityId = entityId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = dateFrom;
    if (dateTo) where.createdAt.lte = dateTo;
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
