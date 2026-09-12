import { getCurrentBuild, publicBuildInfo } from "../lib/build.js";
import { sendJson } from "../lib/http.js";

/**
 * GET /api/build — public current CHUNK version (no license).
 */
export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end();
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=60");

  try {
    const build = await getCurrentBuild();
    sendJson(res, 200, publicBuildInfo(build));
  } catch (err) {
    console.error("[build]", err);
    sendJson(res, 500, { error: "Could not read current build." });
  }
}
