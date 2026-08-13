/**
 * Organisation permission catalogue.
 *
 * [D-039] chose custom roles built from permission checkboxes. The SkillGro
 * role editor displays a count of 226 permissions and never names one, so this
 * catalogue is authored rather than harvested. It is derived from the actions
 * present in specs/inventory/*.csv.
 *
 * This is a SEED, not the finished catalogue — it covers the resources the
 * tenancy-first slice needs [D-033]. Permissions are added as each module lands.
 * Adding one is cheap; changing the shape later is not, which is why ownership
 * is encoded in the key from the start.
 *
 * Two conventions, both load-bearing:
 *
 *   `<resource>:<action>:own`  acts on rows the user owns
 *   `<resource>:<action>:any`  acts on any row IN THE CURRENT ORGANISATION
 *
 * "any" never means across organisations. Cross-tenant access is not a
 * permission — it is impossible by construction [D-044].
 */

export const ORG_PERMISSIONS = {
  organization: [
    "organization:read",
    "organization:update",
    "organization:branding:update",
    "organization:billing:read",
    "organization:billing:update",
    "organization:usage:read",
  ],
  members: [
    "member:read",
    "member:invite",
    "member:remove",
    "member:role:update",
    "member:import",
  ],
  roles: [
    "role:read",
    "role:create",
    "role:update",
    "role:delete",
  ],
  course: [
    "course:read:own",
    "course:read:any",
    "course:create",
    "course:update:own",
    "course:update:any",
    "course:delete:own",
    "course:delete:any",
    "course:publish:own",
    "course:publish:any",
    "course:preview:own",
    "course:preview:any",
    "course:analytics:own",
    "course:analytics:any",
  ],
  content: [
    "lesson:manage:own",
    "lesson:manage:any",
    "quiz:manage:own",
    "quiz:manage:any",
    "assignment:manage:own",
    "assignment:manage:any",
    "assignment:grade:own",
    "assignment:grade:any",
  ],
  taxonomy: [
    "category:manage",
    "language:manage",
    "level:manage",
  ],
  commerce: [
    "order:read:any",
    "order:refund",
    "coupon:manage",
    "payout:read:own",
    "payout:read:any",
    "payout:request",
    "payout:approve",
  ],
  learning: [
    "enrollment:read:own",
    "enrollment:read:any",
    "enrollment:create:any",
    "progress:write:own",
    "certificate:read:own",
    // Org staff verify a student's certificate on request. Added after the
    // catalogue-integrity test showed certificate:read had no :any form,
    // leaving admins unable to answer "did this person really pass?".
    "certificate:read:any",
  ],
  cms: [
    "page:manage",
    "menu:manage",
    "blog:manage",
    "faq:manage",
  ],
} as const;

type Catalogue = typeof ORG_PERMISSIONS;
export type PermissionGroup = keyof Catalogue;
export type OrgPermission = Catalogue[PermissionGroup][number];

export const ALL_ORG_PERMISSIONS: readonly OrgPermission[] = Object.values(
  ORG_PERMISSIONS,
).flatMap((group) => group);

/**
 * The `<resource>:<action>` half of a permission that has `:own` / `:any`
 * forms — e.g. `"course:update"`. Derived from the catalogue, so `canAct`
 * cannot be called with a base that does not exist.
 */
type BaseOf<P> = P extends `${infer B}:own`
  ? B
  : P extends `${infer B}:any`
    ? B
    : never;

export type PermissionBase = BaseOf<OrgPermission>;

/**
 * Membership lookups are string lookups. Widening to ReadonlySet<string> lets
 * `canAct` and `isOrgPermission` ask about a runtime-constructed key without
 * asserting it is an OrgPermission — which for some bases it genuinely is not
 * (`progress:write` has no `:any` form, see OWN_ONLY_PERMISSIONS).
 */
const KNOWN_PERMISSIONS: ReadonlySet<string> = new Set<string>(
  ALL_ORG_PERMISSIONS,
);

