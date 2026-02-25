/**
 * Discord permission bitfield flags.
 * All values are bigint because the bitfield exceeds 53-bit precision.
 * https://discord.com/developers/docs/topics/permissions#permissions-bitwise-permission-flags
 */
export const PermissionFlags = {
  CreateInstantInvite: 1n << 0n,
  KickMembers: 1n << 1n,
  BanMembers: 1n << 2n,
  Administrator: 1n << 3n,
  ManageChannels: 1n << 4n,
  ManageGuild: 1n << 5n,
  AddReactions: 1n << 6n,
  ViewAuditLog: 1n << 7n,
  PrioritySpeaker: 1n << 8n,
  Stream: 1n << 9n,
  ViewChannel: 1n << 10n,
  SendMessages: 1n << 11n,
  SendTTSMessages: 1n << 12n,
  ManageMessages: 1n << 13n,
  EmbedLinks: 1n << 14n,
  AttachFiles: 1n << 15n,
  ReadMessageHistory: 1n << 16n,
  MentionEveryone: 1n << 17n,
  UseExternalEmojis: 1n << 18n,
  ViewGuildInsights: 1n << 19n,
  Connect: 1n << 20n,
  Speak: 1n << 21n,
  MuteMembers: 1n << 22n,
  DeafenMembers: 1n << 23n,
  MoveMembers: 1n << 24n,
  UseVAD: 1n << 25n,
  ChangeNickname: 1n << 26n,
  ManageNicknames: 1n << 27n,
  ManageRoles: 1n << 28n,
  ManageWebhooks: 1n << 29n,
  ManageGuildExpressions: 1n << 30n,
  UseApplicationCommands: 1n << 31n,
  RequestToSpeak: 1n << 32n,
  ManageEvents: 1n << 33n,
  ManageThreads: 1n << 34n,
  CreatePublicThreads: 1n << 35n,
  CreatePrivateThreads: 1n << 36n,
  UseExternalStickers: 1n << 37n,
  SendMessagesInThreads: 1n << 38n,
  UseEmbeddedActivities: 1n << 39n,
  ModerateMembers: 1n << 40n,
  ViewCreatorMonetizationAnalytics: 1n << 41n,
  UseSoundboard: 1n << 42n,
  CreateGuildExpressions: 1n << 43n,
  CreateEvents: 1n << 44n,
  UseExternalSounds: 1n << 45n,
  SendVoiceMessages: 1n << 46n,
  SendPolls: 1n << 49n,
  UseExternalApps: 1n << 50n,
} as const;

export type PermissionName = keyof typeof PermissionFlags;

/** Convert a permission bitfield string to a list of human-readable names. */
export function resolvePermissionNames(bitfield: string): PermissionName[] {
  const value = BigInt(bitfield);
  const names: PermissionName[] = [];
  for (const [name, flag] of Object.entries(PermissionFlags)) {
    if (value & flag) {
      names.push(name as PermissionName);
    }
  }
  return names;
}

/** Convert an array of permission names to a bitfield string. */
export function buildPermissionBitfield(names: PermissionName[]): string {
  let value = 0n;
  for (const name of names) {
    const flag = PermissionFlags[name];
    if (flag === undefined) {
      throw new Error(`Unknown permission: ${name}`);
    }
    value |= flag;
  }
  return value.toString();
}

/** All valid permission names for use in Zod schemas. */
export const PERMISSION_NAMES = Object.keys(PermissionFlags) as [
  PermissionName,
  ...PermissionName[],
];
