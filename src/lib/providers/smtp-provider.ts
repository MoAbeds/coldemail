import nodemailer from "nodemailer";
import type { SendEmailParams, SendEmailResult, EmailProvider } from "./types";

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure?: boolean;
}

export class SmtpProvider implements EmailProvider {
  private config: SmtpConfig;

  constructor(config: SmtpConfig) {
    this.config = config;
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const transport = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure ?? this.config.port === 465,
      auth: {
        user: this.config.user,
        pass: this.config.password,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });

    try {
      const info = await transport.sendMail({
        from: `"${params.fromName}" <${params.from}>`,
        to: params.to,
        replyTo: params.replyTo || params.from,
        subject: params.subject,
        text: params.textBody,
        html: params.htmlBody,
        headers: {
          ...params.headers,
          ...(params.inReplyTo
            ? { "In-Reply-To": params.inReplyTo }
            : {}),
          ...(params.references
            ? { References: params.references }
            : {}),
        },
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (err: unknown) {
      const error = err as Error & { responseCode?: number; code?: string };
      const code = String(error.responseCode || error.code || "");
      const isHardBounce =
        code.startsWith("5") || code === "EENVELOPE";

      return {
        success: false,
        error: error.message,
        errorCode: code,
        isBounce: true,
        isHardBounce,
      };
    } finally {
      transport.close();
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const transport = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure ?? this.config.port === 465,
      auth: {
        user: this.config.user,
        pass: this.config.password,
      },
      connectionTimeout: 10_000,
    });

    try {
      await transport.verify();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    } finally {
      transport.close();
    }
  }
}
