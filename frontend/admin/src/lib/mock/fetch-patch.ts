/**
 * Routes `fetch` calls to the in-memory store, alongside the axios adapter.
 *
 * Several feature APIs (auth, categories, companies, enrollments, analytics)
 * use raw `fetch` rather than the axios client, so the adapter alone left them
 * talking to a backend that is not running — sign-up and sign-in returned 500
 * in demo mode. Patching `fetch` covers those callers without touching them.
 *
 * Only same-origin `/api/*` requests and calls to NEXT_PUBLIC_API_URL are
 * intercepted; everything else (Next's own chunks, fonts, images) passes
 * through untouched.
 */

import { MockHttpError, handlers, type HandlerContext } from "./handlers";
import { LATENCY_MS, matchRoute } from "./adapter";

const API_PREFIX = "/api";

function targetPath(url: string): { path: string; query: URLSearchParams } | null {
  let pathname: string;
  let search = "";

  if (url.startsWith("http://") || url.startsWith("https://")) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }
    const base = process.env.NEXT_PUBLIC_API_URL ?? "";
    // Absolute calls are only ours if they point at the configured API host.
    if (!base || !url.startsWith(base.replace(/\/$/, ""))) return null;
    pathname = parsed.pathname;
    search = parsed.search;
  } else {
    const [p = "/", q = ""] = url.split("?");
    pathname = p;
    search = q ? `?${q}` : "";
    if (!pathname.startsWith(API_PREFIX)) return null;
  }

  const path = pathname.replace(/^\/api(?=\/|$)/, "") || "/";
  return { path, query: new URLSearchParams(search.replace(/^\?/, "")) };
}

async function readBody(init?: RequestInit): Promise<Record<string, unknown>> {
  const body = init?.body;
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (body instanceof FormData) {
    const out: Record<string, unknown> = {};
    body.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  return {};
}

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

let installed = false;

export function installFetchMock(): void {
  if (installed || typeof globalThis.fetch !== "function") return;
  installed = true;

  const original = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    const target = targetPath(url);
    if (!target) return original(input, init);

    const method = (
      init?.method ??
      (typeof input === "object" && "method" in input ? input.method : "GET") ??
      "GET"
    ).toUpperCase();

    const match = matchRoute(method, target.path);
    if (!match) {
      return json(404, {
        statusCode: 404,
        message: `No demo data is wired up for ${method} ${target.path} yet.`,
      });
    }

    const handler = handlers[match.key];
    if (!handler) {
      return json(404, { statusCode: 404, message: "No handler registered" });
    }

    await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

    const context: HandlerContext = {
      params: match.params,
      query: target.query,
      body: await readBody(init),
    };

    try {
      const data = await handler(context);
      return json(method === "POST" ? 201 : 200, data);
    } catch (error) {
      if (error instanceof MockHttpError) {
        return json(error.status, {
          statusCode: error.status,
          message: error.message,
        });
      }
      return json(500, {
        statusCode: 500,
        message: error instanceof Error ? error.message : "Something went wrong",
      });
    }
  };
}
