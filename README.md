# Assembly DSP Website

Marketing site and Stripe checkout for **Assembly DSP** / **CHUNK**.

## Develop

```bash
cp .env.example .env.local
# Add STRIPE_SECRET_KEY from your Stripe Dashboard
npm install
npm run stripe:setup   # creates CHUNK product + $39 price; paste IDs into .env.local
npm run dev:all        # Vite on :5173 + API on :8787 (proxied as /api)
```

Webhook locally:

```bash
stripe listen --forward-to localhost:8787/api/webhook
# paste the whsec_… into STRIPE_WEBHOOK_SECRET, restart API
```

## Build / deploy

```bash
npm run build
```

Static output is `dist/`. On Vercel, `/api/*` deploys as serverless functions. Set `PUBLIC_SITE_URL`, Stripe keys, plus for licensing:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LICENSE_TOKEN_SECRET`

Transactional email (Resend — send only; ImprovMX receives/forwards inbound):

- `RESEND_API_KEY` — already used in Production if set
- `EMAIL_FROM` — e.g. `Assembly DSP <support@assemblydsp.com>` (domain must be verified in Resend)

See [`supabase/README.md`](supabase/README.md) to create the `licenses` tables.

Do **not** reuse Grove Plus price IDs — CHUNK has its own product/price.

## Trial

The 14-day trial is a timed demo binary (not a Stripe subscription trial). The trial CTA stays email-based until a trial build is hosted.
