import "dotenv/config";

import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import postgres = require("postgres");

type Level = "pass" | "fail" | "warn" | "skip";

interface Result {
  group: string;
  name: string;
  level: Level;
  detail: string;
  hint?: string;
}

const results: Result[] = [];
const STRICT = process.argv.includes("--production") || process.env["NODE_ENV"] === "production";

function add(group: string, name: string, level: Level, detail: string, hint?: string): void {
  results.push({ group, name, level, detail, hint });
}

function env(key: string): string {
  return (process.env[key] ?? "").trim();
}

function requireKey(group: string, key: string, opts: { productionOnly?: boolean } = {}): string {
  const value = env(key);
  if (value !== "") {
    add(group, key, "pass", "set");
    return value;
  }
  if (opts.productionOnly && !STRICT) {
    add(group, key, "warn", "not set", `Optional in development, required in production.`);
    return "";
  }
  add(group, key, "fail", "missing", `Add ${key} to backend/.env`);
  return "";
}

async function timedFetch(
  url: string,
  init: RequestInit = {},
  timeoutMs = 15000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function checkCore(): Promise<void> {
  const group = "Core";
  const nodeEnv = env("NODE_ENV");
  if (["development", "production", "test"].includes(nodeEnv)) {
    add(group, "NODE_ENV", "pass", nodeEnv);
  } else {
    add(group, "NODE_ENV", nodeEnv === "" ? "warn" : "fail", nodeEnv || "not set", "Must be development, production or test.");
  }

  const port = env("PORT");
  const portNum = Number(port);
  if (port === "") {
    add(group, "PORT", "warn", "not set", "Defaults to 4000.");
  } else if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535) {
    add(group, "PORT", "fail", port, "Must be an integer between 1 and 65535.");
  } else if (portNum === 6000) {
    add(group, "PORT", "warn", "6000",
      "Port 6000 is on the WHATWG blocked-ports list (X11). Browsers refuse it with ERR_UNSAFE_PORT and Node fetch() rejects it as 'bad port'. It only works today because Next proxies /api server-side. Move the API off 6000 before production.");
  } else {
    add(group, "PORT", "pass", port);
  }

  for (const key of ["FRONTEND_URL", "BACKEND_URL"]) {
    const value = env(key);
    if (value === "") {
      add(group, key, "warn", "not set", "Falls back to a localhost default.");
      continue;
    }
    try {
      const url = new URL(value);
      if (STRICT && url.protocol !== "https:") {
        add(group, key, "fail", value, "Must be https in production.");
      } else if (STRICT && /localhost|127\.0\.0\.1/.test(url.hostname)) {
        add(group, key, "fail", value, "Points at localhost — wrong for production.");
      } else {
        add(group, key, "pass", value);
      }
    } catch {
      add(group, key, "fail", value, "Not a valid URL.");
    }
  }

  const cors = env("CORS_ORIGINS");
  if (cors === "") {
    add(group, "CORS_ORIGINS", STRICT ? "fail" : "warn", "not set",
      "Without it the API falls back to its default origin list; browsers will block your real front ends.");
  } else {
    const bad = cors.split(",").map((o) => o.trim()).filter((o) => {
      if (o === "") return true;
      try {
        new URL(o);
        return false;
      } catch {
        return true;
      }
    });
    if (bad.length > 0) {
      add(group, "CORS_ORIGINS", "fail", cors, `Not valid origins: ${bad.join(", ")}`);
    } else if (STRICT && /localhost|127\.0\.0\.1/.test(cors)) {
      add(group, "CORS_ORIGINS", "warn", cors, "Contains localhost — remove for production.");
    } else {
      add(group, "CORS_ORIGINS", "pass", cors);
    }
  }
}

