import { db } from "@/lib/db";
import type { EmailAccount } from "@prisma/client";

interface RotationCandidate {
  id: string;
  email: string;
  dailyLimit: number;
  sentToday: number;
  healthScore: number;
  weight: number; // calculated
}

export async function getNextSendingAccount(
  campaignId: string
): Promise<EmailAccount | null> {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    include: { emailAccount: true },
  });

  if (!campaign) return null;

  // Single-account campaigns
  const account = campaign.emailAccount;
  if (account.isActive && account.sentToday < account.dailyLimit) {
    return account;
  }

  return null;
}

export async function getAvailableAccounts(
  userId: string
): Promise<RotationCandidate[]> {
  const accounts = await db.emailAccount.findMany({
    where: {
      userId,
      isActive: true,
    },
    orderBy: { healthScore: "desc" },
  });

  return accounts
    .filter((a) => a.sentToday < a.dailyLimit)
    .map((a) => ({
      id: a.id,
      email: a.email,
      dailyLimit: a.dailyLimit,
      sentToday: a.sentToday,
      healthScore: a.healthScore,
      weight: calculateWeight(a),
    }));
}

function calculateWeight(account: {
  healthScore: number;
  dailyLimit: number;
  sentToday: number;
}): number {
  const remainingCapacity = account.dailyLimit - account.sentToday;
  const capacityRatio = remainingCapacity / account.dailyLimit;
  // Weight = healthScore * remaining capacity ratio
  return account.healthScore * capacityRatio;
}

export function selectAccountWeighted(
  candidates: RotationCandidate[]
): RotationCandidate | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return candidates[0];

  let random = Math.random() * totalWeight;
  for (const candidate of candidates) {
    random -= candidate.weight;
    if (random <= 0) return candidate;
  }

  return candidates[0];
}

export async function incrementSentCount(accountId: string): Promise<void> {
  await db.emailAccount.update({
    where: { id: accountId },
    data: {
      sentToday: { increment: 1 },
      lastConnectedAt: new Date(),
    },
  });
}
