import { startEmailSendWorker } from "./email-send-worker";
import { startReplyCheckWorker } from "./reply-check-worker";
import { startAnalyticsWorker } from "./analytics-worker";

/**
 * Start all background workers.
 *
 * Call this from a separate process (e.g., `tsx src/lib/workers/index.ts`)
 * or from a long-running server entry point.
 */
export function startAllWorkers() {
  console.log("[workers] Starting all workers...");

  const emailWorker = startEmailSendWorker();
  const replyWorker = startReplyCheckWorker();
  const analyticsWorker = startAnalyticsWorker();

  console.log("[workers] All workers started");

  // Graceful shutdown
  async function shutdown() {
    console.log("[workers] Shutting down...");
    await Promise.all([
      emailWorker.close(),
      replyWorker.close(),
      analyticsWorker.close(),
    ]);
    console.log("[workers] All workers stopped");
    process.exit(0);
  }

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  return { emailWorker, replyWorker, analyticsWorker };
}

// Allow running directly: npx tsx src/lib/workers/index.ts
if (require.main === module) {
  startAllWorkers();
}
