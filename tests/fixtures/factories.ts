/**
 * Test data factories for creating consistent test fixtures.
 */

let counter = 0;
function uid() {
  return `test-${++counter}-${Date.now()}`;
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  const id = uid();
  return {
    id,
    name: `Test User ${id}`,
    email: `user-${id}@test.com`,
    image: null,
    role: "MEMBER",
    ...overrides,
  };
}

export function createTestTeam(overrides: Partial<TestTeam> = {}): TestTeam {
  const id = uid();
  return {
    id,
    name: `Test Team ${id}`,
    slug: `test-team-${id}`,
    ...overrides,
  };
}

export function createTestCampaign(overrides: Partial<TestCampaign> = {}): TestCampaign {
  const id = uid();
  return {
    id,
    name: `Test Campaign ${id}`,
    status: "DRAFT",
    teamId: "team-1",
    emailAccountId: "account-1",
    createdById: "user-1",
    dailyLimit: 50,
    trackOpens: true,
    trackClicks: true,
    trackReplies: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestProspect(overrides: Partial<TestProspect> = {}): TestProspect {
  const id = uid();
  return {
    id,
    email: `prospect-${id}@example.com`,
    firstName: "Jane",
    lastName: "Doe",
    company: "Acme Corp",
    jobTitle: "CEO",
    status: "ACTIVE",
    campaignId: "campaign-1",
    customFields: {},
    ...overrides,
  };
}

export function createTestLead(overrides: Partial<TestLead> = {}): TestLead {
  const id = uid();
  const prospect = createTestProspect();
  return {
    id,
    status: "NEW",
    temperature: "WARM",
    lastActivityAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    prospect: {
      id: prospect.id,
      email: prospect.email,
      firstName: prospect.firstName,
      lastName: prospect.lastName,
      company: prospect.company,
      jobTitle: prospect.jobTitle,
      status: prospect.status,
      leadTemperature: "WARM",
      currentStep: 1,
      emailEvents: [],
    },
    campaign: { id: "campaign-1", name: "Test Campaign" },
    assignedTo: null,
    ...overrides,
  };
}

export function createTestEmailAccount(overrides: Partial<TestEmailAccount> = {}): TestEmailAccount {
  const id = uid();
  return {
    id,
    email: `sender-${id}@example.com`,
    displayName: `Sender ${id}`,
    provider: "SMTP",
    dailyLimit: 50,
    ...overrides,
  };
}

// ── Types ──

export interface TestUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
}

export interface TestTeam {
  id: string;
  name: string;
  slug: string;
}

export interface TestCampaign {
  id: string;
  name: string;
  status: string;
  teamId: string;
  emailAccountId: string;
  createdById: string;
  dailyLimit: number;
  trackOpens: boolean;
  trackClicks: boolean;
  trackReplies: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TestProspect {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  jobTitle: string | null;
  status: string;
  campaignId: string;
  customFields: Record<string, string>;
}

export interface TestLead {
  id: string;
  status: string;
  temperature: string;
  lastActivityAt: string | null;
  createdAt: string;
  prospect: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    jobTitle: string | null;
    status: string;
    leadTemperature: string;
    currentStep: number;
    emailEvents: Array<{ type: string; timestamp: string; eventData: unknown }>;
  };
  campaign: { id: string; name: string };
  assignedTo: { id: string; name: string | null; email: string; image: string | null } | null;
}

export interface TestEmailAccount {
  id: string;
  email: string;
  displayName: string;
  provider: string;
  dailyLimit: number;
}

/**
 * Reset the counter between test suites.
 */
export function resetFactories() {
  counter = 0;
}
