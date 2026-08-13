/**
 * Membership management schemas.
 *
 * `organizationId` is NEVER accepted from a client — it comes from the
 * subdomain.  `userId` for the target member comes from the URL path, not the
 * request body, so it is also absent from these schemas.
 *
 * All schemas are `.strict()` (mass-assignment defence).
 */
import { z } from "zod";
import { emailSchema } from "./primitives";

/**
 * The role enum for organisation members.
 *
 * Values MUST match the `member_role` Postgres enum in
 * packages/db/src/schema.ts exactly.  If the DB enum changes, update here too.
 */
export const memberRoleSchema = z.enum([
  "OWNER",
  "ADMIN",
  "INSTRUCTOR",
  "STUDENT",
]);

export type MemberRole = z.infer<typeof memberRoleSchema>;

/**
 * Internal item shape reused by both single and bulk invite.
 * Kept un-exported so consumers use the named invite schemas below.
 */
const memberInviteItemSchema = z
  .object({
    email: emailSchema,
    role: memberRoleSchema,
  })
  .strict();

/** Invite a single member by e-mail. */
export const inviteMemberSchema = memberInviteItemSchema;

/**
 * Bulk-invite up to 500 members in one request.
 *
 * The client is expected to parse any CSV file locally and send the result as
 * a typed JSON array, not a raw CSV string.  This keeps the API transport and
 * the file format decoupled, and means the client can validate addresses before
 * the round-trip.
 */
export const bulkInviteMembersSchema = z
  .object({
    members: z
      .array(memberInviteItemSchema)
      .min(1, "At least one member is required")
      .max(500, "Maximum 500 invites per request"),
  })
  .strict();

/**
 * Change the role of an existing member.
 * The target member's userId is supplied as a URL path parameter.
 */
export const updateMemberRoleSchema = z
  .object({
    role: memberRoleSchema,
  })
  .strict();

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type BulkInviteMembersInput = z.infer<typeof bulkInviteMembersSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
