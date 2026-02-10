export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyticsQueue } from "@/lib/queue";

// GET /api/track/click?id=[eventId]&url=[encodedUrl]
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("id");
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.redirect(
      new URL("/", process.env.NEXTAUTH_URL || "http://localhost:3000")
    );
  }

  const decoded = decodeURIComponent(targetUrl);

  // Validate URL to prevent open redirects
  try {
    const url = new URL(decoded);
    if (!["http:", "https:"].includes(url.protocol)) {
      return NextResponse.redirect(
        new URL("/", process.env.NEXTAUTH_URL || "http://localhost:3000")
      );
    }
  } catch {
    return NextResponse.redirect(
      new URL("/", process.env.NEXTAUTH_URL || "http://localhost:3000")
    );
  }

  if (eventId) {
    try {
      const event = await db.emailEvent.findUnique({
        where: { id: eventId },
        select: {
          prospectId: true,
          campaignId: true,
          sequenceId: true,
          emailAccountId: true,
        },
      });

      if (event) {
        await db.emailEvent.create({
          data: {
            prospectId: event.prospectId,
            campaignId: event.campaignId,
            sequenceId: event.sequenceId,
            emailAccountId: event.emailAccountId,
            type: "CLICKED",
            eventData: { originalEventId: eventId, url: decoded },
          },
        });

        await analyticsQueue.add("track-click", {
          type: "click",
          eventId,
          prospectId: event.prospectId,
          campaignId: event.campaignId,
          sequenceStepId: event.sequenceId,
          emailAccountId: event.emailAccountId,
          metadata: { url: decoded },
        });
      }
    } catch {
      // Never fail the redirect
    }
  }

  return NextResponse.redirect(decoded);
}
