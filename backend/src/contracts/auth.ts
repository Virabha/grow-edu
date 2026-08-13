/**
 * Authentication request schemas.
 *
 * `organizationId` is never a field here — the tenant is resolved from the
 * request subdomain, never from the request body [D-045].
 *
 * All schemas are `.strict()` (mass-assignment defence).
 */
import { z } from "zod";
import { emailSchema, passwordSchema } from "./primitives";

/** Create a new platform user account.  Membership is granted separately. */
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    /** Display name, optional at registration. */
    fullName: z.string().min(1).max(255).optional(),
  })
  .strict();

/** Authenticate an existing user.  Returns a signed JWT on success. */
export const loginSchema = z
  .object({
    email: emailSchema,
    /**
     * Raw password.  Not validated against length rules here — the stored hash
     * is the truth, and a wrong-length string simply won't match.
     */
    password: z.string().min(1),
  })
  .strict();

/** Request a password-reset e-mail. */
export const forgotPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

/**
 * Complete a password reset using the token from the e-mail link.
 * The token is opaque (typically a signed JWT or a random UUID stored in the
 * DB); the handler verifies its validity and expiry.
 */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
  })
  .strict();

/**
 * Accept a membership invitation.
 *
 * The invite token encodes the target organisation and role — the client
 * must not supply those separately, which is why `organizationId` and `role`
 * are absent.  If the invitee already has an account the handler may allow
 * `password` to be omitted; that variant is handled in the route layer.
 */
export const acceptInviteSchema = z
  .object({
    /** Opaque token from the invitation e-mail link. */
    token: z.string().min(1),
    /** Required when the invitee is creating a new account. */
    password: passwordSchema,
    fullName: z.string().min(1).max(255).optional(),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
