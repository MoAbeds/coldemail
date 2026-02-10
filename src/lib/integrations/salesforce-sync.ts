import { db } from "@/lib/db";
import type { Integration } from "@prisma/client";
import type { SyncResult } from "./sync-engine";

interface SfApiOptions {
  instanceUrl: string;
  accessToken: string;
}

async function sfApi(
  options: SfApiOptions,
  path: string,
  method: string = "GET",
  body?: unknown
) {
  const res = await fetch(`${options.instanceUrl}/services/data/v58.0${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Salesforce API error ${res.status}: ${text}`);
  }

  return res.status === 204 ? null : res.json();
}

/**
 * Sync prospects and activities to Salesforce.
 */
export async function syncSalesforce(
  integration: Integration,
  credentials: Record<string, string>,
  config: Record<string, unknown>
): Promise<SyncResult> {
  const errors: string[] = [];
  let processed = 0;
  let failed = 0;

  const api: SfApiOptions = {
    instanceUrl: credentials.instanceUrl,
    accessToken: credentials.accessToken,
  };

  const syncSettings = (config.syncSettings as Record<string, unknown>) || {};
  const fieldMappings =
    (config.fieldMappings as Record<string, string>) || {};

  // Get prospects that need syncing (from team campaigns with leads)
  const leads = await db.lead.findMany({
    where: {
      campaign: { teamId: integration.teamId },
    },
    include: {
      prospect: true,
      campaign: { select: { name: true } },
    },
    take: 100, // Batch size
  });

  // Push leads to Salesforce
  if (syncSettings.pushLeads !== false) {
    for (const lead of leads) {
      try {
        const sfLead: Record<string, string> = {};

        // Map fields
        if (fieldMappings.email) sfLead[fieldMappings.email] = lead.prospect.email;
        if (fieldMappings.firstName && lead.prospect.firstName)
          sfLead[fieldMappings.firstName] = lead.prospect.firstName;
        if (fieldMappings.lastName)
          sfLead[fieldMappings.lastName] = lead.prospect.lastName || "Unknown";
        if (fieldMappings.company && lead.prospect.company)
          sfLead[fieldMappings.company] = lead.prospect.company;
        if (fieldMappings.jobTitle && lead.prospect.jobTitle)
          sfLead[fieldMappings.jobTitle] = lead.prospect.jobTitle;

        // Add campaign source
        sfLead.LeadSource = "ColdClaude";
        sfLead.Description = `Campaign: ${lead.campaign.name}`;

        // Check if lead already exists by email
        const query = encodeURIComponent(
          `SELECT Id FROM Lead WHERE Email = '${lead.prospect.email.replace(/'/g, "\\'")}'`
        );
        const existing = await sfApi(api, `/query?q=${query}`);

        if (existing?.records?.length > 0) {
          // Update
          await sfApi(
            api,
            `/sobjects/Lead/${existing.records[0].Id}`,
            "PATCH",
            sfLead
          );
        } else {
          // Create
          await sfApi(api, "/sobjects/Lead", "POST", sfLead);
        }

        processed++;
      } catch (err) {
        failed++;
        errors.push(
          `Lead ${lead.prospect.email}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  }

  // Push email activities
  if (syncSettings.pushActivities !== false) {
    const events = await db.emailEvent.findMany({
      where: {
        campaign: { teamId: integration.teamId },
        type: { in: ["SENT", "REPLIED"] },
        timestamp: {
          gte: integration.lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      include: {
        prospect: { select: { email: true } },
        sequence: { select: { subject: true } },
      },
      take: 200,
    });

    for (const event of events) {
      try {
        // Find the Salesforce Lead/Contact by email
        const query = encodeURIComponent(
          `SELECT Id FROM Lead WHERE Email = '${event.prospect.email.replace(/'/g, "\\'")}'`
        );
        const sfRecord = await sfApi(api, `/query?q=${query}`);

        if (sfRecord?.records?.length > 0) {
          await sfApi(api, "/sobjects/Task", "POST", {
            WhoId: sfRecord.records[0].Id,
            Subject: `Email ${event.type === "REPLIED" ? "Reply" : "Sent"}: ${event.sequence.subject || "No subject"}`,
            Description: `Automated email ${event.type.toLowerCase()} via ColdClaude`,
            Status: "Completed",
            ActivityDate: event.timestamp.toISOString().split("T")[0],
          });
          processed++;
        }
      } catch (err) {
        failed++;
        errors.push(
          `Activity for ${event.prospect.email}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  }

  return {
    status: failed > 0 ? (processed > 0 ? "PARTIAL" : "FAILED") : "SUCCESS",
    recordsProcessed: processed,
    recordsFailed: failed,
    errors,
  };
}
