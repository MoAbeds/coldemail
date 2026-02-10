import nodemailer from "nodemailer";

interface EmailAccount {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  email: string;
  name: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  account: EmailAccount;
}

export async function sendEmail({ to, subject, html, account }: SendEmailOptions) {
  const transporter = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpPort === 465,
    auth: {
      user: account.smtpUser,
      pass: account.smtpPass,
    },
  });

  const info = await transporter.sendMail({
    from: `"${account.name}" <${account.email}>`,
    to,
    subject,
    html,
  });

  return info;
}

export function personalizeTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] ?? match;
  });
}
