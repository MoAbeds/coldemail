const rateLimitMap = new Map<
  string,
  { count: number; lastReset: number }
>();

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

export function rateLimit(
  key: string,
  options: RateLimitOptions = { maxRequests: 5, windowMs: 60 * 1000 }
): { success: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now - record.lastReset > options.windowMs) {
    rateLimitMap.set(key, { count: 1, lastReset: now });
    return { success: true, remaining: options.maxRequests - 1 };
  }

  if (record.count >= options.maxRequests) {
    return { success: false, remaining: 0 };
  }

  record.count++;
  return { success: true, remaining: options.maxRequests - record.count };
}

export function getRateLimitKey(req: Request, prefix: string): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `${prefix}:${ip}`;
}
