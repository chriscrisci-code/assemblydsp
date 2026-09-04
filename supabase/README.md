# Licensing setup

## 1. Create tables in Supabase

Open the **assemblydsp** project → SQL Editor → paste and run in order:

1. [`supabase/migrations/20260322_licenses.sql`](./migrations/20260322_licenses.sql)
2. [`supabase/migrations/20260323_trial_expires.sql`](./migrations/20260323_trial_expires.sql) — trial `source` + `expires_at`

## 2. Env vars (local `.env.local` + Vercel)

```
SUPABASE_URL=https://qtfjgaysjfkipfdiaeyc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...   # Project Settings → API → service_role
LICENSE_TOKEN_SECRET=...        # long random string, e.g. openssl rand -hex 32
CHUNK_BUILD_URL=...             # private URL to CHUNK.vst3 / zip (R2, S3, Blob)
```

Do **not** put the service role key in frontend code.

## 3. Flows

- **Trial:** Site **Start free trial** → `POST /api/license/trial` → `trial-success.html` (key + signed download)
- **Paid:** Stripe `checkout.session.completed` → webhook mints license (`expires_at` null, long plugin token) → `success.html` (key + download)
- **Download:** `GET /api/download?session_id=` or `?license_key=` → short-lived redirect to `CHUNK_BUILD_URL`
- **Manual:** Admin (local `ENABLE_ADMIN=true`) → Grant license → copy key
- **Plugin:** CHUNK → License → paste key → Activate → caches token under `%AppData%/Assembly DSP/CHUNK/license.json`
- **Email:** Resend sends trial/purchase/recover keys when `RESEND_API_KEY` + `EMAIL_FROM` are set (inbound mail stays on ImprovMX)
