import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/validations/auth";
import { campaignSchema, prospectSchema, emailAccountSchema, emailSequenceSchema } from "@/lib/validations/campaign";
import { wizardBasicsSchema, wizardEmailSchema, wizardSequenceStepSchema } from "@/lib/validations/campaign-wizard";

// ── Auth Validations ──

describe("loginSchema", () => {
  it("accepts valid login", () => {
    const result = loginSchema.safeParse({ email: "user@test.com", password: "pass123" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "pass123" });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({ email: "user@test.com", password: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  const validData = {
    name: "John Doe",
    email: "john@test.com",
    password: "Password1",
    confirmPassword: "Password1",
  };

  it("accepts valid registration", () => {
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 2 chars", () => {
    const result = registerSchema.safeParse({ ...validData, name: "J" });
    expect(result.success).toBe(false);
  });

  it("rejects password without uppercase", () => {
    const result = registerSchema.safeParse({ ...validData, password: "password1", confirmPassword: "password1" });
    expect(result.success).toBe(false);
  });

  it("rejects password without number", () => {
    const result = registerSchema.safeParse({ ...validData, password: "Password", confirmPassword: "Password" });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 chars", () => {
    const result = registerSchema.safeParse({ ...validData, password: "Pass1", confirmPassword: "Pass1" });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({ ...validData, confirmPassword: "Different1" });
    expect(result.success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "user@test.com" }).success).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "bad" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("accepts valid reset", () => {
    const result = resetPasswordSchema.safeParse({ password: "NewPass1", confirmPassword: "NewPass1" });
    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = resetPasswordSchema.safeParse({ password: "NewPass1", confirmPassword: "Wrong1" });
    expect(result.success).toBe(false);
  });
});

// ── Campaign Validations ──

describe("campaignSchema", () => {
  const validCampaign = {
    name: "My Campaign",
    teamId: "team-1",
    emailAccountId: "acc-1",
  };

  it("accepts valid campaign", () => {
    expect(campaignSchema.safeParse(validCampaign).success).toBe(true);
  });

  it("applies defaults", () => {
    const result = campaignSchema.safeParse(validCampaign);
    if (result.success) {
      expect(result.data.dailyLimit).toBe(50);
      expect(result.data.trackOpens).toBe(true);
      expect(result.data.timezone).toBe("UTC");
    }
  });

  it("rejects empty name", () => {
    expect(campaignSchema.safeParse({ ...validCampaign, name: "" }).success).toBe(false);
  });

  it("rejects daily limit > 500", () => {
    expect(campaignSchema.safeParse({ ...validCampaign, dailyLimit: 501 }).success).toBe(false);
  });

  it("rejects daily limit < 1", () => {
    expect(campaignSchema.safeParse({ ...validCampaign, dailyLimit: 0 }).success).toBe(false);
  });

  it("validates sending schedule", () => {
    const result = campaignSchema.safeParse({
      ...validCampaign,
      sendingSchedule: { startHour: 9, endHour: 17, days: [1, 2, 3, 4, 5] },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid schedule hours", () => {
    const result = campaignSchema.safeParse({
      ...validCampaign,
      sendingSchedule: { startHour: 25, endHour: 17, days: [1] },
    });
    expect(result.success).toBe(false);
  });
});

describe("prospectSchema", () => {
  it("accepts valid prospect", () => {
    expect(
      prospectSchema.safeParse({ email: "jane@acme.com", firstName: "Jane" }).success
    ).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(prospectSchema.safeParse({ email: "bad-email" }).success).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = prospectSchema.safeParse({ email: "jane@acme.com" });
    expect(result.success).toBe(true);
  });

  it("validates custom fields as string record", () => {
    const result = prospectSchema.safeParse({
      email: "jane@acme.com",
      customFields: { Industry: "Tech" },
    });
    expect(result.success).toBe(true);
  });
});

describe("emailSequenceSchema", () => {
  it("accepts valid email step", () => {
    const result = emailSequenceSchema.safeParse({
      stepNumber: 1,
      type: "EMAIL",
      subject: "Hello",
      body: "<p>Hi</p>",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid wait step", () => {
    const result = emailSequenceSchema.safeParse({
      stepNumber: 2,
      type: "WAIT",
      delayDays: 3,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid step type", () => {
    const result = emailSequenceSchema.safeParse({
      stepNumber: 1,
      type: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("rejects step number < 1", () => {
    const result = emailSequenceSchema.safeParse({
      stepNumber: 0,
      type: "EMAIL",
    });
    expect(result.success).toBe(false);
  });
});

describe("emailAccountSchema", () => {
  it("accepts valid SMTP account", () => {
    const result = emailAccountSchema.safeParse({
      email: "sender@example.com",
      displayName: "My Sender",
      provider: "SMTP",
      smtpHost: "smtp.example.com",
      smtpPort: 587,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid provider", () => {
    const result = emailAccountSchema.safeParse({
      email: "sender@example.com",
      displayName: "Sender",
      provider: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("rejects daily limit > 500", () => {
    const result = emailAccountSchema.safeParse({
      email: "sender@example.com",
      displayName: "Sender",
      dailyLimit: 501,
    });
    expect(result.success).toBe(false);
  });
});

// ── Wizard Validations ──

describe("wizardBasicsSchema", () => {
  const valid = {
    campaignName: "My Campaign",
    emailAccountId: "acc-1",
    goal: "replies" as const,
    dailyLimit: 50,
  };

  it("accepts valid basics", () => {
    expect(wizardBasicsSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects name shorter than 3 chars", () => {
    expect(wizardBasicsSchema.safeParse({ ...valid, campaignName: "ab" }).success).toBe(false);
  });

  it("rejects name longer than 100 chars", () => {
    expect(wizardBasicsSchema.safeParse({ ...valid, campaignName: "x".repeat(101) }).success).toBe(false);
  });

  it("rejects daily limit < 10", () => {
    expect(wizardBasicsSchema.safeParse({ ...valid, dailyLimit: 5 }).success).toBe(false);
  });

  it("rejects daily limit > 200", () => {
    expect(wizardBasicsSchema.safeParse({ ...valid, dailyLimit: 201 }).success).toBe(false);
  });

  it("accepts null goal", () => {
    expect(wizardBasicsSchema.safeParse({ ...valid, goal: null }).success).toBe(true);
  });
});

describe("wizardEmailSchema", () => {
  it("accepts valid email", () => {
    const result = wizardEmailSchema.safeParse({
      subject: "Check this out",
      body: "A".repeat(50),
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty subject", () => {
    expect(wizardEmailSchema.safeParse({ subject: "", body: "A".repeat(50) }).success).toBe(false);
  });

  it("rejects subject > 150 chars", () => {
    expect(wizardEmailSchema.safeParse({ subject: "x".repeat(151), body: "A".repeat(50) }).success).toBe(false);
  });

  it("rejects body < 50 chars", () => {
    expect(wizardEmailSchema.safeParse({ subject: "Hi", body: "Short" }).success).toBe(false);
  });
});

describe("wizardSequenceStepSchema", () => {
  it("accepts valid step", () => {
    const result = wizardSequenceStepSchema.safeParse({
      id: "step-1",
      stepNumber: 1,
      type: "EMAIL",
      subject: "Follow up",
      body: "Just checking in",
    });
    expect(result.success).toBe(true);
  });

  it("accepts condition step", () => {
    const result = wizardSequenceStepSchema.safeParse({
      id: "step-2",
      stepNumber: 2,
      type: "CONDITION",
      condition: { type: "opened", thenStep: 3, elseStep: 4 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid condition type", () => {
    const result = wizardSequenceStepSchema.safeParse({
      id: "step-2",
      stepNumber: 2,
      type: "CONDITION",
      condition: { type: "invalid_type" },
    });
    expect(result.success).toBe(false);
  });
});
