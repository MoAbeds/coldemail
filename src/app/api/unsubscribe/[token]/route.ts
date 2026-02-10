export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

// GET /api/unsubscribe/[token] — Show unsubscribe confirmation page
export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  // Find matching prospect by scanning (token is sha256 of prospectId-campaignId-unsub)
  // We need to search for it since we don't store the token directly
  const html = `
    <!DOCTYPE html>
    <html>
    <head><title>Unsubscribe</title>
    <style>
      body { font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f9fafb; }
      .card { background: white; border-radius: 12px; padding: 40px; max-width: 400px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
      h1 { font-size: 20px; margin-bottom: 8px; }
      p { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
      button { background: #2563eb; color: white; border: none; padding: 10px 24px; border-radius: 6px; font-size: 14px; cursor: pointer; }
      button:hover { background: #1d4ed8; }
      .done { color: #16a34a; }
    </style>
    </head>
    <body>
      <div class="card">
        <h1>Unsubscribe</h1>
        <p>Click below to stop receiving emails from this campaign.</p>
        <form method="POST" action="/api/unsubscribe/${token}">
          <button type="submit">Unsubscribe</button>
        </form>
      </div>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

// POST /api/unsubscribe/[token] — Process unsubscribe
export async function POST(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const { token } = params;

  try {
    // Find all prospects across all campaigns and check their token
    const prospects = await db.prospect.findMany({
      where: {
        status: { in: ["PENDING", "SENDING"] },
      },
      select: {
        id: true,
        campaignId: true,
        email: true,
      },
    });

    let found = false;

    for (const p of prospects) {
      const expectedToken = crypto
        .createHash("sha256")
        .update(`${p.id}-${p.campaignId}-unsub`)
        .digest("hex")
        .slice(0, 32);

      if (expectedToken === token) {
        // Unsubscribe this prospect
        await db.prospect.update({
          where: { id: p.id },
          data: { status: "UNSUBSCRIBED" },
        });

        // Record event
        const firstSequence = await db.emailSequence.findFirst({
          where: { campaignId: p.campaignId },
          orderBy: { stepNumber: "asc" },
        });

        if (firstSequence) {
          const emailAccount = await db.campaign.findUnique({
            where: { id: p.campaignId },
            select: { emailAccountId: true },
          });

          if (emailAccount) {
            await db.emailEvent.create({
              data: {
                prospectId: p.id,
                campaignId: p.campaignId,
                sequenceId: firstSequence.id,
                emailAccountId: emailAccount.emailAccountId,
                type: "UNSUBSCRIBED",
              },
            });
          }
        }

        found = true;
        break;
      }
    }

    const message = found
      ? "You have been unsubscribed. You will no longer receive emails from this campaign."
      : "This unsubscribe link is no longer valid.";

    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Unsubscribed</title>
      <style>
        body { font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f9fafb; }
        .card { background: white; border-radius: 12px; padding: 40px; max-width: 400px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
        h1 { font-size: 20px; margin-bottom: 8px; color: ${found ? "#16a34a" : "#dc2626"}; }
        p { color: #6b7280; font-size: 14px; }
      </style>
      </head>
      <body>
        <div class="card">
          <h1>${found ? "Unsubscribed" : "Link Expired"}</h1>
          <p>${message}</p>
        </div>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch {
    return new NextResponse("Something went wrong", { status: 500 });
  }
}
