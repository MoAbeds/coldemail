import { Client } from "@microsoft/microsoft-graph-client";
import type { SendEmailParams, SendEmailResult, EmailProvider } from "./types";

interface MicrosoftConfig {
  accessToken: string;
}

export class MicrosoftProvider implements EmailProvider {
  private config: MicrosoftConfig;

  constructor(config: MicrosoftConfig) {
    this.config = config;
  }

  private getClient(): Client {
    return Client.init({
      authProvider: (done) => {
        done(null, this.config.accessToken);
      },
    });
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    try {
      const client = this.getClient();

      const message = {
        subject: params.subject,
        body: {
          contentType: "HTML" as const,
          content: params.htmlBody,
        },
        toRecipients: [
          {
            emailAddress: { address: params.to },
          },
        ],
        from: {
          emailAddress: {
            name: params.fromName,
            address: params.from,
          },
        },
        replyTo: params.replyTo
          ? [{ emailAddress: { address: params.replyTo } }]
          : undefined,
        internetMessageHeaders: [
          ...(params.inReplyTo
            ? [
                {
                  name: "In-Reply-To",
                  value: params.inReplyTo,
                },
              ]
            : []),
          ...(params.references
            ? [
                {
                  name: "References",
                  value: params.references,
                },
              ]
            : []),
          ...Object.entries(params.headers || {}).map(([name, value]) => ({
            name,
            value,
          })),
        ],
      };

      const res = await client.api("/me/sendMail").post({
        message,
        saveToSentItems: true,
      });

      // Microsoft Graph sendMail returns 202 with no body on success
      // The message ID is not directly returned — we use a generated one
      const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@outlook.com>`;

      return {
        success: true,
        messageId: res?.id || messageId,
      };
    } catch (err: unknown) {
      const error = err as Error & {
        statusCode?: number;
        code?: string;
      };

      return {
        success: false,
        error: error.message,
        errorCode: error.code || String(error.statusCode || ""),
        isBounce: false,
        isHardBounce: false,
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const client = this.getClient();
      await client.api("/me").get();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  }
}
