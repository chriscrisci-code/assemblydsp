-- Trial licenses + optional expiry for CHUNK
-- Run in Supabase SQL editor after 20260322_licenses.sql

alter table public.licenses
  drop constraint if exists licenses_source_check;

alter table public.licenses
  add constraint licenses_source_check
  check (source in ('stripe', 'manual', 'trial'));

alter table public.licenses
  add column if not exists expires_at timestamptz;

comment on column public.licenses.expires_at is
  'When set, activation and tokens must not outlive this instant (used for 14-day trials). Null = paid/manual long-lived.';
