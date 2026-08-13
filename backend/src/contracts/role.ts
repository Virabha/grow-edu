/**
 * Custom role management schemas.
 *
 * Permissions are validated against the catalogue exported by ../tenancy.
 * Providing a permission string that does not exist in the catalogue is a
 * parse-time error — this prevents typos from silently creating roles with
 * fewer privileges than intended.
 *
 * All schemas are `.strict()` (mass-assignment defence).
 */
import { ALL_ORG_PERMISSIONS, type OrgPermission } from "../tenancy/permissions";
import { z } from "zod";

/**
 * A single permission string validated against the catalogue at parse time.
 *
 * Using `.refine()` rather than `z.enum(ALL_ORG_PERMISSIONS as [...])`
 * because the catalogue is a `readonly string[]` whose length is not known at
 * compile time, making the tuple cast fragile.  The runtime behaviour is
 * identical: unknown strings are rejected with a descriptive message.
 */
const orgPermissionSchema = z.string().refine(
  (p): p is OrgPermission =>
    (ALL_ORG_PERMISSIONS as readonly string[]).includes(p),
  { message: "Unknown permission — must be a value from the permission catalogue" },
);

/** Create a new custom role within the organisation. */
export const createRoleSchema = z
  .object({
    /** Display name for the role, e.g. "Content Manager". */
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    /** At least one permission is required for a role to be useful. */
    permissions: z
      .array(orgPermissionSchema)
      .min(1, "A role must have at least one permission"),
  })
  .strict();

/**
 * Update an existing custom role.
 *
 * All fields are optional — a PATCH with `{ permissions: [...] }` replaces the
 * permission set in full; partial permission lists are not merged server-side.
 */
export const updateRoleSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    permissions: z
      .array(orgPermissionSchema)
      .min(1, "A role must have at least one permission")
      .optional(),
  })
  .strict();

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
