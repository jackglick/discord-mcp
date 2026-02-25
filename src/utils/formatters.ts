import type {
  Ban,
  Channel,
  Guild,
  GuildMember,
  Role,
} from "../discord/types.ts";
import { CHANNEL_TYPE_NAMES } from "../discord/types.ts";
import { resolvePermissionNames } from "../discord/permissions.ts";

export function formatGuild(guild: Guild): string {
  const lines = [
    `**${guild.name}** (${guild.id})`,
    `Owner: <@${guild.owner_id}>`,
    `Verification: ${["None", "Low", "Medium", "High", "Very High"][guild.verification_level]}`,
    `Boost Tier: ${guild.premium_tier} (${guild.premium_subscription_count ?? 0} boosts)`,
  ];

  if (guild.description) lines.push(`Description: ${guild.description}`);
  if (guild.approximate_member_count) lines.push(`Members: ~${guild.approximate_member_count}`);
  if (guild.approximate_presence_count) lines.push(`Online: ~${guild.approximate_presence_count}`);
  if (guild.vanity_url_code) lines.push(`Vanity URL: discord.gg/${guild.vanity_url_code}`);

  lines.push(`Features: ${guild.features.join(", ") || "None"}`);

  return lines.join("\n");
}

export function formatChannel(channel: Channel): string {
  const typeName = CHANNEL_TYPE_NAMES[channel.type] ?? `Type ${channel.type}`;
  const lines = [
    `**#${channel.name ?? "unknown"}** (${channel.id})`,
    `Type: ${typeName}`,
  ];

  if (channel.topic) lines.push(`Topic: ${channel.topic}`);
  if (channel.parent_id) lines.push(`Parent: ${channel.parent_id}`);
  if (channel.position !== undefined) lines.push(`Position: ${channel.position}`);
  if (channel.nsfw) lines.push("NSFW: Yes");
  if (channel.permission_overwrites?.length) {
    lines.push(`Permission overwrites: ${channel.permission_overwrites.length}`);
  }

  return lines.join("\n");
}

export function formatChannelList(channels: Channel[]): string {
  // Group by parent (category)
  const categories = channels.filter((c) => c.type === 4);
  const uncategorized = channels.filter(
    (c) => c.type !== 4 && !c.parent_id,
  );
  const byParent = new Map<string, Channel[]>();

  for (const ch of channels) {
    if (ch.type === 4 || !ch.parent_id) continue;
    const list = byParent.get(ch.parent_id) ?? [];
    list.push(ch);
    byParent.set(ch.parent_id, list);
  }

  const lines: string[] = [];

  if (uncategorized.length > 0) {
    for (const ch of uncategorized) {
      lines.push(formatChannelLine(ch));
    }
  }

  for (const cat of categories.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))) {
    lines.push(`\n📁 **${cat.name}** (${cat.id})`);
    const children = byParent.get(cat.id) ?? [];
    for (const ch of children.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))) {
      lines.push(`  ${formatChannelLine(ch)}`);
    }
  }

  return lines.join("\n");
}

function formatChannelLine(ch: Channel): string {
  const typeName = CHANNEL_TYPE_NAMES[ch.type] ?? "?";
  return `[${typeName}] #${ch.name ?? "unknown"} (${ch.id})`;
}

export function formatRole(role: Role): string {
  const permNames = resolvePermissionNames(role.permissions);
  const colorHex = role.color ? `#${role.color.toString(16).padStart(6, "0")}` : "default";
  const lines = [
    `**@${role.name}** (${role.id})`,
    `Color: ${colorHex} | Position: ${role.position} | Hoist: ${role.hoist} | Mentionable: ${role.mentionable}`,
    `Managed: ${role.managed}`,
    `Permissions: ${permNames.join(", ") || "None"}`,
  ];
  return lines.join("\n");
}

export function formatRoleList(roles: Role[]): string {
  const sorted = [...roles].sort((a, b) => b.position - a.position);
  return sorted
    .map((r) => {
      const colorHex = r.color ? `#${r.color.toString(16).padStart(6, "0")}` : "—";
      return `[${r.position}] **@${r.name}** (${r.id}) ${colorHex}${r.managed ? " [managed]" : ""}`;
    })
    .join("\n");
}

export function formatMember(member: GuildMember): string {
  const user = member.user;
  const lines = [
    `**${user?.global_name ?? user?.username ?? "Unknown"}** (${user?.id ?? "?"})`,
    `Username: ${user?.username ?? "?"}`,
  ];

  if (member.nick) lines.push(`Nickname: ${member.nick}`);
  lines.push(`Joined: ${member.joined_at}`);
  lines.push(`Roles: ${member.roles.length > 0 ? member.roles.map((r) => `<@&${r}>`).join(", ") : "None"}`);

  if (member.communication_disabled_until) {
    lines.push(`Timed out until: ${member.communication_disabled_until}`);
  }
  if (member.pending) lines.push("Pending membership screening");

  return lines.join("\n");
}

export function formatMemberList(members: GuildMember[]): string {
  return members
    .map((m) => {
      const user = m.user;
      const name = user?.global_name ?? user?.username ?? "Unknown";
      return `${name} (${user?.id ?? "?"})${m.nick ? ` aka "${m.nick}"` : ""} — ${m.roles.length} roles`;
    })
    .join("\n");
}

export function formatBan(ban: Ban): string {
  return `**${ban.user.global_name ?? ban.user.username}** (${ban.user.id})${ban.reason ? ` — Reason: ${ban.reason}` : ""}`;
}

export function formatBanList(bans: Ban[]): string {
  if (bans.length === 0) return "No bans found.";
  return bans.map(formatBan).join("\n");
}
