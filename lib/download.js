import { createHmac, timingSafeEqual } from "node:crypto";
import { getLicenseBySessionId, hashLicenseKey, isLicenseConfigured, normalizeKey, resolveLicenseExpiresAt } from "./license.js";
import { getSupabase } from "./supabase.js";
import { getStripe, isCheckoutConfigured } from "./stripe.js";

const DOWNLOAD_TTL_MS = 15 * 60 * 1000; // 15 minutes

/** Option A public zip in Supabase Storage `plugin-builds` (overridable via CHUNK_BUILD_URL). */
const DEFAULT_CHUNK_BUILD_URL =
  "https://qtfjgaysjfkipfdiaeyc.supabase.co/storage/v1/object/public/plugin-builds/CHUNK-0.9.42.zip";

export function isDownloadConfigured() {
  return Boolean(chunkBuildUrl());
}

export function chunkBuildUrl() {
  return String(process.env.CHUNK_BUILD_URL || DEFAULT_CHUNK_BUILD_URL).trim();
}

function downloadSecret() {
  return (
    process.env.CHUNK_DOWNLOAD_SECRET?.trim() ||
    process.env.LICENSE_TOKEN_SECRET?.trim() ||
    ""
  );
}

/**
 * Short-lived HMAC token authorizing a redirect to the private build URL.
 * @param {{ product?: string, reason: string }} claims
 */
export function issueDownloadToken(claims) {
  const secret = downloadSecret();
  if (!secret) throw new Error("Download signing is not configured.");

  const exp = Date.now() + DOWNLOAD_TTL_MS;
  const body = {
    product: claims.product || "chunk",
    reason: claims.reason,
    exp,
  };
  const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyDownloadToken(token) {
  const secret = downloadSecret();
  if (!secret) return null;

  const [payload, sig] = String(token || "").split(".");
  if (!payload || !sig) return null;

  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const body = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!body.exp || body.exp < Date.now()) return null;
    return body;
  } catch {
    return null;
  }
}

/**
 * Authorize download via paid Stripe session or an active license key.
 * @returns {Promise<{ ok: true, reason: string, product: string } | { ok: false, status: number, error: string }>}
 */
export async function authorizeDownload({ sessionId, licenseKey }) {
  if (!isDownloadConfigured()) {
    return {
      ok: false,
      status: 503,
      error: "Plugin download is not configured yet.",
    };
  }

  if (sessionId) {
    if (!isCheckoutConfigured() || !isLicenseConfigured()) {
      return { ok: false, status: 503, error: "Licensing is not configured yet." };
    }
    try {
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.mode !== "payment" || session.payment_status !== "paid") {
        return { ok: false, status: 402, error: "Payment not completed." };
      }
      const license = await getLicenseBySessionId(sessionId);
      return {
        ok: true,
        reason: "stripe",
        product: license?.product || session.metadata?.plugin || "chunk",
      };
    } catch (err) {
      console.error("[download] session auth", err);
      return { ok: false, status: 400, error: "Invalid checkout session." };
    }
  }

  if (licenseKey) {
    if (!isLicenseConfigured()) {
      return { ok: false, status: 503, error: "Licensing is not configured yet." };
    }
    const key = normalizeKey(licenseKey);
    if (!key) {
      return { ok: false, status: 400, error: "Missing license key." };
    }

    const supabase = getSupabase();
    const { data: license, error } = await supabase
      .from("licenses")
      .select("*")
      .eq("license_key_hash", hashLicenseKey(key))
      .maybeSingle();

    if (error) throw error;
    if (!license || license.status !== "active") {
      return { ok: false, status: 403, error: "Invalid or inactive license key." };
    }
    const exp = resolveLicenseExpiresAt(license);
    if (exp && Date.parse(exp) < Date.now()) {
      return { ok: false, status: 403, error: "This license has expired." };
    }

    return {
      ok: true,
      reason: license.source || "license",
      product: license.product || "chunk",
    };
  }

  return {
    ok: false,
    status: 400,
    error: "Provide session_id or license_key.",
  };
}

/** Absolute download URL for success pages (same origin path + token). */
export function buildSignedDownloadPath(token) {
  return `/api/download?token=${encodeURIComponent(token)}`;
}
