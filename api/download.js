import {
  authorizeDownload,
  chunkBuildUrl,
  isDownloadConfigured,
  issueDownloadToken,
  verifyDownloadToken,
} from "../lib/download.js";
import { sendJson } from "../lib/http.js";

/**
 * GET /api/download
 *   ?token=…                    → 302 to private CHUNK build URL
 *   ?session_id=…               → JSON { url } (or redirect=1 → 302)
 *   ?license_key=CHUNK-…        → JSON { url } (or redirect=1 → 302)
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

  let sessionId = "";
  let licenseKey = "";
  let token = "";
  let wantRedirect = false;

  try {
    const url = new URL(req.url || "/", "http://localhost");
    sessionId = url.searchParams.get("session_id") || "";
    licenseKey =
      url.searchParams.get("license_key") ||
      url.searchParams.get("key") ||
      "";
    token = url.searchParams.get("token") || "";
    wantRedirect =
      url.searchParams.get("redirect") === "1" ||
      url.searchParams.get("redirect") === "true";
  } catch {
    /* keep empty */
  }

  try {
    if (token) {
      if (!isDownloadConfigured()) {
        sendJson(res, 503, { error: "Plugin download is not configured yet." });
        return;
      }
      const claims = verifyDownloadToken(token);
      if (!claims) {
        sendJson(res, 403, { error: "Download link expired. Request a new one." });
        return;
      }
      res.statusCode = 302;
      res.setHeader("Location", chunkBuildUrl());
      res.setHeader("Cache-Control", "no-store");
      res.end();
      return;
    }

    const auth = await authorizeDownload({ sessionId, licenseKey });
    if (!auth.ok) {
      sendJson(res, auth.status, { error: auth.error });
      return;
    }

    const signed = issueDownloadToken({
      product: auth.product,
      reason: auth.reason,
    });
    const path = `/api/download?token=${encodeURIComponent(signed)}`;

    if (wantRedirect) {
      res.statusCode = 302;
      res.setHeader("Location", path);
      res.setHeader("Cache-Control", "no-store");
      res.end();
      return;
    }

    sendJson(res, 200, {
      url: path,
      expiresInSeconds: 15 * 60,
      product: auth.product,
    });
  } catch (err) {
    console.error("[download]", err);
    sendJson(res, 500, { error: "Could not authorize download." });
  }
}
