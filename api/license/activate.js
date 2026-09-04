import { activateLicense, isLicenseConfigured } from "../../lib/license.js";
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

  try {
    const result = await activateLicense({
      licenseKey: body.licenseKey || body.license_key,
      machineId: body.machineId || body.machine_id,
      machineLabel: body.machineLabel || body.machine_label,
    });
    sendJson(res, 200, result);
  } catch (err) {
    const status = err.status || 500;
    console.error("[license/activate]", err);
    sendJson(res, status, {
      error: err.message || "Activation failed.",
    });
  }
}
