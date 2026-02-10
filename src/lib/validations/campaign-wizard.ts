import { z } from "zod";

export const wizardBasicsSchema = z.object({
  campaignName: z
    .string()
    .min(3, "Campaign name must be at least 3 characters")
    .max(100, "Campaign name must be under 100 characters"),
  emailAccountId: z.string().min(1, "Please select an email account"),
  goal: z.enum(["replies", "meetings", "clicks", "leads"]).nullable(),
  dailyLimit: z
    .number()
    .min(10, "Minimum daily limit is 10")
    .max(200, "Maximum daily limit is 200"),
  teamId: z.string().optional().default(""),
});

export const wizardEmailSchema = z.object({
  subject: z
    .string()
    .min(1, "Subject line is required")
    .max(150, "Subject line must be under 150 characters"),
  body: z
    .string()
    .min(50, "Email body must be at least 50 characters"),
});

export const wizardSequenceStepSchema = z.object({
  id: z.string(),
  stepNumber: z.number().min(1),
  type: z.enum(["EMAIL", "WAIT", "CONDITION", "TASK"]),
  subject: z.string().optional(),
  body: z.string().optional(),
  delayDays: z.number().min(0).default(0),
  delayHours: z.number().min(0).default(0),
  condition: z
    .object({
      type: z.enum(["link_clicked", "no_reply", "opened"]),
      thenStep: z.number().optional(),
      elseStep: z.number().optional(),
    })
    .optional(),
  taskDescription: z.string().optional(),
});

export type WizardBasicsInput = z.input<typeof wizardBasicsSchema>;
export type WizardEmailInput = z.input<typeof wizardEmailSchema>;