async function checkJwt(): Promise<void> {
  const group = "Auth";
  const secret = env("JWT_SECRET");
  if (secret === "") {
    add(group, "JWT_SECRET", "fail", "missing", "Required. Generate with: openssl rand -base64 48");
  } else if (secret.length < 32) {
    add(group, "JWT_SECRET", STRICT ? "fail" : "warn", `${secret.length} chars`,
      "Must be at least 32 characters in production. Generate with: openssl rand -base64 48");
  } else if (/^(secret|changeme|password|test)/i.test(secret)) {
    add(group, "JWT_SECRET", "fail", "placeholder value", "This looks like a default. Generate a real one.");
  } else {
    add(group, "JWT_SECRET", "pass", `${secret.length} chars`);
  }

  const expires = env("JWT_EXPIRES_IN") || "7d";
  if (!/^\d+(ms|s|m|h|d|w|y)?$/.test(expires)) {
    add(group, "JWT_EXPIRES_IN", "fail", expires, "Must look like 15m, 24h or 7d.");
  } else {
    const days = /^(\d+)d$/.exec(expires);
    if (days !== null && Number(days[1]) > 1) {
      add(group, "JWT_EXPIRES_IN", "warn", expires,
        "Long-lived tokens cannot be revoked server-side; 'log out other devices' stays ineffective for this whole window. Consider 24h or less with refresh tokens.");
    } else {
      add(group, "JWT_EXPIRES_IN", "pass", expires);
    }
  }
}

async function checkDatabase(): Promise<void> {
  const group = "Database";
  const url = requireKey(group, "DATABASE_URL");
  if (url === "") return;

  if (STRICT && !/sslmode=require|ssl=true/.test(url)) {
    add(group, "DATABASE_URL · TLS", "warn", "no sslmode=require",
      "Production connections should force TLS.");
  }

  const sql = postgres(url, { max: 1, idle_timeout: 5, connect_timeout: 10 });
  try {
    const [row] = await sql<{ version: string }[]>`select version()`;
    add(group, "connect", "pass", (row?.version ?? "connected").split(",")[0] ?? "connected");

    const [counts] = await sql<{ tables: number }[]>`
      select count(*)::int as tables
        from information_schema.tables
       where table_schema = 'public'
    `;
    const tables = counts?.tables ?? 0;
    add(group, "schema", tables > 0 ? "pass" : "fail", `${tables} tables`,
      tables === 0 ? "Database is empty. Run: pnpm db:push" : undefined);

    const [applied] = await sql<{ n: number }[]>`
      select count(*)::int as n from _manual_migrations
    `.catch(() => [{ n: -1 }]);
    if ((applied?.n ?? -1) < 0) {
      add(group, "manual migrations", "warn", "_manual_migrations table absent",
        "Run: pnpm db:migrate:tenancy");
    } else {
      add(group, "manual migrations", "pass", `${applied?.n ?? 0} applied`);
    }

    const [rls] = await sql<{ n: number }[]>`
      select count(*)::int as n
        from pg_class c
        join pg_namespace ns on ns.oid = c.relnamespace
       where ns.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = true
    `;
    if ((rls?.n ?? 0) === 0) {
      add(group, "row-level security", STRICT ? "fail" : "warn", "0 tables have RLS",
        "No tenant isolation is enforced in this database. See migrations-tenancy/manual/0001_tenancy_rls.sql");
    } else {
      add(group, "row-level security", "pass", `${rls?.n ?? 0} tables protected`);
    }

    const [owner] = await sql<{ rolbypassrls: boolean }[]>`
      select rolbypassrls from pg_roles where rolname = current_user
    `;
    if (owner?.rolbypassrls === true) {
      add(group, "connection role", STRICT ? "fail" : "warn", "current_user has BYPASSRLS",
        "Every RLS policy is silently ignored for this role. Connect as a role without BYPASSRLS (see migration 0002_app_role.sql).");
    } else {
      add(group, "connection role", "pass", "no BYPASSRLS");
    }
  } catch (error) {
    add(group, "connect", "fail", error instanceof Error ? error.message : String(error),
      "Check DATABASE_URL host, credentials and network access.");
  } finally {
    await sql.end({ timeout: 5 }).catch(() => undefined);
  }
}

