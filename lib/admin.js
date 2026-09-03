import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { defaultContent, mergeContent } from "./site-content.js";
import { readJsonBody, sendJson } from "./http.js";

const COOKIE = "adsp_admin";

export function adminPassword() {
  return process.env.ADMIN_PASSWORD || "750Berries#";
}

export function adminToken() {
  return createHmac("sha256", adminPassword()).update("assembly-dsp-admin").digest("hex");
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of String(header).split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

export function isAdminRequest(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token) return false;
  const expected = adminToken();
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function passwordsMatch(input) {
  const expected = adminPassword();
  const a = Buffer.from(String(input ?? ""));
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

function setAdminCookie(res) {
  const secure = process.env.VERCEL ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${adminToken()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`,
  );
}

export function contentFilePath() {
  if (process.env.VERCEL) {
    return path.join("/tmp", "assembly-dsp-content.json");
  }
  return path.join(process.cwd(), "public", "content.json");
}

export async function readStoredContent() {
  try {
    const raw = await readFile(contentFilePath(), "utf8");
    return mergeContent(JSON.parse(raw));
  } catch {
    return mergeContent(defaultContent);
  }
}

export async function writeStoredContent(content) {
  const merged = mergeContent(content);
  const json = `${JSON.stringify(merged, null, 2)}\n`;
  const file = contentFilePath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, json, "utf8");
  if (!process.env.VERCEL) {
    const backup = path.join(process.cwd(), "data", "site-content.json");
    await mkdir(path.dirname(backup), { recursive: true });
    await writeFile(backup, json, "utf8");
  }
  return merged;
}

function pathnameOf(req) {
  try {
    return new URL(req.url || "/", "http://localhost").pathname;
  } catch {
    return req.url || "/";
  }
}

function matchesAdminPath(pathname, suffix) {
  return pathname === suffix || pathname.endsWith(suffix);
}

export async function handleAdminRequest(req, res) {
  const pathname = pathnameOf(req);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.end();
    return true;
  }

  if (matchesAdminPath(pathname, "/api/admin/login") && req.method === "POST") {
    const body = await readJsonBody(req);
    if (!body || !passwordsMatch(body.password)) {
      sendJson(res, 401, { error: "Wrong password." });
      return true;
    }
    setAdminCookie(res);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (matchesAdminPath(pathname, "/api/admin/session") && req.method === "GET") {
    if (!isAdminRequest(req)) {
      sendJson(res, 401, { error: "Unauthorized." });
      return true;
    }
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (matchesAdminPath(pathname, "/api/admin/content") && req.method === "GET") {
    if (!isAdminRequest(req)) {
      sendJson(res, 401, { error: "Unauthorized." });
      return true;
    }
    sendJson(res, 200, { content: await readStoredContent() });
    return true;
  }

  if (matchesAdminPath(pathname, "/api/admin/content") && req.method === "POST") {
    if (!isAdminRequest(req)) {
      sendJson(res, 401, { error: "Unauthorized." });
      return true;
    }
    const body = await readJsonBody(req);
    if (!body || typeof body.content !== "object") {
      sendJson(res, 400, { error: "Missing content." });
      return true;
    }
    try {
      const content = await writeStoredContent(body.content);
      sendJson(res, 200, { ok: true, content });
    } catch (err) {
      console.error("[admin content]", err);
      sendJson(res, 500, { error: "Could not save content." });
    }
    return true;
  }

  return false;
}
