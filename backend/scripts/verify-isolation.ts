/**
 * Proves tenant isolation actually works against a real database.
 *
 *   DATABASE_URL=postgres://... pnpm db:verify:isolation
 *
 * Unit tests cannot cover this: row-level security is enforced by PostgreSQL,
 * not by application code, so the only honest verification is to insert two
 * organisations' rows and confirm one cannot see the other's.
 *
 * Runs inside a transaction that is always rolled back, so it leaves nothing
 * behind and is safe to run repeatedly.
 */
import { sql } from "drizzle-orm";

import { createDb } from "../src/tenancy/client";
import { ORG_CONTEXT_SETTING } from "../src/tenancy/schema";
import { APP_ROLE } from "../src/tenancy/tenant";

type Check = { name: string; pass: boolean; detail: string };

/**
 * Runs a statement that is EXPECTED to be rejected.
 *
 * A failed statement aborts the enclosing transaction in PostgreSQL, so every
 * later query would fail with "current transaction is aborted" and the results
 * would be meaningless. A savepoint scopes the failure so the transaction
 * survives it.
 */
async function expectRejected(
  tx: { execute: (q: ReturnType<typeof sql>) => Promise<unknown> },
  statement: ReturnType<typeof sql>,
): Promise<boolean> {
  await tx.execute(sql`savepoint expect_rejected`);
  try {
    await tx.execute(statement);
    await tx.execute(sql`release savepoint expect_rejected`);
    return false;
  } catch {
    await tx.execute(sql`rollback to savepoint expect_rejected`);
    return true;
  }
}

