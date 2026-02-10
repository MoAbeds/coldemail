/**
 * Lightweight error reporting wrapper.
 * Sends errors to Sentry if DSN is configured, otherwise logs to console.
 *
 * This avoids a heavy @sentry/nextjs dependency while still providing
 * structured error capture for production.
 */

const SENTRY_DSN = process.env.SENTRY_DSN || "";

interface ErrorContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: { id: string; email?: string };
  level?: "error" | "warning" | "info";
}

/**
 * Capture an error and report it.
 */
export async function captureError(error: unknown, context?: ErrorContext): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error));
  const level = context?.level || "error";

  // Always log to console
  if (level === "error") {
    console.error(`[${level}]`, err.message, context?.tags || "");
  } else {
    console.warn(`[${level}]`, err.message, context?.tags || "");
  }

  // Send to Sentry if configured
  if (!SENTRY_DSN) return;

  try {
    const payload = {
      exception: {
        values: [
          {
            type: err.name,
            value: err.message,
            stacktrace: err.stack
              ? {
                  frames: err.stack
                    .split("\n")
                    .slice(1, 10)
                    .map((line) => ({ filename: line.trim() })),
                }
              : undefined,
          },
        ],
      },
      level,
      tags: context?.tags || {},
      extra: context?.extra || {},
      user: context?.user,
      platform: "node",
      environment: process.env.NODE_ENV || "development",
      server_name: process.env.VERCEL_URL || "localhost",
      timestamp: Date.now() / 1000,
    };

    // Parse DSN to get Sentry ingest URL
    const dsnMatch = SENTRY_DSN.match(
      /^https:\/\/([^@]+)@([^/]+)\/(.+)$/
    );
    if (!dsnMatch) return;

    const [, publicKey, host, projectId] = dsnMatch;
    const url = `https://${host}/api/${projectId}/store/`;

    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=coldclaude/1.0, sentry_key=${publicKey}`,
      },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Silent fail — don't let error reporting cause errors
    });
  } catch {
    // Silent fail
  }
}

/**
 * Capture a message (non-error).
 */
export async function captureMessage(
  message: string,
  context?: Omit<ErrorContext, "level"> & { level?: "info" | "warning" }
): Promise<void> {
  return captureError(new Error(message), { ...context, level: context?.level || "info" });
}

/**
 * Wrap an async function with error reporting.
 */
export function withErrorCapture<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: ErrorContext
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      await captureError(error, context);
      throw error;
    }
  }) as T;
}
