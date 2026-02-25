import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DiscordRestClient } from "../discord/client.ts";
import type { Role } from "../discord/types.ts";
import { DiscordApiError } from "../discord/errors.ts";
import { formatRole, formatRoleList } from "../utils/formatters.ts";
import { snowflake, color, permissionBitfield } from "../utils/validators.ts";

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

function errorContent(error: unknown): {
  content: { type: "text"; text: string }[];
  isError: true;
} {
  if (error instanceof DiscordApiError) {
    return {
      content: [{ type: "text" as const, text: error.toUserMessage() }],
      isError: true,
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

export function registerRoleTools(
  server: McpServer,
  client: DiscordRestClient,
  defaultGuildId?: string,
): void {
  // 1. list_roles
  server.registerTool("list_roles", {
    title: "List Roles",
    description: "List all roles in a guild, sorted by position.",
    inputSchema: z.object({
      guild_id: snowflake.optional().describe("Guild ID (uses default if omitted)"),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);
      const roles = await client.request<Role[]>({
        method: "GET",
        path: `/guilds/${guildId}/roles`,
      });
      return {
        content: [{ type: "text" as const, text: formatRoleList(roles) }],
      };
    } catch (error) {
      return errorContent(error);
    }
  });

  // 2. get_role
  server.registerTool("get_role", {
    title: "Get Role",
    description: "Get detailed information about a specific role in a guild.",
    inputSchema: z.object({
      guild_id: snowflake.optional().describe("Guild ID (uses default if omitted)"),
      role_id: snowflake.describe("The role ID to look up"),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);
      const roles = await client.request<Role[]>({
        method: "GET",
        path: `/guilds/${guildId}/roles`,
      });
      const role = roles.find((r) => r.id === params.role_id);
      if (!role) {
        return {
          content: [{ type: "text" as const, text: `Role ${params.role_id} not found in guild ${guildId}.` }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text" as const, text: formatRole(role) }],
      };
    } catch (error) {
      return errorContent(error);
    }
  });

  // 3. create_role
  server.registerTool("create_role", {
    title: "Create Role",
    description: "Create a new role in a guild.",
    inputSchema: z.object({
      guild_id: snowflake.optional().describe("Guild ID (uses default if omitted)"),
      name: z.string().optional().describe("Role name"),
      color: color.optional().describe("Role color as integer (0-16777215 / 0xFFFFFF)"),
      hoist: z.boolean().optional().describe("Whether the role should be displayed separately in the sidebar"),
      mentionable: z.boolean().optional().describe("Whether the role should be mentionable"),
      permissions: permissionBitfield.optional().describe("Permission bitfield string"),
      reason: z.string().optional().describe("Audit log reason"),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);
      const body: Record<string, unknown> = {};
      if (params.name !== undefined) body.name = params.name;
      if (params.color !== undefined) body.color = params.color;
      if (params.hoist !== undefined) body.hoist = params.hoist;
      if (params.mentionable !== undefined) body.mentionable = params.mentionable;
      if (params.permissions !== undefined) body.permissions = params.permissions;

      const role = await client.request<Role>({
        method: "POST",
        path: `/guilds/${guildId}/roles`,
        body,
        reason: params.reason,
      });
      return {
        content: [{ type: "text" as const, text: `Role created:\n${formatRole(role)}` }],
      };
    } catch (error) {
      return errorContent(error);
    }
  });

  // 4. modify_role
  server.registerTool("modify_role", {
    title: "Modify Role",
    description: "Modify an existing role in a guild. Can only modify roles below the bot's highest role.",
    inputSchema: z.object({
      guild_id: snowflake.optional().describe("Guild ID (uses default if omitted)"),
      role_id: snowflake.describe("The role ID to modify"),
      name: z.string().optional().describe("New role name"),
      color: color.optional().describe("New role color as integer (0-16777215 / 0xFFFFFF)"),
      hoist: z.boolean().optional().describe("Whether the role should be displayed separately in the sidebar"),
      mentionable: z.boolean().optional().describe("Whether the role should be mentionable"),
      permissions: permissionBitfield.optional().describe("New permission bitfield string"),
      reason: z.string().optional().describe("Audit log reason"),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);
      const body: Record<string, unknown> = {};
      if (params.name !== undefined) body.name = params.name;
      if (params.color !== undefined) body.color = params.color;
      if (params.hoist !== undefined) body.hoist = params.hoist;
      if (params.mentionable !== undefined) body.mentionable = params.mentionable;
      if (params.permissions !== undefined) body.permissions = params.permissions;

      const role = await client.request<Role>({
        method: "PATCH",
        path: `/guilds/${guildId}/roles/${params.role_id}`,
        body,
        reason: params.reason,
      });
      return {
        content: [{ type: "text" as const, text: `Role updated:\n${formatRole(role)}` }],
      };
    } catch (error) {
      return errorContent(error);
    }
  });

  // 5. delete_role
  server.registerTool("delete_role", {
    title: "Delete Role",
    description: "Delete a role from a guild. This action is irreversible. Can only delete roles below the bot's highest role.",
    inputSchema: z.object({
      guild_id: snowflake.optional().describe("Guild ID (uses default if omitted)"),
      role_id: snowflake.describe("The role ID to delete"),
      reason: z.string().optional().describe("Audit log reason"),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);
      await client.request<undefined>({
        method: "DELETE",
        path: `/guilds/${guildId}/roles/${params.role_id}`,
        reason: params.reason,
      });
      return {
        content: [{ type: "text" as const, text: `Role ${params.role_id} deleted successfully.` }],
      };
    } catch (error) {
      return errorContent(error);
    }
  });

  // 6. reorder_roles
  server.registerTool("reorder_roles", {
    title: "Reorder Roles",
    description: "Reorder roles in a guild by specifying new positions. Note: bots can only move roles below their own highest role.",
    inputSchema: z.object({
      guild_id: snowflake.optional().describe("Guild ID (uses default if omitted)"),
      roles: z.array(
        z.object({
          id: snowflake.describe("Role ID"),
          position: z.number().int().min(0).describe("New position for the role"),
        }),
      ).describe("Array of role ID and position pairs"),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);
      const roles = await client.request<Role[]>({
        method: "PATCH",
        path: `/guilds/${guildId}/roles`,
        body: params.roles,
      });
      return {
        content: [{ type: "text" as const, text: `Roles reordered:\n${formatRoleList(roles)}` }],
      };
    } catch (error) {
      return errorContent(error);
    }
  });

  // 7. add_role_to_member
  server.registerTool("add_role_to_member", {
    title: "Add Role to Member",
    description: "Add a role to a guild member.",
    inputSchema: z.object({
      guild_id: snowflake.optional().describe("Guild ID (uses default if omitted)"),
      user_id: snowflake.describe("The user ID of the member"),
      role_id: snowflake.describe("The role ID to add"),
      reason: z.string().optional().describe("Audit log reason"),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);
      await client.request<undefined>({
        method: "PUT",
        path: `/guilds/${guildId}/members/${params.user_id}/roles/${params.role_id}`,
        reason: params.reason,
      });
      return {
        content: [{ type: "text" as const, text: `Role ${params.role_id} added to user ${params.user_id}.` }],
      };
    } catch (error) {
      return errorContent(error);
    }
  });

  // 8. remove_role_from_member
  server.registerTool("remove_role_from_member", {
    title: "Remove Role from Member",
    description: "Remove a role from a guild member.",
    inputSchema: z.object({
      guild_id: snowflake.optional().describe("Guild ID (uses default if omitted)"),
      user_id: snowflake.describe("The user ID of the member"),
      role_id: snowflake.describe("The role ID to remove"),
      reason: z.string().optional().describe("Audit log reason"),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);
      await client.request<undefined>({
        method: "DELETE",
        path: `/guilds/${guildId}/members/${params.user_id}/roles/${params.role_id}`,
        reason: params.reason,
      });
      return {
        content: [{ type: "text" as const, text: `Role ${params.role_id} removed from user ${params.user_id}.` }],
      };
    } catch (error) {
      return errorContent(error);
    }
  });
}
