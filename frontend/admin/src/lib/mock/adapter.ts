/**
 * An axios adapter that answers requests from the in-memory store instead of
 * the network.
 *
 * Installing it at the client level means no hook, service or component has to
 * know the demo is running on mock data — they keep calling the same paths and
 * receiving the same shapes. Removing it restores real network calls.
 */

import { AxiosError } from "axios";
import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

import { MockHttpError, handlers, type HandlerContext } from "./handlers";

/** Requests resolve after a short delay so loading states are actually visible. */
const LATENCY_MS = 260;

interface ParsedRoute {
  method: string;
  segments: string[];
}

const routeTable: { route: ParsedRoute; key: string }[] = Object.keys(
  handlers,
).map((key) => {
  const [method = "GET", path = "/"] = key.split(" ");
  return {
    key,
    route: { method, segments: path.split("/").filter(Boolean) },
  };
});

function normalisePath(config: InternalAxiosRequestConfig): {
  path: string;
  query: URLSearchParams;
} {
  const raw = config.url ?? "/";
  const [pathPart = "/", queryPart = ""] = raw.split("?");
  const query = new URLSearchParams(queryPart);

  // Params passed as an object rather than in the URL.
  const params = config.params as Record<string, unknown> | undefined;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    }
  }

  // The browser client uses "/api" as its base and relies on a Next rewrite;
  // strip it so routes match the backend paths.
  const path = pathPart.replace(/^\/api(?=\/|$)/, "") || "/";
  return { path, query };
}

export function matchRoute(
  method: string,
  path: string,
): { key: string; params: Record<string, string> } | null {
  const segments = path.split("/").filter(Boolean);

  for (const { key, route } of routeTable) {
    if (route.method !== method) continue;
    if (route.segments.length !== segments.length) continue;

    const params: Record<string, string> = {};
    let matched = true;

    for (let i = 0; i < route.segments.length; i++) {
      const expected = route.segments[i] as string;
      const actual = segments[i] as string;
      if (expected.startsWith(":")) {
        params[expected.slice(1)] = decodeURIComponent(actual);
      } else if (expected !== actual) {
        matched = false;
        break;
      }
    }

    if (matched) return { key, params };
  }

  return null;
}

function parseBody(config: InternalAxiosRequestConfig): Record<string, unknown> {
  const { data } = config;
  if (!data) return {};
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (data instanceof FormData) {
    const out: Record<string, unknown> = {};
    data.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (typeof data === "object") return data as Record<string, unknown>;
  return {};
}

function respond(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown,
): AxiosResponse {
  return {
    data,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: {},
    config,
  };
}

function fail(
  config: InternalAxiosRequestConfig,
  status: number,
  message: string,
): AxiosError {
  const error = new AxiosError(
    message,
    status === 404 ? "ERR_BAD_REQUEST" : "ERR_BAD_RESPONSE",
    config,
    null,
    respond(config, status, { statusCode: status, message }),
  );
  return error;
}

export { LATENCY_MS };

export const mockAdapter: AxiosAdapter = async (config) => {
  const method = (config.method ?? "get").toUpperCase();
  const { path, query } = normalisePath(config);

  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

  const match = matchRoute(method, path);

  if (!match) {
    throw fail(
      config,
      404,
      `No demo data is wired up for ${method} ${path} yet.`,
    );
  }

  const handler = handlers[match.key];
  if (!handler) {
    throw fail(config, 404, `No handler registered for ${match.key}`);
  }

  const context: HandlerContext = {
    params: match.params,
    query,
    body: parseBody(config),
  };

  try {
    // Handlers may be async — the file-upload one has to read the blob.
    const data = await handler(context);
    return respond(config, method === "POST" ? 201 : 200, data);
  } catch (error) {
    if (error instanceof MockHttpError) {
      throw fail(config, error.status, error.message);
    }
    throw fail(
      config,
      500,
      error instanceof Error ? error.message : "Something went wrong",
    );
  }
};
