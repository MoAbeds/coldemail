import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/auth-email";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const { success } = rateLimit(getRateLimitKey(req, "resend-verify"), {
      maxRequests: 3,
      windowMs: 5 * 60 * 1000, // 3 per 5 minutes
    });

    if (!success) {
      return NextResponse.json(
        { message: "Too many requests. Please wait before trying again." },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { message: "Email is already verified" },
        { status: 400 }
      );
    }

    await sendVerificationEmail(user.email, user.name);

    return NextResponse.json({ message: "Verification email sent" });
  } catch {
    return NextResponse.json(
      { message: "Failed to send verification email" },
      { status: 500 }
    );
  }
}
