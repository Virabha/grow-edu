-- Tenancy enforcement.
--
-- Runs AFTER the drizzle-generated table migration. Everything in this file is
-- load-bearing: without it the schema is a shared database with an
-- organization_id column and nothing stopping a missing WHERE clause.
--
-- Decisions: [D-044] RLS as backstop, [D-045] transaction-scoped context,
-- [D-035c] one instructor membership per user, [D-035e] membership is itself
-- tenant-scoped.

--------------------------------------------------------------------- roles

-- The API connects as groedu_app and IS subject to RLS.
-- The platform console connects as groedu_platform and bypasses it [D-013].
-- Neither owns the tables, so neither can quietly escape policy.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'groedu_app') THEN
    CREATE ROLE groedu_app NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'groedu_platform') THEN
    CREATE ROLE groedu_platform NOLOGIN BYPASSRLS;
  END IF;
END
$$;

--------------------------------------------------------------- constraints

-- [D-035c] A user may hold at most ONE instructor membership, across all
-- organisations. Student memberships stay unlimited and may coexist with it.
-- Expressed as a partial unique index so it cannot be forgotten by a new code
-- path, raced past by concurrent inserts, or bypassed by a bulk import.
CREATE UNIQUE INDEX IF NOT EXISTS one_instructor_membership_per_user
  ON organization_members (user_id)
  WHERE role = 'INSTRUCTOR';

-- Email uniqueness must be case-insensitive, or Foo@x.com and foo@x.com are
-- two accounts. Students reuse one identity across organisations [D-035a], so
-- a duplicate here splits a person in two.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key
  ON users (lower(email));

-- Subdomains are the tenant key [D-045]; reserve the names that would collide
-- with platform hosts or be mistaken for them.
ALTER TABLE organizations
  ADD CONSTRAINT organizations_slug_not_reserved
  CHECK (slug NOT IN (
    'www','api','app','admin','platform','static','cdn','assets','mail',
    'smtp','ftp','ns1','ns2','status','docs','help','support','billing',
    'account','accounts','auth','login','signup','test','staging','dev'
  ));

-- 3-63 chars, DNS-label safe. Minimum of three is a product choice: one- and
-- two-character subdomains are scarce, confusable and squatted.
-- MUST stay identical to SLUG_RE in packages/auth/src/host.ts.
ALTER TABLE organizations
  ADD CONSTRAINT organizations_slug_format
  CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$');

------------------------------------------------------------------- the RLS

-- Applies the standard tenant policy to a table. Every tenant-owned table gets
-- this exactly once; doing it by hand per table is how one gets missed.
--
-- FORCE is essential: without it the table OWNER silently bypasses the policy,
-- which is precisely the case that hides a leak during development.
--
-- Fail-closed by design: current_setting(..., true) yields NULL when context
-- was never set, and `organization_id = NULL` is NULL, not true. A query that
-- forgets withOrgContext() therefore returns ZERO rows rather than ALL rows.
CREATE OR REPLACE FUNCTION apply_tenant_rls(target regclass)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', target);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', target);
  EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %s', target);
  EXECUTE format($f$
    CREATE POLICY tenant_isolation ON %s
      USING      (organization_id = current_setting('app.current_org', true)::uuid)
      WITH CHECK (organization_id = current_setting('app.current_org', true)::uuid)
  $f$, target);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %s TO groedu_app', target);
END
$$;

-- [D-035e] Membership is tenant-scoped like everything else, so no
-- organisation can discover that one of its students studies elsewhere. This
-- privacy property is what makes shared student identity safe to offer.
SELECT apply_tenant_rls('organization_members');

-- organizations and users are deliberately NOT under tenant RLS:
--   organizations — a row IS a tenant; scoping it by itself is circular.
--                   Access is controlled at the application layer, which only
--                   ever loads the organisation resolved from the request host.
--   users         — global identity shared across organisations [D-035a].
--                   A user row carries no organisation data; everything that
--                   reveals *where* someone belongs lives in the membership
--                   table above, which IS scoped.
GRANT SELECT, INSERT, UPDATE ON organizations TO groedu_app;
GRANT SELECT, INSERT, UPDATE ON users TO groedu_app;

------------------------------------------------------------------ reminder

COMMENT ON FUNCTION apply_tenant_rls(regclass) IS
  'Call once for every tenant-owned table. A table with an organization_id but '
  'no policy is a silent cross-tenant leak; see specs/00-architecture.md.';
