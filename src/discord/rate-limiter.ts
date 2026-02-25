/**
 * Two-layer rate limiter for Discord API:
 * 1. Global: 50 requests/second sliding window
 * 2. Per-route: bucket tracking from response headers
 */

interface Bucket {
  remaining: number;
  resetAt: number; // epoch ms
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  private globalResetAt = 0;
  private globalRequests: number[] = []; // timestamps of recent requests

  private readonly globalLimit: number;

  constructor(globalLimit = 50) {
    this.globalLimit = globalLimit;
  }

  /**
   * Normalize a Discord API path to a route key for bucket grouping.
   * Replaces snowflake IDs but keeps major parameters (guild/channel/webhook ID).
   */
  static routeKey(method: string, path: string): string {
    // Replace snowflake IDs in the path, but keep major params
    // Major params: /guilds/{id}, /channels/{id}, /webhooks/{id}
    const normalized = path.replace(
      /\/([a-z-]+)\/(\d{16,20})/g,
      (match, resource: string, id: string) => {
        const majorResources = ["guilds", "channels", "webhooks"];
        if (majorResources.includes(resource)) {
          return `/${resource}/${id}`;
        }
        return `/${resource}/:id`;
      },
    );
    return `${method}:${normalized}`;
  }

  /** Wait until we can make a request to this route. */
  async acquire(routeKey: string): Promise<void> {
    // Check global rate limit
    const now = Date.now();
    if (now < this.globalResetAt) {
      await sleep(this.globalResetAt - now);
    }

    // Prune old timestamps (older than 1 second)
    this.globalRequests = this.globalRequests.filter((t) => now - t < 1000);
    if (this.globalRequests.length >= this.globalLimit) {
      const oldestInWindow = this.globalRequests[0]!;
      const waitMs = 1000 - (now - oldestInWindow);
      if (waitMs > 0) {
        await sleep(waitMs);
      }
    }

    // Check per-route bucket
    const bucket = this.buckets.get(routeKey);
    if (bucket && bucket.remaining <= 0) {
      const waitMs = bucket.resetAt - Date.now();
      if (waitMs > 0) {
        await sleep(waitMs);
      }
    }

    // Record this request
    this.globalRequests.push(Date.now());
  }

  /** Update rate limit state from Discord response headers. */
  updateFromHeaders(routeKey: string, headers: Headers): void {
    const remaining = headers.get("x-ratelimit-remaining");
    const resetAfter = headers.get("x-ratelimit-reset-after");

    if (remaining !== null && resetAfter !== null) {
      this.buckets.set(routeKey, {
        remaining: parseInt(remaining, 10),
        resetAt: Date.now() + parseFloat(resetAfter) * 1000,
      });
    }
  }

  /** Handle a 429 response. Returns the retry delay in ms. */
  handleRateLimit(headers: Headers, body: { retry_after?: number; global?: boolean }): number {
    const retryAfterMs = (body.retry_after ?? 1) * 1000;

    if (body.global) {
      this.globalResetAt = Date.now() + retryAfterMs;
    }

    return retryAfterMs;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
