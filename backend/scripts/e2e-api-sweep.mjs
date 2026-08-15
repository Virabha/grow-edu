import http from "node:http";

const API = process.env.API ?? "http://127.0.0.1:6000";
const PASSWORD = "Password123!";

const results = [];

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  if (!pass) console.log(`  \x1b[31mFAIL\x1b[0m  ${name}  \x1b[2m${detail}\x1b[0m`);
}

function call(method, path, { token, body } = {}) {
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
          try {
            data = JSON.parse(text);
          } catch {
            data = text;
          }
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
      await new Promise((res) => setTimeout(res, 15000 * (attempt + 1)));
      continue;
    }
    const token = r.data?.accessToken ?? r.data?.access_token ?? r.data?.token ?? null;
    if (!token) throw new Error(`login failed for ${email}: ${r.status}`);
    return { token, userId: r.data?.user?.userId ?? r.data?.user?.id ?? null };
  }
  throw new Error(`login for ${email} still throttled`);
}

const SAMPLE_ID = "00000000-0000-0000-0000-000000000000";

function fillParams(path) {
  return path.replace(/\{([^}]+)\}/g, (_, name) => {
    if (name === "slug") return "does-not-exist";
    return SAMPLE_ID;
  });
}

async function main() {
  console.log(`\n\x1b[1mAPI sweep\x1b[0m  ${API}\n`);

  const spec = await call("GET", "/api-docs-json");
  if (spec.status !== 200 || !spec.data?.paths) {
    console.error(
      `Could not read the OpenAPI document (status ${spec.status}). ` +
        `Swagger is only mounted outside production — check NODE_ENV.`,
    );
    process.exit(1);
  }

  const admin = await login("superadmin@grotutor.com");
  const student = await login("learner1@example.com");
  console.log("  logged in as admin and student\n");

  const paths = spec.data.paths;
  const routes = [];
  for (const [path, methods] of Object.entries(paths)) {
    for (const method of Object.keys(methods)) {
      routes.push({ path, method: method.toUpperCase() });
    }
  }
  console.log(`  ${routes.length} routes declared across ${Object.keys(paths).length} paths\n`);

  const getRoutes = routes.filter((r) => r.method === "GET");

  let checked = 0;
  for (const route of getRoutes) {
    const concrete = fillParams(route.path);
    for (const actor of [
      { name: "admin", token: admin.token },
      { name: "student", token: student.token },
    ]) {
      const r = await call("GET", concrete, { token: actor.token });
      checked++;

      record(
        `GET ${route.path} [${actor.name}] does not 500`,
        r.status !== 500,
        `status ${r.status} ${typeof r.data === "object" ? JSON.stringify(r.data).slice(0, 160) : String(r.data).slice(0, 160)}`,
      );

      const hasParam = route.path.includes("{");
      if (!hasParam) {
        record(
          `GET ${route.path} [${actor.name}] route is reachable`,
          r.status !== 404,
          `status ${r.status}`,
        );
      }
    }
  }

  console.log(`\n  ${checked} GET calls made\n`);

  const paramRoutes = routes.filter((r) => r.path.includes("{"));
  const genericIdParams = paramRoutes.filter((r) => /\{id\}/.test(r.path));
  record(
    "no route still uses a generic {id} parameter",
    genericIdParams.length === 0,
    genericIdParams.length
      ? genericIdParams.map((r) => `${r.method} ${r.path}`).join(", ").slice(0, 400)
      : "",
  );

  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  console.log(
    `\x1b[1m${passed}/${results.length} checks passed\x1b[0m` +
      (failed ? `  \x1b[31m${failed} failed\x1b[0m` : ""),
  );
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error("\n\x1b[31mscript error\x1b[0m", err);
  process.exit(1);
});
