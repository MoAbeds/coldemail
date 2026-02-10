import { google } from "googleapis";
import type { SendEmailParams, SendEmailResult, EmailProvider } from "./types";

interface GmailConfig {
  accessToken: string;
  refreshToken?: string;
  clientId: string;
  clientSecret: string;
}

function buildRawEmail(params: SendEmailParams): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const headers = [
    `From: "${params.fromName}" <${params.from}>`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];

  if (params.replyTo) {
    headers.push(`Reply-To: ${params.replyTo}`);
  }
  if (params.inReplyTo) {
    headers.push(`In-Reply-To: ${params.inReplyTo}`);
  }
  if (params.references) {
    headers.push(`References: ${params.references}`);
  }
  if (params.headers) {
    for (const [key, value] of Object.entries(params.headers)) {
      headers.push(`${key}: ${value}`);
    }
  }

  const raw = [
    headers.join("\r\n"),
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    params.textBody,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    "",
    params.htmlBody,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  // URL-safe base64 encode
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export class GmailProvider implements EmailProvider {
  private config: GmailConfig;

  constructor(config: GmailConfig) {
    this.config = config;
  }

  private getAuth() {
    const oauth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret
    );
    oauth2Client.setCredentials({
      access_token: this.config.accessToken,
      refresh_token: this.config.refreshToken,
    });
    return oauth2Client;
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      const auth = this.getAuth();
      const gmail = google.gmail({ version: "v1", auth });

      const raw = buildRawEmail(params);

      const res = await gmail.users.messages.send({
        userId: "me",
        requestBody: { raw },
      });

      // Extract Message-ID from sent message headers
      let messageId: string | undefined;
      if (res.data.id) {
        try {
          const msg = await gmail.users.messages.get({
            userId: "me",
            id: res.data.id,
            format: "metadata",
            metadataHeaders: ["Message-Id"],
          });
          const header = msg.data.payload?.headers?.find(
            (h) => h.name?.toLowerCase() === "message-id"
          );
          messageId = header?.value || undefined;
        } catch {
          // Non-critical — fall through
        }
      }

      return {
        success: true,
        messageId: messageId || res.data.id || undefined,
      };
    } catch (err: unknown) {
      const error = err as Error & { code?: number; status?: number };
      const code = String(error.code || error.status || "");

      return {
        success: false,
        error: error.message,
        errorCode: code,
        isBounce: code === "550" || code === "553",
        isHardBounce: code === "550" || code === "553",
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const auth = this.getAuth();
      const gmail = google.gmail({ version: "v1", auth });
      await gmail.users.getProfile({ userId: "me" });
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  }
}
