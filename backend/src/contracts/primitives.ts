/**
 * Shared Zod primitives.
 *
 * Define once, reuse everywhere. No other file in this package may re-derive
 * email, password, or slug rules — import from here.
 */
import { isSlugAvailableForUse } from "../tenancy/host";
import { z } from "zod";

/**
 * Accepts any string, trims whitespace, lower-cases it, then validates it as
 * an e-mail address.  The transform fires before the email check so that
 * "User@Example.COM  " is normalised to "user@example.com" and accepted,
 * rather than rejected.
 */
export const emailSchema = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .pipe(z.string().email());

/**
 * Password policy: minimum 12 characters.
 *
 * No composition rules (uppercase, symbol, digit requirements).
 * NIST SP 800-63B §5.1.1 advises against composition rules — they increase
 * complexity without increasing entropy and train users toward predictable
 * workarounds.  Length is the property that matters.
 */
export const passwordSchema = z.string().min(12, {
  message: "Password must be at least 12 characters",
});

/**
 * Organisation slug: 3–63 characters, DNS-label safe (lowercase alphanumeric
 * plus interior hyphens, no leading or trailing hyphen), and not on the
 * reserved-names list.
 *
 * Normalises the input to lowercase (consistent with how the host resolver in
 * ../tenancy lowercases incoming subdomains) so the stored slug is always
 * in canonical form.  Delegates to `isSlugAvailableForUse` for the regex and
 * reserved-names check, so those two sources of truth can never drift.
 */
export const orgSlugSchema = z
  .string()
  .transform((v) => v.trim().toLowerCase())
  .pipe(
    z.string().refine(isSlugAvailableForUse, {
      message:
        "Slug must be 3–63 lowercase alphanumeric characters, may contain interior hyphens, must not start or end with a hyphen, and must not be a reserved name",
    }),
  );

/** A standard UUID v4 string. */
export const uuidSchema = z.string().uuid();

/**
 * Query-string pagination parameters.
 *
 * `perPage` is capped at 100 on the server — clients requesting more get 100.
 * Default is page 1, 20 items per page.
 */
export const paginationSchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    perPage: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

/**
 * A non-negative integer representing a monetary amount in minor units (paise
 * for INR, cents for USD, etc.).
 *
 * NOTE — the existing backend stores prices in `decimal(10,2)` columns (rupees
 * with two decimal places). That is a known defect: floating-point arithmetic
 * on monetary values introduces rounding errors.  All new money surfaces MUST
 * use minor units (integer paise). See the migration plan in specs/.
 */
export const moneyMinorSchema = z
  .number()
  .int({ message: "Money must be an integer in minor units (paise)" })
  .min(0, { message: "Money must be non-negative" });

export type PaginationInput = z.input<typeof paginationSchema>;
export type Pagination = z.output<typeof paginationSchema>;
