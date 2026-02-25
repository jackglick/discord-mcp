import type { RequestOptions } from "./types.ts";
import { DiscordApiError } from "./errors.ts";
import { RateLimiter } from "./rate-limiter.ts";

const BASE_URL = "https://discord.com/api/v10";
const USER_AGENT = "DiscordBot (https://github.com/jglick/discord-mcp, 1.0.0)";
const MAX_RETRIES = 3;

export class DiscordRestClient {
  private rateLimiter = new RateLimiter();

  constructor(private readonly token: string) {}

  async request<T>(options: RequestOptions): Promise<T> {
    const routeKey = RateLimiter.routeKey(options.method, options.path);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      await this.rateLimiter.acquire(routeKey);

      const url = this.buildUrl(options.path, options.query);
      const headers: Record<string, string> = {
        Authorization: `Bot ${this.token}`,
        "User-Agent": USER_AGENT,
      };

      if (options.body !== undefined) {
        headers["Content-Type"] = "application/json";
      }

      if (options.reason) {
        headers["X-Audit-Log-Reason"] = encodeURIComponent(options.reason);
      }

      const response = await fetch(url, {
        method: options.method,
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });

      this.rateLimiter.updateFromHeaders(routeKey, response.headers);

      if (response.status === 429) {
        const body = await response.json() as { retry_after?: number; global?: boolean };
        const retryMs = this.rateLimiter.handleRateLimit(response.headers, body);

        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, retryMs));
          continue;
        }
        throw new DiscordApiError(429, 0, `Rate limited after ${MAX_RETRIES} retries`);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      if (!response.ok) {
        throw await DiscordApiError.fromResponse(response);
      }

      return response.json() as Promise<T>;
    }

    throw new DiscordApiError(429, 0, "Rate limited: max retries exceeded");
  }

  private buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
    const url = new URL(`${BASE_URL}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }
}
