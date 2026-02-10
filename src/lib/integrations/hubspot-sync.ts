import { db } from "@/lib/db";
import type { Integration } from "@prisma/client";
import type { SyncResult } from "./sync-engine";

async function hsApi(
  accessToken: string,
  path: string,
  method: string = "GET",
  body?: unknown
) {
  const res = await fetch(`https://api.hubapi.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot API error ${res.status}: ${text}`);
  }

  return res.status === 204 ? null : res.json();
}

/**
 * Sync prospects and activities to HubSpot.
 */
export async function syncHubSpot(
  integration: Integration,
  credentials: Record<string, string>,
  config: Record<string, unknown>
): Promise<SyncResult> {
  const errors: string[] = [];
  let processed = 0;
  let failed = 0;

  const accessToken = credentials.accessToken;
  const syncSettings = (config.syncSettings as Record<string, unknown>) || {};
  const fieldMappings =
    (config.fieldMappings as Record<string, string>) || {};

  // Push contacts
  if (syncSettings.pushContacts !== false) {
    const leads = await db.lead.findMany({
      where: { campaign: { teamId: integration.teamId } },
      include: {
        prospect: true,
        campaign: { select: { name: true } },
      },
      take: 100,
    });

    for (const lead of leads) {
      try {
        const properties: Record<string, string> = {};

        if (fieldMappings.email)
          properties[fieldMappings.email] = lead.prospect.email;
        if (fieldMappings.firstName && lead.prospect.firstName)
          properties[fieldMappings.firstName] = lead.prospect.firstName;
        if (fieldMappings.lastName && lead.prospect.lastName)
          properties[fieldMappings.lastName] = lead.prospect.lastName;
        if (fieldMappings.company && lead.prospect.company)
          properties[fieldMappings.company] = lead.prospect.company;
        if (fieldMappings.jobTitle && lead.prospect.jobTitle)
          properties[fieldMappings.jobTitle] = lead.prospect.jobTitle;

        // Search for existing contact by email
        const searchRes = await hsApi(
          accessToken,
          "/crm/v3/objects/contacts/search",
          "POST",
          {
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: "email",
                    operator: "EQ",
                    value: lead.prospect.email,
                  },
                ],
              },
            ],
          }
        );

        if (searchRes?.results?.length > 0) {
          // Update existing
          await hsApi(
            accessToken,
            `/crm/v3/objects/contacts/${searchRes.results[0].id}`,
            "PATCH",
            { properties }
          );
        } else {
          // Create new
          await hsApi(accessToken, "/crm/v3/objects/contacts", "POST", {
            properties,
          });
        }

        processed++;
      } catch (err) {
        failed++;
        errors.push(
          `Contact ${lead.prospect.email}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  }

  // Log activities as timeline events
  if (syncSettings.pushActivities !== false) {
    const events = await db.emailEvent.findMany({
      where: {
        campaign: { teamId: integration.teamId },
        type: { in: ["SENT", "OPENED", "CLICKED", "REPLIED"] },
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
        // Find contact
        const searchRes = await hsApi(
          accessToken,
          "/crm/v3/objects/contacts/search",
          "POST",
          {
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: "email",
                    operator: "EQ",
                    value: event.prospect.email,
                  },
                ],
              },
            ],
          }
        );

        if (searchRes?.results?.length > 0) {
          // Create engagement (note)
          await hsApi(accessToken, "/crm/v3/objects/notes", "POST", {
            properties: {
              hs_timestamp: event.timestamp.toISOString(),
              hs_note_body: `Email ${event.type.toLowerCase()}: ${event.sequence.subject || "No subject"} (via ColdClaude)`,
            },
            associations: [
              {
                to: { id: searchRes.results[0].id },
                types: [
                  { associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 },
                ],
              },
            ],
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

  // Create deals for won leads
  if (syncSettings.createDeals !== false) {
    const wonLeads = await db.lead.findMany({
      where: {
        campaign: { teamId: integration.teamId },
        status: "WON",
        lastActivityAt: {
          gte: integration.lastSyncAt || new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      include: {
        prospect: true,
        campaign: { select: { name: true } },
      },
    });

    for (const lead of wonLeads) {
      try {
        const dealName = `${lead.prospect.firstName || lead.prospect.email} - ${lead.campaign.name}`;

        await hsApi(accessToken, "/crm/v3/objects/deals", "POST", {
          properties: {
            dealname: dealName,
            pipeline: "default",
            dealstage: "closedwon",
            description: `Won lead from ColdClaude campaign: ${lead.campaign.name}`,
          },
        });
        processed++;
      } catch (err) {
        failed++;
        errors.push(
          `Deal for ${lead.prospect.email}: ${err instanceof Error ? err.message : "Unknown error"}`
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