const STORAGE_REGIONS = ["", "ny", "la", "sg", "syd", "uk", "se", "br", "jh"];

async function checkBunnyStorage(): Promise<void> {
  const group = "Bunny Storage";
  const zone = requireKey(group, "BUNNY_STORAGE_ZONE_NAME");
  const key = requireKey(group, "BUNNY_STORAGE_API_KEY");
  const cdnHost = requireKey(group, "BUNNY_CDN_HOSTNAME");
  const region = env("BUNNY_STORAGE_REGION");
  add(group, "BUNNY_STORAGE_REGION", "pass", region === "" ? "(Falkenstein default)" : region);

  if (zone === "" || key === "") {
    add(group, "live probe", "skip", "credentials missing");
    return;
  }

  const base = region === "" ? "https://storage.bunnycdn.com" : `https://${region.toLowerCase()}.storage.bunnycdn.com`;

  let listed = false;
  try {
    const res = await timedFetch(`${base}/${zone}/`, { headers: { AccessKey: key } });
    if (res.ok) {
      listed = true;
      add(group, "list zone", "pass", `${res.status} from ${base}`);
    } else if (res.status === 401) {
      const alt: string[] = [];
      for (const r of STORAGE_REGIONS) {
        if (r === region.toLowerCase()) continue;
        const altBase = r === "" ? "https://storage.bunnycdn.com" : `https://${r}.storage.bunnycdn.com`;
        const probe = await timedFetch(`${altBase}/${zone}/`, { headers: { AccessKey: key } }).catch(() => null);
        if (probe?.ok === true) alt.push(r === "" ? "(default)" : r);
      }
      add(group, "list zone", "fail", "401 Unauthorized",
        alt.length > 0
          ? `The key works in region ${alt.join(", ")} — set BUNNY_STORAGE_REGION accordingly.`
          : "Storage password is wrong. dash.bunny.net -> Storage -> your zone -> FTP & API Access -> Password.");
    } else {
      add(group, "list zone", "fail", `${res.status} ${res.statusText}`);
    }
  } catch (error) {
    add(group, "list zone", "fail", error instanceof Error ? error.message : String(error));
  }

  if (!listed) {
    add(group, "upload/serve/delete", "skip", "cannot authenticate");
    return;
  }

  const probeKey = `healthcheck/${randomUUID()}.txt`;
  const payload = `groedu env check ${new Date().toISOString()}`;

  try {
    const put = await timedFetch(`${base}/${zone}/${probeKey}`, {
      method: "PUT",
      headers: { AccessKey: key, "Content-Type": "text/plain" },
      body: payload,
    });
    if (!put.ok) {
      add(group, "upload", "fail", `${put.status} ${await put.text()}`,
        "The key can read but not write. Use the full-access password, not a read-only one.");
      return;
    }
    add(group, "upload", "pass", `wrote ${probeKey}`);

    const readBack = await timedFetch(`${base}/${zone}/${probeKey}`, { headers: { AccessKey: key } });
    const body = readBack.ok ? await readBack.text() : "";
    add(group, "read back", body === payload ? "pass" : "fail",
      body === payload ? "content matches" : `got ${readBack.status}`);

    if (cdnHost !== "") {
      const cdnUrl = `https://${cdnHost.replace(/^https?:\/\//, "")}/${probeKey}`;
      let served = false;
      for (let attempt = 0; attempt < 3 && !served; attempt++) {
        const cdn = await timedFetch(cdnUrl).catch(() => null);
        if (cdn?.ok === true) {
          const text = await cdn.text();
          served = text === payload;
          add(group, "serve over CDN", served ? "pass" : "fail",
            served ? cdnUrl : `content mismatch from ${cdnUrl}`);
        } else if (attempt === 2) {
          add(group, "serve over CDN", "fail", `${cdn?.status ?? "no response"} from ${cdnUrl}`,
            "The zone may not be linked to this pull zone, or the hostname is wrong. This is the URL learners actually download from.");
        } else {
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    } else {
      add(group, "serve over CDN", "skip", "BUNNY_CDN_HOSTNAME not set");
    }
  } finally {
    await timedFetch(`${base}/${zone}/${probeKey}`, {
      method: "DELETE",
      headers: { AccessKey: key },
    })
      .then((res) => add(group, "delete", res.ok ? "pass" : "warn",
        res.ok ? "probe file removed" : `${res.status} — remove ${probeKey} by hand`))
      .catch(() => add(group, "delete", "warn", `could not remove ${probeKey}`));
  }
}

async function checkBunnyStream(): Promise<void> {
  const group = "Bunny Stream";
  const libraryId = requireKey(group, "BUNNY_STREAM_LIBRARY_ID");
  const apiKey = requireKey(group, "BUNNY_STREAM_API_KEY");
  const cdnHost = requireKey(group, "BUNNY_STREAM_CDN_HOSTNAME");
  const tokenKey = requireKey(group, "BUNNY_STREAM_TOKEN_KEY");

  if (libraryId === "" || apiKey === "") {
    add(group, "live probe", "skip", "credentials missing");
    return;
  }

  const api = `https://video.bunnycdn.com/library/${libraryId}`;
  let authed = false;

  try {
    const res = await timedFetch(`${api}/videos?page=1&itemsPerPage=1`, {
      headers: { AccessKey: apiKey },
    });
    if (res.ok) {
      authed = true;
      add(group, "library lookup", "pass", `library ${libraryId} reachable`);
    } else if (res.status === 401) {
      add(group, "library lookup", "fail", "401 Unauthorized",
        `Stream API key is wrong. dash.bunny.net -> Stream -> Library ${libraryId} -> API -> API Key. Note this is different from the Storage password.`);
    } else if (res.status === 404) {
      add(group, "library lookup", "fail", "404 Not Found",
        `Library ${libraryId} does not exist under this account. Check BUNNY_STREAM_LIBRARY_ID.`);
    } else {
      add(group, "library lookup", "fail", `${res.status} ${res.statusText}`);
    }
  } catch (error) {
    add(group, "library lookup", "fail", error instanceof Error ? error.message : String(error));
  }

  if (!authed) {
    add(group, "create/playback/delete", "skip", "cannot authenticate");
  } else {
    let videoId = "";
    try {
      const create = await timedFetch(`${api}/videos`, {
        method: "POST",
        headers: { AccessKey: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ title: `groedu-env-check-${randomUUID()}` }),
      });
      if (!create.ok) {
        add(group, "create video", "fail", `${create.status} ${await create.text()}`,
          "The API key can read but not create. Check its permissions.");
      } else {
        const created: unknown = await create.json();
        const guid =
          typeof created === "object" && created !== null && "guid" in created
            ? Reflect.get(created, "guid")
            : null;
        if (typeof guid === "string" && guid !== "") {
          videoId = guid;
          add(group, "create video", "pass", `guid ${guid}`);
          add(group, "tus upload endpoint", "pass", "https://video.bunnycdn.com/tusupload");
        } else {
          add(group, "create video", "fail", "response had no guid");
        }
      }
    } catch (error) {
      add(group, "create video", "fail", error instanceof Error ? error.message : String(error));
    }

    if (videoId !== "") {
      const expires = Math.floor(Date.now() / 1000) + 600;
      const token = createHash("sha256").update(tokenKey + videoId + expires).digest("hex");
      const embed = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}`;

      if (tokenKey === "") {
        add(group, "signed playback URL", "fail", "BUNNY_STREAM_TOKEN_KEY missing",
          "Without it every embed URL is unsigned and anyone can share a permanent link to paid content.");
      } else {
        const embedRes = await timedFetch(embed, { redirect: "manual" }).catch(() => null);
        const status = embedRes?.status ?? 0;
        if (status >= 200 && status < 400) {
          add(group, "signed playback URL", "pass", `embed responded ${status}`);
        } else if (status === 403) {
          add(group, "signed playback URL", "fail", "403 from embed",
            `Token rejected. BUNNY_STREAM_TOKEN_KEY must be the library's Token Authentication Key (dash.bunny.net -> Stream -> Library ${libraryId} -> Security), and token authentication must be ENABLED on the library.`);
        } else {
          add(group, "signed playback URL", "warn", `embed responded ${status}`,
            "Could not confirm playback; verify manually in a browser.");
        }
      }

      await timedFetch(`${api}/videos/${videoId}`, {
        method: "DELETE",
        headers: { AccessKey: apiKey },
      })
        .then((res) => add(group, "delete video", res.ok ? "pass" : "warn",
          res.ok ? "probe video removed" : `${res.status} — delete ${videoId} by hand`))
        .catch(() => add(group, "delete video", "warn", `could not remove ${videoId}`));
    }
  }

  if (cdnHost !== "") {
    const res = await timedFetch(`https://${cdnHost.replace(/^https?:\/\//, "")}/`).catch(() => null);
    add(group, "stream CDN hostname", res === null ? "fail" : "pass",
      res === null ? "unreachable" : `reachable (${res.status})`);
  }
}

