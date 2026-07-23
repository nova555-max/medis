-- Password reset rate-limit attempts (anti-abuse)

create table if not exists public.password_reset_attempts (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_attempts_email_created_idx
  on public.password_reset_attempts (email_hash, created_at desc);

alter table public.password_reset_attempts enable row level security;

-- No client policies: only service / security definer RPCs

create or replace function public.request_password_reset_allowed(
  p_email text,
  p_ip text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_email_hash text;
  v_ip_hash text;
  v_count int;
begin
  if p_email is null or position('@' in p_email) = 0 then
    return false;
  end if;

  v_email_hash := encode(extensions.digest(lower(trim(p_email)), 'sha256'), 'hex');
  v_ip_hash := case
    when p_ip is null or trim(p_ip) = '' then null
    else encode(extensions.digest(trim(p_ip), 'sha256'), 'hex')
  end;

  -- Max 3 attempts per email in 15 minutes
  select count(*)::int into v_count
  from public.password_reset_attempts
  where email_hash = v_email_hash
    and created_at > now() - interval '15 minutes';

  if v_count >= 3 then
    return false;
  end if;

  -- Max 10 attempts per IP in 15 minutes
  if v_ip_hash is not null then
    select count(*)::int into v_count
    from public.password_reset_attempts
    where ip_hash = v_ip_hash
      and created_at > now() - interval '15 minutes';
    if v_count >= 10 then
      return false;
    end if;
  end if;

  insert into public.password_reset_attempts (email_hash, ip_hash)
  values (v_email_hash, v_ip_hash);

  return true;
end;
$$;

grant execute on function public.request_password_reset_allowed(text, text) to authenticated, anon;

-- Cleanup old rows periodically (optional helper)
create or replace function public.cleanup_password_reset_attempts()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.password_reset_attempts
  where created_at < now() - interval '7 days';
$$;

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
