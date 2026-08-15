import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const SRC = new URL("../src/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

async function controllerFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await controllerFiles(full)));
    else if (entry.name.endsWith(".controller.ts")) found.push(full);
  }
  return found;
}

const ROUTE = /@(Get|Post|Put|Patch|Delete)\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/g;
const PARAM = /@Param\(\s*['"`]([^'"`]+)['"`]\s*\)/g;

function controllerPrefix(source) {
  const m = /@Controller\(\s*(?:['"`]([^'"`]*)['"`])?/.exec(source);
  return m?.[1] ?? "";
}

const problems = [];
let routeCount = 0;
let paramCount = 0;
let genericCount = 0;

for (const file of await controllerFiles(SRC)) {
  const source = await readFile(file, "utf8");
  const prefix = controllerPrefix(source);
  const prefixParams = [...prefix.matchAll(/:([A-Za-z0-9_]+)/g)].map((m) => m[1]);

  const routes = [...source.matchAll(ROUTE)].map((m) => ({
    method: m[1],
    path: m[2] ?? "",
    at: m.index ?? 0,
  }));

  for (let i = 0; i < routes.length; i++) {
    routeCount++;
    const route = routes[i];
    const end = i + 1 < routes.length ? routes[i + 1].at : source.length;
    const body = source.slice(route.at, end);

    const declared = new Set([
      ...prefixParams,
      ...[...route.path.matchAll(/:([A-Za-z0-9_]+)/g)].map((m) => m[1]),
    ]);

    if (declared.has("id")) genericCount++;

    for (const m of body.matchAll(PARAM)) {
      paramCount++;
      const name = m[1];
      if (!declared.has(name)) {
        problems.push(
          `${file.replace(SRC, "")}  ${route.method} '${route.path}'  ` +
            `@Param('${name}') has no matching :${name} in the route path` +
            (declared.size ? `  (declared: ${[...declared].join(", ")})` : "  (route declares no params)"),
        );
      }
    }
  }
}

console.log(`checked ${routeCount} routes, ${paramCount} @Param bindings`);

if (problems.length) {
  console.error(`\n${problems.length} mismatched @Param binding(s) — these return undefined at runtime:\n`);
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}

console.log("every @Param binding matches a parameter declared in its route path");

if (genericCount) {
  console.log(`\n${genericCount} route(s) still declare a generic :id parameter`);
}
