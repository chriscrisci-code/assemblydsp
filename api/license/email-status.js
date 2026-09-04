import { isEmailConfigured, emailFromAddress } from "../../lib/email.js";
import { isLicenseConfigured } from "../../lib/license.js";
import { sendJson } from "../../lib/http.js";

/**
 * Lightweight config check for transactional email (no send, no secrets).
 */
export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end();
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  const from = emailFromAddress();
  sendJson(res, 200, {
    licenseConfigured: isLicenseConfigured(),
    emailConfigured: isEmailConfigured(),
    from,
    hasResendKey: Boolean(process.env.RESEND_API_KEY?.trim()),
    hasEmailFromEnv: Boolean(process.env.EMAIL_FROM?.trim()),
  });
}