async function checkWebhook(): Promise<void> {
  const group = "Webhooks";
  const secret = env("WEBHOOK_SECRET");
  if (secret === "") {
    add(group, "WEBHOOK_SECRET", "fail", "not set",
      "The Bunny Stream webhook controller rejects EVERY request without it, so encoded videos never get marked ready. Set it here and in dash.bunny.net -> Stream -> Library -> Webhook.");
  } else if (secret.length < 16) {
    add(group, "WEBHOOK_SECRET", "warn", `${secret.length} chars`, "Use a longer random value.");
  } else {
    add(group, "WEBHOOK_SECRET", "pass", `${secret.length} chars`);
  }
}

async function checkEmail(): Promise<void> {
  const group = "Email";
  const provider = env("EMAIL_PROVIDER") || "sendgrid";
  add(group, "EMAIL_PROVIDER", ["ses", "sendgrid"].includes(provider) ? "pass" : "fail", provider,
    ["ses", "sendgrid"].includes(provider) ? undefined : "Must be 'ses' or 'sendgrid'.");

  add(group, "EMAIL_FROM_NAME", "pass", env("EMAIL_FROM_NAME") || "grotutor (default)");

  const from = env("EMAIL_FROM_ADDRESS");
  if (from === "") {
    add(group, "EMAIL_FROM_ADDRESS", "fail", "not set",
      "Verification, password-reset and receipt emails have no From address.");
  } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(from)) {
    add(group, "EMAIL_FROM_ADDRESS", "fail", from, "Not a valid email address.");
  } else {
    add(group, "EMAIL_FROM_ADDRESS", "pass", from);
  }

  if (provider === "sendgrid") {
    const key = env("SENDGRID_API_KEY");
    if (key === "") {
      add(group, "SENDGRID_API_KEY", "fail", "not set", "Required when EMAIL_PROVIDER=sendgrid.");
      return;
    }
    if (!key.startsWith("SG.")) {
      add(group, "SENDGRID_API_KEY", "warn", "does not start with 'SG.'", "SendGrid keys normally begin with SG.");
    }
    const res = await timedFetch("https://api.sendgrid.com/v3/scopes", {
      headers: { Authorization: `Bearer ${key}` },
    }).catch(() => null);
    if (res === null) {
      add(group, "SendGrid auth", "fail", "unreachable");
    } else if (res.ok) {
      add(group, "SendGrid auth", "pass", "key accepted");
      if (from !== "") {
        const verified = await timedFetch(
          `https://api.sendgrid.com/v3/verified_senders?limit=200`,
          { headers: { Authorization: `Bearer ${key}` } },
        ).catch(() => null);
        if (verified?.ok === true) {
          const text = await verified.text();
          add(group, "sender verified", text.includes(from) ? "pass" : "warn",
            text.includes(from) ? from : `${from} not in verified senders`,
            text.includes(from) ? undefined : "SendGrid will reject mail from an unverified sender.");
        }
      }
    } else if (res.status === 401) {
      add(group, "SendGrid auth", "fail", "401 Unauthorized", "The API key is wrong or revoked.");
    } else {
      add(group, "SendGrid auth", "fail", `${res.status} ${res.statusText}`);
    }
  }
}

