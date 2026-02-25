import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.ts";
import { DiscordRestClient } from "./discord/client.ts";
import { registerAllTools } from "./tools/index.ts";

const config = loadConfig();
const client = new DiscordRestClient(config.DISCORD_BOT_TOKEN);

const server = new McpServer({
  name: "discord-mcp",
  version: "1.0.0",
});

registerAllTools(server, client, config.DISCORD_GUILD_ID);

const transport = new StdioServerTransport();
await server.connect(transport);
