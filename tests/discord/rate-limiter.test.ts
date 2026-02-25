import { describe, test, expect } from "bun:test";
import { RateLimiter } from "../../src/discord/rate-limiter.ts";

describe("RateLimiter", () => {
  describe("routeKey", () => {
    test("keeps major resource IDs and replaces non-major IDs with :id", () => {
      const key = RateLimiter.routeKey(
        "GET",
        "/guilds/123456789012345678/members/987654321098765432",
      );
      expect(key).toBe("GET:/guilds/123456789012345678/members/:id");
    });

    test("preserves channel ID and replaces permission overwrite ID", () => {
      const key = RateLimiter.routeKey(
        "DELETE",
        "/channels/123456789012345678/permissions/987654321098765432",
      );
      expect(key).toBe("DELETE:/channels/123456789012345678/permissions/:id");
    });

    test("preserves webhook ID and replaces other IDs", () => {
      const key = RateLimiter.routeKey(
        "POST",
        "/webhooks/123456789012345678/messages/987654321098765432",
      );
      expect(key).toBe("POST:/webhooks/123456789012345678/messages/:id");
    });
  });

  describe("updateFromHeaders", () => {
    test("stores bucket info from rate limit headers", async () => {
      const limiter = new RateLimiter(5);
      const routeKey = "GET:/channels/123456789012345678/messages/:id";

      const headers = new Headers({
        "x-ratelimit-remaining": "4",
        "x-ratelimit-reset-after": "0.500",
      });

      limiter.updateFromHeaders(routeKey, headers);

      // Verify it was stored by acquiring -- should resolve immediately since remaining > 0
      const start = Date.now();
      await limiter.acquire(routeKey);
      expect(Date.now() - start).toBeLessThan(50);
    });

    test("ignores missing rate limit headers", () => {
      const limiter = new RateLimiter(5);
      const routeKey = "GET:/channels/123456789012345678/messages/:id";

      const headers = new Headers(); // no rate limit headers

      // Should not throw
      limiter.updateFromHeaders(routeKey, headers);
    });
  });

  describe("handleRateLimit", () => {
    test("returns retry_after converted to milliseconds", () => {
      const limiter = new RateLimiter(5);
      const headers = new Headers();

      const ms = limiter.handleRateLimit(headers, { retry_after: 1.5 });
      expect(ms).toBe(1500);
    });

    test("sets globalResetAt when global is true", () => {
      const limiter = new RateLimiter(5);
      const headers = new Headers();
      const before = Date.now();

      limiter.handleRateLimit(headers, { retry_after: 2, global: true });

      // After a global rate limit, acquire should need to wait.
      // We verify indirectly: globalResetAt should be ~2s in the future.
      // Access the private field via bracket notation for testing.
      const globalResetAt = (limiter as any).globalResetAt;
      expect(globalResetAt).toBeGreaterThanOrEqual(before + 2000);
      expect(globalResetAt).toBeLessThanOrEqual(Date.now() + 2000);
    });

    test("defaults retry_after to 1 second when not provided", () => {
      const limiter = new RateLimiter(5);
      const headers = new Headers();

      const ms = limiter.handleRateLimit(headers, {});
      expect(ms).toBe(1000);
    });
  });

  describe("acquire", () => {
    test("resolves immediately when no limits are hit", async () => {
      const limiter = new RateLimiter(5);
      const routeKey = "GET:/guilds/123456789012345678/members/:id";

      const start = Date.now();
      await limiter.acquire(routeKey);
      expect(Date.now() - start).toBeLessThan(50);
    });

    test("allows multiple requests within global limit without blocking", async () => {
      const limiter = new RateLimiter(5);
      const routeKey = "GET:/guilds/123456789012345678/members/:id";

      const start = Date.now();
      for (let i = 0; i < 5; i++) {
        await limiter.acquire(routeKey);
      }
      expect(Date.now() - start).toBeLessThan(100);
    });
  });
});
