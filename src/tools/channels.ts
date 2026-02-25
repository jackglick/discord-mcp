import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import type { DiscordRestClient } from "../discord/client.ts";
import type { Channel } from "../discord/types.ts";
import { DiscordApiError } from "../discord/errors.ts";
import { formatChannel, formatChannelList } from "../utils/formatters.ts";
import { snowflake, guildChannelType, permissionOverwrite, permissionBitfield } from "../utils/validators.ts";

function resolveGuildId(guildId: string | undefined, defaultGuildId: string | undefined): string {
  const resolved = guildId ?? defaultGuildId;
  if (!resolved) {
    throw new Error("guild_id is required (no default guild configured)");
  }
  return resolved;
}

function errorResult(error: unknown) {
  if (error instanceof DiscordApiError) {
    return {
      content: [{ type: "text" as const, text: error.toUserMessage() }],
      isError: true,
    };
  }
  if (error instanceof Error) {
    return {
      content: [{ type: "text" as const, text: error.message }],
      isError: true,
    };
  }
  return {
    content: [{ type: "text" as const, text: String(error) }],
    isError: true,
  };
}

export function registerChannelTools(
  server: McpServer,
  client: DiscordRestClient,
  defaultGuildId?: string,
): void {
  // 1. list_channels
  server.registerTool("list_channels", {
    title: "List Channels",
    description: "List all channels in a guild, grouped by category.",
    inputSchema: z.object({
      guild_id: snowflake.optional().describe("Guild ID (uses default if not provided)"),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);
      const channels = await client.request<Channel[]>({
        method: "GET",
        path: `/guilds/${guildId}/channels`,
      });
      return {
        content: [{ type: "text" as const, text: formatChannelList(channels) }],
      };
    } catch (error) {
      return errorResult(error);
    }
  });

  // 2. get_channel
  server.registerTool("get_channel", {
    title: "Get Channel",
    description: "Get detailed information about a specific channel.",
    inputSchema: z.object({
      channel_id: snowflake.describe("Channel ID"),
    }),
  }, async (params) => {
    try {
      const channel = await client.request<Channel>({
        method: "GET",
        path: `/channels/${params.channel_id}`,
      });
      return {
        content: [{ type: "text" as const, text: formatChannel(channel) }],
      };
    } catch (error) {
      return errorResult(error);
    }
  });

  // 3. create_channel
  server.registerTool("create_channel", {
    title: "Create Channel",
    description: "Create a new channel in a guild.",
    inputSchema: z.object({
      guild_id: snowflake.optional().describe("Guild ID (uses default if not provided)"),
      name: z.string().describe("Channel name"),
      type: guildChannelType.describe("Channel type: 0=Text, 2=Voice, 4=Category, 5=Announcement, 13=Stage, 15=Forum, 16=Media"),
      parent_id: snowflake.optional().describe("Parent category ID"),
      topic: z.string().optional().describe("Channel topic"),
      permission_overwrites: z.array(permissionOverwrite).optional().describe("Permission overwrites"),
      reason: z.string().optional().describe("Audit log reason"),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);
      const body: Record<string, unknown> = {
        name: params.name,
        type: params.type,
      };
      if (params.parent_id !== undefined) body.parent_id = params.parent_id;
      if (params.topic !== undefined) body.topic = params.topic;
      if (params.permission_overwrites !== undefined) body.permission_overwrites = params.permission_overwrites;

      const channel = await client.request<Channel>({
        method: "POST",
        path: `/guilds/${guildId}/channels`,
        body,
        reason: params.reason,
      });
      return {
        content: [{ type: "text" as const, text: `Channel created:\n${formatChannel(channel)}` }],
      };
    } catch (error) {
      return errorResult(error);
    }
  });

  // 4. modify_channel
  server.registerTool("modify_channel", {
    title: "Modify Channel",
    description: "Modify a channel's settings (name, topic, position, etc.).",
    inputSchema: z.object({
      channel_id: snowflake.describe("Channel ID"),
      name: z.string().optional().describe("New channel name"),
      topic: z.string().optional().describe("New channel topic"),
      position: z.number().int().optional().describe("New position"),
      parent_id: snowflake.optional().describe("New parent category ID"),
      nsfw: z.boolean().optional().describe("Whether the channel is NSFW"),
      reason: z.string().optional().describe("Audit log reason"),
    }),
  }, async (params) => {
    try {
      const body: Record<string, unknown> = {};
      if (params.name !== undefined) body.name = params.name;
      if (params.topic !== undefined) body.topic = params.topic;
      if (params.position !== undefined) body.position = params.position;
      if (params.parent_id !== undefined) body.parent_id = params.parent_id;
      if (params.nsfw !== undefined) body.nsfw = params.nsfw;

      const channel = await client.request<Channel>({
        method: "PATCH",
        path: `/channels/${params.channel_id}`,
        body,
        reason: params.reason,
      });
      return {
        content: [{ type: "text" as const, text: `Channel updated:\n${formatChannel(channel)}` }],
      };
    } catch (error) {
      return errorResult(error);
    }
  });

  // 5. delete_channel
  server.registerTool("delete_channel", {
    title: "Delete Channel",
    description: "Permanently delete a channel. This cannot be undone.",
    inputSchema: z.object({
      channel_id: snowflake.describe("Channel ID"),
      reason: z.string().optional().describe("Audit log reason"),
    }),
  }, async (params) => {
    try {
      const channel = await client.request<Channel>({
        method: "DELETE",
        path: `/channels/${params.channel_id}`,
        reason: params.reason,
      });
      return {
        content: [{ type: "text" as const, text: `Channel #${channel.name ?? params.channel_id} deleted.` }],
      };
    } catch (error) {
      return errorResult(error);
    }
  });

  // 6. set_channel_permissions
  server.registerTool("set_channel_permissions", {
    title: "Set Channel Permissions",
    description: "Set permission overwrites for a role or member on a channel.",
    inputSchema: z.object({
      channel_id: snowflake.describe("Channel ID"),
      overwrite_id: snowflake.describe("Role or user ID to set permissions for"),
      type: z.union([z.literal(0), z.literal(1)]).describe("0 = role, 1 = member"),
      allow: permissionBitfield.optional().describe("Allowed permissions bitfield"),
      deny: permissionBitfield.optional().describe("Denied permissions bitfield"),
      reason: z.string().optional().describe("Audit log reason"),
    }),
  }, async (params) => {
    try {
      const body: Record<string, unknown> = {
        type: params.type,
      };
      if (params.allow !== undefined) body.allow = params.allow;
      if (params.deny !== undefined) body.deny = params.deny;

      await client.request<void>({
        method: "PUT",
        path: `/channels/${params.channel_id}/permissions/${params.overwrite_id}`,
        body,
        reason: params.reason,
      });
      const targetType = params.type === 0 ? "role" : "member";
      return {
        content: [{ type: "text" as const, text: `Permission overwrite set for ${targetType} ${params.overwrite_id} on channel ${params.channel_id}.` }],
      };
    } catch (error) {
      return errorResult(error);
    }
  });

  // 7. delete_channel_permissions
  server.registerTool("delete_channel_permissions", {
    title: "Delete Channel Permissions",
    description: "Delete a permission overwrite for a role or member on a channel.",
    inputSchema: z.object({
      channel_id: snowflake.describe("Channel ID"),
      overwrite_id: snowflake.describe("Role or user ID to remove the overwrite for"),
      reason: z.string().optional().describe("Audit log reason"),
    }),
  }, async (params) => {
    try {
      await client.request<void>({
        method: "DELETE",
        path: `/channels/${params.channel_id}/permissions/${params.overwrite_id}`,
        reason: params.reason,
      });
      return {
        content: [{ type: "text" as const, text: `Permission overwrite for ${params.overwrite_id} removed from channel ${params.channel_id}.` }],
      };
    } catch (error) {
      return errorResult(error);
    }
  });
}
