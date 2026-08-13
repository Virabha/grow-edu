-- Make the tenant policy tolerate a blank org context.
--
-- 0001 wrote the predicate as:
--     organization_id = current_setting('app.current_org', true)::uuid
--
-- `current_setting(..., true)` yields NULL when the setting was never set, and
-- NULL compares to nothing, so a query outside withOrgContext correctly returns
-- zero rows. But if the setting is present and EMPTY — `set_config(..., '')`,
-- which is what resetting it within a transaction actually does — the cast
-- `''::uuid` raises `invalid input syntax for type uuid`.
--
-- An exception is still fail-closed, so this was never a data leak. It is
-- nonetheless the wrong behaviour: a blank context should deny cleanly, not
-- turn into a 500. `nullif(..., '')` maps empty to NULL and restores the
-- intended "matches nothing" semantics.
--
-- Found by verify-isolation.ts, not by review.

CREATE OR REPLACE FUNCTION apply_tenant_rls(target regclass)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', target);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', target);
  EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %s', target);
  EXECUTE format($f$
    CREATE POLICY tenant_isolation ON %s
      USING      (organization_id = nullif(current_setting('app.current_org', true), '')::uuid)
      WITH CHECK (organization_id = nullif(current_setting('app.current_org', true), '')::uuid)
  $f$, target);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %s TO groedu_app', target);
END
$$;

-- Re-apply to every table that already has the old policy.
SELECT apply_tenant_rls('organization_members');