async function main(): Promise<void> {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const { db, close } = createDb(url, { max: 1 });
  const checks: Check[] = [];

  try {
    await db.transaction(async (tx) => {
      // --- fixtures -------------------------------------------------------
      const [orgA] = await tx.execute<{ organization_id: string }>(sql`
        insert into organizations (name, slug) values ('Alpha', 'alpha-test')
        returning organization_id
      `);
      const [orgB] = await tx.execute<{ organization_id: string }>(sql`
        insert into organizations (name, slug) values ('Beta', 'beta-test')
        returning organization_id
      `);
      if (!orgA || !orgB) throw new Error("fixture organisations not created");

      const [user] = await tx.execute<{ user_id: string }>(sql`
        insert into users (email, password_hash)
        values ('isolation@example.com', 'x') returning user_id
      `);
      if (!user) throw new Error("fixture user not created");

      await tx.execute(sql`
        insert into organization_members (user_id, organization_id, role, status)
        values (${user.user_id}, ${orgA.organization_id}, 'STUDENT', 'ACTIVE'),
               (${user.user_id}, ${orgB.organization_id}, 'STUDENT', 'ACTIVE')
      `);

      // --- drop privileges, exactly as withOrgContext does ------------------
      // Fixtures above were created as the migrating role. Everything below
      // runs as groedu_app, which has no BYPASSRLS.
      await tx.execute(sql`set local role ${sql.raw(APP_ROLE)}`);

      // --- 0. the check that would have caught the original failure ---------
      // Neon's neondb_owner has rolbypassrls=true, which overrides ENABLE and
      // FORCE alike. Every other check below passes vacuously if this one fails.
      const [role] = await tx.execute<{ u: string; rolbypassrls: boolean }>(
        sql`select current_user as u, rolbypassrls
              from pg_roles where rolname = current_user`,
      );
      checks.push({
        name: "effective role does NOT have BYPASSRLS",
        pass: role?.rolbypassrls === false,
        detail: `${role?.u ?? "?"} bypassrls=${String(role?.rolbypassrls)}`,
      });

      // --- 1. scoped to A sees only A --------------------------------------
      await tx.execute(
        sql`select set_config(${ORG_CONTEXT_SETTING}, ${orgA.organization_id}, true)`,
      );
      const inA = await tx.execute<{ organization_id: string }>(
        sql`select organization_id from organization_members`,
      );
      checks.push({
        name: "scoped to A returns only A's memberships",
        pass:
          inA.length === 1 && inA[0]?.organization_id === orgA.organization_id,
        detail: `${inA.length} row(s)`,
      });

      // --- 2. scoped to B sees only B --------------------------------------
      await tx.execute(
        sql`select set_config(${ORG_CONTEXT_SETTING}, ${orgB.organization_id}, true)`,
      );
      const inB = await tx.execute<{ organization_id: string }>(
        sql`select organization_id from organization_members`,
      );
      checks.push({
        name: "scoped to B returns only B's memberships",
        pass:
          inB.length === 1 && inB[0]?.organization_id === orgB.organization_id,
        detail: `${inB.length} row(s)`,
      });

      // --- 3. THE important one: no context returns NOTHING ----------------
      // A query that forgets withOrgContext must fail closed, not open.
      await tx.execute(sql`select set_config(${ORG_CONTEXT_SETTING}, '', true)`);
      const unscoped = await tx.execute(
        sql`select organization_id from organization_members`,
      );
      checks.push({
        name: "no org context returns ZERO rows (fails closed)",
        pass: unscoped.length === 0,
        detail: `${unscoped.length} row(s)`,
      });

      // --- 4. cannot write into another tenant ------------------------------
      await tx.execute(
        sql`select set_config(${ORG_CONTEXT_SETTING}, ${orgA.organization_id}, true)`,
      );
      const blocked = await expectRejected(
        tx,
        sql`insert into organization_members (user_id, organization_id, role, status)
            values (${user.user_id}, ${orgB.organization_id}, 'ADMIN', 'ACTIVE')`,
      );
      checks.push({
        name: "WITH CHECK blocks writing a row into another tenant",
        pass: blocked,
        detail: blocked ? "rejected" : "INSERT SUCCEEDED — policy is wrong",
      });

      // --- 5. one instructor membership per user ---------------------------
      const [orgC] = await tx.execute<{ organization_id: string }>(sql`
        insert into organizations (name, slug) values ('Gamma', 'gamma-test')
        returning organization_id
      `);
      if (!orgC) throw new Error("fixture organisation C not created");
      await tx.execute(
        sql`select set_config(${ORG_CONTEXT_SETTING}, ${orgC.organization_id}, true)`,
      );
      await tx.execute(sql`
        insert into organization_members (user_id, organization_id, role, status)
        values (${user.user_id}, ${orgC.organization_id}, 'INSTRUCTOR', 'ACTIVE')
      `);
      const [orgD] = await tx.execute<{ organization_id: string }>(sql`
        insert into organizations (name, slug) values ('Delta', 'delta-test')
        returning organization_id
      `);
      if (!orgD) throw new Error("fixture organisation D not created");
      await tx.execute(
        sql`select set_config(${ORG_CONTEXT_SETTING}, ${orgD.organization_id}, true)`,
      );
      const secondInstructorBlocked = await expectRejected(
        tx,
        sql`insert into organization_members (user_id, organization_id, role, status)
            values (${user.user_id}, ${orgD.organization_id}, 'INSTRUCTOR', 'ACTIVE')`,
      );
      checks.push({
        name: "a user cannot hold a second INSTRUCTOR membership [D-035c]",
        pass: secondInstructorBlocked,
        detail: secondInstructorBlocked ? "rejected" : "SECOND INSERT SUCCEEDED",
      });

      // Never keep the fixtures.
      throw new Error("__rollback__");
    });
  } catch (err) {
    if (!(err instanceof Error) || err.message !== "__rollback__") {
      await close();
      throw err;
    }
  }

  await close();

  let failed = 0;
  for (const c of checks) {
    console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.name}  (${c.detail})`);
    if (!c.pass) failed++;
  }
  console.log(`\n${checks.length - failed}/${checks.length} isolation checks passed`);
  if (failed > 0) process.exit(1);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
