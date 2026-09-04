import {
  ensureStripeLicense,
  getLicenseBySessionId,
  isLicenseConfigured,
} from "../../lib/license.js";
import { sendJson } from "../../lib/http.js";
import { getStripe, isCheckoutConfigured } from "../../lib/stripe.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  if (!isLicenseConfigured() || !isCheckoutConfigured()) {
    sendJson(res, 503, { error: "Licensing is not configured yet." });
    return;
  }

  let sessionId = "";
  try {
    const url = new URL(req.url || "/", "http://localhost");
    sessionId = url.searchParams.get("session_id") || "";
  } catch {
    sessionId = "";
  }

  if (!sessionId) {
    sendJson(res, 400, { error: "Missing session_id." });
    return;
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (
      session.mode !== "payment" ||
      session.payment_status !== "paid"
    ) {
      sendJson(res, 402, { error: "Payment not completed." });
      return;
    }

    let license = await getLicenseBySessionId(sessionId);
    if (!license) {
      // Webhook may still be in flight — mint idempotently
      const minted = await ensureStripeLicense(session);
      license = minted.license;
    }

    sendJson(res, 200, {
      licenseKey: license.license_key,
      email: license.email,
      product: license.product,
      maxActivations: license.max_activations,
    });
  } catch (err) {
    console.error("[license/by-session]", err);
    sendJson(res, 500, { error: "Could not load license." });
  }
}
