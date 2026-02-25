export class DiscordApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: number,
    message: string,
    public readonly errors?: unknown,
  ) {
    super(message);
    this.name = "DiscordApiError";
  }

  static async fromResponse(response: Response): Promise<DiscordApiError> {
    let body: { code?: number; message?: string; errors?: unknown };
    try {
      body = (await response.json()) as { code?: number; message?: string; errors?: unknown };
    } catch {
      body = { message: response.statusText };
    }
    return new DiscordApiError(
      response.status,
      body.code ?? 0,
      body.message ?? response.statusText,
      body.errors,
    );
  }

  toUserMessage(): string {
    return `Discord API error ${this.status} (code ${this.code}): ${this.message}`;
  }
}

export class RateLimitError extends Error {
  constructor(
    public readonly retryAfterMs: number,
    public readonly global: boolean,
  ) {
    super(
      `Rate limited${global ? " (global)" : ""}, retry after ${retryAfterMs}ms`,
    );
    this.name = "RateLimitError";
  }
}
