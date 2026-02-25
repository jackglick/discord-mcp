/** Discord Snowflake ID (string) */
export type Snowflake = string;

/** https://discord.com/developers/docs/resources/guild#guild-object */
export interface Guild {
  id: Snowflake;
  name: string;
  icon: string | null;
  icon_hash?: string | null;
  splash: string | null;
  discovery_splash: string | null;
  owner_id: Snowflake;
  afk_channel_id: Snowflake | null;
  afk_timeout: number;
  verification_level: VerificationLevel;
  default_message_notifications: number;
  explicit_content_filter: number;
  roles: Role[];
  features: string[];
  mfa_level: number;
  system_channel_id: Snowflake | null;
  system_channel_flags: number;
  rules_channel_id: Snowflake | null;
  max_members?: number;
  vanity_url_code: string | null;
  description: string | null;
  banner: string | null;
  premium_tier: number;
  premium_subscription_count?: number;
  preferred_locale: string;
  public_updates_channel_id: Snowflake | null;
  approximate_member_count?: number;
  approximate_presence_count?: number;
  nsfw_level: number;
  safety_alerts_channel_id: Snowflake | null;
}

export enum VerificationLevel {
  None = 0,
  Low = 1,
  Medium = 2,
  High = 3,
  VeryHigh = 4,
}

/** https://discord.com/developers/docs/resources/channel#channel-object */
export interface Channel {
  id: Snowflake;
  type: ChannelType;
  guild_id?: Snowflake;
  position?: number;
  permission_overwrites?: PermissionOverwrite[];
  name?: string;
  topic?: string | null;
  nsfw?: boolean;
  bitrate?: number;
  user_limit?: number;
  rate_limit_per_user?: number;
  parent_id?: Snowflake | null;
  rtc_region?: string | null;
  default_auto_archive_duration?: number;
  flags?: number;
}

export enum ChannelType {
  GuildText = 0,
  DM = 1,
  GuildVoice = 2,
  GroupDM = 3,
  GuildCategory = 4,
  GuildAnnouncement = 5,
  AnnouncementThread = 10,
  PublicThread = 11,
  PrivateThread = 12,
  GuildStageVoice = 13,
  GuildDirectory = 14,
  GuildForum = 15,
  GuildMedia = 16,
}

export const CHANNEL_TYPE_NAMES: Record<number, string> = {
  [ChannelType.GuildText]: "Text",
  [ChannelType.GuildVoice]: "Voice",
  [ChannelType.GuildCategory]: "Category",
  [ChannelType.GuildAnnouncement]: "Announcement",
  [ChannelType.GuildStageVoice]: "Stage",
  [ChannelType.GuildForum]: "Forum",
  [ChannelType.GuildMedia]: "Media",
};

export interface PermissionOverwrite {
  id: Snowflake;
  type: 0 | 1; // 0 = role, 1 = member
  allow: string;
  deny: string;
}

/** https://discord.com/developers/docs/topics/permissions#role-object */
export interface Role {
  id: Snowflake;
  name: string;
  color: number;
  hoist: boolean;
  icon?: string | null;
  position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
  flags: number;
}

/** https://discord.com/developers/docs/resources/guild#guild-member-object */
export interface GuildMember {
  user?: User;
  nick?: string | null;
  avatar?: string | null;
  roles: Snowflake[];
  joined_at: string;
  premium_since?: string | null;
  deaf: boolean;
  mute: boolean;
  pending?: boolean;
  communication_disabled_until?: string | null;
}

/** https://discord.com/developers/docs/resources/user#user-object */
export interface User {
  id: Snowflake;
  username: string;
  discriminator: string;
  global_name?: string | null;
  avatar: string | null;
  bot?: boolean;
}

/** https://discord.com/developers/docs/resources/guild#ban-object */
export interface Ban {
  reason: string | null;
  user: User;
}

/** Discord API request options */
export interface RequestOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  reason?: string;
  query?: Record<string, string | number | undefined>;
}
