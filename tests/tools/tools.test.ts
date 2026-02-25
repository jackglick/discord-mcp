import { describe, test, expect, beforeEach } from "bun:test";
import type { DiscordRestClient } from "../../src/discord/client.ts";
import type { RequestOptions } from "../../src/discord/types.ts";
import { DiscordApiError } from "../../src/discord/errors.ts";
import { registerServerInfoTools } from "../../src/tools/server-info.ts";
import { registerChannelTools } from "../../src/tools/channels.ts";
import { registerRoleTools } from "../../src/tools/roles.ts";
import { registerMemberTools } from "../../src/tools/members.ts";
import { registerCompositeTools } from "../../src/tools/composite.ts";
import {
  GUILD_ID,
  sampleGuild,
  sampleChannels,
  sampleRoles,
  sampleMember,
} from "../fixtures/discord-responses.ts";

// ---------------------------------------------------------------------------
// Test infrastructure: capture tool handlers without a real MCP transport
// ---------------------------------------------------------------------------

type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: { type: string; text: string }[];
  isError?: boolean;
}>;

/**
 * Lightweight stand-in for McpServer that captures tool handlers during
 * registration so we can invoke them directly in tests.
 */
class TestToolRegistry {
  handlers = new Map<string, ToolHandler>();

  /** Matches the McpServer.registerTool(name, config, handler) signature. */
  registerTool(name: string, _config: unknown, handler: ToolHandler) {
    this.handlers.set(name, handler);
  }

  async callTool(
    name: string,
    params: Record<string, unknown> = {},
  ): Promise<{ content: { type: string; text: string }[]; isError?: boolean }> {
    const handler = this.handlers.get(name);
    if (!handler) throw new Error(`Tool "${name}" not registered`);
    return handler(params);
  }
}

// ---------------------------------------------------------------------------
// Mock Discord REST client
// ---------------------------------------------------------------------------

/** Build a mock DiscordRestClient that resolves from a route map. */
function createMockClient(
  responses: Map<string, unknown>,
): DiscordRestClient {
  const client = Object.create(
    null,
  ) as DiscordRestClient;

  (client as any).request = async (options: RequestOptions) => {
    const key = `${options.method}:${options.path}`;
    if (responses.has(key)) return responses.get(key);
    throw new Error(`No mock response for ${key}`);
  };

  return client;
}

/** Convenience: build a Map from [key, value] pairs. */
function mockRoutes(
  ...entries: [string, unknown][]
): Map<string, unknown> {
  return new Map(entries);
}

