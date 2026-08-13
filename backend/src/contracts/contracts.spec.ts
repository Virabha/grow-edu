
import { acceptInviteSchema, loginSchema, registerSchema } from "./auth";
import {
  bulkInviteMembersSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from "./membership";
import {
  createOrganizationSchema,
  updateOrgBrandingSchema,
  updateOrganizationSchema,
} from "./organization";
import {
  emailSchema,
  moneyMinorSchema,
  orgSlugSchema,
  paginationSchema,
  passwordSchema,
  uuidSchema,
} from "./primitives";
import { createRoleSchema, updateRoleSchema } from "./role";

// ---------------------------------------------------------------------------
// paginationSchema
// ---------------------------------------------------------------------------

describe("paginationSchema", () => {
  it("defaults to page 1, perPage 20 when given an empty object", () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, perPage: 20 });
  });

  it("accepts perPage exactly at the 100-item cap", () => {
    expect(paginationSchema.parse({ perPage: 100 })).toMatchObject({
      perPage: 100,
    });
  });

  it("rejects perPage above 100 (server-side cap enforcement)", () => {
    expect(() => paginationSchema.parse({ perPage: 101 })).toThrow();
    expect(() => paginationSchema.parse({ perPage: 999 })).toThrow();
  });

  it("coerces string query-string values to numbers", () => {
    expect(paginationSchema.parse({ page: "2", perPage: "50" })).toEqual({
      page: 2,
      perPage: 50,
    });
  });

  it("rejects unknown keys (strict mode)", () => {
    expect(() =>
      paginationSchema.parse({ page: 1, perPage: 20, cursor: "abc" }),
    ).toThrow();
  });

  it("rejects non-positive page numbers", () => {
    expect(() => paginationSchema.parse({ page: 0 })).toThrow();
    expect(() => paginationSchema.parse({ page: -1 })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// orgSlugSchema
// ---------------------------------------------------------------------------

describe("orgSlugSchema", () => {
  it("accepts valid slugs", () => {
    expect(() => orgSlugSchema.parse("acme")).not.toThrow();
    expect(() => orgSlugSchema.parse("st-marys")).not.toThrow();
    expect(() => orgSlugSchema.parse("abc")).not.toThrow();
    // 63 characters — maximum allowed
    expect(() => orgSlugSchema.parse("a".repeat(63))).not.toThrow();
  });

  it("rejects every reserved slug", () => {
    const reserved = [
      "www", "api", "app", "admin", "platform", "static", "cdn", "assets",
      "mail", "smtp", "ftp", "ns1", "ns2", "status", "docs", "help",
      "support", "billing", "account", "accounts", "auth", "login", "signup",
      "test", "staging", "dev",
    ];
    // Collect rather than assert per iteration: jest's expect takes no message
    // argument, and an empty-array assertion names every offender at once.
    const accepted = reserved.filter(
      (slug) => orgSlugSchema.safeParse(slug).success,
    );
    expect(accepted).toEqual([]);
  });

  it("rejects slugs shorter than 3 characters", () => {
    expect(() => orgSlugSchema.parse("ab")).toThrow();
    expect(() => orgSlugSchema.parse("a")).toThrow();
    expect(() => orgSlugSchema.parse("")).toThrow();
  });

  it("rejects a 64-character slug (one over the DNS label limit)", () => {
    expect(() => orgSlugSchema.parse("a".repeat(64))).toThrow();
  });

  it("rejects slugs with a leading hyphen", () => {
    expect(() => orgSlugSchema.parse("-acme")).toThrow();
  });

  it("rejects slugs with a trailing hyphen", () => {
    expect(() => orgSlugSchema.parse("acme-")).toThrow();
  });

  it("normalises uppercase letters to lowercase (mirrors host resolver behaviour)", () => {
    // isSlugAvailableForUse also lowercases; the schema makes the stored value
    // canonical so "Acme" and "acme" produce the same slug.
    expect(orgSlugSchema.parse("Acme")).toBe("acme");
    expect(orgSlugSchema.parse("ACME")).toBe("acme");
  });

  it("rejects slugs containing underscores or dots", () => {
    expect(() => orgSlugSchema.parse("acme_corp")).toThrow();
    expect(() => orgSlugSchema.parse("acme.corp")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// passwordSchema
// ---------------------------------------------------------------------------

describe("passwordSchema", () => {
  it("rejects passwords shorter than 12 characters", () => {
    expect(() => passwordSchema.parse("short")).toThrow();
    expect(() => passwordSchema.parse("11charshere")).toThrow(); // exactly 11
  });

  it("accepts a password of exactly 12 characters", () => {
    expect(() => passwordSchema.parse("exactly12chr")).not.toThrow();
  });

  it("accepts long passwords", () => {
    expect(() =>
      passwordSchema.parse("a-very-long-passphrase-that-is-easy-to-remember"),
    ).not.toThrow();
  });

  it("imposes no composition rules — any character mix is fine", () => {
    // NIST SP 800-63B: composition rules are counterproductive
    expect(() => passwordSchema.parse("alllowercase!!")).not.toThrow();
    expect(() => passwordSchema.parse("ALLUPPERCASEOK")).not.toThrow();
    expect(() => passwordSchema.parse("123456789012")).not.toThrow(); // digits only
    expect(() => passwordSchema.parse("            ")).not.toThrow(); // spaces only
  });
});

// ---------------------------------------------------------------------------
// emailSchema
// ---------------------------------------------------------------------------

describe("emailSchema", () => {
  it("normalises to lowercase and trims whitespace", () => {
    expect(emailSchema.parse("  User@Example.COM  ")).toBe("user@example.com");
  });

  it("rejects invalid e-mail addresses", () => {
    expect(() => emailSchema.parse("not-an-email")).toThrow();
    expect(() => emailSchema.parse("@missing-local.com")).toThrow();
    expect(() => emailSchema.parse("missing-at-sign.com")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// uuidSchema
// ---------------------------------------------------------------------------

describe("uuidSchema", () => {
  it("accepts a valid UUID v4", () => {
    expect(() =>
      uuidSchema.parse("550e8400-e29b-41d4-a716-446655440000"),
    ).not.toThrow();
  });

  it("rejects non-UUID strings", () => {
    expect(() => uuidSchema.parse("not-a-uuid")).toThrow();
    expect(() => uuidSchema.parse("123")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// moneyMinorSchema
// ---------------------------------------------------------------------------

describe("moneyMinorSchema", () => {
  it("accepts zero (free items)", () => {
    expect(() => moneyMinorSchema.parse(0)).not.toThrow();
  });

  it("accepts positive integers", () => {
    expect(() => moneyMinorSchema.parse(4999)).not.toThrow(); // ₹49.99
  });

  it("rejects negative amounts", () => {
    expect(() => moneyMinorSchema.parse(-1)).toThrow();
  });

  it("rejects fractional values (already in minor units so no decimals expected)", () => {
    expect(() => moneyMinorSchema.parse(49.99)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// createOrganizationSchema — also tests the no-organizationId rule
// ---------------------------------------------------------------------------

describe("createOrganizationSchema", () => {
  const valid = { name: "Acme Academy", slug: "acme" };

  it("accepts valid input", () => {
    expect(() => createOrganizationSchema.parse(valid)).not.toThrow();
  });

  it("rejects a client-supplied organizationId (tenancy model violation)", () => {
    expect(() =>
      createOrganizationSchema.parse({
        ...valid,
        organizationId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).toThrow();
  });

  it("rejects unknown keys (mass-assignment defence)", () => {
    expect(() =>
      createOrganizationSchema.parse({ ...valid, status: "ACTIVE" }),
    ).toThrow();
    expect(() =>
      createOrganizationSchema.parse({ ...valid, kycStatus: "VERIFIED" }),
    ).toThrow();
    expect(() =>
      createOrganizationSchema.parse({ ...valid, commissionRateBps: 0 }),
    ).toThrow();
    expect(() =>
      createOrganizationSchema.parse({ ...valid, extra: "bad" }),
    ).toThrow();
  });

  it("rejects a reserved slug", () => {
    expect(() =>
      createOrganizationSchema.parse({ name: "Admin Corp", slug: "admin" }),
    ).toThrow();
  });

  it("rejects an empty name", () => {
    expect(() =>
      createOrganizationSchema.parse({ name: "", slug: "acme" }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// updateOrganizationSchema
// ---------------------------------------------------------------------------

describe("updateOrganizationSchema", () => {
  it("accepts a name update", () => {
    expect(() =>
      updateOrganizationSchema.parse({ name: "New Name" }),
    ).not.toThrow();
  });

  it("accepts an empty object (no-op PATCH)", () => {
    expect(() => updateOrganizationSchema.parse({})).not.toThrow();
  });

  it("rejects unknown keys including slug changes", () => {
    // Slug changes are excluded from this endpoint deliberately
    expect(() =>
      updateOrganizationSchema.parse({ name: "X", slug: "new-slug" }),
    ).toThrow();
  });

  it("rejects a client-supplied organizationId", () => {
    expect(() =>
      updateOrganizationSchema.parse({
        name: "X",
        organizationId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// updateOrgBrandingSchema
// ---------------------------------------------------------------------------

describe("updateOrgBrandingSchema", () => {
  it("accepts valid branding", () => {
    expect(() =>
      updateOrgBrandingSchema.parse({
        logoUrl: "https://cdn.example.com/logo.png",
        primaryColor: "#1a2b3c",
      }),
    ).not.toThrow();
  });

  it("accepts null to remove branding values", () => {
    expect(() =>
      updateOrgBrandingSchema.parse({ logoUrl: null, primaryColor: null }),
    ).not.toThrow();
  });

  it("rejects an invalid hex color", () => {
    expect(() =>
      updateOrgBrandingSchema.parse({ primaryColor: "red" }),
    ).toThrow();
    expect(() =>
      updateOrgBrandingSchema.parse({ primaryColor: "#xyz" }),
    ).toThrow();
  });

  it("rejects a non-URL for logoUrl", () => {
    expect(() =>
      updateOrgBrandingSchema.parse({ logoUrl: "not-a-url" }),
    ).toThrow();
  });

  it("rejects unknown keys", () => {
    expect(() =>
      updateOrgBrandingSchema.parse({ logoUrl: null, organizationId: "x" }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// registerSchema
// ---------------------------------------------------------------------------

describe("registerSchema", () => {
  const valid = { email: "user@example.com", password: "validpassword1" };

  it("accepts minimal valid input", () => {
    expect(() => registerSchema.parse(valid)).not.toThrow();
  });

  it("normalises email to lowercase", () => {
    const result = registerSchema.parse({
      ...valid,
      email: "User@Example.COM",
    });
    expect(result.email).toBe("user@example.com");
  });

  it("rejects a short password", () => {
    expect(() =>
      registerSchema.parse({ ...valid, password: "short" }),
    ).toThrow();
  });

  it("rejects a client-supplied organizationId (tenancy violation)", () => {
    expect(() =>
      registerSchema.parse({
        ...valid,
        organizationId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).toThrow();
  });

  it("rejects unknown keys (mass-assignment defence)", () => {
    expect(() =>
      registerSchema.parse({ ...valid, role: "ADMIN", platformRole: "PLATFORM_OWNER" }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// loginSchema
// ---------------------------------------------------------------------------

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    expect(() =>
      loginSchema.parse({ email: "user@example.com", password: "any-value" }),
    ).not.toThrow();
  });

  it("rejects unknown keys", () => {
    expect(() =>
      loginSchema.parse({
        email: "user@example.com",
        password: "x",
        organizationId: "uuid",
      }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// acceptInviteSchema
// ---------------------------------------------------------------------------

describe("acceptInviteSchema", () => {
  it("accepts a valid invite acceptance", () => {
    expect(() =>
      acceptInviteSchema.parse({
        token: "signed-invite-token",
        password: "newvalidpassword",
      }),
    ).not.toThrow();
  });

  it("rejects role or organizationId in the body (they come from the token)", () => {
    expect(() =>
      acceptInviteSchema.parse({
        token: "t",
        password: "newvalidpassword",
        role: "STUDENT",
      }),
    ).toThrow();
    expect(() =>
      acceptInviteSchema.parse({
        token: "t",
        password: "newvalidpassword",
        organizationId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// inviteMemberSchema
// ---------------------------------------------------------------------------

describe("inviteMemberSchema", () => {
  it("accepts a valid invite", () => {
    expect(() =>
      inviteMemberSchema.parse({ email: "teacher@example.com", role: "INSTRUCTOR" }),
    ).not.toThrow();
  });

  it("rejects organizationId in the request body (tenancy violation)", () => {
    expect(() =>
      inviteMemberSchema.parse({
        email: "teacher@example.com",
        role: "INSTRUCTOR",
        organizationId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).toThrow();
  });

  it("rejects an invalid role", () => {
    expect(() =>
      inviteMemberSchema.parse({ email: "x@x.com", role: "SUPERUSER" }),
    ).toThrow();
  });

  it("accepts every valid member_role enum value", () => {
    for (const role of ["OWNER", "ADMIN", "INSTRUCTOR", "STUDENT"] as const) {
      expect(() =>
        inviteMemberSchema.parse({ email: "x@example.com", role }),
      ).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// bulkInviteMembersSchema
// ---------------------------------------------------------------------------

describe("bulkInviteMembersSchema", () => {
  it("accepts a valid member list", () => {
    expect(() =>
      bulkInviteMembersSchema.parse({
        members: [
          { email: "a@example.com", role: "STUDENT" },
          { email: "b@example.com", role: "INSTRUCTOR" },
        ],
      }),
    ).not.toThrow();
  });

  it("rejects an empty members array", () => {
    expect(() => bulkInviteMembersSchema.parse({ members: [] })).toThrow();
  });

  it("rejects organizationId at both the envelope and item level", () => {
    expect(() =>
      bulkInviteMembersSchema.parse({
        members: [{ email: "a@example.com", role: "STUDENT" }],
        organizationId: "uuid",
      }),
    ).toThrow();
    expect(() =>
      bulkInviteMembersSchema.parse({
        members: [
          { email: "a@example.com", role: "STUDENT", organizationId: "uuid" },
        ],
      }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// updateMemberRoleSchema
// ---------------------------------------------------------------------------

describe("updateMemberRoleSchema", () => {
  it("accepts a valid role change", () => {
    expect(() => updateMemberRoleSchema.parse({ role: "ADMIN" })).not.toThrow();
  });

  it("rejects organizationId or userId in the body", () => {
    expect(() =>
      updateMemberRoleSchema.parse({
        role: "ADMIN",
        organizationId: "uuid",
      }),
    ).toThrow();
    expect(() =>
      updateMemberRoleSchema.parse({ role: "ADMIN", userId: "uuid" }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// createRoleSchema
// ---------------------------------------------------------------------------

describe("createRoleSchema", () => {
  it("accepts a valid role definition", () => {
    expect(() =>
      createRoleSchema.parse({
        name: "Content Manager",
        permissions: ["course:read:any", "course:create", "lesson:manage:own"],
      }),
    ).not.toThrow();
  });

  it("rejects unknown/misspelled permissions", () => {
    expect(() =>
      createRoleSchema.parse({
        name: "Bad Role",
        permissions: ["totally:fake:permission"],
      }),
    ).toThrow();
    expect(() =>
      createRoleSchema.parse({
        name: "Typo Role",
        // correct: "course:read:any"
        permissions: ["course:read:ALL"],
      }),
    ).toThrow();
  });

  it("rejects an empty permissions array", () => {
    expect(() =>
      createRoleSchema.parse({ name: "Empty", permissions: [] }),
    ).toThrow();
  });

  it("rejects unknown keys", () => {
    expect(() =>
      createRoleSchema.parse({
        name: "X",
        permissions: ["course:read:any"],
        organizationId: "uuid",
      }),
    ).toThrow();
  });

  it("rejects organizationId in the body", () => {
    expect(() =>
      createRoleSchema.parse({
        name: "X",
        permissions: ["course:read:any"],
        organizationId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// updateRoleSchema
// ---------------------------------------------------------------------------

describe("updateRoleSchema", () => {
  it("accepts a partial update (name only)", () => {
    expect(() =>
      updateRoleSchema.parse({ name: "Renamed Role" }),
    ).not.toThrow();
  });

  it("accepts a full update", () => {
    expect(() =>
      updateRoleSchema.parse({
        name: "Full Update",
        description: "Updated desc",
        permissions: ["course:read:any"],
      }),
    ).not.toThrow();
  });

  it("rejects an empty permissions array even in an update", () => {
    expect(() =>
      updateRoleSchema.parse({ permissions: [] }),
    ).toThrow();
  });

  it("rejects unknown permissions in an update", () => {
    expect(() =>
      updateRoleSchema.parse({ permissions: ["fake:permission"] }),
    ).toThrow();
  });
});
