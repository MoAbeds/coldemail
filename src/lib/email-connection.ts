import nodemailer from "nodemailer";

interface SmtpTestOptions {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure?: boolean;
}

export async function testSmtpConnection(
  options: SmtpTestOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure ?? options.port === 465,
      auth: {
        user: options.user,
        pass: options.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    await transporter.verify();
    return { success: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Connection failed";
    return { success: false, error: message };
  }
}

export function getSmtpDefaults(provider: string): {
  smtpHost: string;
  smtpPort: number;
  imapHost: string;
  imapPort: number;
} {
  switch (provider) {
    case "GMAIL":
      return {
        smtpHost: "smtp.gmail.com",
        smtpPort: 587,
        imapHost: "imap.gmail.com",
        imapPort: 993,
      };
    case "OUTLOOK":
      return {
        smtpHost: "smtp.office365.com",
        smtpPort: 587,
        imapHost: "outlook.office365.com",
        imapPort: 993,
      };
    default:
      return {
        smtpHost: "",
        smtpPort: 587,
        imapHost: "",
        imapPort: 993,
      };
  }
}
