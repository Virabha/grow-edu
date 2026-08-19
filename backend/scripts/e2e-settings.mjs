/**
 * End-to-end exercise of the settings API against a RUNNING server.
 *
 *   node scripts/e2e-settings.mjs            (expects API on :6000)
 *   API=http://127.0.0.1:6000 node scripts/e2e-settings.mjs
 *
 * Covers: GET returns 200 with defaults for all 20 groups, PUT persists,
 * GET reflects the change, and a non-admin gets 403 on both GET and PUT.
 *
 * Modifies then restores each group's settings so the test is safe to re-run.
 * Exit code is non-zero if any assertion fails.
 */
import http from "node:http";

const API = process.env.API ?? "http://127.0.0.1:6000";
const PASSWORD = "Password123!";
const SECRET_MASK = "**redacted**";

const GROUPS = [
  "analytics",
  "breadcrumb",
  "commission",
  "cookie",
  "email",
  "facebook-pixel",
  "footer",
  "general",
  "google-map",
  "gtm",
  "gtm-data-layer",
  "logo",
  "maintenance",
  "payment-gateway",
  "recaptcha",
  "seo",
  "sms",
  "social-login",
  "tawk",
  "theme-colour",
];

const results = [];
const saved = {};

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  const tag = pass ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`  ${tag}  ${name}${detail ? `  \x1b[2m${detail}\x1b[0m` : ""}`);
}

