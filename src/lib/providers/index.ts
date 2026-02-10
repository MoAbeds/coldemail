import { decrypt } from "@/lib/crypto";
import { SmtpProvider } from "./smtp-provider";
import { GmailProvider } from "./gmail-provider";
import { MicrosoftProvider } from "./microsoft-provider";
import type { EmailProvider } from "./types";

export type { SendEmailParams, SendEmailResult, EmailProvider } from "./types";

interface AccountRecord {
  provider: "GMAIL" | "OUTLOOK" | "SMTP";
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpPassword?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
}

export function createProvider(account: AccountRecord): EmailProvider {
  switch (account.provider) {
    case "GMAIL": {
      if (!account.accessToken) {
        throw new Error("Gmail account missing access token");
      }
      return new GmailProvider({
        accessToken: decrypt(account.accessToken),
        refreshToken: account.refreshToken
          ? decrypt(account.refreshToken)
          : undefined,
        clientId:
          process.env.GOOGLE_EMAIL_CLIENT_ID ||
          process.env.GOOGLE_CLIENT_ID ||
          "",
        clientSecret:
          process.env.GOOGLE_EMAIL_CLIENT_SECRET ||
          process.env.GOOGLE_CLIENT_SECRET ||
          "",
      });
    }

    case "OUTLOOK": {
      if (!account.accessToken) {
        throw new Error("Outlook account missing access token");
      }
      return new MicrosoftProvider({
        accessToken: decrypt(account.accessToken),
      });
    }

    case "SMTP": {
      if (
        !account.smtpHost ||
        !account.smtpPort ||
        !account.smtpUser ||
        !account.smtpPassword
      ) {
        throw new Error("SMTP account missing configuration");
      }
      return new SmtpProvider({
        host: account.smtpHost,
        port: account.smtpPort,
        user: account.smtpUser,
        password: decrypt(account.smtpPassword),
      });
    }

    default:
      throw new Error(`Unknown provider: ${account.provider}`);
  }
}
