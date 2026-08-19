import http from "node:http";
import https from "node:https";
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

import "dotenv/config";

const API = process.env.API ?? "http://127.0.0.1:6000";
const PASSWORD = "Password123!";
const VIDEO = process.env.SAMPLE_VIDEO ?? join(tmpdir(), "groedu-e2e", "sample.mp4");
const ENCODE_TIMEOUT_MS = Number(process.env.ENCODE_TIMEOUT_MS ?? 300000);

const results = [];
const cleanup = [];

function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  const tag = pass ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`  ${tag}  ${name}${detail ? `  \x1b[2m${detail}\x1b[0m` : ""}`);
}

function info(msg) {
  console.log(`  \x1b[2m${msg}\x1b[0m`);
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

function httpsRequest(url, { method = "GET", headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, method, headers },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks),
          }),
        );
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
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
    if (!token) throw new Error(`login failed for ${email}: ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
    return { token, userId: r.data?.user?.userId ?? r.data?.user?.id ?? null, role: r.data?.user?.role };
  }
  throw new Error(`login for ${email} still throttled`);
}

function ensureVideo() {
  if (existsSync(VIDEO)) return;
  mkdirSync(join(VIDEO, ".."), { recursive: true });
  info(`generating ${VIDEO} with ffmpeg`);
  execSync(
    `ffmpeg -y -f lavfi -i testsrc=duration=3:size=320x240:rate=15 -f lavfi -i sine=frequency=440:duration=3 ` +
      `-c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "${VIDEO}"`,
    { stdio: "ignore" },
  );
}

async function tusUpload(tusUploadUrl, auth, file) {
  const metadata = [
    `filetype ${Buffer.from("video/mp4").toString("base64")}`,
    `title ${Buffer.from("e2e").toString("base64")}`,
  ].join(",");

  const create = await httpsRequest(tusUploadUrl, {
    method: "POST",
    headers: {
      "Tus-Resumable": "1.0.0",
      "Upload-Length": String(file.length),
      "Upload-Metadata": metadata,
      AuthorizationSignature: auth.AuthorizationSignature,
      AuthorizationExpire: String(auth.AuthorizationExpire),
      VideoId: auth.VideoId,
      LibraryId: String(auth.LibraryId),
    },
  });

  if (create.status !== 201) {
    return { ok: false, detail: `tus create ${create.status} ${create.body.toString().slice(0, 200)}` };
  }

  const location = create.headers["location"];
  if (typeof location !== "string") {
    return { ok: false, detail: "tus create returned no Location header" };
  }
  const uploadUrl = location.startsWith("http") ? location : new URL(location, tusUploadUrl).toString();

  const patch = await httpsRequest(uploadUrl, {
    method: "PATCH",
    headers: {
      "Tus-Resumable": "1.0.0",
      "Upload-Offset": "0",
      "Content-Type": "application/offset+octet-stream",
      "Content-Length": String(file.length),
      AuthorizationSignature: auth.AuthorizationSignature,
      AuthorizationExpire: String(auth.AuthorizationExpire),
      VideoId: auth.VideoId,
      LibraryId: String(auth.LibraryId),
    },
    body: file,
  });

  if (patch.status !== 204) {
    return { ok: false, detail: `tus patch ${patch.status} ${patch.body.toString().slice(0, 200)}` };
  }
  return { ok: true, detail: `${file.length} bytes uploaded` };
}

async function bunnyVideo(videoId) {
  const lib = process.env.BUNNY_STREAM_LIBRARY_ID;
  const key = process.env.BUNNY_STREAM_API_KEY;
  const res = await httpsRequest(`https://video.bunnycdn.com/library/${lib}/videos/${videoId}`, {
    headers: { AccessKey: key ?? "" },
  });
  if (res.status !== 200) return null;
  try {
    return JSON.parse(res.body.toString());
  } catch {
    return null;
  }
}

const uniq = String(process.hrtime.bigint()).slice(-9);

