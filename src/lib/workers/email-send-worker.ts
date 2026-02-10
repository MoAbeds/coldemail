import type { Job } from "bullmq";
import { db } from "@/lib/db";
import {
  createWorker,
  emailSendQueue,
  type EmailSendJob,
} from "@/lib/queue";
import { createProvider } from "@/lib/providers";
import {
  personalizeEmail,
  injectOpenTracker,
  rewriteLinksForTracking,
  addUnsubscribeLink,
  buildUnsubscribeHeaders,
} from "@/lib/personalization";
import { parseSchedule, calculateNextSendTime, delayFromNow } from "@/lib/scheduling";
import { recordBounce, recordConnectionError } from "@/lib/email-health";
import crypto from "crypto";

/**
 * Process a single email-send job.
 *
 * Steps:
 * 1. Load prospect + campaign + sequence step + email account
 * 2. Verify daily limit not exceeded
 * 3. Personalize subject + body
 * 4. Inject tracking (open pixel, click redirect, unsubscribe)
 * 5. Send via provider
 * 6. Record EmailEvent
 * 7. Schedule next sequence step
 * 8. Handle errors (bounce / retry)
 */
async function processEmailSend(job: Job<EmailSendJob>): Promise<void> {
  const { prospectId, campaignId, sequenceStepId, emailAccountId } = job.data;

  // ── 1. Load data ──────────────────────────────────────────────

  const [prospect, campaign, step, account] = await Promise.all([
    db.prospect.findUnique({ where: { id: prospectId } }),
    db.campaign.findUnique({ where: { id: campaignId } }),
    db.emailSequence.findUnique({ where: { id: sequenceStepId } }),
    db.emailAccount.findUnique({ where: { id: emailAccountId } }),
  ]);

  if (!prospect || !campaign || !step || !account) {
    console.error(
      `[email-send] Missing data for job ${job.id}: ` +
        `prospect=${!!prospect} campaign=${!!campaign} step=${!!step} account=${!!account}`
    );
    return; // Don't retry — data is permanently missing
  }

  // Skip if prospect is no longer active
  if (
    prospect.status !== "PENDING" &&
    prospect.status !== "SENDING"
  ) {
    console.log(
      `[email-send] Prospect ${prospectId} status is ${prospect.status}, skipping`
    );
    return;
  }

  // Skip if campaign is not active
  if (campaign.status !== "ACTIVE") {
    console.log(
      `[email-send] Campaign ${campaignId} is ${campaign.status}, skipping`
    );
    return;
  }

  // ── 2. Check daily limit ──────────────────────────────────────

  if (account.sentToday >= account.dailyLimit) {
    console.log(
      `[email-send] Account ${emailAccountId} daily limit reached (${account.sentToday}/${account.dailyLimit}), rescheduling`
    );

    // Reschedule for tomorrow morning within the sending window
    const schedule = parseSchedule(campaign.sendingSchedule);
    const tomorrow = calculateNextSendTime(
      new Date(),
      1,
      0,
      schedule
    );

    await emailSendQueue.add(
      `send-${prospectId}-${step.stepNumber}`,
      job.data,
      { delay: delayFromNow(tomorrow) }
    );
    return;
  }

  // ── 3. Personalize ───────────────────────────────────────────

  const customFields =
    prospect.customFields && typeof prospect.customFields === "object"
      ? (prospect.customFields as Record<string, string>)
      : {};

  const { subject, body } = personalizeEmail(
    step.subject || "",
    step.body || "",
    {
      firstName: prospect.firstName,
      lastName: prospect.lastName,
      email: prospect.email,
      company: prospect.company,
      jobTitle: prospect.jobTitle,
      customFields,
    }
  );

  // ── 4. Tracking ──────────────────────────────────────────────

  const eventId = crypto.randomUUID();
  const unsubscribeToken = crypto
    .createHash("sha256")
    .update(`${prospectId}-${campaignId}-unsub`)
    .digest("hex")
    .slice(0, 32);

  let htmlBody = `<div style="font-family:sans-serif;font-size:14px;line-height:1.6">${body.replace(/\n/g, "<br>")}</div>`;

  // Add tracking if enabled
  if (campaign.trackOpens) {
    htmlBody = injectOpenTracker(htmlBody, eventId);
  }
  if (campaign.trackClicks) {
    htmlBody = rewriteLinksForTracking(htmlBody, eventId);
  }

  htmlBody = addUnsubscribeLink(htmlBody, unsubscribeToken);

  const unsubHeaders = buildUnsubscribeHeaders(unsubscribeToken);

  // ── 5. Send ──────────────────────────────────────────────────

  const provider = createProvider(account);

  const result = await provider.send({
    to: prospect.email,
    from: account.email,
    fromName: account.displayName,
    subject,
    htmlBody,
    textBody: body,
    headers: unsubHeaders,
  });

  // ── 6. Record event + update counters ────────────────────────

  if (result.success) {
    // Create SENT event
    await db.emailEvent.create({
      data: {
        id: eventId,
        prospectId,
        campaignId,
        sequenceId: sequenceStepId,
        emailAccountId,
        type: "SENT",
        messageId: result.messageId || null,
      },
    });

    // Increment sent counter
    await db.emailAccount.update({
      where: { id: emailAccountId },
      data: {
        sentToday: { increment: 1 },
        lastConnectedAt: new Date(),
        lastError: null,
        lastErrorAt: null,
      },
    });

    // Update prospect
    await db.prospect.update({
      where: { id: prospectId },
      data: {
        status: "SENDING",
        currentStep: step.stepNumber,
        lastEmailSentAt: new Date(),
      },
    });

    console.log(
      `[email-send] Sent email to ${prospect.email} (step ${step.stepNumber}) msgId=${result.messageId}`
    );

    // ── 7. Schedule next step ──────────────────────────────────
    await scheduleNextStep(
      prospect.id,
      campaign,
      step.stepNumber,
      emailAccountId
    );
  } else {
    // ── 8. Handle failure ──────────────────────────────────────

    if (result.isHardBounce) {
      // Hard bounce — mark prospect as bounced, don't retry
      await db.prospect.update({
        where: { id: prospectId },
        data: { status: "BOUNCED" },
      });

      await db.emailEvent.create({
        data: {
          prospectId,
          campaignId,
          sequenceId: sequenceStepId,
          emailAccountId,
          type: "BOUNCED",
          eventData: {
            error: result.error,
            errorCode: result.errorCode,
            hardBounce: true,
          },
        },
      });

      await recordBounce(emailAccountId);

      console.error(
        `[email-send] Hard bounce for ${prospect.email}: ${result.error}`
      );

      // Don't throw — we don't want a retry
      return;
    }

    // Soft failure — record error and let BullMQ retry
    await recordConnectionError(emailAccountId, result.error || "Send failed");

    console.error(
      `[email-send] Send failed for ${prospect.email} (attempt ${job.attemptsMade}): ${result.error}`
    );

    throw new Error(result.error || "Email send failed"); // triggers retry
  }
}

