import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/auth-email";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { rateLimit, getRateLimitKey } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const { success } = rateLimit(getRateLimitKey(req, "forgot-password"), {
      maxRequests: 3,
      windowMs: 15 * 60 * 1000, // 3 per 15 minutes
    });

    if (!success) {
      return NextResponse.json(
        { message: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email } = forgotPasswordSchema.parse(body);

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Always return success to prevent email enumeration
    if (!user || !user.password) {
      return NextResponse.json({
        message: "If an account exists, a reset email has been sent.",
      });
    }

    await sendPasswordResetEmail(user.email, user.name);

    return NextResponse.json({
      message: "If an account exists, a reset email has been sent.",
    });
  } catch {
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
}
