import {
  chunkPriceId,
  getStripe,
  isCheckoutConfigured,
  siteUrl,
} from "../lib/stripe.js";
import { sendJson } from "../lib/http.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  if (!isCheckoutConfigured()) {
    sendJson(res, 503, { error: "Payments are not configured yet." });
    return;
  }

  try {
    const stripe = getStripe();
    const base = siteUrl(req);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: chunkPriceId(), quantity: 1 }],
      success_url: `${base}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/#pricing`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      customer_creation: "always",
      metadata: {
        product: "chunk",
        plugin: "chunk",
        brand: "assembly-dsp",
      },
      payment_intent_data: {
        metadata: {
          product: "chunk",
          plugin: "chunk",
        },
      },
    });

    if (!session.url) {
      sendJson(res, 500, { error: "Checkout could not be started." });
      return;
    }

    sendJson(res, 200, { url: session.url });
  } catch (err) {
    console.error("[checkout]", err);
    sendJson(res, 500, { error: "Checkout could not be started." });
  }
}
