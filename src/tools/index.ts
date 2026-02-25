import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { DiscordRestClient } from "../discord/client.ts";
import { registerServerInfoTools } from "./server-info.ts";
import { registerChannelTools } from "./channels.ts";
import { registerRoleTools } from "./roles.ts";
import { registerMemberTools } from "./members.ts";
import { registerCompositeTools } from "./composite.ts";

export function registerAllTools(
  server: McpServer,
  client: DiscordRestClient,
  defaultGuildId?: string,
): void {
  registerServerInfoTools(server, client, defaultGuildId);
  registerChannelTools(server, client, defaultGuildId);
  registerRoleTools(server, client, defaultGuildId);
  registerMemberTools(server, client, defaultGuildId);
  registerCompositeTools(server, client, defaultGuildId);
}
