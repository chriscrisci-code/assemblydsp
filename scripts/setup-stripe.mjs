import Stripe from "stripe";

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) {
  console.error("Set STRIPE_SECRET_KEY in .env.local (or the environment) first.");
  process.exit(1);
}

const stripe = new Stripe(secret);

const product = await stripe.products.create({
  name: "CHUNK",
  description:
    "Multiband channel processor — EQ, COMP, and spectral RS on one frequency graph. Perpetual license.",
  metadata: {
    plugin: "chunk",
    brand: "assembly-dsp",
  },
});

const launch = await stripe.prices.create({
  product: product.id,
  currency: "usd",
  unit_amount: 3900,
  nickname: "CHUNK launch $39",
  metadata: {
    plugin: "chunk",
    kind: "launch",
  },
});

const list = await stripe.prices.create({
  product: product.id,
  currency: "usd",
  unit_amount: 7900,
  nickname: "CHUNK list $79",
  metadata: {
    plugin: "chunk",
    kind: "list",
  },
  active: false,
});

console.log("Add these to .env.local and your host environment:");
console.log(`STRIPE_CHUNK_PRICE_ID=${launch.id}`);
console.log(`STRIPE_CHUNK_LIST_PRICE_ID=${list.id}`);
console.log(`# product id (reference): ${product.id}`);
console.log("");
console.log("Then create a webhook endpoint pointing at:");
console.log("  https://<your-domain>/api/webhook");
console.log("Events: checkout.session.completed");
console.log("Paste the signing secret as STRIPE_WEBHOOK_SECRET.");
