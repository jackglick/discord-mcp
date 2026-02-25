import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DiscordRestClient } from "../discord/client.ts";
import type { Guild } from "../discord/types.ts";
import { DiscordApiError } from "../discord/errors.ts";
import { formatGuild } from "../utils/formatters.ts";
import { snowflake } from "../utils/validators.ts";

function resolveGuildId(
  guildId: string | undefined,
  defaultGuildId: string | undefined,
): string {
  const resolved = guildId ?? defaultGuildId;
  if (!resolved) {
    throw new Error(
      "guild_id is required (no default guild configured)",
    );
  }
  return resolved;
}

export function registerServerInfoTools(
  server: McpServer,
  client: DiscordRestClient,
  defaultGuildId?: string,
): void {
  // ── get_guild ──────────────────────────────────────────────────────
  server.registerTool("get_guild", {
    title: "Get Guild",
    description:
      "Retrieve detailed information about a Discord server (guild), including member/presence counts, features, boost status, and configuration. Use this to inspect server settings or verify server state.",
    inputSchema: z.object({
      guild_id: snowflake
        .optional()
        .describe("Guild ID. Optional if a default guild is configured."),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);
      const guild = await client.request<Guild>({
        method: "GET",
        path: `/guilds/${guildId}`,
        query: { with_counts: "true" },
      });
      return {
        content: [{ type: "text" as const, text: formatGuild(guild) }],
      };
    } catch (error) {
      if (error instanceof DiscordApiError) {
        return {
          content: [{ type: "text" as const, text: error.toUserMessage() }],
          isError: true,
        };
      }
      throw error;
    }
  });

  // ── get_guild_preview ──────────────────────────────────────────────
  server.registerTool("get_guild_preview", {
    title: "Get Guild Preview",
    description:
      "Get a preview of a Discord server, including its name, icon, splash, emojis, stickers, and approximate counts. Works for discoverable guilds or guilds the bot is in.",
    inputSchema: z.object({
      guild_id: snowflake
        .optional()
        .describe("Guild ID. Optional if a default guild is configured."),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);
      const preview = await client.request<Record<string, unknown>>({
        method: "GET",
        path: `/guilds/${guildId}/preview`,
      });
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(preview, null, 2) },
        ],
      };
    } catch (error) {
      if (error instanceof DiscordApiError) {
        return {
          content: [{ type: "text" as const, text: error.toUserMessage() }],
          isError: true,
        };
      }
      throw error;
    }
  });

  // ── modify_guild ───────────────────────────────────────────────────
  server.registerTool("modify_guild", {
    title: "Modify Guild",
    description:
      "Update a Discord server's settings such as name, description, verification level, icon, banner, or system channel. Requires the MANAGE_GUILD permission. Changes are recorded in the audit log.",
    inputSchema: z.object({
      guild_id: snowflake
        .optional()
        .describe("Guild ID. Optional if a default guild is configured."),
      name: z.string().min(2).max(100).optional()
        .describe("New server name (2-100 characters)."),
      description: z.string().max(120).nullable().optional()
        .describe("New server description (max 120 characters), or null to clear."),
      verification_level: z.number().int().min(0).max(4).optional()
        .describe("Verification level: 0=None, 1=Low, 2=Medium, 3=High, 4=VeryHigh."),
      icon: z.string().optional()
        .describe("Server icon as a base64 data URI (e.g. data:image/png;base64,...), or null to remove."),
      banner: z.string().optional()
        .describe("Server banner as a base64 data URI (e.g. data:image/png;base64,...), or null to remove."),
      system_channel_id: snowflake.nullable().optional()
        .describe("Channel ID for system messages, or null to disable."),
      reason: z.string().max(512).optional()
        .describe("Audit log reason for this change."),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);

      const body: Record<string, unknown> = {};
      if (params.name !== undefined) body.name = params.name;
      if (params.description !== undefined) body.description = params.description;
      if (params.verification_level !== undefined) body.verification_level = params.verification_level;
      if (params.icon !== undefined) body.icon = params.icon;
      if (params.banner !== undefined) body.banner = params.banner;
      if (params.system_channel_id !== undefined) body.system_channel_id = params.system_channel_id;

      const guild = await client.request<Guild>({
        method: "PATCH",
        path: `/guilds/${guildId}`,
        body,
        reason: params.reason,
      });

      return {
        content: [{ type: "text" as const, text: formatGuild(guild) }],
      };
    } catch (error) {
      if (error instanceof DiscordApiError) {
        return {
          content: [{ type: "text" as const, text: error.toUserMessage() }],
          isError: true,
        };
      }
      throw error;
    }
  });
}