/** Extract text from the first content item (asserts it exists). */
function textOf(result: { content: { type: string; text: string }[] }): string {
  const first = result.content[0];
  if (!first) throw new Error("No content in result");
  return first.text;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("get_guild", () => {
  test("returns formatted guild information", async () => {
    const routes = mockRoutes([
      `GET:/guilds/${GUILD_ID}`,
      sampleGuild,
    ]);
    const client = createMockClient(routes);
    const registry = new TestToolRegistry();
    registerServerInfoTools(registry as any, client, GUILD_ID);

    const result = await registry.callTool("get_guild", {});

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    const text = textOf(result);
    expect(text).toContain("Test Community Server");
    expect(text).toContain(GUILD_ID);
    expect(text).toContain("Boost Tier: 2");
    expect(text).toContain("Members: ~1250");
  });
});

describe("list_channels", () => {
  test("returns formatted channel list with category grouping", async () => {
    const routes = mockRoutes([
      `GET:/guilds/${GUILD_ID}/channels`,
      sampleChannels,
    ]);
    const client = createMockClient(routes);
    const registry = new TestToolRegistry();
    registerChannelTools(registry as any, client, GUILD_ID);

    const result = await registry.callTool("list_channels", {});

    expect(result.isError).toBeUndefined();
    const text = textOf(result);
    expect(text).toContain("General");
    expect(text).toContain("chat");
    expect(text).toContain("Voice Lounge");
  });
});

describe("list_roles", () => {
  test("returns formatted role list sorted by position", async () => {
    const routes = mockRoutes([
      `GET:/guilds/${GUILD_ID}/roles`,
      sampleRoles,
    ]);
    const client = createMockClient(routes);
    const registry = new TestToolRegistry();
    registerRoleTools(registry as any, client, GUILD_ID);

    const result = await registry.callTool("list_roles", {});

    expect(result.isError).toBeUndefined();
    const text = textOf(result);
    expect(text).toContain("@everyone");
    expect(text).toContain("Moderator");
    expect(text).toContain("Admin");
  });
});

describe("get_member", () => {
  test("returns formatted member details", async () => {
    const userId = sampleMember.user!.id;
    const routes = mockRoutes([
      `GET:/guilds/${GUILD_ID}/members/${userId}`,
      sampleMember,
    ]);
    const client = createMockClient(routes);
    const registry = new TestToolRegistry();
    registerMemberTools(registry as any, client, GUILD_ID);

    const result = await registry.callTool("get_member", { user_id: userId });

    expect(result.isError).toBeUndefined();
    const text = textOf(result);
    expect(text).toContain("Test User");
    expect(text).toContain("testuser");
    expect(text).toContain("Testy");
  });
});

describe("create_role", () => {
  test("sends correct body and reason to Discord API", async () => {
    let capturedOptions: RequestOptions | undefined;

    const newRole = { ...sampleRoles[1]!, id: "5000000000000000099", name: "New Role" };
    const client = Object.create(null) as DiscordRestClient;
    (client as any).request = async (options: RequestOptions) => {
      capturedOptions = options;
      return newRole;
    };

    const registry = new TestToolRegistry();
    registerRoleTools(registry as any, client, GUILD_ID);

    const result = await registry.callTool("create_role", {
      name: "New Role",
      color: 0xff5733,
      hoist: true,
      reason: "Setting up moderation roles",
    });

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("New Role");
    expect(capturedOptions).toBeDefined();
    expect(capturedOptions!.method).toBe("POST");
    expect(capturedOptions!.path).toBe(`/guilds/${GUILD_ID}/roles`);
    expect((capturedOptions!.body as any).name).toBe("New Role");
    expect((capturedOptions!.body as any).color).toBe(0xff5733);
    expect((capturedOptions!.body as any).hoist).toBe(true);
    expect(capturedOptions!.reason).toBe("Setting up moderation roles");
  });
});

describe("kick_member", () => {
  test("sends DELETE to correct path", async () => {
    let capturedOptions: RequestOptions | undefined;
    const userId = "6000000000000000001";

    const client = Object.create(null) as DiscordRestClient;
    (client as any).request = async (options: RequestOptions) => {
      capturedOptions = options;
      return undefined;
    };

    const registry = new TestToolRegistry();
    registerMemberTools(registry as any, client, GUILD_ID);

    const result = await registry.callTool("kick_member", {
      user_id: userId,
      reason: "Rule violation",
    });

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("kicked");
    expect(textOf(result)).toContain(userId);
    expect(capturedOptions!.method).toBe("DELETE");
    expect(capturedOptions!.path).toBe(`/guilds/${GUILD_ID}/members/${userId}`);
    expect(capturedOptions!.reason).toBe("Rule violation");
  });
});

describe("timeout_member", () => {
  test("sets communication_disabled_until in the future", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const userId = "6000000000000000001";

    const client = Object.create(null) as DiscordRestClient;
    (client as any).request = async (options: RequestOptions) => {
      capturedBody = options.body as Record<string, unknown>;
      return sampleMember;
    };

    const registry = new TestToolRegistry();
    registerMemberTools(registry as any, client, GUILD_ID);

    const before = Date.now();
    const result = await registry.callTool("timeout_member", {
      user_id: userId,
      duration_seconds: 3600,
      reason: "Cooling off period",
    });
    const after = Date.now();

    expect(result.isError).toBeUndefined();
    expect(textOf(result)).toContain("Timed out until");

    // Verify the ISO timestamp is roughly 1 hour from now
    const disabledUntil = capturedBody!.communication_disabled_until as string;
    const ts = new Date(disabledUntil).getTime();
    const expectedMin = before + 3600 * 1000;
    const expectedMax = after + 3600 * 1000;
    expect(ts).toBeGreaterThanOrEqual(expectedMin);
    expect(ts).toBeLessThanOrEqual(expectedMax);
  });
});

describe("server_audit_snapshot", () => {
  test("fetches guild, channels, and roles in parallel and returns combined output", async () => {
    const requestedPaths: string[] = [];

    const client = Object.create(null) as DiscordRestClient;
    (client as any).request = async (options: RequestOptions) => {
      requestedPaths.push(options.path);
      if (options.path === `/guilds/${GUILD_ID}`) return sampleGuild;
      if (options.path === `/guilds/${GUILD_ID}/channels`) return sampleChannels;
      if (options.path === `/guilds/${GUILD_ID}/roles`) return sampleRoles;
      throw new Error(`Unexpected path: ${options.path}`);
    };

    const registry = new TestToolRegistry();
    registerCompositeTools(registry as any, client, GUILD_ID);

    const result = await registry.callTool("server_audit_snapshot", {});

    expect(result.isError).toBeUndefined();
    const text = textOf(result);
    expect(text).toContain("Server Audit Snapshot");
    expect(text).toContain("Test Community Server");
    expect(text).toContain("chat");
    expect(text).toContain("Admin");

    // All three endpoints were called
    expect(requestedPaths).toContain(`/guilds/${GUILD_ID}`);
    expect(requestedPaths).toContain(`/guilds/${GUILD_ID}/channels`);
    expect(requestedPaths).toContain(`/guilds/${GUILD_ID}/roles`);
  });
});

describe("error handling", () => {
  test("DiscordApiError is caught and returned as isError result", async () => {
    const client = Object.create(null) as DiscordRestClient;
    (client as any).request = async () => {
      throw new DiscordApiError(403, 50013, "Missing Permissions");
    };

    const registry = new TestToolRegistry();
    registerServerInfoTools(registry as any, client, GUILD_ID);

    const result = await registry.callTool("get_guild", {});

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("403");
    expect(textOf(result)).toContain("Missing Permissions");
  });

  test("non-Discord errors propagate through for server-info tools", async () => {
    const client = Object.create(null) as DiscordRestClient;
    (client as any).request = async () => {
      throw new TypeError("fetch failed");
    };

    const registry = new TestToolRegistry();
    registerServerInfoTools(registry as any, client, GUILD_ID);

    expect(registry.callTool("get_guild", {})).rejects.toThrow("fetch failed");
  });
});
