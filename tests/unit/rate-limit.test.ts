import { checkRateLimit, resetRateLimit } from "@/lib/security/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimit("test-key");
  });

  it("allows requests under the limit", () => {
    const result = checkRateLimit("test-key", { maxRequests: 5, windowMs: 60000 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.retryAfterMs).toBe(0);
  });

  it("tracks remaining count correctly", () => {
    const opts = { maxRequests: 3, windowMs: 60000 };
    checkRateLimit("test-key", opts);
    checkRateLimit("test-key", opts);
    const result = checkRateLimit("test-key", opts);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("rejects when limit is exceeded", () => {
    const opts = { maxRequests: 2, windowMs: 60000 };
    checkRateLimit("test-key", opts);
    checkRateLimit("test-key", opts);
    const result = checkRateLimit("test-key", opts);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("uses separate keys independently", () => {
    const opts = { maxRequests: 1, windowMs: 60000 };
    checkRateLimit("key-a", opts);
    const result = checkRateLimit("key-b", opts);
    expect(result.success).toBe(true);

    resetRateLimit("key-a");
    resetRateLimit("key-b");
  });

  it("resets allow new requests", () => {
    const opts = { maxRequests: 1, windowMs: 60000 };
    checkRateLimit("test-key", opts);
    expect(checkRateLimit("test-key", opts).success).toBe(false);

    resetRateLimit("test-key");
    expect(checkRateLimit("test-key", opts).success).toBe(true);
  });

  it("allows requests after window expires", () => {
    jest.useFakeTimers();
    const opts = { maxRequests: 1, windowMs: 1000 };
    checkRateLimit("test-key", opts);
    expect(checkRateLimit("test-key", opts).success).toBe(false);

    jest.advanceTimersByTime(1001);
    expect(checkRateLimit("test-key", opts).success).toBe(true);

    jest.useRealTimers();
  });

  it("returns retryAfterMs close to window duration", () => {
    const opts = { maxRequests: 1, windowMs: 5000 };
    checkRateLimit("test-key", opts);
    const result = checkRateLimit("test-key", opts);
    expect(result.retryAfterMs).toBeGreaterThan(4000);
    expect(result.retryAfterMs).toBeLessThanOrEqual(5000);
  });
});
