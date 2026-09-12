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
# Optional pins — leave unset so downloads follow chunk-current.json
# CHUNK_BUILD_URL=...
# CHUNK_VERSION=0.9.46
```

Do **not** put the service role key in frontend code.

## 3. Flows

- **Trial:** Site **Start free trial** → `POST /api/license/trial` → `trial-success.html` (key + signed download)
- **Paid:** Stripe `checkout.session.completed` → webhook mints license (`expires_at` null, long plugin token) → `success.html` (key + download)
- **Download:** `GET /api/download?session_id=` or `?license_key=` → short-lived redirect to the current zip from `chunk-current.json` (or `CHUNK_BUILD_URL` if pinned)
- **Current build:** public `chunk-current.json` in `plugin-builds` — footer and download labels read it in the browser
- **Manual:** Admin (local `ENABLE_ADMIN=true`) → Grant license → copy key
- **Plugin:** CHUNK → License → paste key → Activate → caches token under `%AppData%/Assembly DSP/CHUNK/license.json`
- **Email:** Resend sends trial/purchase/recover keys when `RESEND_API_KEY` + `EMAIL_FROM` are set (inbound mail stays on ImprovMX)

## 4. Publish a CHUNK build

In Storage → `plugin-builds` (public):

1. Upload `CHUNK-x.y.z.zip`
2. Upload/overwrite `chunk-current.json` (see [`chunk-current.json`](./chunk-current.json)):

```json
{
  "product": "chunk",
  "version": "0.9.46",
  "filename": "CHUNK-0.9.46.zip",
  "url": "https://qtfjgaysjfkipfdiaeyc.supabase.co/storage/v1/object/public/plugin-builds/CHUNK-0.9.46.zip",
  "releasedAt": "2026-09-04"
}
```

No website redeploy. Homepage, trial/purchase download buttons, and license emails pick up the new version within about a minute. If `CHUNK_BUILD_URL` is set on Vercel, unset it or the zip URL stays pinned.