async function checkPayments(): Promise<void> {
  const group = "Payments";
  const id = env("RAZORPAY_KEY_ID");
  const secret = env("RAZORPAY_KEY_SECRET");

  if (id === "" && secret === "") {
    add(group, "RAZORPAY_KEY_ID / SECRET", STRICT ? "fail" : "warn", "not set",
      "Only manual-QR and free checkout will work; the RAZORPAY gateway will fail.");
  } else if (id === "" || secret === "") {
    add(group, "RAZORPAY_KEY_ID / SECRET", "fail", "only one of the pair is set",
      "Both are required together.");
  } else {
    if (STRICT && id.startsWith("rzp_test_")) {
      add(group, "Razorpay mode", "fail", "test key in production", "Use the rzp_live_ key.");
    } else {
      add(group, "Razorpay mode", "pass", id.startsWith("rzp_live_") ? "live" : "test");
    }
    const auth = Buffer.from(`${id}:${secret}`).toString("base64");
    const res = await timedFetch("https://api.razorpay.com/v1/payments?count=1", {
      headers: { Authorization: `Basic ${auth}` },
    }).catch(() => null);
    if (res === null) add(group, "Razorpay auth", "fail", "unreachable");
    else if (res.ok) add(group, "Razorpay auth", "pass", "credentials accepted");
    else if (res.status === 401) add(group, "Razorpay auth", "fail", "401 Unauthorized", "Key id/secret mismatch.");
    else add(group, "Razorpay auth", "warn", `${res.status} ${res.statusText}`);
  }

  const phonePeId = env("PHONE_PAY_CLIENT_ID");
  const phonePeSecret = env("PHONE_PAY_SECRET");
  if (phonePeId !== "" || phonePeSecret !== "") {
    add(group, "PHONE_PAY_*", "warn", "set but unused",
      "These are in .env but appear in NO config schema entry and NO source file, so they are dead configuration. The payment_gateway enum declares PHONEPE but nothing implements it. Either implement it or remove the keys.");
  }
}

