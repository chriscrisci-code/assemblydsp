-- Assembly DSP / CHUNK licensing
-- Run in Supabase SQL editor (project: assemblydsp)

create extension if not exists "pgcrypto";

create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  product text not null default 'chunk',
  source text not null default 'stripe' check (source in ('stripe', 'manual')),
  license_key text not null unique,
  license_key_hash text not null unique,
  license_key_last4 text not null,
  email text,
  note text,
  stripe_session_id text unique,
  stripe_customer_id text,
  stripe_payment_intent_id text,
  status text not null default 'active' check (status in ('active', 'revoked')),
  max_activations int not null default 2 check (max_activations > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.license_activations (
  id uuid primary key default gen_random_uuid(),
  license_id uuid not null references public.licenses (id) on delete cascade,
  machine_id text not null,
  machine_label text,
  activated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (license_id, machine_id)
);

create index if not exists licenses_email_idx on public.licenses (email);
create index if not exists license_activations_license_id_idx on public.license_activations (license_id);

alter table public.licenses enable row level security;
alter table public.license_activations enable row level security;

-- No policies for anon/authenticated: service role bypasses RLS.
-- Deny-by-default for client keys.

comment on table public.licenses is 'CHUNK (and future) plugin licenses; service role only';
comment on table public.license_activations is 'Machine bindings per license; max enforced in API';
