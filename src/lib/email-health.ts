import { db } from "@/lib/db";

export function calculateHealthScore(account: {
  bounceCount: number;
  spamCount: number;
  errorCount: number;
}): number {
  const score =
    100 -
    account.bounceCount * 2 -
    account.spamCount * 5 -
    account.errorCount * 10;

  return Math.max(0, Math.min(100, score));
}

export async function updateAccountHealthScore(
  accountId: string
): Promise<number> {
  const account = await db.emailAccount.findUnique({
    where: { id: accountId },
    select: { bounceCount: true, spamCount: true, errorCount: true },
  });

  if (!account) return 0;

  const score = calculateHealthScore(account);

  await db.emailAccount.update({
    where: { id: accountId },
    data: { healthScore: score },
  });

  return score;
}

export async function recordBounce(accountId: string): Promise<void> {
  await db.emailAccount.update({
    where: { id: accountId },
    data: { bounceCount: { increment: 1 } },
  });
  await updateAccountHealthScore(accountId);
}

export async function recordSpamComplaint(accountId: string): Promise<void> {
  await db.emailAccount.update({
    where: { id: accountId },
    data: { spamCount: { increment: 1 } },
  });
  await updateAccountHealthScore(accountId);
}

export async function recordConnectionError(
  accountId: string,
  error: string
): Promise<void> {
  await db.emailAccount.update({
    where: { id: accountId },
    data: {
      errorCount: { increment: 1 },
      lastErrorAt: new Date(),
      lastError: error,
    },
  });
  await updateAccountHealthScore(accountId);
}

export async function resetDailySentCounts(): Promise<void> {
  await db.emailAccount.updateMany({
    data: { sentToday: 0 },
  });
}
