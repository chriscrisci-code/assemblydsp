import Stripe from "stripe";

export function isCheckoutConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_CHUNK_PRICE_ID,
  );
}

export function isWebhookConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET,
  );
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  return new Stripe(key);
}

export function chunkPriceId() {
  const id = process.env.STRIPE_CHUNK_PRICE_ID;
  if (!id) {
    throw new Error("STRIPE_CHUNK_PRICE_ID is not configured.");
  }
  return id;
}

/** Prefer PUBLIC_SITE_URL; fall back to request Origin/Host. */
export function siteUrl(req) {
  const configured = process.env.PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;

  const origin = req.headers.origin || req.headers.Origin;
  if (typeof origin === "string" && origin) {
    return origin.replace(/\/$/, "");
  }

  const host = req.headers.host || req.headers.Host;
  const proto =
    req.headers["x-forwarded-proto"] ||
    req.headers["X-Forwarded-Proto"] ||
    "http";
  if (typeof host === "string" && host) {
    const scheme = Array.isArray(proto) ? proto[0] : String(proto);
    return `${scheme}://${host}`.replace(/\/$/, "");
  }

  return "http://localhost:5173";
}
