import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import type { DiscordRestClient } from "../discord/client.ts";
import type { Channel, Guild, GuildMember, Role } from "../discord/types.ts";
import { DiscordApiError } from "../discord/errors.ts";
import { PermissionFlags } from "../discord/permissions.ts";
import {
  formatChannelList,
  formatGuild,
  formatRoleList,
} from "../utils/formatters.ts";
import {
  color,
  permissionBitfield,
  permissionOverwrite,
  snowflake,
} from "../utils/validators.ts";

function resolveGuildId(
  guildId: string | undefined,
  defaultGuildId: string | undefined,
): string {
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

export function registerCompositeTools(
  server: McpServer,
  client: DiscordRestClient,
  defaultGuildId?: string,
): void {
  // ── server_audit_snapshot ──────────────────────────────────────────
  server.registerTool("server_audit_snapshot", {
    title: "Server Audit Snapshot",
    description:
      "Take a read-only snapshot of the server: guild info, all channels, and all roles. Useful before making changes to understand current state.",
    inputSchema: z.object({
      guild_id: snowflake
        .optional()
        .describe("Guild ID (uses default if not provided)"),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);

      const [guild, channels, roles] = await Promise.all([
        client.request<Guild>({
          method: "GET",
          path: `/guilds/${guildId}`,
          query: { with_counts: "true" },
        }),
        client.request<Channel[]>({
          method: "GET",
          path: `/guilds/${guildId}/channels`,
        }),
        client.request<Role[]>({
          method: "GET",
          path: `/guilds/${guildId}/roles`,
        }),
      ]);

      const sections = [
        "# Server Audit Snapshot\n",
        "## Guild Info",
        formatGuild(guild),
        "",
        `## Channels (${channels.length})`,
        formatChannelList(channels),
        "",
        `## Roles (${roles.length})`,
        formatRoleList(roles),
      ];

      return {
        content: [{ type: "text" as const, text: sections.join("\n") }],
      };
    } catch (error) {
      return errorResult(error);
    }
  });

  // ── setup_channel_category ─────────────────────────────────────────
  server.registerTool("setup_channel_category", {
    title: "Setup Channel Category",
    description:
      "Create a category and its child channels in one operation. Optionally set permission overwrites on the category (children inherit them).",
    inputSchema: z.object({
      guild_id: snowflake
        .optional()
        .describe("Guild ID (uses default if not provided)"),
      category_name: z.string().describe("Name for the category"),
      channels: z
        .array(
          z.object({
            name: z.string().describe("Channel name"),
            type: z
              .union([
                z.literal(0),
                z.literal(2),
                z.literal(5),
                z.literal(13),
                z.literal(15),
                z.literal(16),
              ])
              .describe(
                "Channel type: 0=Text, 2=Voice, 5=Announcement, 13=Stage, 15=Forum, 16=Media",
              ),
            topic: z.string().optional().describe("Channel topic"),
          }),
        )
        .describe("Child channels to create under the category"),
      permission_overwrites: z
        .array(permissionOverwrite)
        .optional()
        .describe("Permission overwrites for the category (children inherit)"),
      reason: z.string().optional().describe("Audit log reason"),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);

      // Create the category
      const categoryBody: Record<string, unknown> = {
        name: params.category_name,
        type: 4, // Category
      };
      if (params.permission_overwrites) {
        categoryBody.permission_overwrites = params.permission_overwrites;
      }

      const category = await client.request<Channel>({
        method: "POST",
        path: `/guilds/${guildId}/channels`,
        body: categoryBody,
        reason: params.reason,
      });

      // Create child channels under the category
      const created: Channel[] = [category];
      for (const ch of params.channels) {
        const chBody: Record<string, unknown> = {
          name: ch.name,
          type: ch.type,
          parent_id: category.id,
        };
        if (ch.topic) chBody.topic = ch.topic;

        const child = await client.request<Channel>({
          method: "POST",
          path: `/guilds/${guildId}/channels`,
          body: chBody,
          reason: params.reason,
        });
        created.push(child);
      }

      const lines = [
        `Created category **${category.name}** (${category.id}) with ${params.channels.length} child channel(s):`,
        ...created.slice(1).map(
          (ch) => `  - #${ch.name} (${ch.id}) type=${ch.type}`,
        ),
      ];

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    } catch (error) {
      return errorResult(error);
    }
  });

  // ── lockdown_channel ───────────────────────────────────────────────
  server.registerTool("lockdown_channel", {
    title: "Lockdown Channel",
    description:
      "Set a channel to read-only for @everyone (deny SendMessages), or restore it. Useful for emergency lockdowns or archiving channels.",
    inputSchema: z.object({
      channel_id: snowflake.describe("Channel ID to lock/unlock"),
      guild_id: snowflake
        .optional()
        .describe(
          "Guild ID (needed to find the @everyone role, uses default if not provided)",
        ),
      unlock: z
        .boolean()
        .optional()
        .default(false)
        .describe("If true, remove the lockdown (restore SendMessages)"),
      reason: z.string().optional().describe("Audit log reason"),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);
      // @everyone role ID is the same as the guild ID
      const everyoneRoleId = guildId;

      if (params.unlock) {
        // Remove the permission overwrite for @everyone
        await client.request<void>({
          method: "DELETE",
          path: `/channels/${params.channel_id}/permissions/${everyoneRoleId}`,
          reason: params.reason,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Channel ${params.channel_id} unlocked — @everyone permission overwrite removed.`,
            },
          ],
        };
      }

      // Deny SendMessages + SendMessagesInThreads for @everyone
      const deny = (
        PermissionFlags.SendMessages | PermissionFlags.SendMessagesInThreads
      ).toString();

      await client.request<void>({
        method: "PUT",
        path: `/channels/${params.channel_id}/permissions/${everyoneRoleId}`,
        body: { type: 0, deny, allow: "0" },
        reason: params.reason,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Channel ${params.channel_id} locked down — @everyone denied SendMessages.`,
          },
        ],
      };
    } catch (error) {
      return errorResult(error);
    }
  });

  // ── setup_role_hierarchy ───────────────────────────────────────────
  server.registerTool("setup_role_hierarchy", {
    title: "Setup Role Hierarchy",
    description:
      "Create multiple roles with specified colors and permissions, then reorder them into a hierarchy. Roles are created in order from highest to lowest position.",
    inputSchema: z.object({
      guild_id: snowflake
        .optional()
        .describe("Guild ID (uses default if not provided)"),
      roles: z
        .array(
          z.object({
            name: z.string().describe("Role name"),
            color: color.optional().describe("Role color as integer (0-16777215)"),
            hoist: z
              .boolean()
              .optional()
              .describe("Display role members separately"),
            mentionable: z
              .boolean()
              .optional()
              .describe("Allow anyone to @mention this role"),
            permissions: permissionBitfield
              .optional()
              .describe("Permission bitfield string"),
          }),
        )
        .describe(
          "Roles to create, ordered from highest position to lowest",
        ),
      reason: z.string().optional().describe("Audit log reason"),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);

      // Create all roles
      const createdRoles: Role[] = [];
      for (const roleDef of params.roles) {
        const body: Record<string, unknown> = { name: roleDef.name };
        if (roleDef.color !== undefined) body.color = roleDef.color;
        if (roleDef.hoist !== undefined) body.hoist = roleDef.hoist;
        if (roleDef.mentionable !== undefined)
          body.mentionable = roleDef.mentionable;
        if (roleDef.permissions !== undefined)
          body.permissions = roleDef.permissions;

        const role = await client.request<Role>({
          method: "POST",
          path: `/guilds/${guildId}/roles`,
          body,
          reason: params.reason,
        });
        createdRoles.push(role);
      }

      // Reorder: first role in array gets highest position
      // We need to find a position above the existing roles but below bot role
      const existingRoles = await client.request<Role[]>({
        method: "GET",
        path: `/guilds/${guildId}/roles`,
      });
      const maxPosition = Math.max(
        ...existingRoles
          .filter((r) => !createdRoles.some((cr) => cr.id === r.id))
          .map((r) => r.position),
      );

      const reorderPayload = createdRoles.map((role, index) => ({
        id: role.id,
        position: maxPosition + createdRoles.length - index,
      }));

      await client.request<Role[]>({
        method: "PATCH",
        path: `/guilds/${guildId}/roles`,
        body: reorderPayload,
      });

      const lines = [
        `Created and ordered ${createdRoles.length} role(s):`,
        ...createdRoles.map(
          (r, i) =>
            `  ${i + 1}. **@${r.name}** (${r.id})`,
        ),
      ];

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
      };
    } catch (error) {
      return errorResult(error);
    }
  });

  // ── bulk_assign_role ───────────────────────────────────────────────
  server.registerTool("bulk_assign_role", {
    title: "Bulk Assign Role",
    description:
      "Assign a role to multiple members at once. Processes members sequentially to respect rate limits.",
    inputSchema: z.object({
      guild_id: snowflake
        .optional()
        .describe("Guild ID (uses default if not provided)"),
      role_id: snowflake.describe("Role ID to assign"),
      user_ids: z
        .array(snowflake)
        .min(1)
        .describe("Array of user IDs to assign the role to"),
      reason: z.string().optional().describe("Audit log reason"),
    }),
  }, async (params) => {
    try {
      const guildId = resolveGuildId(params.guild_id, defaultGuildId);

      const results: { userId: string; success: boolean; error?: string }[] =
        [];

      for (const userId of params.user_ids) {
        try {
          await client.request<void>({
            method: "PUT",
            path: `/guilds/${guildId}/members/${userId}/roles/${params.role_id}`,
            reason: params.reason,
          });
          results.push({ userId, success: true });
        } catch (error) {
          const msg =
            error instanceof DiscordApiError
              ? error.toUserMessage()
              : String(error);
          results.push({ userId, success: false, error: msg });
        }
      }

      const succeeded = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success);

      const lines = [
        `Bulk assign role ${params.role_id}: ${succeeded}/${results.length} succeeded.`,
      ];

      if (failed.length > 0) {
        lines.push("Failures:");
        for (const f of failed) {
          lines.push(`  - ${f.userId}: ${f.error}`);
        }
      }

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
        ...(failed.length > 0 && { isError: true }),
      };
    } catch (error) {
      return errorResult(error);
    }
  });
}
