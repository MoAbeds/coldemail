import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { syncSalesforce } from "./salesforce-sync";
import { syncHubSpot } from "./hubspot-sync";
import type { Integration } from "@prisma/client";

export interface SyncResult {
  status: "SUCCESS" | "FAILED" | "PARTIAL";
  recordsProcessed: number;
  recordsFailed: number;
  errors: string[];
}

/**
 * Run a sync for an integration. Creates a SyncLog entry.
 */
export async function runSync(integration: Integration): Promise<SyncResult> {
  const log = await db.syncLog.create({
    data: {
      integrationId: integration.id,
      status: "SUCCESS",
      direction: "push",
    },
  });

  let result: SyncResult;

  try {
    const credentials = integration.credentials as Record<string, string> | null;
    const config = (integration.config as Record<string, unknown>) || {};

    if (!credentials) {
      throw new Error("No credentials found for integration");
    }

    // Decrypt tokens
    const decrypted: Record<string, string> = {};
    for (const [key, value] of Object.entries(credentials)) {
      try {
        decrypted[key] = decrypt(value);
      } catch {
        decrypted[key] = value; // Non-encrypted values (like instanceUrl)
      }
    }

    switch (integration.provider) {
      case "SALESFORCE":
        result = await syncSalesforce(integration, decrypted, config);
        break;
      case "HUBSPOT":
        result = await syncHubSpot(integration, decrypted, config);
        break;
      default:
        result = {
          status: "FAILED",
          recordsProcessed: 0,
          recordsFailed: 0,
          errors: [`Sync not supported for ${integration.provider}`],
        };
    }
  } catch (err) {
    result = {
      status: "FAILED",
      recordsProcessed: 0,
      recordsFailed: 0,
      errors: [err instanceof Error ? err.message : "Unknown sync error"],
    };
  }

  // Update the sync log
  await db.syncLog.update({
    where: { id: log.id },
    data: {
      status: result.status,
      recordsProcessed: result.recordsProcessed,
      recordsFailed: result.recordsFailed,
      errors: result.errors.length > 0 ? result.errors : undefined,
      completedAt: new Date(),
    },
  });

  // Update integration lastSyncAt
  await db.integration.update({
    where: { id: integration.id },
    data: { lastSyncAt: new Date() },
  });

  return result;
}
