import { ensureStripeLicense, isLicenseConfigured } from "../lib/license.js";
import { recordPurchase } from "../lib/purchases.js";
import { readRawBody, sendJson } from "../lib/http.js";
import { getStripe, isWebhookConfigured } from "../lib/stripe.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  if (!isWebhookConfigured()) {
    res.statusCode = 400;
    res.end("Webhook is not configured.");
    return;
  }

  const signature = req.headers["stripe-signature"];
  if (!signature || typeof signature !== "string") {
    res.statusCode = 400;
    res.end("Missing stripe-signature.");
    return;
  }

  const rawBody = await readRawBody(req);
  let event;

  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("[webhook] signature", err.message);
    res.statusCode = 400;
    res.end("Invalid signature.");
    return;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (session.mode === "payment" && session.payment_status === "paid") {
        await recordPurchase({
          eventId: event.id,
          sessionId: session.id,
          paymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null,
          customerId:
            typeof session.customer === "string"
              ? session.customer
              : session.customer?.id ?? null,
          customerEmail:
            session.customer_details?.email ||
            session.customer_email ||
            null,
          amountTotal: session.amount_total,
          currency: session.currency,
          product: session.metadata?.product || "chunk",
          plugin: session.metadata?.plugin || "chunk",
        });

        if (isLicenseConfigured()) {
          const { licenseKey, created } = await ensureStripeLicense(session);
          console.log(
            "[license]",
            created ? "created" : "existing",
            "session",
            session.id,
            "last4",
            licenseKey?.slice(-4),
          );
        } else {
          console.warn("[license] skipped — licensing not configured");
        }
      }
    }
  } catch (err) {
    console.error("[webhook] handle", err);
    res.statusCode = 500;
    res.end("Webhook handler failed.");
    return;
  }

  res.statusCode = 200;
  res.end();
}
