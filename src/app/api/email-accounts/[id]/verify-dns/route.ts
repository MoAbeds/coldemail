import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { runFullDnsCheck } from "@/lib/dns-verify";

// GET /api/email-accounts/[id]/verify-dns
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await db.emailAccount.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!account) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const results = await runFullDnsCheck(account.email);

    // Update DNS config status in DB
    await db.emailAccount.update({
      where: { id: params.id },
      data: {
        spfConfigured: results.spf.configured,
        dkimConfigured: results.dkim.configured,
        dmarcConfigured: results.dmarc.configured,
      },
    });

    return NextResponse.json({ dns: results });
  } catch {
    return NextResponse.json(
      { error: "DNS verification failed" },
      { status: 500 }
    );
  }
}
