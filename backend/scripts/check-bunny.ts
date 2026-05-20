/**
 * Bunny credential health-check.
 *
 * Probes each Bunny endpoint with the credentials in .env and reports
 * pass/fail for every one. Exit code 0 = all good, 1 = at least one failure.
 *
 *   pnpm ts-node -r tsconfig-paths/register scripts/check-bunny.ts
 *   pnpm tsx scripts/check-bunny.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });

type CheckResult = {
  name: string;
  ok: boolean;
  detail: string;
  hint?: string;
};

const env = {
  storageRegion: process.env.BUNNY_STORAGE_REGION ?? "",
  storageZone: process.env.BUNNY_STORAGE_ZONE_NAME ?? "",
  storageKey: process.env.BUNNY_STORAGE_API_KEY ?? "",
  cdnHost: process.env.BUNNY_CDN_HOSTNAME ?? "",
  streamLibraryId: process.env.BUNNY_STREAM_LIBRARY_ID ?? "",
  streamKey: process.env.BUNNY_STREAM_API_KEY ?? "",
  streamTokenKey: process.env.BUNNY_STREAM_TOKEN_KEY ?? "",
  streamCdnHost: process.env.BUNNY_STREAM_CDN_HOSTNAME ?? "",
};

function storageBaseUrl(): string {
  const prefix = env.storageRegion ? `${env.storageRegion.toLowerCase()}.` : "";
  return `https://${prefix}storage.bunnycdn.com`;
}

function mask(value: string): string {
  if (!value) return "(empty)";
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms = 15_000,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms),
    ),
  ]);
}

// ── Checks ────────────────────────────────────────────────────────

const BUNNY_REGIONS: { code: string; label: string }[] = [
  { code: "", label: "de (Falkenstein, default)" },
  { code: "ny", label: "ny (New York)" },
  { code: "la", label: "la (Los Angeles)" },
  { code: "sg", label: "sg (Singapore)" },
  { code: "syd", label: "syd (Sydney)" },
  { code: "uk", label: "uk (London)" },
  { code: "se", label: "se (Stockholm)" },
  { code: "br", label: "br (São Paulo)" },
  { code: "jh", label: "jh (Johannesburg)" },
];

async function probeStorageRegion(): Promise<{
  region: string;
  status: number;
} | null> {
  for (const r of BUNNY_REGIONS) {
    const host = r.code
      ? `https://${r.code}.storage.bunnycdn.com`
      : `https://storage.bunnycdn.com`;
    try {
      const res = await withTimeout(
        fetch(`${host}/${env.storageZone}/`, {
          method: "GET",
          headers: {
            AccessKey: env.storageKey,
            Accept: "application/json",
          },
        }),
        8_000,
      );
      if (res.ok) return { region: r.label, status: res.status };
    } catch {
      // ignore, try next region
    }
  }
  return null;
}

async function checkStorageList(): Promise<CheckResult> {
  const name = "Storage · list root";
  if (!env.storageZone || !env.storageKey) {
    return {
      name,
      ok: false,
      detail: "Missing BUNNY_STORAGE_ZONE_NAME or BUNNY_STORAGE_API_KEY",
    };
  }
  const url = `${storageBaseUrl()}/${env.storageZone}/`;
  try {
    const res = await withTimeout(
      fetch(url, {
        method: "GET",
        headers: { AccessKey: env.storageKey, Accept: "application/json" },
      }),
    );
    if (res.status === 401) {
      // Probe other regions before giving up — maybe the zone lives elsewhere.
      const match = await probeStorageRegion();
      if (match) {
        return {
          name,
          ok: false,
          detail: "401 in configured region, but key works elsewhere",
          hint: `Same key returned 200 from region "${match.region}". Set BUNNY_STORAGE_REGION=${match.region.split(" ")[0]} in .env.`,
        };
      }
      return {
        name,
        ok: false,
        detail: "401 Unauthorized in every region tried",
        hint:
          "Storage API key is wrong. Go to dash.bunny.net → Storage → " +
          env.storageZone +
          " → FTP & API Access → copy the Password field.",
      };
    }
    if (res.status === 404)
      return {
        name,
        ok: false,
        detail: "404 Not Found",
        hint: `Zone "${env.storageZone}" doesn't exist in this region. Check BUNNY_STORAGE_ZONE_NAME and BUNNY_STORAGE_REGION.`,
      };
    if (!res.ok)
      return { name, ok: false, detail: `${res.status} ${res.statusText}` };
    const body = (await res.json().catch((): unknown[] => [])) as unknown[];
    return {
      name,
      ok: true,
      detail: `200 OK · ${Array.isArray(body) ? body.length : "?"} item(s) at zone root`,
    };
  } catch (e) {
    return { name, ok: false, detail: (e as Error).message };
  }
}

async function checkStorageUpload(): Promise<CheckResult> {
  const name = "Storage · write probe";
  if (!env.storageZone || !env.storageKey) {
    return { name, ok: false, detail: "Missing storage env vars" };
  }
  const key = `__healthcheck/${Date.now()}.txt`;
  const url = `${storageBaseUrl()}/${env.storageZone}/${key}`;
  try {
    const res = await withTimeout(
      fetch(url, {
        method: "PUT",
        headers: {
          AccessKey: env.storageKey,
          "Content-Type": "text/plain",
        },
        body: "grotutor-bunny-check",
      }),
    );
    if (res.status === 401)
      return {
        name,
        ok: false,
        detail: "401 Unauthorized",
        hint: "Storage API key cannot write to this zone.",
      };
    if (!res.ok)
      return { name, ok: false, detail: `${res.status} ${res.statusText}` };

    // Clean up immediately so we don't litter the bucket.
    const del = await withTimeout(
      fetch(url, {
        method: "DELETE",
        headers: { AccessKey: env.storageKey },
      }),
    );
    const cleanup = del.ok ? "deleted probe file" : `cleanup ${del.status}`;
    return { name, ok: true, detail: `201 Created · ${cleanup}` };
  } catch (e) {
    return { name, ok: false, detail: (e as Error).message };
  }
}

async function checkCdnHost(): Promise<CheckResult> {
  const name = "Storage CDN · hostname reachable";
  if (!env.cdnHost) return { name, ok: false, detail: "Missing BUNNY_CDN_HOSTNAME" };
  try {
    const res = await withTimeout(
      fetch(`https://${env.cdnHost}/`, { method: "HEAD" }),
    );
    // Any 2xx/3xx/4xx means the CDN is responding. 5xx or network = bad.
    if (res.status >= 500) {
      return { name, ok: false, detail: `${res.status} ${res.statusText}` };
    }
    return {
      name,
      ok: true,
      detail: `reachable · ${res.status} ${res.statusText}`,
    };
  } catch (e) {
    return {
      name,
      ok: false,
      detail: (e as Error).message,
      hint: `DNS or network issue reaching ${env.cdnHost}.`,
    };
  }
}

async function checkStreamLibrary(): Promise<CheckResult> {
  const name = "Stream · library lookup";
  if (!env.streamLibraryId || !env.streamKey) {
    return {
      name,
      ok: false,
      detail: "Missing BUNNY_STREAM_LIBRARY_ID or BUNNY_STREAM_API_KEY",
    };
  }
  const url = `https://video.bunnycdn.com/library/${env.streamLibraryId}`;
  try {
    const res = await withTimeout(
      fetch(url, {
        method: "GET",
        headers: { AccessKey: env.streamKey, Accept: "application/json" },
      }),
    );
    if (res.status === 401)
      return {
        name,
        ok: false,
        detail: "401 Unauthorized",
        hint:
          "Stream API key is wrong. Generate one at: dash.bunny.net → Stream → Library " +
          env.streamLibraryId +
          " → API → API Key.",
      };
    if (res.status === 404)
      return {
        name,
        ok: false,
        detail: "404 Not Found",
        hint: `Library ${env.streamLibraryId} does not exist on this account.`,
      };
    if (!res.ok)
      return { name, ok: false, detail: `${res.status} ${res.statusText}` };
    const body = (await res.json().catch(() => ({}))) as {
      Id?: number;
      Name?: string;
      VideoCount?: number;
    };
    return {
      name,
      ok: true,
      detail: `200 OK · "${body.Name ?? "unnamed"}" · ${body.VideoCount ?? 0} video(s)`,
    };
  } catch (e) {
    return { name, ok: false, detail: (e as Error).message };
  }
}

async function checkStreamCdnHost(): Promise<CheckResult> {
  const name = "Stream CDN · hostname reachable";
  if (!env.streamCdnHost)
    return { name, ok: false, detail: "Missing BUNNY_STREAM_CDN_HOSTNAME" };
  try {
    const res = await withTimeout(
      fetch(`https://${env.streamCdnHost}/`, { method: "HEAD" }),
    );
    if (res.status >= 500) {
      return { name, ok: false, detail: `${res.status} ${res.statusText}` };
    }
    return {
      name,
      ok: true,
      detail: `reachable · ${res.status} ${res.statusText}`,
    };
  } catch (e) {
    return {
      name,
      ok: false,
      detail: (e as Error).message,
      hint: `DNS or network issue reaching ${env.streamCdnHost}.`,
    };
  }
}

function checkStreamTokenKey(): CheckResult {
  const name = "Stream · token signing key present";
  if (!env.streamTokenKey)
    return {
      name,
      ok: false,
      detail: "Missing BUNNY_STREAM_TOKEN_KEY",
      hint:
        "Required to sign secure URLs. For most Bunny Stream libraries this is the same as BUNNY_STREAM_API_KEY — just copy that value here.",
    };
  return { name, ok: true, detail: "present" };
}

// ── Runner ────────────────────────────────────────────────────────

function printConfig() {
  console.log("\nLoaded env:");
  console.log(`  BUNNY_STORAGE_REGION      = ${env.storageRegion || "(default · de)"}`);
  console.log(`  BUNNY_STORAGE_ZONE_NAME   = ${env.storageZone || "(empty)"}`);
  console.log(`  BUNNY_STORAGE_API_KEY     = ${mask(env.storageKey)}`);
  console.log(`  BUNNY_CDN_HOSTNAME        = ${env.cdnHost || "(empty)"}`);
  console.log(`  BUNNY_STREAM_LIBRARY_ID   = ${env.streamLibraryId || "(empty)"}`);
  console.log(`  BUNNY_STREAM_API_KEY      = ${mask(env.streamKey)}`);
  console.log(`  BUNNY_STREAM_TOKEN_KEY    = ${mask(env.streamTokenKey)}`);
  console.log(`  BUNNY_STREAM_CDN_HOSTNAME = ${env.streamCdnHost || "(empty)"}\n`);
}

function printResult(r: CheckResult) {
  const tick = r.ok ? "✓" : "✗";
  const label = r.ok ? "PASS" : "FAIL";
  console.log(`  ${tick} ${label}  ${r.name}`);
  console.log(`         ${r.detail}`);
  if (r.hint) console.log(`         hint: ${r.hint}`);
}

async function main() {
  console.log("\nBunny credential check");
  console.log("─".repeat(60));
  printConfig();

  const results: CheckResult[] = [];
  results.push(await checkStorageList());
  results.push(await checkStorageUpload());
  results.push(await checkCdnHost());
  results.push(await checkStreamLibrary());
  results.push(await checkStreamCdnHost());
  results.push(checkStreamTokenKey());

  console.log("Results:");
  console.log("─".repeat(60));
  results.forEach(printResult);

  const failed = results.filter((r) => !r.ok);
  console.log("─".repeat(60));
  if (failed.length === 0) {
    console.log(`\nAll ${results.length} checks passed.\n`);
    process.exit(0);
  }
  console.log(`\n${failed.length} of ${results.length} checks failed.\n`);
  process.exit(1);
}

main().catch((e) => {
  console.error("\nUnexpected error:", e);
  process.exit(2);
});
