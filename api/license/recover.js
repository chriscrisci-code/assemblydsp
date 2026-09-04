import {
  findActiveLicensesByEmail,
  isLicenseConfigured,
  TRIAL_DAYS,
} from "../../lib/license.js";
import { isEmailConfigured, sendLicenseKeyEmail } from "../../lib/email.js";
import { readJsonBody, sendJson } from "../../lib/http.js";

/**
 * Lost-key recovery: look up active licenses by email and send keys via Resend.
 * Never returns license keys in the HTTP response.
 */
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

  if (!isEmailConfigured()) {
    sendJson(res, 503, {
      error: "Email recovery is not configured yet. Contact support@assemblydsp.com.",
    });
    return;
  }

  const body = await readJsonBody(req);
  if (!body) {
    sendJson(res, 400, { error: "Invalid JSON body." });
    return;
  }

  const emailRaw = body.email ? String(body.email).trim().toLowerCase() : "";
  if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    sendJson(res, 400, { error: "Enter a valid email." });
    return;
  }

  try {
    const matches = await findActiveLicensesByEmail(emailRaw);

    // Same generic message whether found or not (avoid email enumeration).
    const okMessage =
      "If we find an active license for that email, we’ll send the key shortly. Check your inbox (and spam).";

    if (matches.length === 0) {
      sendJson(res, 200, { ok: true, message: okMessage });
      return;
    }

    let sent = 0;
    for (const match of matches) {
      const result = await sendLicenseKeyEmail({
        to: emailRaw,
        licenseKey: match.licenseKey,
        licenseType: match.licenseType,
        expiresAt: match.license.expires_at,
        trialDays: TRIAL_DAYS,
      });
      if (result.ok) sent += 1;
      else console.error("[license/recover] send", result.error);
    }

    if (sent === 0) {
      sendJson(res, 502, {
        error: "Could not send email right now. Try again or contact support@assemblydsp.com.",
      });
      return;
    }

    sendJson(res, 200, { ok: true, message: okMessage });
  } catch (err) {
    console.error("[license/recover]", err);
    sendJson(res, err.status || 500, {
      error: err.message || "Could not recover license.",
    });
  }
}