async function checkOptional(): Promise<void> {
  const group = "Optional services";

  const redis = env("REDIS_URL");
  if (redis === "") {
    add(group, "REDIS_URL", "warn", "not set",
      "No shared cache. Device-session revocation is per-instance only, so 'log out other devices' will not take effect immediately across multiple API instances.");
  } else {
    try {
      new URL(redis);
      add(group, "REDIS_URL", "pass", "set");
    } catch {
      add(group, "REDIS_URL", "fail", redis, "Not a valid URL.");
    }
  }

  const pexels = env("PEXELS_API_KEY");
  if (pexels === "") {
    add(group, "PEXELS_API_KEY", "warn", "not set", "Only used by seed/demo image scripts.");
  } else {
    const res = await timedFetch("https://api.pexels.com/v1/search?query=study&per_page=1", {
      headers: { Authorization: pexels },
    }).catch(() => null);
    if (res?.ok === true) add(group, "PEXELS_API_KEY", "pass", "key accepted");
    else if (res?.status === 401) add(group, "PEXELS_API_KEY", "fail", "401 Unauthorized");
    else add(group, "PEXELS_API_KEY", "warn", `${res?.status ?? "unreachable"}`);
  }
}

function checkUnknownKeys(): void {
  const group = "Schema drift";
  const known = new Set([
    "NODE_ENV", "PORT", "FRONTEND_URL", "BACKEND_URL", "CORS_ORIGINS",
    "DATABASE_URL", "JWT_SECRET", "JWT_EXPIRES_IN",
    "BUNNY_STORAGE_ZONE_NAME", "BUNNY_STORAGE_API_KEY", "BUNNY_STORAGE_REGION", "BUNNY_CDN_HOSTNAME",
    "BUNNY_STREAM_LIBRARY_ID", "BUNNY_STREAM_API_KEY", "BUNNY_STREAM_CDN_HOSTNAME", "BUNNY_STREAM_TOKEN_KEY",
    "WEBHOOK_SECRET", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET",
    "EMAIL_PROVIDER", "EMAIL_FROM_NAME", "EMAIL_FROM_ADDRESS", "SENDGRID_API_KEY",
    "REDIS_URL", "PEXELS_API_KEY",
  ]);

  const path = join(__dirname, "..", ".env");
  if (!existsSync(path)) {
    add(group, ".env", "warn", "no backend/.env found", "Reading process environment only.");
    return;
  }
  const declared = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .map((line) => /^([A-Z0-9_]+)=/.exec(line.trim())?.[1])
    .filter((k): k is string => k !== undefined);

  const unknown = declared.filter((k) => !known.has(k));
  if (unknown.length > 0) {
    add(group, "keys not in config schema", "warn", unknown.join(", "),
      "These are never read by AppConfigService, so they do nothing. Add them to src/config/config.schema.ts or delete them.");
  } else {
    add(group, "keys not in config schema", "pass", "none");
  }

  const missing = [...known].filter((k) => !declared.includes(k));
  if (missing.length > 0) {
    add(group, "schema keys absent from .env", "warn", missing.join(", "),
      "Each falls back to a default or disables a feature. Confirm that is intended for production.");
  }
}

