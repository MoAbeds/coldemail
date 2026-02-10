export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyticsQueue } from "@/lib/queue";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

// GET /api/track/open?id=[eventId]
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("id");

  if (eventId) {
    // Fire-and-forget: record the open event
    try {
      const event = await db.emailEvent.findUnique({
        where: { id: eventId },
        select: {
          prospectId: true,
          campaignId: true,
          sequenceId: true,
          emailAccountId: true,
          type: true,
        },
      });

      if (event && event.type === "SENT") {
        // Create an OPENED event
        await db.emailEvent.create({
          data: {
            prospectId: event.prospectId,
            campaignId: event.campaignId,
            sequenceId: event.sequenceId,
            emailAccountId: event.emailAccountId,
            type: "OPENED",
            eventData: { originalEventId: eventId },
          },
        });

        // Queue analytics processing
        await analyticsQueue.add("track-open", {
          type: "open",
          eventId,
          prospectId: event.prospectId,
          campaignId: event.campaignId,
          sequenceStepId: event.sequenceId,
          emailAccountId: event.emailAccountId,
        });
      }
    } catch {
      // Never fail the pixel response
    }
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