async function main() {
  console.log(`\n\x1b[1mCourse → video → playback end-to-end\x1b[0m  ${API}\n`);

  ensureVideo();
  const file = readFileSync(VIDEO);

  console.log("\x1b[1mActors\x1b[0m");
  const admin = await login("superadmin@grotutor.com");
  record("admin logs in", !!admin.token);
  const instructor = await login("instructor1@grotutor.com");
  record("instructor logs in", !!instructor.token, `role ${instructor.role}`);
  const student = await login("learner1@example.com");
  record("student logs in", !!student.token);

  console.log("\n\x1b[1mCourse structure\x1b[0m");

  const cats = await call("GET", "/categories?page=1&limit=1", { token: admin.token });
  const categoryId = cats.data?.data?.[0]?.categoryId ?? cats.data?.[0]?.categoryId ?? null;
  record("a category exists to attach the course to", !!categoryId);

  const mkCourse = await call("POST", "/courses", {
    token: instructor.token,
    body: {
      title: `E2E Video Course ${uniq}`,
      slug: `e2e-video-course-${uniq}`,
      description: "Created by the course/video end-to-end script.",
      shortDescription: "E2E",
      price: 0,
      currency: "INR",
      categoryId,
      level: "BEGINNER",
      language: "English",
    },
  });
  const courseId = mkCourse.data?.courseId ?? mkCourse.data?.data?.courseId ?? null;
  record("instructor creates a course", mkCourse.status === 201 && !!courseId,
    `status ${mkCourse.status} ${courseId ? "" : JSON.stringify(mkCourse.data).slice(0, 200)}`);
  if (!courseId) {
    summarise();
    return;
  }
  cleanup.push(["DELETE", `/courses/${courseId}`, admin.token]);

  const mkSection = await call("POST", "/sections", {
    token: instructor.token,
    body: { courseId, title: `Section ${uniq}`, order: 1 },
  });
  const sectionId = mkSection.data?.sectionId ?? mkSection.data?.data?.sectionId ?? null;
  record("instructor creates a section", mkSection.status === 201 && !!sectionId,
    `status ${mkSection.status} ${sectionId ? "" : JSON.stringify(mkSection.data).slice(0, 200)}`);
  if (!sectionId) {
    summarise();
    return;
  }

  const mkLesson = await call("POST", "/lessons", {
    token: instructor.token,
    body: { sectionId, title: `Lesson ${uniq}`, type: "VIDEO", order: 1, isFreePreview: true },
  });
  const lessonId = mkLesson.data?.lessonId ?? mkLesson.data?.data?.lessonId ?? null;
  record("instructor creates a video lesson", mkLesson.status === 201 && !!lessonId,
    `status ${mkLesson.status} ${lessonId ? "" : JSON.stringify(mkLesson.data).slice(0, 200)}`);
  if (!lessonId) {
    summarise();
    return;
  }

  console.log("\n\x1b[1mVideo upload\x1b[0m");

  const upload = await call("POST", "/video-encoding/create-upload", {
    token: instructor.token,
    body: { courseId, lessonId, title: `E2E video ${uniq}` },
  });
  record("create-upload returns Bunny video + TUS auth", upload.status === 201,
    `status ${upload.status} ${upload.status === 201 ? "" : JSON.stringify(upload.data).slice(0, 250)}`);

  const videoId = upload.data?.videoId ?? null;
  const tusUrl = upload.data?.tusUploadUrl ?? null;
  const tusAuth = upload.data?.tusAuth ?? null;
  record("response carries videoId, tusUploadUrl and tusAuth",
    !!videoId && !!tusUrl && !!tusAuth,
    videoId ? `videoId ${videoId}` : "missing");

  if (!videoId || !tusUrl || !tusAuth) {
    summarise();
    return;
  }

  const sigInput = `${tusAuth.LibraryId}${process.env.BUNNY_STREAM_API_KEY}${tusAuth.AuthorizationExpire}${tusAuth.VideoId}`;
  const expectedSig = createHash("sha256").update(sigInput).digest("hex");
  record("TUS signature matches sha256(library + apiKey + expire + videoId)",
    tusAuth.AuthorizationSignature === expectedSig,
    tusAuth.AuthorizationSignature === expectedSig ? "" : "signature formula mismatch — Bunny will reject the upload");

  const expiresInSec = tusAuth.AuthorizationExpire - Math.floor(Date.now() / 1000);
  record("TUS authorization is not already expired", expiresInSec > 0, `expires in ${expiresInSec}s`);

  const up = await tusUpload(tusUrl, tusAuth, file);
  record("video bytes upload over TUS", up.ok, up.detail);

  if (!up.ok) {
    summarise();
    return;
  }

  console.log("\n\x1b[1mEncoding\x1b[0m");
  const started = Date.now();
  let encoded = false;
  let lastStatus = -1;
  while (Date.now() - started < ENCODE_TIMEOUT_MS) {
    const v = await bunnyVideo(videoId);
    if (v !== null) {
      lastStatus = v.status;
      if (v.status === 3 || v.status === 4) {
        encoded = true;
        info(`Bunny status ${v.status} (finished) after ${Math.round((Date.now() - started) / 1000)}s`);
        break;
      }
      if (v.status === 5 || v.status === 6) {
        info(`Bunny status ${v.status} (failed)`);
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  record("Bunny finishes encoding the upload", encoded, `last status ${lastStatus}`);

  console.log("\n\x1b[1mPlayback\x1b[0m");

  const play = await call("GET", `/lessons/${lessonId}/play`, { token: instructor.token });
  record("instructor gets a playback URL", play.status === 200,
    `status ${play.status} ${play.status === 200 ? "" : JSON.stringify(play.data).slice(0, 200)}`);

  const playUrl = play.data?.signedUrl ?? play.data?.url ?? play.data?.playbackUrl ?? play.data?.embedUrl ?? null;
  record("playback response contains a URL", !!playUrl,
    playUrl ? String(playUrl).slice(0, 110) : `keys: ${Object.keys(play.data ?? {}).join(",")}`);

  if (playUrl) {
    const hasToken = /token=/.test(String(playUrl)) && /expires=/.test(String(playUrl));
    record("playback URL is token-signed", hasToken,
      hasToken ? "" : "unsigned — anyone can share a permanent link to paid content");

    const res = await httpsRequest(String(playUrl)).catch(() => null);
    record("playback URL actually loads", res !== null && res.status >= 200 && res.status < 400,
      res === null ? "request failed" : `HTTP ${res.status}`);

    if (res !== null && res.status === 200) {
      const html = res.body.toString();
      record("player page returns the Bunny embed player",
        /mediadelivery|bunny|player/i.test(html),
        `${html.length} bytes`);
    }
  }

  const jobs = await call("GET", `/video-encoding/debug/${lessonId}`, { token: instructor.token });
  const jobId = jobs.data?.encodingJob?.jobId ?? jobs.data?.job?.jobId ?? jobs.data?.jobId ?? null;
  if (jobId) {
    const reconciled = await call("GET", `/video-encoding/status/${jobId}`, { token: instructor.token });
    record("status endpoint reconciles a missed webhook",
      reconciled.status === 200 && reconciled.data?.status === "COMPLETED",
      `status ${reconciled.status}, job ${reconciled.data?.status}`);
  } else {
    record("encoding job is discoverable for reconciliation", false,
      `debug returned keys: ${Object.keys(jobs.data ?? {}).join(",")}`);
  }

  const preview = await call("GET", `/lessons/${lessonId}/preview`);
  record("free-preview lesson is playable without a token", preview.status === 200,
    `status ${preview.status}`);

  const studentPlay = await call("GET", `/lessons/${lessonId}/play`, { token: student.token });
  record("non-enrolled student is refused playback",
    studentPlay.status === 403 || studentPlay.status === 404,
    `status ${studentPlay.status}`);

  const otherInstructor = await login("instructor2@grotutor.com").catch(() => null);
  if (otherInstructor !== null) {
    const foreign = await call("GET", `/lessons/${lessonId}/play`, { token: otherInstructor.token });
    record("an unrelated instructor cannot play another instructor's lesson",
      foreign.status === 403 || foreign.status === 404,
      `status ${foreign.status}`);
  }

  console.log("\n\x1b[1mCleanup\x1b[0m");
  if (videoId) {
    const lib = process.env.BUNNY_STREAM_LIBRARY_ID;
    const key = process.env.BUNNY_STREAM_API_KEY;
    const del = await httpsRequest(`https://video.bunnycdn.com/library/${lib}/videos/${videoId}`, {
      method: "DELETE",
      headers: { AccessKey: key ?? "" },
    }).catch(() => null);
    info(`bunny video delete: ${del?.status ?? "failed"}`);
  }
  let removed = 0;
  for (const [method, path, token] of cleanup.reverse()) {
    const r = await call(method, path, { token });
    if (r.status >= 200 && r.status < 300) removed++;
  }
  info(`removed ${removed}/${cleanup.length} fixtures`);

  summarise();
}

function summarise() {
  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  console.log(
    `\n\x1b[1m${passed}/${results.length} checks passed\x1b[0m` +
      (failed ? `  \x1b[31m${failed} failed\x1b[0m` : ""),
  );
  if (failed) {
    console.log("\nFailures:");
    for (const r of results.filter((x) => !x.pass)) {
      console.log(`  \x1b[31m·\x1b[0m ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\n\x1b[31mscript error\x1b[0m", err);
  process.exit(1);
});
