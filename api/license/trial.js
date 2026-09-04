import { createTrialLicense, isLicenseConfigured, TRIAL_DAYS } from "../../lib/license.js";
import { isDownloadConfigured } from "../../lib/download.js";
import { readJsonBody, sendJson } from "../../lib/http.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  if (!isLicenseConfigured()) {
    sendJson(res, 503, { error: "Licensing is not configured yet." });
    return;
  }

  const body = await readJsonBody(req);
  if (!body) {
    sendJson(res, 400, { error: "Invalid JSON body." });
    return;
  }

  const emailRaw = body.email ? String(body.email).trim() : "";
  if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    sendJson(res, 400, { error: "Enter a valid email, or leave it blank." });
    return;
  }

  try {
    const clientKey =
      (req.headers["x-forwarded-for"] || "")
        .toString()
        .split(",")[0]
        .trim() ||
      (req.headers["x-real-ip"] || "").toString().trim() ||
      null;

    const minted = await createTrialLicense({
      email: emailRaw || null,
      note: body.note || "14-day free trial",
      clientKey,
    });

    const payload = {
      licenseKey: minted.licenseKey,
      expiresAt: minted.license.expires_at,
      product: minted.license.product,
      trialDays: TRIAL_DAYS,
      created: minted.created,
      licenseType: "trial",
    };

    if (isDownloadConfigured()) {
      payload.downloadUrl = `/api/download?license_key=${encodeURIComponent(minted.licenseKey)}`;
    } else {
      payload.downloadUrl = null;
      payload.downloadPending = true;
    }

    sendJson(res, 200, payload);
  } catch (err) {
    const status = err.status || 500;
    console.error("[license/trial]", err);
    sendJson(res, status, {
      error: err.message || "Could not start trial.",
    });
  }
}
