/**
 * Organisation request schemas.
 *
 * Hard rules:
 *   - `organizationId` is NEVER accepted from a client.  It is resolved from
 *     the subdomain on every request [D-045].  If you are tempted to add it
 *     here, that is the bug the tenancy model exists to prevent.
 *   - `status`, `kycStatus`, and `commissionRateBps` are platform-only fields;
 *     they are not client-settable and are absent from every schema here.
 *   - All schemas are `.strict()` so unknown keys are rejected (mass-assignment
 *     defence).
 */
import { z } from "zod";
import { orgSlugSchema } from "./primitives";

/**
 * Create a new organisation.  The owner's account and the first membership row
 * are created in the same transaction by the handler.
 */
export const createOrganizationSchema = z
  .object({
    /** Human-readable display name, e.g. "Acme Academy". */
    name: z.string().min(1).max(255),
    /** Subdomain label.  Validated against DNS rules and the reserved-name list. */
    slug: orgSlugSchema,
  })
  .strict();

/**
 * Update basic organisation details.
 *
 * Slug changes are intentionally excluded: changing the subdomain would break
 * all existing bookmarks and embedded links, and requires a coordinated DNS
 * update.  If slug migration is ever needed it will be a dedicated, audited
 * endpoint with a redirect grace period, not a plain PATCH field.
 */
export const updateOrganizationSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
  })
  .strict();

/**
 * Update branding.  Separate from the main update so permissions can be
 * scoped independently (`organization:branding:update` vs `organization:update`).
 */
export const updateOrgBrandingSchema = z
  .object({
    /**
     * Absolute URL to the organisation logo.  Pass `null` to remove the logo.
     * The server validates the URL is reachable and within an allowed CDN
     * domain before persisting.
     */
    logoUrl: z.string().url().nullish(),
    /**
     * Six-digit hex colour used as the tenant primary brand colour.
     * Pass `null` to reset to the platform default.
     */
    primaryColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Must be a 6-digit hex color, e.g. #1a2b3c")
      .nullish(),
  })
  .strict();

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type UpdateOrgBrandingInput = z.infer<typeof updateOrgBrandingSchema>;
