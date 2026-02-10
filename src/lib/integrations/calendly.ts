import { db } from "@/lib/db";

/**
 * Calendly integration helpers.
 * Calendly uses incoming webhooks to notify when meetings are booked.
 */

interface CalendlyEvent {
  event: string; // invitee.created, invitee.canceled
  payload: {
    email: string;
    name: string;
    event_type: { name: string };
    scheduled_event: {
      start_time: string;
      end_time: string;
    };
    tracking?: {
      utm_campaign?: string;
      utm_source?: string;
    };
  };
}

/**
 * Generate a Calendly link with tracking parameters for a prospect.
 * Embeds campaignId and prospectId in UTM params for attribution.
 */
export function buildCalendlyLink(
  baseUrl: string,
  prospectEmail: string,
  campaignId: string,
  prospectId: string
): string {
  const url = new URL(baseUrl);
  url.searchParams.set("email", prospectEmail);
  url.searchParams.set("utm_source", "coldclaude");
  url.searchParams.set("utm_campaign", campaignId);
  url.searchParams.set("utm_content", prospectId);
  return url.toString();
}

/**
 * Handle Calendly webhook event.
 * Called from /api/integrations/calendly/webhook
 */
export async function handleCalendlyWebhook(event: CalendlyEvent) {
  if (event.event !== "invitee.created") return;

  const email = event.payload.email;
  const campaignId = event.payload.tracking?.utm_campaign;

  if (!email) return;

  // Find matching prospect
  const whereClause = campaignId
    ? { email, campaignId }
    : { email };

  const prospects = await db.prospect.findMany({
    where: whereClause,
    include: { campaign: { select: { teamId: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 1,
  });

  if (prospects.length === 0) return;

  const prospect = prospects[0];

  // Update prospect status
  await db.prospect.update({
    where: { id: prospect.id },
    data: {
      leadTemperature: "HOT",
      leadStatus: "QUALIFIED",
      status: "COMPLETED",
    },
  });

  // Create or update lead
  const existingLead = await db.lead.findFirst({
    where: { prospectId: prospect.id },
  });

  if (existingLead) {
    await db.lead.update({
      where: { id: existingLead.id },
      data: {
        status: "QUALIFIED",
        temperature: "HOT",
        lastActivityAt: new Date(),
      },
    });
  } else {
    await db.lead.create({
      data: {
        prospectId: prospect.id,
        campaignId: prospect.campaignId,
        status: "QUALIFIED",
        temperature: "HOT",
        lastActivityAt: new Date(),
      },
    });
  }

  // Create a task for the meeting
  await db.task.create({
    data: {
      prospectId: prospect.id,
      campaignId: prospect.campaignId,
      type: "CALL",
      title: `Meeting with ${event.payload.name}: ${event.payload.event_type.name}`,
      description: `Calendly meeting booked.\nTime: ${event.payload.scheduled_event.start_time}`,
      dueDate: new Date(event.payload.scheduled_event.start_time),
      status: "PENDING",
    },
  });

  return { prospectId: prospect.id, campaignName: prospect.campaign.name };
}
