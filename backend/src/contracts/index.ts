/**
 * backend/src/contracts — single source of validation truth.
 *
 * The API validates requests with these schemas; frontends drive their forms
 * from the same ones, so the two cannot drift.
 */

export {
  emailSchema,
  passwordSchema,
  orgSlugSchema,
  uuidSchema,
  paginationSchema,
  moneyMinorSchema,
  type PaginationInput,
  type Pagination,
} from "./primitives";

export {
  createOrganizationSchema,
  updateOrganizationSchema,
  updateOrgBrandingSchema,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
  type UpdateOrgBrandingInput,
} from "./organization";

export {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  acceptInviteSchema,
  type RegisterInput,
  type LoginInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type AcceptInviteInput,
} from "./auth";

export {
  memberRoleSchema,
  inviteMemberSchema,
  bulkInviteMembersSchema,
  updateMemberRoleSchema,
  type MemberRole,
  type InviteMemberInput,
  type BulkInviteMembersInput,
  type UpdateMemberRoleInput,
} from "./membership";

export {
  createRoleSchema,
  updateRoleSchema,
  type CreateRoleInput,
  type UpdateRoleInput,
} from "./role";
