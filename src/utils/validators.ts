import { z } from "zod/v4";
import { ChannelType } from "../discord/types.ts";

/** Discord snowflake ID: 17-20 digit string */
export const snowflake = z.string().regex(/^\d{17,20}$/, "Must be a valid Discord snowflake ID");

/** Permission bitfield as a string of digits */
export const permissionBitfield = z.string().regex(/^\d+$/, "Must be a permission bitfield string");

/** Color as integer (0x000000 - 0xFFFFFF) */
export const color = z.number().int().min(0).max(0xffffff);

/** Channel types that can be created in a guild */
export const guildChannelType = z.nativeEnum(ChannelType).describe(
  "Channel type: 0=Text, 2=Voice, 4=Category, 5=Announcement, 13=Stage, 15=Forum, 16=Media",
);

/** Permission overwrite for channel */
export const permissionOverwrite = z.object({
  id: snowflake.describe("Role or user ID"),
  type: z.union([z.literal(0), z.literal(1)]).describe("0 = role, 1 = member"),
  allow: permissionBitfield.optional().describe("Allowed permissions bitfield"),
  deny: permissionBitfield.optional().describe("Denied permissions bitfield"),
});