function report(): void {
  const icon: Record<Level, string> = {
    pass: "\x1b[32m✓ PASS\x1b[0m",
    fail: "\x1b[31m✗ FAIL\x1b[0m",
    warn: "\x1b[33m! WARN\x1b[0m",
    skip: "\x1b[2m- SKIP\x1b[0m",
  };

  let currentGroup = "";
  for (const r of results) {
    if (r.group !== currentGroup) {
      currentGroup = r.group;
      console.log(`\n\x1b[1m${currentGroup}\x1b[0m`);
      console.log("─".repeat(60));
    }
    console.log(`  ${icon[r.level]}  ${r.name}`);
    if (r.detail !== "") console.log(`         \x1b[2m${r.detail}\x1b[0m`);
    if (r.hint !== undefined) console.log(`         \x1b[36m→ ${r.hint}\x1b[0m`);
  }

  const failed = results.filter((r) => r.level === "fail");
  const warned = results.filter((r) => r.level === "warn");

  console.log("\n" + "═".repeat(60));
  console.log(
    `\x1b[1m${results.filter((r) => r.level === "pass").length} passed\x1b[0m · ` +
      `\x1b[31m${failed.length} failed\x1b[0m · ` +
      `\x1b[33m${warned.length} warnings\x1b[0m · ` +
      `\x1b[2m${results.filter((r) => r.level === "skip").length} skipped\x1b[0m`,
  );
  console.log(
    STRICT
      ? "\x1b[1mProduction mode\x1b[0m — warnings that only matter in production were escalated to failures."
      : "Development mode. Re-run with \x1b[1m--production\x1b[0m to apply production rules.",
  );

  if (failed.length > 0) {
    console.log("\n\x1b[31mBlocking issues:\x1b[0m");
    for (const f of failed) console.log(`  · ${f.group} / ${f.name} — ${f.detail}`);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  console.log(`\n\x1b[1mgroEdu environment check\x1b[0m  ${STRICT ? "(production rules)" : "(development rules)"}`);

  await checkCore();
  await checkJwt();
  await checkDatabase();
  await checkBunnyStorage();
  await checkBunnyStream();
  await checkWebhook();
  await checkEmail();
  await checkPayments();
  await checkOptional();
  checkUnknownKeys();

  report();
}

main().catch((error: unknown) => {
  console.error("\n\x1b[31mcheck-env crashed\x1b[0m", error);
  process.exit(1);
});
