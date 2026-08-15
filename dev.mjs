#!/usr/bin/env node
/**
 * Local dev runner — starts the backend and both frontends together.
 *
 * Deliberately dependency-free (Node built-ins only). Installing anything here
 * would create a root `node_modules` and `pnpm-lock.yaml`, and Next.js would
 * then infer the repo root as its workspace root and resolve Tailwind from the
 * wrong place — which is exactly what broke the learner app on 2026-08-13.
 * Do not add dependencies to the root package.json.
 *
 *   node dev.mjs          start everything
 *   node dev.mjs --stop   free the ports and exit
 */
import { spawn, spawnSync } from "node:child_process";
import { get } from "node:http";
import { platform } from "node:os";

const WIN = platform() === "win32";

const SERVICES = [
  { name: "api    ", port: 6000, dir: "backend", script: "start:dev", colour: "\x1b[36m" },
  { name: "admin  ", port: 6001, dir: "frontend/admin", script: "dev", colour: "\x1b[35m" },
  { name: "learner", port: 6002, dir: "frontend/learner", script: "dev", colour: "\x1b[32m" },
];

const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

/** PIDs listening on a port. Windows `netstat`; `lsof` elsewhere. */
function pidsOnPort(port) {
  const out = WIN
    ? spawnSync("netstat", ["-ano"], { encoding: "utf8" }).stdout ?? ""
    : spawnSync("lsof", ["-ti", `tcp:${port}`], { encoding: "utf8" }).stdout ?? "";

  if (!WIN) return [...new Set(out.split(/\s+/).filter(Boolean))];

  return [
    ...new Set(
      out
        .split(/\r?\n/)
        .filter((l) => new RegExp(`:${port}\\s`).test(l) && /LISTENING/.test(l))
        .map((l) => l.trim().split(/\s+/).pop())
        .filter((p) => p && p !== "0"),
    ),
  ];
}

/**
 * Kill a process AND its children.
 *
 * `nest start --watch` and `next dev` both spawn grandchildren. Killing only
 * the parent leaves them holding the port — the failure mode that makes a
 * restart look like "address already in use".
 */
function killTree(pid) {
  if (WIN) spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
  else {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        /* already gone */
      }
    }
  }
}

function freePorts() {
  let freed = 0;
  for (const { port } of SERVICES) {
    for (const pid of pidsOnPort(port)) {
      killTree(pid);
      freed++;
    }
  }
  return freed;
}

function isUp(port) {
  return new Promise((resolve) => {
    const req = get({ host: "127.0.0.1", port, path: "/", timeout: 2000 }, (res) => {
      res.resume();
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function announceWhenReady() {
  const pending = new Map(SERVICES.map((s) => [s.port, s]));
  const started = Date.now();

  while (pending.size > 0 && Date.now() - started < 5 * 60_000) {
    await new Promise((r) => setTimeout(r, 2000));
    for (const [port, svc] of [...pending]) {
      if (await isUp(port)) {
        pending.delete(port);
        const secs = ((Date.now() - started) / 1000).toFixed(0);
        console.log(
          `${svc.colour}${BOLD}  ✓ ${svc.name.trim()}${RESET} ready on ` +
            `${BOLD}http://localhost:${port}${RESET} ${DIM}(${secs}s)${RESET}`,
        );
      }
    }
  }
  if (pending.size === 0) {
    console.log(`\n${BOLD}All three are up.${RESET} ${DIM}Ctrl+C stops everything.${RESET}\n`);
  }
}

// --------------------------------------------------------------------------

if (process.argv.includes("--stop")) {
  const n = freePorts();
  console.log(n ? `stopped ${n} process tree(s) on 6000/6001/6002` : "nothing was running");
  process.exit(0);
}

const stale = freePorts();
if (stale) console.log(`${DIM}freed ${stale} stale process tree(s) first${RESET}`);

console.log(`${BOLD}starting groEdu${RESET} ${DIM}— api :6000 · admin :6001 · learner :6002${RESET}\n`);

const children = [];

for (const svc of SERVICES) {
  const child = spawn("pnpm", ["run", svc.script], {
    cwd: new URL(`./${svc.dir}/`, import.meta.url),
    shell: true,
    detached: !WIN, // own process group, so we can kill the whole tree
    stdio: ["ignore", "pipe", "pipe"],
  });

  const prefix = `${svc.colour}${svc.name}${RESET} ${DIM}│${RESET} `;
  const pipe = (stream, toErr = false) => {
    let buf = "";
    stream.on("data", (chunk) => {
      buf += chunk.toString();
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim()) (toErr ? process.stderr : process.stdout).write(prefix + line + "\n");
      }
    });
  };
  pipe(child.stdout);
  pipe(child.stderr, true);

  child.on("exit", (code) => {
    if (!shuttingDown && code !== 0) {
      console.error(`\n${RED}${svc.name.trim()} exited with code ${code}${RESET}`);
      console.error(`${DIM}its log is above — the other services are still running${RESET}\n`);
    }
  });

  children.push(child);
}

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${DIM}stopping…${RESET}`);
  for (const c of children) if (c.pid) killTree(c.pid);
  // Belt and braces: the watchers respawn children, so sweep the ports too.
  setTimeout(() => {
    freePorts();
    process.exit(0);
  }, 500);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

announceWhenReady();
