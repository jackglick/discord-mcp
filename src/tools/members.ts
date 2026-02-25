import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DiscordRestClient } from "../discord/client.ts";
import type { Ban, GuildMember } from "../discord/types.ts";
import { DiscordApiError } from "../discord/errors.ts";
import {
  formatBan,
  formatBanList,
  formatMember,
  formatMemberList,
} from "../utils/formatters.ts";
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

export function registerMemberTools(
  server: McpServer,
  client: DiscordRestClient,
  defaultGuildId?: string,
): void {
  // ── list_members ─────────────────────────────────────────────────────
  server.registerTool("list_members", {
    title: "List Members",
    description:
      "List members of a Discord server with pagination. Returns usernames, nicknames, role counts, and IDs. Use the 'after' parameter with the last member's user ID to paginate through large servers.",
    inputSchema: z.object({
      guild_id: snowflake
        .optional()
        .describe("Guild ID. Optional if a default guild is configured."),
      limit: z.number().int().min(1).max(1000).optional()
        .describe("Max number of members to return (1-1000, default 100)."),
      after: snowflake.optional()
        .describe("Snowflake ID to paginate after. Returns members with IDs greater than this value."),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);
      const members = await client.request<GuildMember[]>({
        method: "GET",
        path: `/guilds/${guildId}/members`,
        query: {
          limit: params.limit ?? 100,
          after: params.after,
        },
      });
      return {
        content: [{ type: "text" as const, text: formatMemberList(members) || "No members found." }],
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

  // ── search_members ───────────────────────────────────────────────────
  server.registerTool("search_members", {
    title: "Search Members",
    description:
      "Search for guild members whose username or nickname starts with the provided query string. Returns up to the specified limit of matching members.",
    inputSchema: z.object({
      guild_id: snowflake
        .optional()
        .describe("Guild ID. Optional if a default guild is configured."),
      query: z.string().min(1)
        .describe("Query string to match against usernames and nicknames (prefix match)."),
      limit: z.number().int().min(1).max(1000).optional()
        .describe("Max number of members to return (1-1000, default 10)."),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);
      const members = await client.request<GuildMember[]>({
        method: "GET",
        path: `/guilds/${guildId}/members/search`,
        query: {
          query: params.query,
          limit: params.limit ?? 10,
        },
      });
      return {
        content: [{ type: "text" as const, text: formatMemberList(members) || "No members found." }],
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

  // ── get_member ───────────────────────────────────────────────────────
  server.registerTool("get_member", {
    title: "Get Member",
    description:
      "Get detailed information about a specific guild member, including their username, nickname, roles, join date, and timeout status.",
    inputSchema: z.object({
      guild_id: snowflake
        .optional()
        .describe("Guild ID. Optional if a default guild is configured."),
      user_id: snowflake
        .describe("The user ID of the member to retrieve."),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);
      const member = await client.request<GuildMember>({
        method: "GET",
        path: `/guilds/${guildId}/members/${params.user_id}`,
      });
      return {
        content: [{ type: "text" as const, text: formatMember(member) }],
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

  // ── modify_member ────────────────────────────────────────────────────
  server.registerTool("modify_member", {
    title: "Modify Member",
    description:
      "Modify attributes of a guild member. Can change nickname, roles, mute/deafen status. Only provided fields are updated. Requires appropriate permissions (MANAGE_NICKNAMES, MANAGE_ROLES, MUTE_MEMBERS, DEAFEN_MEMBERS).",
    inputSchema: z.object({
      guild_id: snowflake
        .optional()
        .describe("Guild ID. Optional if a default guild is configured."),
      user_id: snowflake
        .describe("The user ID of the member to modify."),
      nick: z.string().max(32).nullable().optional()
        .describe("New nickname for the member, or null to remove nickname."),
      roles: z.array(snowflake).optional()
        .describe("Array of role IDs to assign to the member (replaces all current roles)."),
      mute: z.boolean().optional()
        .describe("Whether the member is muted in voice channels."),
      deaf: z.boolean().optional()
        .describe("Whether the member is deafened in voice channels."),
      reason: z.string().max(512).optional()
        .describe("Audit log reason for this change."),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);

      const body: Record<string, unknown> = {};
      if (params.nick !== undefined) body.nick = params.nick;
      if (params.roles !== undefined) body.roles = params.roles;
      if (params.mute !== undefined) body.mute = params.mute;
      if (params.deaf !== undefined) body.deaf = params.deaf;

      const member = await client.request<GuildMember>({
        method: "PATCH",
        path: `/guilds/${guildId}/members/${params.user_id}`,
        body,
        reason: params.reason,
      });
      return {
        content: [{ type: "text" as const, text: formatMember(member) }],
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

  // ── kick_member ──────────────────────────────────────────────────────
  server.registerTool("kick_member", {
    title: "Kick Member",
    description:
      "Remove a member from the guild. The member can rejoin if they have an invite. Requires the KICK_MEMBERS permission. The action is recorded in the audit log.",
    inputSchema: z.object({
      guild_id: snowflake
        .optional()
        .describe("Guild ID. Optional if a default guild is configured."),
      user_id: snowflake
        .describe("The user ID of the member to kick."),
      reason: z.string().max(512).optional()
        .describe("Audit log reason for this kick."),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);
      await client.request<undefined>({
        method: "DELETE",
        path: `/guilds/${guildId}/members/${params.user_id}`,
        reason: params.reason,
      });
      return {
        content: [{ type: "text" as const, text: `Successfully kicked user ${params.user_id} from guild ${guildId}.` }],
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

  // ── ban_member ───────────────────────────────────────────────────────
  server.registerTool("ban_member", {
    title: "Ban Member",
    description:
      "Ban a user from the guild, preventing them from rejoining. Optionally delete their recent messages. Requires the BAN_MEMBERS permission. The action is recorded in the audit log.",
    inputSchema: z.object({
      guild_id: snowflake
        .optional()
        .describe("Guild ID. Optional if a default guild is configured."),
      user_id: snowflake
        .describe("The user ID of the member to ban."),
      delete_message_seconds: z.number().int().min(0).max(604800).optional()
        .describe("Number of seconds of messages to delete (0-604800, i.e. up to 7 days)."),
      reason: z.string().max(512).optional()
        .describe("Audit log reason for this ban."),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);

      const body: Record<string, unknown> = {};
      if (params.delete_message_seconds !== undefined) {
        body.delete_message_seconds = params.delete_message_seconds;
      }

      await client.request<undefined>({
        method: "PUT",
        path: `/guilds/${guildId}/bans/${params.user_id}`,
        body: Object.keys(body).length > 0 ? body : undefined,
        reason: params.reason,
      });
      return {
        content: [{ type: "text" as const, text: `Successfully banned user ${params.user_id} from guild ${guildId}.` }],
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

  // ── unban_member ─────────────────────────────────────────────────────
  server.registerTool("unban_member", {
    title: "Unban Member",
    description:
      "Remove a ban for a user, allowing them to rejoin the guild. Requires the BAN_MEMBERS permission. The action is recorded in the audit log.",
    inputSchema: z.object({
      guild_id: snowflake
        .optional()
        .describe("Guild ID. Optional if a default guild is configured."),
      user_id: snowflake
        .describe("The user ID of the member to unban."),
      reason: z.string().max(512).optional()
        .describe("Audit log reason for this unban."),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);
      await client.request<undefined>({
        method: "DELETE",
        path: `/guilds/${guildId}/bans/${params.user_id}`,
        reason: params.reason,
      });
      return {
        content: [{ type: "text" as const, text: `Successfully unbanned user ${params.user_id} from guild ${guildId}.` }],
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

  // ── list_bans ────────────────────────────────────────────────────────
  server.registerTool("list_bans", {
    title: "List Bans",
    description:
      "List all banned users in the guild. Returns usernames, IDs, and ban reasons. Requires the BAN_MEMBERS permission.",
    inputSchema: z.object({
      guild_id: snowflake
        .optional()
        .describe("Guild ID. Optional if a default guild is configured."),
      limit: z.number().int().min(1).max(1000).optional()
        .describe("Max number of bans to return (1-1000, default 1000)."),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);
      const bans = await client.request<Ban[]>({
        method: "GET",
        path: `/guilds/${guildId}/bans`,
        query: {
          limit: params.limit ?? 1000,
        },
      });
      return {
        content: [{ type: "text" as const, text: formatBanList(bans) }],
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

  // ── get_ban ──────────────────────────────────────────────────────────
  server.registerTool("get_ban", {
    title: "Get Ban",
    description:
      "Get ban information for a specific user in the guild. Returns the user's details and ban reason. Requires the BAN_MEMBERS permission.",
    inputSchema: z.object({
      guild_id: snowflake
        .optional()
        .describe("Guild ID. Optional if a default guild is configured."),
      user_id: snowflake
        .describe("The user ID to look up ban information for."),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);
      const ban = await client.request<Ban>({
        method: "GET",
        path: `/guilds/${guildId}/bans/${params.user_id}`,
      });
      return {
        content: [{ type: "text" as const, text: formatBan(ban) }],
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

  // ── timeout_member ───────────────────────────────────────────────────
  server.registerTool("timeout_member", {
    title: "Timeout Member",
    description:
      "Temporarily prevent a member from interacting in the guild (sending messages, reacting, joining voice). Provide duration_seconds to set a timeout, or omit it to remove an existing timeout. Requires the MODERATE_MEMBERS permission.",
    inputSchema: z.object({
      guild_id: snowflake
        .optional()
        .describe("Guild ID. Optional if a default guild is configured."),
      user_id: snowflake
        .describe("The user ID of the member to timeout."),
      duration_seconds: z.number().int().min(1).nullable().optional()
        .describe("Timeout duration in seconds. Omit or set to null to remove an existing timeout."),
      reason: z.string().max(512).optional()
        .describe("Audit log reason for this timeout."),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);

      let communicationDisabledUntil: string | null = null;
      if (params.duration_seconds != null) {
        const until = new Date(Date.now() + params.duration_seconds * 1000);
        communicationDisabledUntil = until.toISOString();
      }

      const member = await client.request<GuildMember>({
        method: "PATCH",
        path: `/guilds/${guildId}/members/${params.user_id}`,
        body: { communication_disabled_until: communicationDisabledUntil },
        reason: params.reason,
      });

      const action = communicationDisabledUntil
        ? `Timed out until ${communicationDisabledUntil}`
        : "Timeout removed";
      return {
        content: [{ type: "text" as const, text: `${action} for user ${params.user_id}.\n\n${formatMember(member)}` }],
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
