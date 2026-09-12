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
- `EMAIL_FROM` — prefer bare `support@assemblydsp.com` on Vercel (avoid unquoted `Name <email>` which some UIs strip)

See [`supabase/README.md`](supabase/README.md) to create the `licenses` tables.

Do **not** reuse Grove Plus price IDs — CHUNK has its own product/price.

## Trial

The 14-day trial requires an email. The site mints a license, shows the key, and emails it via Resend. Lost keys: `/support.html` → recover API.

## Current build version

The public download version is **not** baked into `content.json`. The site reads a small manifest next to the zip:

`https://qtfjgaysjfkipfdiaeyc.supabase.co/storage/v1/object/public/plugin-builds/chunk-current.json`

Each release:

1. Upload `CHUNK-x.y.z.zip` to the `plugin-builds` bucket
2. Update `chunk-current.json` (`version`, `filename`, `url`, `releasedAt`)

The homepage/support footer and download buttons read that JSON in the browser. License emails and `GET /api/download` still resolve the current zip on the server via `lib/build.js`.

Optional env pins (leave unset to follow the manifest):

- `CHUNK_BUILD_MANIFEST_URL`
- `CHUNK_BUILD_URL` — pins the zip URL
- `CHUNK_VERSION` — pins the displayed version

See [`supabase/README.md`](supabase/README.md) and the template at [`supabase/chunk-current.json`](supabase/chunk-current.json).
