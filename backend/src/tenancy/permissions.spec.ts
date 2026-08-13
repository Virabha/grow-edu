
import {
  ALL_ORG_PERMISSIONS,
  BUILTIN_ROLE_PERMISSIONS,
  can,
  canAct,
  isOrgPermission,
  OWN_ONLY_PERMISSIONS,
  parsePermissions,
  type OrgActor,
  type OrgPermission,
} from "./permissions";

const actorWith = (...permissions: OrgPermission[]): OrgActor => ({
  userId: "u1",
  organizationId: "org1",
  permissions: new Set(permissions),
});

describe("can", () => {
  it("is exact — no implicit inheritance between permissions", () => {
    const a = actorWith("course:update:own");
    expect(can(a, "course:update:own")).toBe(true);
    expect(can(a, "course:update:any")).toBe(false);
    expect(can(a, "course:delete:own")).toBe(false);
  });
});

describe("canAct", () => {
  it("allows an owner acting on their own resource", () => {
    const a = actorWith("course:update:own");
    expect(canAct(a, "course:update", { ownerId: "u1" })).toBe(true);
  });

  it("denies :own against someone else's resource", () => {
    // The bug this function exists to prevent: holding :own and forgetting to
    // compare the owner.
    const a = actorWith("course:update:own");
    expect(canAct(a, "course:update", { ownerId: "u2" })).toBe(false);
  });

  it("allows :any regardless of owner", () => {
    const a = actorWith("course:update:any");
    expect(canAct(a, "course:update", { ownerId: "u2" })).toBe(true);
  });

  it("denies when the resource has no owner and only :own is held", () => {
    const a = actorWith("course:update:own");
    expect(canAct(a, "course:update", { ownerId: null })).toBe(false);
    expect(canAct(a, "course:update", { ownerId: undefined })).toBe(false);
  });

  it("denies when neither form is held", () => {
    expect(canAct(actorWith(), "course:update", { ownerId: "u1" })).toBe(false);
  });
});

describe("built-in roles", () => {
  it("gives a student only its enumerated capabilities", () => {
    const student = new Set(BUILTIN_ROLE_PERMISSIONS.STUDENT);
    expect(student.has("progress:write:own")).toBe(true);
    expect(student.has("course:create")).toBe(false);
    expect(student.has("member:invite")).toBe(false);
    expect(student.has("order:refund")).toBe(false);
  });

  it("does not let an instructor preview a colleague's course [D-052]", () => {
    // course:preview:any would be a free-access path around the paywall for
    // paid content the instructor does not own.
    const instructor = new Set(BUILTIN_ROLE_PERMISSIONS.INSTRUCTOR);
    expect(instructor.has("course:preview:own")).toBe(true);
    expect(instructor.has("course:preview:any")).toBe(false);
  });

  it("keeps an instructor away from other people's courses and money", () => {
    const instructor = new Set(BUILTIN_ROLE_PERMISSIONS.INSTRUCTOR);
    expect(instructor.has("course:update:any")).toBe(false);
    expect(instructor.has("payout:approve")).toBe(false);
    expect(instructor.has("order:refund")).toBe(false);
    expect(instructor.has("member:role:update")).toBe(false);
  });

  it("withholds billing from admin but not from owner", () => {
    const admin = new Set(BUILTIN_ROLE_PERMISSIONS.ADMIN);
    const owner = new Set(BUILTIN_ROLE_PERMISSIONS.OWNER);
    expect(admin.has("organization:billing:update")).toBe(false);
    expect(owner.has("organization:billing:update")).toBe(true);
  });

  it("grants the owner everything in the catalogue", () => {
    expect(new Set(BUILTIN_ROLE_PERMISSIONS.OWNER).size).toBe(
      ALL_ORG_PERMISSIONS.length,
    );
  });
});

describe("catalogue integrity", () => {
  it("has no duplicate keys across groups", () => {
    expect(new Set(ALL_ORG_PERMISSIONS).size).toBe(ALL_ORG_PERMISSIONS.length);
  });

  it("pairs every :own permission with an :any counterpart, or allowlists it", () => {
    // canAct only escalates via :any, so an :own with no :any means no
    // administrator can ever perform that action. Sometimes that is correct —
    // those cases live in OWN_ONLY_PERMISSIONS with a stated reason, so the
    // gap is a decision rather than an oversight.
    // Collected rather than asserted per iteration: jest's expect takes no
    // message argument, and an empty-array assertion names every offender.
    const missingAnyForm = ALL_ORG_PERMISSIONS.filter(
      (p) =>
        p.endsWith(":own") &&
        !OWN_ONLY_PERMISSIONS.has(p) &&
        // Built at runtime from a slice, so it is a string until proven
        // otherwise — isOrgPermission is exactly that proof.
        !isOrgPermission(`${p.slice(0, -4)}:any`),
    );
    expect(missingAnyForm).toEqual([]);
  });

  it("only allowlists permissions that genuinely exist", () => {
    const notInCatalogue = [...OWN_ONLY_PERMISSIONS].filter(
      (p) => !ALL_ORG_PERMISSIONS.includes(p),
    );
    expect(notInCatalogue).toEqual([]);
  });
});

describe("parsePermissions", () => {
  it("separates known from unknown", () => {
    const { valid, unknown } = parsePermissions([
      "course:create",
      "course:teleport",
      "coupon:manage",
    ]);
    expect(valid).toEqual(["course:create", "coupon:manage"]);
    expect(unknown).toEqual(["course:teleport"]);
  });

  it("rejects everything when given nonsense", () => {
    const { valid, unknown } = parsePermissions(["*", "admin", ""]);
    expect(valid).toEqual([]);
    expect(unknown).toHaveLength(3);
  });
});
