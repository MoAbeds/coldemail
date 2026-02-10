import { ImapFlow } from "imapflow";
import type { Job } from "bullmq";
import { db } from "@/lib/db";
import { createWorker, type ReplyCheckJob } from "@/lib/queue";
import { decrypt } from "@/lib/crypto";

/**
 * Reply detection via IMAP polling.
 *
 * For each email account:
 *  1. Connect to IMAP inbox
 *  2. Search for unseen messages
 *  3. Match In-Reply-To / References headers against sent Message-IDs
 *  4. Record REPLIED event and update prospect status
 */
async function processReplyCheck(job: Job<ReplyCheckJob>): Promise<void> {
  const { emailAccountId } = job.data;

  const account = await db.emailAccount.findUnique({
    where: { id: emailAccountId },
  });

  if (!account || !account.isActive) return;

  // Determine IMAP credentials
  let imapConfig: {
    host: string;
    port: number;
    auth: { user: string; pass?: string; accessToken?: string };
    secure: boolean;
  };

  if (account.provider === "GMAIL" && account.accessToken) {
    imapConfig = {
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: {
        user: account.email,
        accessToken: decrypt(account.accessToken),
      },
    };
  } else if (account.provider === "OUTLOOK" && account.accessToken) {
    imapConfig = {
      host: "outlook.office365.com",
      port: 993,
      secure: true,
      auth: {
        user: account.email,
        accessToken: decrypt(account.accessToken),
      },
    };
  } else if (
    account.imapHost &&
    account.imapPort &&
    account.smtpUser &&
    account.smtpPassword
  ) {
    imapConfig = {
      host: account.imapHost,
      port: account.imapPort,
      secure: account.imapPort === 993,
      auth: {
        user: account.smtpUser,
        pass: decrypt(account.smtpPassword),
      },
    };
  } else {
    console.log(
      `[reply-check] No IMAP config for account ${emailAccountId}, skipping`
    );
    return;
  }

  const client = new ImapFlow({
    host: imapConfig.host,
    port: imapConfig.port,
    secure: imapConfig.secure,
    auth: imapConfig.auth,
    logger: false,
  });

  try {
    await client.connect();

    const lock = await client.getMailboxLock("INBOX");

    try {
      // Search for unseen messages from the last 7 days
      const since = new Date();
      since.setDate(since.getDate() - 7);

      const messages = client.fetch(
        { seen: false, since },
        {
          envelope: true,
          headers: ["in-reply-to", "references", "message-id"],
          uid: true,
        }
      );

      // Load all sent message IDs for this account for quick lookup
      const sentEvents = await db.emailEvent.findMany({
        where: {
          emailAccountId,
          type: "SENT",
          messageId: { not: null },
        },
        select: {
          messageId: true,
          prospectId: true,
          campaignId: true,
          sequenceId: true,
        },
      });

      const messageIdMap = new Map(
        sentEvents
          .filter((e) => e.messageId)
          .map((e) => [e.messageId!, e])
      );

      for await (const msg of messages) {
        // Parse headers from Buffer
        const headersStr = msg.headers?.toString("utf-8") || "";
        const inReplyToMatch = headersStr.match(/^in-reply-to:\s*(.+)$/im);
        const referencesMatch = headersStr.match(/^references:\s*(.+)$/im);
        const inReplyTo = inReplyToMatch?.[1]?.trim();
        const references = referencesMatch?.[1]?.trim();
        const fromAddress = msg.envelope?.from?.[0]?.address;

        if (!fromAddress) continue;

        // Check if In-Reply-To matches any of our sent messages
        let matchedEvent = inReplyTo ? messageIdMap.get(inReplyTo) : undefined;

        // Also check References header (chain of Message-IDs)
        if (!matchedEvent && references) {
          const refIds = references.split(/\s+/);
          for (const refId of refIds) {
            matchedEvent = messageIdMap.get(refId.trim());
            if (matchedEvent) break;
          }
        }

        // Also try matching by sender email against prospects
        if (!matchedEvent) {
          const prospect = await db.prospect.findFirst({
            where: {
              email: fromAddress,
              status: { in: ["PENDING", "SENDING"] },
              campaign: {
                emailAccountId,
                status: "ACTIVE",
              },
            },
            include: {
              campaign: {
                select: {
                  id: true,
                  sequences: {
                    orderBy: { stepNumber: "asc" },
                    take: 1,
                    select: { id: true },
                  },
                },
              },
            },
          });

          if (prospect && prospect.campaign.sequences[0]) {
            matchedEvent = {
              messageId: null,
              prospectId: prospect.id,
              campaignId: prospect.campaign.id,
              sequenceId: prospect.campaign.sequences[0].id,
            };
          }
        }

        if (matchedEvent) {
          // Check if we already recorded this reply
          const existingReply = await db.emailEvent.findFirst({
            where: {
              prospectId: matchedEvent.prospectId,
              campaignId: matchedEvent.campaignId,
              type: "REPLIED",
            },
          });

          if (!existingReply) {
            // Record reply event
            await db.emailEvent.create({
              data: {
                prospectId: matchedEvent.prospectId,
                campaignId: matchedEvent.campaignId,
                sequenceId: matchedEvent.sequenceId,
                emailAccountId,
                type: "REPLIED",
                eventData: {
                  from: fromAddress,
                  subject: msg.envelope?.subject || "",
                  inReplyTo: inReplyTo || null,
                },
              },
            });

            // Pause prospect from further emails
            await db.prospect.update({
              where: { id: matchedEvent.prospectId },
              data: {
                status: "COMPLETED",
                leadTemperature: "HOT",
                leadStatus: "CONTACTED",
              },
            });

            // Create lead
            const campaign = await db.campaign.findUnique({
              where: { id: matchedEvent.campaignId },
              select: { createdById: true },
            });

            await db.lead.create({
              data: {
                prospectId: matchedEvent.prospectId,
                campaignId: matchedEvent.campaignId,
                assignedToId: campaign?.createdById,
                status: "CONTACTED",
                temperature: "HOT",
                lastActivityAt: new Date(),
              },
            });

            console.log(
              `[reply-check] Reply detected from ${fromAddress} for prospect ${matchedEvent.prospectId}`
            );
          }

          // Mark as seen in IMAP
          if (msg.uid) {
            await client.messageFlagsAdd({ uid: msg.uid }, ["\\Seen"], {
              uid: true,
            });
          }
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    console.error(
      `[reply-check] Error checking replies for account ${emailAccountId}:`,
      (err as Error).message
    );
    throw err; // allow retry
  }
}

export function startReplyCheckWorker() {
  return createWorker<ReplyCheckJob>(
    "reply-check",
    processReplyCheck,
    2 // lower concurrency for IMAP
  );
}
