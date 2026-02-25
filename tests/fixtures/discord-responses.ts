import type {
  Guild,
  Channel,
  Role,
  GuildMember,
  Ban,
} from "../../src/discord/types.ts";
import { VerificationLevel, ChannelType } from "../../src/discord/types.ts";

export const GUILD_ID = "1234567890123456789";

export const sampleGuild: Guild = {
  id: GUILD_ID,
  name: "Test Community Server",
  icon: "abc123iconhash",
  icon_hash: null,
  splash: null,
  discovery_splash: null,
  owner_id: "9876543210987654321",
  afk_channel_id: null,
  afk_timeout: 300,
  verification_level: VerificationLevel.Medium,
  default_message_notifications: 1,
  explicit_content_filter: 2,
  roles: [],
  features: ["COMMUNITY", "NEWS", "WELCOME_SCREEN_ENABLED"],
  mfa_level: 1,
  system_channel_id: "1111111111111111111",
  system_channel_flags: 0,
  rules_channel_id: "2222222222222222222",
  max_members: 500000,
  vanity_url_code: null,
  description: "A test server for unit tests",
  banner: null,
  premium_tier: 2,
  premium_subscription_count: 14,
  preferred_locale: "en-US",
  public_updates_channel_id: "3333333333333333333",
  approximate_member_count: 1250,
  approximate_presence_count: 340,
  nsfw_level: 0,
  safety_alerts_channel_id: null,
};

export const sampleChannels: Channel[] = [
  {
    id: "4000000000000000001",
    type: ChannelType.GuildCategory,
    guild_id: GUILD_ID,
    position: 0,
    permission_overwrites: [],
    name: "General",
  },
  {
    id: "4000000000000000002",
    type: ChannelType.GuildText,
    guild_id: GUILD_ID,
    position: 0,
    permission_overwrites: [],
    name: "chat",
    topic: "General discussion",
    nsfw: false,
    parent_id: "4000000000000000001",
    rate_limit_per_user: 0,
  },
  {
    id: "4000000000000000003",
    type: ChannelType.GuildVoice,
    guild_id: GUILD_ID,
    position: 1,
    permission_overwrites: [],
    name: "Voice Lounge",
    parent_id: "4000000000000000001",
    bitrate: 64000,
    user_limit: 10,
  },
];

export const sampleRoles: Role[] = [
  {
    id: GUILD_ID,
    name: "@everyone",
    color: 0,
    hoist: false,
    position: 0,
    permissions: "1071698529857",
    managed: false,
    mentionable: false,
    flags: 0,
  },
  {
    id: "5000000000000000001",
    name: "Moderator",
    color: 0x3498db,
    hoist: true,
    position: 2,
    permissions: "1099511627775",
    managed: false,
    mentionable: true,
    flags: 0,
  },
  {
    id: "5000000000000000002",
    name: "Admin",
    color: 0xe74c3c,
    hoist: true,
    position: 3,
    permissions: "8",
    managed: false,
    mentionable: false,
    flags: 0,
  },
];

export const sampleMember: GuildMember = {
  user: {
    id: "6000000000000000001",
    username: "testuser",
    discriminator: "0",
    global_name: "Test User",
    avatar: "def456avatarhash",
    bot: false,
  },
  nick: "Testy",
  avatar: null,
  roles: ["5000000000000000001"],
  joined_at: "2024-01-15T10:30:00.000Z",
  premium_since: null,
  deaf: false,
  mute: false,
  pending: false,
  communication_disabled_until: null,
};

export const sampleBan: Ban = {
  reason: "Spamming in multiple channels",
  user: {
    id: "7000000000000000001",
    username: "badactor",
    discriminator: "0",
    global_name: "Bad Actor",
    avatar: null,
  },
};