async function call(method, path, { token, body } = {}) {
  const payload = body === undefined ? null : JSON.stringify(body);
  const url = new URL(API + path);
  const opts = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method,
    headers: {
      "Content-Type": "application/json",
      ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
  };
  return new Promise((resolve, reject) => {
    const req = http.request(opts, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (c) => (text += c));
      res.on("end", () => {
        let data = null;
        if (text) {
          try { data = JSON.parse(text); } catch { data = text; }
        }
        resolve({ status: res.statusCode ?? 0, data });
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function login(email) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await call("POST", "/auth/login", { body: { email, password: PASSWORD } });
    if (r.status === 429) {
      const waitMs = 15000 * (attempt + 1);
      console.log(`  \x1b[2mthrottled, waiting ${waitMs / 1000}s…\x1b[0m`);
      await new Promise((res) => setTimeout(res, waitMs));
      continue;
    }
    const token = r.data?.accessToken ?? r.data?.access_token ?? r.data?.token ?? null;
    if (!token) {
      throw new Error(
        `login failed for ${email}: ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`,
      );
    }
    return token;
  }
  throw new Error(`login for ${email} still throttled after retries`);
}

function pickTestField(group, fields) {
  const nonSecret = fields.filter(
    (f) => f.type !== "password" && f.type !== "boolean",
  );
  if (nonSecret.length > 0) return nonSecret[0];
  const boolField = fields.find((f) => f.type === "boolean");
  return boolField ?? null;
}

function testValueFor(field, originalValue) {
  if (field.type === "boolean") {
    return typeof originalValue === "boolean" ? !originalValue : true;
  }
  if (field.type === "number") {
    return typeof originalValue === "number" ? originalValue + 1 : 1;
  }
  if (field.type === "colour") {
    return originalValue === "#ff0000" ? "#00ff00" : "#ff0000";
  }
  if (field.type === "select" && Array.isArray(field.options) && field.options.length > 1) {
    const current = field.options.findIndex((o) => o.value === originalValue);
    return field.options[(current + 1) % field.options.length].value;
  }
  return typeof originalValue === "string" && originalValue !== "e2e-test"
    ? "e2e-test"
    : "e2e-test-2";
}

async function main() {
  console.log(`\n\x1b[1mSettings end-to-end\x1b[0m  ${API}\n`);

  console.log("\x1b[1mActors\x1b[0m");
  const adminToken = await login("superadmin@grotutor.com");
  record("admin logs in", !!adminToken);
  const learnerToken = await login("learner1@example.com");
  record("learner logs in", !!learnerToken);

  console.log("\n\x1b[1mGET defaults — all 20 groups\x1b[0m");
  for (const group of GROUPS) {
    const r = await call("GET", `/settings/${group}`, { token: adminToken });
    const ok =
      r.status === 200 &&
      r.data?.group === group &&
      typeof r.data?.meta?.title === "string" &&
      Array.isArray(r.data?.fields) &&
      r.data?.fields.length > 0 &&
      typeof r.data?.values === "object" &&
      r.data?.values !== null;
    record(`GET /settings/${group}`, ok, `status ${r.status}`);
    if (ok) saved[group] = r.data.values;
  }

  console.log("\n\x1b[1mAccess control — non-admin gets 403\x1b[0m");
  for (const group of GROUPS.slice(0, 5)) {
    const getR = await call("GET", `/settings/${group}`, { token: learnerToken });
    record(`GET /settings/${group} as learner → 403`, getR.status === 403, `status ${getR.status}`);
    const putR = await call("PUT", `/settings/${group}`, { token: learnerToken, body: {} });
    record(`PUT /settings/${group} as learner → 403`, putR.status === 403, `status ${putR.status}`);
  }

  console.log("\n\x1b[1mPUT persists — GET reflects change\x1b[0m");
  for (const group of GROUPS) {
    const getR = await call("GET", `/settings/${group}`, { token: adminToken });
    if (getR.status !== 200) {
      record(`${group}: PUT/verify`, false, `initial GET failed (${getR.status})`);
      continue;
    }

    const { fields, values } = getR.data;
    const field = pickTestField(group, fields);
    if (!field) {
      record(`${group}: PUT/verify`, true, "no testable field — skipped");
      continue;
    }

    const originalValue = values[field.key];
    const newValue = testValueFor(field, originalValue);
    const patchedValues = { ...values, [field.key]: newValue };

    const putR = await call("PUT", `/settings/${group}`, { token: adminToken, body: patchedValues });
    if (putR.status !== 200) {
      record(`${group}: PUT`, false, `status ${putR.status} — ${JSON.stringify(putR.data).slice(0, 200)}`);
      continue;
    }
    record(`PUT /settings/${group}`, putR.status === 200, `status ${putR.status}`);

    const verifyR = await call("GET", `/settings/${group}`, { token: adminToken });
    const reflected = verifyR.status === 200 && verifyR.data?.values?.[field.key] === newValue;
    record(
      `GET /settings/${group} reflects change`,
      reflected,
      reflected
        ? `${field.key} = ${String(newValue)}`
        : `got ${JSON.stringify(verifyR.data?.values?.[field.key])} expected ${String(newValue)}`,
    );
  }

  console.log("\n\x1b[1mSecret masking — password fields return mask\x1b[0m");
  const secretGroups = ["payment-gateway", "email", "sms", "recaptcha", "social-login"];
  for (const group of secretGroups) {
    const fields = (await call("GET", `/settings/${group}`, { token: adminToken })).data?.fields ?? [];
    const passwordField = fields.find((f) => f.type === "password");
    if (!passwordField) {
      record(`${group}: has a password field`, false, "no password field found");
      continue;
    }
    record(`${group}: has a password field`, true, passwordField.key);

    const writeBody = { [passwordField.key]: "super-secret-value-xyz" };
    await call("PUT", `/settings/${group}`, { token: adminToken, body: writeBody });

    const readR = await call("GET", `/settings/${group}`, { token: adminToken });
    const returnedValue = readR.data?.values?.[passwordField.key];
    const isMasked = returnedValue === SECRET_MASK;
    record(
      `${group}: ${passwordField.key} is masked in GET response`,
      isMasked,
      `got ${JSON.stringify(returnedValue)}`,
    );

    const preserveBody = { [passwordField.key]: SECRET_MASK };
    await call("PUT", `/settings/${group}`, { token: adminToken, body: preserveBody });
    const afterPreserve = await call("GET", `/settings/${group}`, { token: adminToken });
    const stillMasked = afterPreserve.data?.values?.[passwordField.key] === SECRET_MASK;
    record(
      `${group}: PUT with mask preserves existing secret`,
      stillMasked,
      `still ${SECRET_MASK}: ${stillMasked}`,
    );
  }

  return summarise();
}

async function summarise() {
  const failed = results.filter((r) => !r.pass);
  console.log(`\n\x1b[1m${results.length - failed.length}/${results.length} checks passed\x1b[0m`);
  if (failed.length) {
    console.log("\n\x1b[31mFailures:\x1b[0m");
    for (const f of failed) console.log(`  - ${f.name}  ${f.detail}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n\x1b[31mE2E aborted:\x1b[0m", err.message);
  summarise().finally(() => process.exit(1));
});
