# Licensing setup

## 1. Create tables in Supabase

Open the **assemblydsp** project → SQL Editor → paste and run:

[`supabase/migrations/20260322_licenses.sql`](./migrations/20260322_licenses.sql)

## 2. Env vars (local `.env.local` + Vercel)

```
SUPABASE_URL=https://qtfjgaysjfkipfdiaeyc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...   # Project Settings → API → service_role
LICENSE_TOKEN_SECRET=...        # long random string, e.g. openssl rand -hex 32
```

Do **not** put the service role key in frontend code.

## 3. Flows

- **Paid:** Stripe `checkout.session.completed` → webhook mints license → success page shows key
- **Manual:** Admin (local `ENABLE_ADMIN=true`) → Grant license → copy key
- **Plugin:** CHUNK → License → paste key → Activate → caches token under `%AppData%/Assembly DSP/CHUNK/license.json`
