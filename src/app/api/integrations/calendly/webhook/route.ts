export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { handleCalendlyWebhook } from "@/lib/integrations/calendly";

// POST /api/integrations/calendly/webhook — Handle Calendly webhook events
export async function POST(req: Request) {
  try {
    const event = await req.json();

    if (!event?.event || !event?.payload) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const result = await handleCalendlyWebhook(event);

    return NextResponse.json({
      received: true,
      processed: !!result,
      ...(result || {}),
    });
  } catch (err) {
    console.error("[calendly-webhook] Error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
