import nodemailer from "nodemailer";
import crypto from "crypto";
import { db } from "@/lib/db";

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function getBaseUrl() {
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

function getFromAddress() {
  return process.env.SMTP_FROM || `ColdClaude <${process.env.SMTP_USER}>`;
}

// ─── Token generation ───────────────────────────────────────

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// ─── Email verification ─────────────────────────────────────

export async function createVerificationToken(email: string): Promise<string> {
  const token = generateToken();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Delete any existing tokens for this email
  await db.verificationToken.deleteMany({
    where: { identifier: email },
  });

  await db.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });

  return token;
}

export async function sendVerificationEmail(
  email: string,
  name: string | null
) {
  const token = await createVerificationToken(email);
  const verifyUrl = `${getBaseUrl()}/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

  const transporter = getTransporter();

  await transporter.sendMail({
    from: getFromAddress(),
    to: email,
    subject: "Verify your email — ColdClaude",
    html: `
      <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <h2 style="color: #111827; font-size: 20px; margin-bottom: 16px;">
          Verify your email
        </h2>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
          Hi${name ? ` ${name}` : ""},<br><br>
          Click the button below to verify your email address and activate your account.
        </p>
        <a href="${verifyUrl}"
           style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
          Verify Email
        </a>
        <p style="color: #9ca3af; font-size: 12px;">
          This link expires in 24 hours. If you didn't create an account, ignore this email.
        </p>
      </div>
    `,
  });
}

export async function verifyEmailToken(
  token: string,
  email: string
): Promise<boolean> {
  const record = await db.verificationToken.findFirst({
    where: { token, identifier: email },
  });

  if (!record) return false;
  if (record.expires < new Date()) {
    await db.verificationToken.delete({
      where: { identifier_token: { identifier: email, token } },
    });
    return false;
  }

  // Mark user as verified
  await db.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });

  // Clean up the token
  await db.verificationToken.delete({
    where: { identifier_token: { identifier: email, token } },
  });

  return true;
}

// ─── Password reset ─────────────────────────────────────────

export async function createPasswordResetToken(
  email: string
): Promise<string> {
  const token = generateToken();
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Delete any existing reset tokens for this email
  await db.passwordResetToken.deleteMany({
    where: { email },
  });

  await db.passwordResetToken.create({
    data: { email, token, expires },
  });

  return token;
}

export async function sendPasswordResetEmail(
  email: string,
  name: string | null
) {
  const token = await createPasswordResetToken(email);
  const resetUrl = `${getBaseUrl()}/auth/reset-password/${token}`;

  const transporter = getTransporter();

  await transporter.sendMail({
    from: getFromAddress(),
    to: email,
    subject: "Reset your password — ColdClaude",
    html: `
      <div style="max-width: 480px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <h2 style="color: #111827; font-size: 20px; margin-bottom: 16px;">
          Reset your password
        </h2>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
          Hi${name ? ` ${name}` : ""},<br><br>
          We received a request to reset your password. Click the button below to choose a new one.
        </p>
        <a href="${resetUrl}"
           style="display: inline-block; margin: 24px 0; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">
          Reset Password
        </a>
        <p style="color: #9ca3af; font-size: 12px;">
          This link expires in 1 hour. If you didn't request this, ignore this email.
        </p>
      </div>
    `,
  });
}

export async function validatePasswordResetToken(
  token: string
): Promise<string | null> {
  const record = await db.passwordResetToken.findUnique({
    where: { token },
  });

  if (!record) return null;
  if (record.expires < new Date()) {
    await db.passwordResetToken.delete({ where: { token } });
    return null;
  }

  return record.email;
}

export async function consumePasswordResetToken(token: string): Promise<void> {
  await db.passwordResetToken.delete({ where: { token } });
}
