import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getSupabase, isSupabaseConfigured } from "./supabase.js";

const PRODUCT = "chunk";
const TOKEN_TTL_DAYS = 90;

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

/**
 * @param {{
 *   source: 'stripe' | 'manual',
 *   email?: string | null,
 *   note?: string | null,
 *   stripeSessionId?: string | null,
 *   stripeCustomerId?: string | null,
 *   stripePaymentIntentId?: string | null,
 *   maxActivations?: number,
 *   product?: string,
 * }} opts
 */
export async function createLicense(opts) {
  if (!isLicenseConfigured()) {
    throw new Error("Licensing is not configured.");
  }

  const supabase = getSupabase();
  const licenseKey = generateLicenseKey();
  const row = {
    product: opts.product || PRODUCT,
    source: opts.source,
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

  const { data, error } = await supabase
    .from("licenses")
    .insert(row)
    .select("*")
    .single();

  if (error) throw error;
  return { license: data, licenseKey };
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
  const tokenPayload = issueToken({
    licenseId: license.id,
    product: license.product,
    machineId,
    email: license.email,
  });

  return {
    ...tokenPayload,
    activationsUsed: used,
    maxActivations: max,
    product: license.product,
  };
}

function issueToken({ licenseId, product, machineId, email }) {
  const expiresAt = new Date(
    Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const body = {
    licenseId,
    product,
    machineId,
    email: email || null,
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
