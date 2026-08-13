
import {
  resolveRequestContext,
  type ContextLoaders,
  type MembershipRecord,
  type OrgRecord,
} from "./context";

const config = { rootDomain: "groedu.com" };

const ACME: OrgRecord = {
  organizationId: "11111111-1111-4111-8111-111111111111",
  slug: "acme",
  status: "ACTIVE",
};

function loaders(
  org: OrgRecord | null,
  membership: MembershipRecord | null,
): ContextLoaders {
  return {
    findOrganizationBySlug: async () => org,
    findMembership: async () => membership,
  };
}

const active = (role: MembershipRecord["role"]): MembershipRecord => ({
  role,
  status: "ACTIVE",
});

describe("resolveRequestContext", () => {
  it("resolves an active member of the organisation in the host", async () => {
    const ctx = await resolveRequestContext(
      { host: "acme.groedu.com", claims: { userId: "u1" } },
      config,
      loaders(ACME, active("INSTRUCTOR")),
    );

    expect(ctx.kind).toBe("organization");
    if (ctx.kind !== "organization") return;
    expect(ctx.role).toBe("INSTRUCTOR");
    expect(ctx.access).toBe("full");
    expect(ctx.actor.organizationId).toBe(ACME.organizationId);
    expect(ctx.actor.permissions.has("course:create")).toBe(true);
  });

  describe("tenant isolation", () => {
    it("returns not-found — never forbidden — for a non-member", async () => {
      // The whole point: a valid token for a real user, presented to an
      // organisation they do not belong to, must not confirm that the
      // organisation exists. [D-046]
      const ctx = await resolveRequestContext(
        { host: "acme.groedu.com", claims: { userId: "outsider" } },
        config,
        loaders(ACME, null),
      );
      expect(ctx.kind).toBe("not-found");
    });

    it("treats an unknown organisation the same as a non-member", async () => {
      const ctx = await resolveRequestContext(
        { host: "nosuchorg.groedu.com", claims: { userId: "u1" } },
        config,
        loaders(null, null),
      );
      // Identical outcome, so the two cases are indistinguishable to a caller
      // probing for which organisations exist.
      expect(ctx.kind).toBe("not-found");
    });

    it("rejects an invited-but-not-joined membership", async () => {
      const ctx = await resolveRequestContext(
        { host: "acme.groedu.com", claims: { userId: "u1" } },
        config,
        loaders(ACME, { role: "STUDENT", status: "INVITED" }),
      );
      expect(ctx.kind).toBe("not-found");
    });

    it("rejects a suspended membership", async () => {
      const ctx = await resolveRequestContext(
        { host: "acme.groedu.com", claims: { userId: "u1" } },
        config,
        loaders(ACME, { role: "ADMIN", status: "SUSPENDED" }),
      );
      expect(ctx.kind).toBe("not-found");
    });

    it("grants no organisation authority from the token alone", async () => {
      // A token is identity, not entitlement. Without a membership the same
      // token yields nothing, whatever role the user holds elsewhere.
      const ctx = await resolveRequestContext(
        {
          host: "acme.groedu.com",
          claims: { userId: "u1", platformRole: null },
        },
        config,
        loaders(ACME, null),
      );
      expect(ctx.kind).toBe("not-found");
    });
  });

  describe("organisation lifecycle", () => {
    it("is read-only when suspended [D-018]", async () => {
      const ctx = await resolveRequestContext(
        { host: "acme.groedu.com", claims: { userId: "u1" } },
        config,
        loaders({ ...ACME, status: "SUSPENDED" }, active("ADMIN")),
      );
      expect(ctx.kind === "organization" && ctx.access).toBe("read-only");
    });

    it("is fully usable during grace [D-025]", async () => {
      const ctx = await resolveRequestContext(
        { host: "acme.groedu.com", claims: { userId: "u1" } },
        config,
        loaders({ ...ACME, status: "GRACE" }, active("ADMIN")),
      );
      expect(ctx.kind === "organization" && ctx.access).toBe("full");
    });

    it("is blocked before KYC completes [D-017]", async () => {
      const ctx = await resolveRequestContext(
        { host: "acme.groedu.com", claims: { userId: "u1" } },
        config,
        loaders({ ...ACME, status: "PENDING_KYC" }, active("OWNER")),
      );
      expect(ctx.kind === "organization" && ctx.access).toBe("blocked");
    });
  });

  describe("platform console", () => {
    it("admits platform staff", async () => {
      const ctx = await resolveRequestContext(
        {
          host: "admin.groedu.com",
          claims: { userId: "staff", platformRole: "PLATFORM_OWNER" },
        },
        config,
        loaders(null, null),
      );
      expect(ctx).toEqual({
        kind: "platform",
        userId: "staff",
        platformRole: "PLATFORM_OWNER",
      });
    });

    it("hides the console from ordinary users", async () => {
      const ctx = await resolveRequestContext(
        { host: "admin.groedu.com", claims: { userId: "u1" } },
        config,
        loaders(null, null),
      );
      expect(ctx.kind).toBe("not-found");
    });
  });

  it("does not hit the database for an unparseable host", async () => {
    let touched = false;
    const ctx = await resolveRequestContext(
      { host: "acme.groedu.com.evil.com", claims: { userId: "u1" } },
      config,
      {
        findOrganizationBySlug: async () => {
          touched = true;
          return ACME;
        },
        findMembership: async () => active("OWNER"),
      },
    );
    expect(ctx.kind).toBe("not-found");
    expect(touched).toBe(false);
  });

  it("reports unauthenticated when no token is presented", async () => {
    const ctx = await resolveRequestContext(
      { host: "acme.groedu.com", claims: null },
      config,
      loaders(ACME, null),
    );
    expect(ctx.kind).toBe("unauthenticated");
  });

  it("applies custom role permissions when present [D-039]", async () => {
    const ctx = await resolveRequestContext(
      { host: "acme.groedu.com", claims: { userId: "u1" } },
      config,
      loaders(ACME, {
        role: "STUDENT",
        status: "ACTIVE",
        customPermissions: ["course:read:any", "coupon:manage"],
      }),
    );
    expect(ctx.kind).toBe("organization");
    if (ctx.kind !== "organization") return;
    expect(ctx.actor.permissions.has("coupon:manage")).toBe(true);
    expect(ctx.actor.permissions.has("progress:write:own")).toBe(false);
  });
});
