import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: Array<{ type: string; text: string; emoji?: boolean }>;
  fields?: Array<{ type: string; text: string }>;
}

/**
 * Send a notification to the team's connected Slack channel.
 */
export async function sendSlackNotification(
  teamId: string,
  notificationType: string,
  blocks: SlackBlock[],
  text: string // Fallback text
) {
  const integration = await db.integration.findUnique({
    where: { teamId_provider: { teamId, provider: "SLACK" } },
  });

  if (!integration || !integration.isActive) return;

  const config = (integration.config as Record<string, unknown>) || {};
  const notifications = (config.notifications as Record<string, boolean>) || {};

  // Check if this notification type is enabled
  if (notifications[notificationType] === false) return;

  const credentials = integration.credentials as Record<string, string> | null;
  if (!credentials?.webhookUrl) return;

  const webhookUrl = decrypt(credentials.webhookUrl);

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, blocks }),
    });
  } catch (err) {
    console.error("[slack] Failed to send notification:", err);
  }
}

/**
 * Pre-built notification helpers.
 */
export const slackNotifications = {
  async newReply(
    teamId: string,
    prospectName: string,
    prospectEmail: string,
    campaignName: string
  ) {
    return sendSlackNotification(
      teamId,
      "newReply",
      [
        {
          type: "header",
          text: { type: "plain_text", text: "New Reply Received", emoji: true },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*From:*\n${prospectName} <${prospectEmail}>` },
            { type: "mrkdwn", text: `*Campaign:*\n${campaignName}` },
          ],
        },
      ],
      `New reply from ${prospectName} (${prospectEmail}) in campaign "${campaignName}"`
    );
  },

  async campaignMilestone(
    teamId: string,
    campaignName: string,
    milestone: string
  ) {
    return sendSlackNotification(
      teamId,
      "campaignMilestones",
      [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Campaign Milestone*\n_${campaignName}_: ${milestone}`,
          },
        },
      ],
      `Campaign "${campaignName}" milestone: ${milestone}`
    );
  },

  async leadWon(
    teamId: string,
    prospectName: string,
    campaignName: string
  ) {
    return sendSlackNotification(
      teamId,
      "leadWon",
      [
        {
          type: "header",
          text: { type: "plain_text", text: "Lead Won!", emoji: true },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Lead:*\n${prospectName}` },
            { type: "mrkdwn", text: `*Campaign:*\n${campaignName}` },
          ],
        },
      ],
      `Lead won! ${prospectName} from campaign "${campaignName}"`
    );
  },

  async dailyDigest(
    teamId: string,
    stats: { sent: number; opened: number; replied: number; leads: number }
  ) {
    return sendSlackNotification(
      teamId,
      "dailyDigest",
      [
        {
          type: "header",
          text: { type: "plain_text", text: "Daily Outreach Digest", emoji: true },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Sent:*\n${stats.sent}` },
            { type: "mrkdwn", text: `*Opened:*\n${stats.opened}` },
            { type: "mrkdwn", text: `*Replied:*\n${stats.replied}` },
            { type: "mrkdwn", text: `*New Leads:*\n${stats.leads}` },
          ],
        },
      ],
      `Daily digest: ${stats.sent} sent, ${stats.opened} opened, ${stats.replied} replied, ${stats.leads} new leads`
    );
  },
};
