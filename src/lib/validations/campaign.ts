import { z } from "zod";

export const campaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  teamId: z.string().min(1, "Team is required"),
  emailAccountId: z.string().min(1, "Email account is required"),
  dailyLimit: z.number().min(1).max(500).default(50),
  sendingSchedule: z
    .object({
      startHour: z.number().min(0).max(23).default(9),
      endHour: z.number().min(0).max(23).default(17),
      days: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5]),
    })
    .optional(),
  timezone: z.string().default("UTC"),
  trackOpens: z.boolean().default(true),
  trackClicks: z.boolean().default(true),
  trackReplies: z.boolean().default(true),
});

export const emailSequenceSchema = z.object({
  stepNumber: z.number().min(1),
  type: z.enum(["EMAIL", "WAIT", "CONDITION", "TASK"]).default("EMAIL"),
  subject: z.string().optional(),
  body: z.string().optional(),
  delayDays: z.number().min(0).default(0),
  delayHours: z.number().min(0).default(0),
  condition: z.record(z.string(), z.unknown()).optional(),
  abTestVariant: z.enum(["A", "B"]).optional(),
});

export const prospectSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  customFields: z.record(z.string(), z.string()).optional(),
});

export const emailAccountSchema = z.object({
  email: z.string().email("Invalid email address"),
  displayName: z.string().min(1, "Display name is required"),
  provider: z.enum(["GMAIL", "OUTLOOK", "SMTP"]).default("SMTP"),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  imapHost: z.string().optional(),
  imapPort: z.number().optional(),
  dailyLimit: z.number().min(1).max(500).default(50),
});

export type CampaignInput = z.infer<typeof campaignSchema>;
export type EmailSequenceInput = z.infer<typeof emailSequenceSchema>;
export type ProspectInput = z.infer<typeof prospectSchema>;
export type EmailAccountInput = z.infer<typeof emailAccountSchema>;