/** Runtime-checked narrowing — the membership test justifies the predicate. */
export function isOrgPermission(value: string): value is OrgPermission {
  return KNOWN_PERMISSIONS.has(value);
}

/**
 * Permissions that intentionally have no `:any` counterpart, because acting on
 * someone else's instance is not a capability anyone should hold.
 *
 * Everything else with an `:own` form must have an `:any` form — otherwise an
 * administrator simply cannot perform the action, since `canAct` only escalates
 * via `:any`. The catalogue-integrity test enforces that, and this set is the
 * explicit, reasoned exception list rather than a hole in the check.
 */
export const OWN_ONLY_PERMISSIONS: ReadonlySet<OrgPermission> = new Set([
  // Writing another person's progress is forging a learning record. An admin
  // may read progress and revoke an enrolment; they may not claim someone
  // watched a lesson.
  "progress:write:own",
]);

/**
 * Defaults for the built-in roles. An organisation may define custom roles
 * [D-039]; these are what it starts from.
 *
 * STUDENT is deliberately tiny. Every capability a student has is enumerated
 * here — if something is missing a student can do, it is a bug in this list,
 * not something to be granted implicitly elsewhere.
 */
export const BUILTIN_ROLE_PERMISSIONS: Record<
  "OWNER" | "ADMIN" | "INSTRUCTOR" | "STUDENT",
  readonly OrgPermission[]
> = {
  OWNER: ALL_ORG_PERMISSIONS,

  ADMIN: ALL_ORG_PERMISSIONS.filter(
    (p) => !p.startsWith("organization:billing") && p !== "organization:update",
  ),

  INSTRUCTOR: [
    "organization:read",
    "course:read:own",
    "course:create",
    "course:update:own",
    "course:delete:own",
    "course:publish:own",
    // [D-052] preview is scoped to their OWN courses. Granting :any here would
    // be a free-access path around the paywall for colleagues' paid content.
    "course:preview:own",
    "course:analytics:own",
    "lesson:manage:own",
    "quiz:manage:own",
    "assignment:manage:own",
    "assignment:grade:own",
    "enrollment:read:own",
    "payout:read:own",
    "payout:request",
  ],

  STUDENT: [
    "organization:read",
    "course:read:any",
    "enrollment:read:own",
    "progress:write:own",
    "certificate:read:own",
  ],
};

export interface OrgActor {
  userId: string;
  organizationId: string;
  permissions: ReadonlySet<OrgPermission>;
}

/** Does the actor hold this permission outright? */
export function can(actor: OrgActor, permission: OrgPermission): boolean {
  return actor.permissions.has(permission);
}

/**
 * Ownership-aware check. Prefer this for anything with `:own` / `:any` forms —
 * it removes the commonest authorisation bug, which is checking `:own` and then
 * forgetting to compare the owner.
 *
 *   canAct(actor, "course:update", { ownerId: course.instructorId })
 */
export function canAct(
  actor: OrgActor,
  base: PermissionBase,
  resource: { ownerId: string | null | undefined },
): boolean {
  // Widened to string: `${base}:any` is a well-formed key but not always a
  // member of OrgPermission, so claiming otherwise would be false.
  const held: ReadonlySet<string> = actor.permissions;
  if (held.has(`${base}:any`)) return true;
  if (!resource.ownerId || resource.ownerId !== actor.userId) return false;
  return held.has(`${base}:own`);
}

/** Validates a custom role's permission list against the catalogue. */
export function parsePermissions(input: readonly string[]): {
  valid: OrgPermission[];
  unknown: string[];
} {
  const valid: OrgPermission[] = [];
  const unknown: string[] = [];
  for (const p of input) {
    // isOrgPermission narrows p — no assertion needed.
    if (isOrgPermission(p)) valid.push(p);
    else unknown.push(p);
  }
  return { valid, unknown };
}
