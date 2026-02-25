# Discord MCP Server

An MCP server that exposes Discord admin operations as tools. Built with TypeScript + Bun, using direct Discord REST API v10 calls (no discord.js dependency).

## Features

- 33 tools for Discord server administration
- Channel management, role management, member moderation, server configuration
- Composite tools for common multi-step workflows (category setup, channel lockdown, bulk role assignment)
- Built-in rate limiting with per-route bucket tracking and automatic retry
- Audit log reasons for all write operations via `X-Audit-Log-Reason` header

## Prerequisites

- [Bun](https://bun.sh) v1.0+
- A Discord bot token with appropriate permissions

## Discord Bot Setup

1. Go to <https://discord.com/developers/applications>
2. Create a new application
3. Go to the **Bot** tab, create a bot, and copy the token
4. Enable required intents: **Server Members Intent** (needed for member listing)
5. Go to **OAuth2 > URL Generator**
6. Select scopes: `bot`
7. Select permissions: **Administrator** (or granular permissions: Manage Channels, Manage Roles, Kick Members, Ban Members, Manage Guild, Moderate Members)
8. Copy the generated invite URL and add the bot to your server
9. Copy the Guild ID (right-click the server name in Discord > **Copy Server ID** -- requires Developer Mode enabled in Discord settings)

## Installation

```bash
git clone <repo-url>
cd discord-mcp
bun install
```

## Configuration

```bash
cp .env.example .env
# Edit .env with your bot token and optional guild ID
```

Environment variables:

| Variable | Required | Description |
|---|---|---|
| `DISCORD_BOT_TOKEN` | Yes | Your Discord bot token |
| `DISCORD_GUILD_ID` | No | Default guild ID. If set, tools will use this as the default and the `guild_id` parameter becomes optional. |

## Usage with Claude Code

Add the following to `.claude/mcp.json`:

```json
{
  "mcpServers": {
    "discord": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/discord-mcp/src/index.ts"],
      "env": {
        "DISCORD_BOT_TOKEN": "your-token-here",
        "DISCORD_GUILD_ID": "your-guild-id"
      }
    }
  }
}
```

## Usage with Claude Desktop

Add the following to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "discord": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/discord-mcp/src/index.ts"],
      "env": {
        "DISCORD_BOT_TOKEN": "your-token-here",
        "DISCORD_GUILD_ID": "your-guild-id"
      }
    }
  }
}
```

## Testing with MCP Inspector

```bash
bunx @modelcontextprotocol/inspector -- bun run src/index.ts
```

## Tool Reference

### Server Info (3 tools)

| Tool | Description |
|---|---|
| `get_guild` | Get detailed server information including member counts, features, and boost status |
| `get_guild_preview` | Get server preview with emojis, stickers, and approximate counts |
| `modify_guild` | Update server settings (name, description, verification level, icon, banner, system channel) |

### Channels (7 tools)

| Tool | Description |
|---|---|
| `list_channels` | List all channels in a guild, grouped by category |
| `get_channel` | Get detailed information about a specific channel |
| `create_channel` | Create a new channel (text, voice, category, announcement, stage, forum, media) |
| `modify_channel` | Modify a channel's settings (name, topic, position, parent, NSFW) |
| `delete_channel` | Permanently delete a channel |
| `set_channel_permissions` | Set permission overwrites for a role or member on a channel |
| `delete_channel_permissions` | Remove a permission overwrite for a role or member on a channel |

### Roles (8 tools)

| Tool | Description |
|---|---|
| `list_roles` | List all roles in a guild, sorted by position |
| `get_role` | Get detailed information about a specific role |
| `create_role` | Create a new role with optional name, color, hoist, mentionable, and permissions |
| `modify_role` | Modify an existing role's properties |
| `delete_role` | Permanently delete a role |
| `reorder_roles` | Reorder roles by specifying new positions |
| `add_role_to_member` | Add a role to a guild member |
| `remove_role_from_member` | Remove a role from a guild member |

### Members and Moderation (10 tools)

| Tool | Description |
|---|---|
| `list_members` | List guild members with pagination (up to 1000 per request) |
| `search_members` | Search for members by username or nickname prefix |
| `get_member` | Get detailed info about a member (roles, join date, timeout status) |
| `modify_member` | Modify a member's nickname, roles, or voice mute/deafen status |
| `kick_member` | Remove a member from the guild (they can rejoin with an invite) |
| `ban_member` | Ban a user from the guild, optionally deleting recent messages (up to 7 days) |
| `unban_member` | Remove a ban, allowing the user to rejoin |
| `list_bans` | List all banned users with reasons |
| `get_ban` | Get ban information for a specific user |
| `timeout_member` | Temporarily prevent a member from interacting, or remove an existing timeout |

### Composite Tools (5 tools)

| Tool | Description |
|---|---|
| `server_audit_snapshot` | Read-only snapshot of guild info, all channels, and all roles |
| `setup_channel_category` | Create a category with child channels and optional permission overwrites in one operation |
| `lockdown_channel` | Set a channel to read-only for @everyone, or restore it |
| `setup_role_hierarchy` | Create multiple roles with colors and permissions, then reorder them into a hierarchy |
| `bulk_assign_role` | Assign a role to multiple members at once, with per-member error reporting |

## Development

```bash
bun run start     # Start the server
bun run dev       # Start with --watch for auto-reload
bun test          # Run tests
bun run lint      # Lint code (Biome)
bun run format    # Format code (Biome)
```

## Project Structure

```
src/
  index.ts              # Entry point — creates MCP server and stdio transport
  config.ts             # Environment variable loading and validation (Zod)
  discord/
    client.ts           # Discord REST client with rate limiting and retry
    rate-limiter.ts     # Per-route bucket rate limiter
    types.ts            # Discord API type definitions
    errors.ts           # Discord API error handling
    permissions.ts      # Permission flag constants
  tools/
    index.ts            # Tool registration coordinator
    server-info.ts      # Guild info tools
    channels.ts         # Channel management tools
    roles.ts            # Role management tools
    members.ts          # Member and moderation tools
    composite.ts        # Multi-step workflow tools
  utils/
    formatters.ts       # Human-readable output formatting
    validators.ts       # Shared Zod validators (snowflake, color, permissions)
```

## License

MIT
