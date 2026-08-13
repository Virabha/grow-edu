
import { isSlugAvailableForUse, normalizeSlug, resolveHost } from "./host";

const config = { rootDomain: "groedu.com" };

describe("resolveHost", () => {
  it("resolves a tenant subdomain", () => {
    expect(resolveHost("acme.groedu.com", config)).toEqual({
      kind: "organization",
      slug: "acme",
    });
  });

  it("ignores port and case", () => {
    expect(resolveHost("ACME.GroEdu.com:3000", config)).toEqual({
      kind: "organization",
      slug: "acme",
    });
  });

  it("accepts the FQDN trailing dot form", () => {
    expect(resolveHost("acme.groedu.com.", config)).toEqual({
      kind: "organization",
      slug: "acme",
    });
  });

  it("treats apex and www as public", () => {
    expect(resolveHost("groedu.com", config)).toEqual({ kind: "public" });
    expect(resolveHost("www.groedu.com", config)).toEqual({ kind: "public" });
  });

  it("routes the platform console", () => {
    expect(resolveHost("admin.groedu.com", config)).toEqual({ kind: "platform" });
  });

  it("honours a custom platform subdomain", () => {
    expect(
      resolveHost("ops.groedu.com", { ...config, platformSubdomain: "ops" }),
    ).toEqual({ kind: "platform" });
    // and the default no longer applies
    expect(
      resolveHost("admin.groedu.com", { ...config, platformSubdomain: "ops" }),
    ).toEqual({ kind: "unknown" });
  });

  describe("host header attacks", () => {
    // The Host header is attacker-controlled. Each of these must NOT yield
    // { kind: "organization", slug: "acme" }.
    const attacks = [
      "acme.groedu.com.evil.com", // suffix smuggling
      "evil.com",
      "notgroedu.com", // endsWith without the dot
      "xgroedu.com",
      "acme.evil.com",
      "a.b.groedu.com", // two labels is not a tenant
      ".groedu.com",
      "..groedu.com",
      "acme..groedu.com",
      "-acme.groedu.com", // leading hyphen is not a legal label
      "acme-.groedu.com",
      "ac me.groedu.com",
      "acme_x.groedu.com",
    ];

    for (const host of attacks) {
      it(`rejects ${host}`, () => {
        const r = resolveHost(host, config);
        expect(r.kind).not.toBe("organization");
      });
    }

    it("rejects reserved names as tenants", () => {
      for (const reserved of ["api", "cdn", "billing", "auth", "static"]) {
        expect(resolveHost(`${reserved}.groedu.com`, config).kind).toBe(
          "unknown",
        );
      }
    });

    // Pins the suffix boundary specifically. Mutating `endsWith` to `includes`
    // survived the rest of this suite, because the "exactly one label" check
    // happens to catch the same hosts — the two are mutually redundant. That
    // redundancy is deliberate, but it means neither is independently covered,
    // so these cases assert the boundary directly. Do not delete one check on
    // the grounds that the other covers it.
    it("requires the root domain at the END, not merely present", () => {
      const hosts = [
        "acme.groedu.com.evil.com", // suffix in the middle
        "acme.groedu.commercial.com", // suffix is a prefix of a longer label
        "acme.groedu.comm", // one character too many
        "acme.groedu.co", // one character too few
      ];
      const wronglyAccepted = hosts.filter(
        (h) => resolveHost(h, config).kind === "organization",
      );
      expect(wronglyAccepted).toEqual([]);
    });
  });

  it("returns unknown for missing or empty host", () => {
    expect(resolveHost(undefined, config)).toEqual({ kind: "unknown" });
    expect(resolveHost(null, config)).toEqual({ kind: "unknown" });
    expect(resolveHost("   ", config)).toEqual({ kind: "unknown" });
  });

  it("accepts a 63-character label but not 64", () => {
    const ok = "a".repeat(63);
    const tooLong = "a".repeat(64);
    expect(resolveHost(`${ok}.groedu.com`, config).kind).toBe("organization");
    expect(resolveHost(`${tooLong}.groedu.com`, config).kind).toBe("unknown");
  });
});

describe("isSlugAvailableForUse", () => {
  it("accepts ordinary slugs", () => {
    expect(isSlugAvailableForUse("acme")).toBe(true);
    expect(isSlugAvailableForUse("st-marys-school")).toBe(true);
  });

  it("rejects reserved names, so signup cannot claim them", () => {
    expect(isSlugAvailableForUse("www")).toBe(false);
    expect(isSlugAvailableForUse("ADMIN")).toBe(false);
  });

  it("rejects malformed slugs", () => {
    for (const bad of ["", "a", "ab", "-x", "x-", "x_y", "x.y", "Ünicode"]) {
      expect(isSlugAvailableForUse(bad)).toBe(false);
    }
  });

  // Pins a contract that is easy to misread: this normalises before checking,
  // so mixed case is ACCEPTED. Callers must store normalizeSlug(input) — the
  // database CHECK is lower-case only, and resolveHost lower-cases the host,
  // so an organisation stored as "Acme" would be permanently unreachable.
  it("accepts mixed case, because it normalises first", () => {
    expect(isSlugAvailableForUse("Acme")).toBe(true);
    expect(isSlugAvailableForUse("  ACME  ")).toBe(true);
    expect(normalizeSlug("  ACME  ")).toBe("acme");
  });

  it("rejects a reserved name however it is cased", () => {
    expect(isSlugAvailableForUse("WWW")).toBe(false);
    expect(isSlugAvailableForUse(" Admin ")).toBe(false);
  });
});
