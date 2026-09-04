import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getSupabase, isSupabaseConfigured } from "./supabase.js";

const PRODUCT = "chunk";
/** Paid / manual activations: long-lived plugin cache. */
const PAID_TOKEN_DAYS = 3650;
export const TRIAL_DAYS = 14;

export function isLicenseConfigured() {
  return (
    isSupabaseConfigured() && Boolean(process.env.LICENSE_TOKEN_SECRET)
  );
}

function tokenSecret() {
  const secret = process.env.LICENSE_TOKEN_SECRET;
  if (!secret) throw new Error("LICENSE_TOKEN_SECRET is not configured.");
  return secret;
}

export function hashLicenseKey(key) {
  return createHash("sha256").update(normalizeKey(key)).digest("hex");
}

export function normalizeKey(key) {
  return String(key || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

/** CHUNK-XXXX-XXXX-XXXX-XXXX */
export function generateLicenseKey() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(16);
  let raw = "";
  for (let i = 0; i < 16; i++) {
    raw += alphabet[bytes[i] % alphabet.length];
  }
  return `CHUNK-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

function last4(key) {
  const compact = normalizeKey(key).replace(/-/g, "");
  return compact.slice(-4);
}

function plusDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function isMissingColumnError(error, column) {
  const msg = String(error?.message || "");
  return error?.code === "PGRST204" && msg.includes(`'${column}'`);
}

function isSourceCheckError(error) {
  const msg = String(error?.message || error?.details || "");
  return /licenses_source_check|source.*trial/i.test(msg);
}

/** Resolve expiry whether stored in expires_at or encoded in note (pre-migration). */
export function resolveLicenseExpiresAt(license) {
  if (!license) return null;
  if (license.expires_at) return license.expires_at;
  const fromNote = String(license.note || "").match(/expires:([^\s|]+)/i);
  if (fromNote?.[1]) return fromNote[1];
  if (isTrialLicense(license) && license.created_at) {
    return new Date(
      Date.parse(license.created_at) + TRIAL_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
  }
  return null;
}

export function isTrialLicense(license) {
  if (!license) return false;
  if (license.source === "trial") return true;
  return /\btrial\b/i.test(String(license.note || ""));
}

/**
 * @param {{
 *   source: 'stripe' | 'manual' | 'trial',
 *   email?: string | null,
 *   note?: string | null,
 *   stripeSessionId?: string | null,
 *   stripeCustomerId?: string | null,
 *   stripePaymentIntentId?: string | null,
 *   maxActivations?: number,
 *   product?: string,
 *   expiresAt?: string | null,
 * }} opts
 */
export async function createLicense(opts) {
  if (!isLicenseConfigured()) {
    throw new Error("Licensing is not configured.");
  }

  const supabase = getSupabase();
  const licenseKey = generateLicenseKey();

  const base = {
    product: opts.product || PRODUCT,
    license_key: licenseKey,
    license_key_hash: hashLicenseKey(licenseKey),
    license_key_last4: last4(licenseKey),
    email: opts.email || null,
    note: opts.note || null,
    stripe_session_id: opts.stripeSessionId || null,
    stripe_customer_id: opts.stripeCustomerId || null,
    stripe_payment_intent_id: opts.stripePaymentIntentId || null,
    status: "active",
    max_activations: opts.maxActivations ?? 2,
  };

  const attempts = [];
  // Preferred: native trial source + expires_at (post-migration)
  if (opts.expiresAt != null) {
    attempts.push({
      ...base,
      source: opts.source,
      expires_at: opts.expiresAt,
    });
  } else {
    // Paid/manual: try with explicit null only if column exists (may 204)
    attempts.push({
      ...base,
      source: opts.source,
      expires_at: null,
    });
  }
  // Works on current schema (no expires_at column)
  attempts.push({
    ...base,
    source: opts.source,
    note:
      opts.expiresAt != null
        ? [base.note, `expires:${opts.expiresAt}`].filter(Boolean).join(" | ")
        : base.note,
  });
  // Pre-migration: source check only allows stripe|manual
  if (opts.source === "trial") {
    attempts.push({
      ...base,
      source: "manual",
      note: [base.note || "14-day free trial", `expires:${opts.expiresAt || plusDays(TRIAL_DAYS)}`]
        .filter(Boolean)
        .join(" | "),
    });
  }

  let lastError = null;
  for (const row of attempts) {
    const { data, error } = await supabase
      .from("licenses")
      .insert(row)
      .select("*")
      .single();
    if (!error) {
      // Normalize for callers when column missing
      if (!data.expires_at && opts.expiresAt) {
        data.expires_at = opts.expiresAt;
      }
      return { license: data, licenseKey };
    }
    lastError = error;
    if (
      isMissingColumnError(error, "expires_at") ||
      isSourceCheckError(error)
    ) {
      continue;
    }
    throw error;
  }

  throw lastError || new Error("Could not create license.");
}

/**
 * Mint a 14-day trial license. Optional email: one active trial per email.
 * @param {{ email?: string | null, note?: string | null, clientKey?: string | null }} opts
 */
export async function createTrialLicense(opts = {}) {
  if (!isLicenseConfigured()) {
    throw new Error("Licensing is not configured.");
  }

  const email = opts.email
    ? String(opts.email).trim().toLowerCase()
    : null;
  const clientKey = opts.clientKey
    ? String(opts.clientKey).trim().slice(0, 64)
    : null;

  const supabase = getSupabase();

  if (email) {
    const { data: existing, error } = await supabase
      .from("licenses")
      .select("*")
      .eq("source", "trial")
      .eq("email", email)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (existing) {
      const exp = resolveLicenseExpiresAt(existing);
      const stillValid = exp && Date.parse(exp) > Date.now();
      if (stillValid) {
        return {
          license: { ...existing, expires_at: exp },
          licenseKey: existing.license_key,
          created: false,
        };
      }
    }
  }

  // Soft abuse cap: max 5 trials per client fingerprint per day
  if (clientKey) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recent, error: recentError } = await supabase
      .from("licenses")
      .select("id")
      .eq("source", "trial")
      .ilike("note", `%client:${clientKey}%`)
      .gte("created_at", since);

    if (recentError) throw recentError;
    if ((recent || []).length >= 5) {
      const err = new Error(
        "Too many trials from this browser today. Try again tomorrow or buy CHUNK.",
      );
      err.status = 429;
      throw err;
    }
  }

  const noteParts = [opts.note || "14-day free trial"];
  if (clientKey) noteParts.push(`client:${clientKey}`);

  const created = await createLicense({
    source: "trial",
    email,
    note: noteParts.join(" | "),
    maxActivations: 1,
    expiresAt: plusDays(TRIAL_DAYS),
    product: PRODUCT,
  });
  return {
    ...created,
    created: true,
    license: {
      ...created.license,
      expires_at:
        created.license.expires_at || resolveLicenseExpiresAt(created.license),
    },
  };
}

/** Idempotent: returns existing license for session, or creates one. */
export async function ensureStripeLicense(session) {
  if (!isLicenseConfigured()) {
    throw new Error("Licensing is not configured.");
  }

  const supabase = getSupabase();
  const sessionId = session.id;

  const { data: existing, error: findError } = await supabase
    .from("licenses")
    .select("*")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (findError) throw findError;
  if (existing) {
    return { license: existing, licenseKey: existing.license_key, created: false };
  }

  const email =
    session.customer_details?.email ||
    session.customer_email ||
    null;
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  try {
    const created = await createLicense({
      source: "stripe",
      email,
      stripeSessionId: sessionId,
      stripeCustomerId: customerId,
      stripePaymentIntentId: paymentIntentId,
      product: session.metadata?.plugin || PRODUCT,
      expiresAt: null,
    });
    return { ...created, created: true };
  } catch (err) {
    // Race: another webhook created it
    const { data: again, error: againError } = await supabase
      .from("licenses")
      .select("*")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();
    if (againError) throw againError;
    if (again) {
      return { license: again, licenseKey: again.license_key, created: false };
    }
    throw err;
  }
}

export async function getLicenseBySessionId(sessionId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("licenses")
    .select("*")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * @param {{ licenseKey: string, machineId: string, machineLabel?: string }} input
 */
export async function activateLicense(input) {
  if (!isLicenseConfigured()) {
    throw new Error("Licensing is not configured.");
  }

  const key = normalizeKey(input.licenseKey);
  const machineId = String(input.machineId || "").trim();
  if (!key || !machineId) {
    const err = new Error("License key and machine id are required.");
    err.status = 400;
    throw err;
  }

  const supabase = getSupabase();
  const keyHash = hashLicenseKey(key);

  const { data: license, error: licError } = await supabase
    .from("licenses")
    .select("*")
    .eq("license_key_hash", keyHash)
    .maybeSingle();

  if (licError) throw licError;
  if (!license || license.status !== "active") {
    const err = new Error("Invalid or inactive license key.");
    err.status = 403;
    throw err;
  }

  const licenseExpiresAt = resolveLicenseExpiresAt(license);
  if (licenseExpiresAt && Date.parse(licenseExpiresAt) < Date.now()) {
    const err = new Error("This trial or license has expired. Buy CHUNK to continue.");
    err.status = 403;
    throw err;
  }

  const { data: activations, error: actError } = await supabase
    .from("license_activations")
    .select("*")
    .eq("license_id", license.id);

  if (actError) throw actError;

  const existing = (activations || []).find((a) => a.machine_id === machineId);
  const max = license.max_activations ?? 2;

  if (existing) {
    await supabase
      .from("license_activations")
      .update({
        last_seen_at: new Date().toISOString(),
        machine_label: input.machineLabel || existing.machine_label,
      })
      .eq("id", existing.id);
  } else if ((activations || []).length >= max) {
    const err = new Error(
      `This license is already activated on ${max} machines.`,
    );
    err.status = 403;
    throw err;
  } else {
    const { error: insertError } = await supabase
      .from("license_activations")
      .insert({
        license_id: license.id,
        machine_id: machineId,
        machine_label: input.machineLabel || null,
      });
    if (insertError) throw insertError;
  }

  const { count, error: countError } = await supabase
    .from("license_activations")
    .select("*", { count: "exact", head: true })
    .eq("license_id", license.id);

  if (countError) throw countError;

  const used = count ?? (activations || []).length + (existing ? 0 : 1);
  const trial = isTrialLicense(license);
  const tokenPayload = issueToken({
    licenseId: license.id,
    product: license.product,
    machineId,
    email: license.email,
    licenseExpiresAt,
    source: trial ? "trial" : license.source,
  });

  return {
    ...tokenPayload,
    activationsUsed: used,
    maxActivations: max,
    product: license.product,
    licenseType: trial ? "trial" : "paid",
    source: trial ? "trial" : license.source,
  };
}

function issueToken({
  licenseId,
  product,
  machineId,
  email,
  licenseExpiresAt,
  source,
}) {
  let expiresAt;
  if (licenseExpiresAt) {
    expiresAt = new Date(licenseExpiresAt).toISOString();
  } else if (source === "trial") {
    expiresAt = plusDays(TRIAL_DAYS);
  } else {
    expiresAt = plusDays(PAID_TOKEN_DAYS);
  }

  const body = {
    licenseId,
    product,
    machineId,
    email: email || null,
    source: source || null,
    exp: expiresAt,
  };
  const payload = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = createHmac("sha256", tokenSecret())
    .update(payload)
    .digest("base64url");
  return {
    token: `${payload}.${sig}`,
    expiresAt,
  };
}

export function verifyToken(token) {
  const [payload, sig] = String(token || "").split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", tokenSecret())
    .update(payload)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const body = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!body.exp || Date.parse(body.exp) < Date.now()) return null;
    return body;
  } catch {
    return null;
  }
}

/**
 * Active licenses for an email (trial + paid). Expired trials are omitted.
 * @param {string} email
 * @returns {Promise<Array<{ license: object, licenseKey: string, licenseType: string }>>}
 */
export async function findActiveLicensesByEmail(email) {
  if (!isLicenseConfigured()) {
    throw new Error("Licensing is not configured.");
  }

  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("licenses")
    .select("*")
    .eq("email", normalized)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const now = Date.now();
  const results = [];
  for (const license of data || []) {
    const exp = resolveLicenseExpiresAt(license);
    if (exp && Date.parse(exp) <= now) continue;
    if (!license.license_key) continue;
    results.push({
      license: { ...license, expires_at: exp || license.expires_at },
      licenseKey: license.license_key,
      licenseType: isTrialLicense(license) ? "trial" : "paid",
    });
  }
  return results;
}
