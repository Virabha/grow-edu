-- Make the application actually run WITHOUT the RLS bypass.
--
-- Why this migration exists:
--
--   0001 enabled RLS, forced it, and wrote the policies — and isolation still
--   did not work. The managed-Postgres role the app connects as (Neon's
--   `neondb_owner`, RDS's master user, Supabase's `postgres`) is very often
--   created with BYPASSRLS. That attribute overrides everything, including
--   FORCE ROW LEVEL SECURITY. Every policy is silently ignored and every tenant
--   sees every other tenant's rows.
--
--   Verified on Neon: rolbypassrls = true on neondb_owner, with
--   relrowsecurity = true and relforcerowsecurity = true on the table. The
--   configuration was correct and the isolation was still absent.
--
-- The fix: the connection may authenticate as the privileged role, but every
-- query must RUN as `groedu_app`, which has no BYPASSRLS. `withOrgContext`
-- issues `SET LOCAL ROLE groedu_app` — transaction-scoped, like the org
-- context itself, so it is safe under PgBouncer transaction pooling.

-- groedu_app must be able to reach the schema at all.
GRANT USAGE ON SCHEMA public TO groedu_app;

-- Sequences, for any table that gains a serial/identity column later.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO groedu_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO groedu_app;

-- Tables created by 0001 that are not tenant-scoped still need access;
-- apply_tenant_rls() grants the scoped ones.
GRANT SELECT, INSERT, UPDATE, DELETE ON organizations TO groedu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO groedu_app;

-- Allow whoever runs migrations to SET ROLE groedu_app. Without this the
-- application cannot drop its privileges, and RLS stays bypassed.
DO $$
BEGIN
  EXECUTE format('GRANT groedu_app TO %I', current_user);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
