import type { Job } from "bullmq";
import { db } from "@/lib/db";
import { createWorker, type AnalyticsJob } from "@/lib/queue";
import { recordBounce, recordSpamComplaint } from "@/lib/email-health";

/**
 * Process analytics events for lead scoring and health updates.
 */
async function processAnalyticsEvent(job: Job<AnalyticsJob>): Promise<void> {
  const { type, prospectId, emailAccountId } = job.data;

  switch (type) {
    case "open": {
      // Update lead temperature on opens
      await db.prospect.update({
        where: { id: prospectId },
        data: { leadTemperature: "WARM" },
      });
      break;
    }

    case "click": {
      // Clicks indicate high interest
      await db.prospect.update({
        where: { id: prospectId },
        data: {
          leadTemperature: "HOT",
          leadStatus: "QUALIFIED",
        },
      });
      break;
    }

    case "bounce": {
      await recordBounce(emailAccountId);
      break;
    }

    case "reply": {
      // Already handled in reply-check-worker, but update temperature
      await db.prospect.update({
        where: { id: prospectId },
        data: {
          leadTemperature: "HOT",
          leadStatus: "CONTACTED",
        },
      });
      break;
    }

    case "unsubscribe": {
      await recordSpamComplaint(emailAccountId);
      break;
    }
  }
}

export function startAnalyticsWorker() {
  return createWorker<AnalyticsJob>(
    "analytics",
    processAnalyticsEvent,
    10 // high concurrency, lightweight jobs
  );
}
