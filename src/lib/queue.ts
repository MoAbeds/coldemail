import { Queue, Worker, type Job, type ConnectionOptions } from "bullmq";

const redisUrl = new URL(process.env.REDIS_URL || "redis://localhost:6379");
const connection: ConnectionOptions = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6379),
  username: redisUrl.username || undefined,
  password: redisUrl.password || undefined,
};

// ── Queue Definitions ──────────────────────────────────────────

export const emailSendQueue = new Queue("email-send", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 60_000 }, // 1m, 2m, 4m
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export const warmupQueue = new Queue("warmup", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "fixed", delay: 300_000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
});

export const replyCheckQueue = new Queue("reply-check", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "fixed", delay: 120_000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
});

export const analyticsQueue = new Queue("analytics", {
  connection,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: { count: 2000 },
    removeOnFail: { count: 2000 },
  },
});

// ── Job Types ──────────────────────────────────────────────────

export interface EmailSendJob {
  prospectId: string;
  campaignId: string;
  sequenceStepId: string;
  emailAccountId: string;
}

export interface ReplyCheckJob {
  emailAccountId: string;
  userId: string;
}

export interface AnalyticsJob {
  type: "open" | "click" | "bounce" | "reply" | "unsubscribe";
  eventId: string;
  prospectId: string;
  campaignId: string;
  sequenceStepId: string;
  emailAccountId: string;
  metadata?: Record<string, string>;
}

export interface WarmupJob {
  emailAccountId: string;
  userId: string;
  day: number; // warmup day counter
}

// ── Helper: Create a worker ────────────────────────────────────

export function createWorker<T>(
  queueName: string,
  processor: (job: Job<T>) => Promise<void>,
  concurrency = 5
): Worker<T> {
  const worker = new Worker<T>(queueName, processor, {
    connection,
    concurrency,
    limiter: {
      max: concurrency,
      duration: 1000,
    },
  });

  worker.on("failed", (job, err) => {
    console.error(
      `[${queueName}] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`,
      err.message
    );
  });

  worker.on("completed", (job) => {
    console.log(`[${queueName}] Job ${job.id} completed`);
  });

  return worker;
}

// ── Queue Stats ────────────────────────────────────────────────

export async function getQueueStats() {
  const queues = [
    { name: "email-send", queue: emailSendQueue },
    { name: "warmup", queue: warmupQueue },
    { name: "reply-check", queue: replyCheckQueue },
    { name: "analytics", queue: analyticsQueue },
  ];

  const stats = await Promise.all(
    queues.map(async ({ name, queue }) => {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);
      return { name, waiting, active, completed, failed, delayed };
    })
  );

  return stats;
}
