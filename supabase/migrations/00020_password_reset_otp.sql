-- OTP-based password reset (hashed codes, one-time, 10 min expiry)
-- Replaces any legacy password_reset_otps schema

drop table if exists public.password_reset_otps cascade;

create table public.password_reset_otps (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null,
  user_id uuid references auth.users(id) on delete cascade,
  code_hash text not null,
  attempts int not null default 0,
  max_attempts int not null default 5,
  expires_at timestamptz not null,
  verified_at timestamptz,
  reset_token_hash text,
  reset_token_expires_at timestamptz,
  consumed_at timestamptz,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index password_reset_otps_email_active_idx
  on public.password_reset_otps (email_hash, created_at desc);

create index password_reset_otps_expires_idx
  on public.password_reset_otps (expires_at);

create index password_reset_otps_reset_token_idx
  on public.password_reset_otps (reset_token_hash)
  where reset_token_hash is not null;

alter table public.password_reset_otps enable row level security;

-- No direct client access; app uses service role

create or replace function public.cleanup_password_reset_otps()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.password_reset_otps
  where expires_at < now() - interval '1 day'
     or (consumed_at is not null and consumed_at < now() - interval '1 day');
$$;