/**
 * Schedule the next sequence step for a prospect.
 */
async function scheduleNextStep(
  prospectId: string,
  campaign: { id: string; sendingSchedule: unknown },
  currentStepNumber: number,
  emailAccountId: string
): Promise<void> {
  // Find the next step in the sequence
  const nextStep = await db.emailSequence.findFirst({
    where: {
      campaignId: campaign.id,
      stepNumber: { gt: currentStepNumber },
    },
    orderBy: { stepNumber: "asc" },
  });

  if (!nextStep) {
    // Sequence complete
    await db.prospect.update({
      where: { id: prospectId },
      data: { status: "COMPLETED" },
    });
    return;
  }

  // Handle different step types
  if (nextStep.type === "WAIT") {
    // WAIT step: just schedule whatever comes after with the wait's delay
    const afterWait = await db.emailSequence.findFirst({
      where: {
        campaignId: campaign.id,
        stepNumber: { gt: nextStep.stepNumber },
      },
      orderBy: { stepNumber: "asc" },
    });

    if (!afterWait) {
      await db.prospect.update({
        where: { id: prospectId },
        data: { status: "COMPLETED" },
      });
      return;
    }

    const schedule = parseSchedule(campaign.sendingSchedule);
    const sendAt = calculateNextSendTime(
      new Date(),
      nextStep.delayDays + (afterWait.delayDays || 0),
      nextStep.delayHours + (afterWait.delayHours || 0),
      schedule
    );

    await emailSendQueue.add(
      `send-${prospectId}-${afterWait.stepNumber}`,
      {
        prospectId,
        campaignId: campaign.id,
        sequenceStepId: afterWait.id,
        emailAccountId,
      },
      { delay: delayFromNow(sendAt) }
    );

    await db.prospect.update({
      where: { id: prospectId },
      data: { nextScheduledAt: sendAt },
    });
    return;
  }

  if (nextStep.type === "TASK") {
    // Create a manual task, then schedule whatever comes next
    await db.task.create({
      data: {
        prospectId,
        campaignId: campaign.id,
        type: "MANUAL",
        title: `Follow-up task for step ${nextStep.stepNumber}`,
        description: nextStep.body || null,
      },
    });

    // Continue to next step after this
    await scheduleNextStep(
      prospectId,
      campaign,
      nextStep.stepNumber,
      emailAccountId
    );
    return;
  }

  // EMAIL or CONDITION step — schedule with delay
  const schedule = parseSchedule(campaign.sendingSchedule);
  const sendAt = calculateNextSendTime(
    new Date(),
    nextStep.delayDays,
    nextStep.delayHours,
    schedule
  );

  await emailSendQueue.add(
    `send-${prospectId}-${nextStep.stepNumber}`,
    {
      prospectId,
      campaignId: campaign.id,
      sequenceStepId: nextStep.id,
      emailAccountId,
    },
    { delay: delayFromNow(sendAt) }
  );

  await db.prospect.update({
    where: { id: prospectId },
    data: { nextScheduledAt: sendAt },
  });
}

// ── Start worker ───────────────────────────────────────────────

export function startEmailSendWorker() {
  return createWorker<EmailSendJob>(
    "email-send",
    processEmailSend,
    3 // concurrency
  );
}
