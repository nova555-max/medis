-- Fix QR token creation: gen_random_bytes lives in extensions schema

create or replace function public.admin_create_qr_token(
  p_label text default 'سەرەکی',
  p_hours integer default 24
)
returns table(id uuid, token text, label text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin uuid := auth.uid();
  v_company uuid;
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_id uuid;
  v_exp timestamptz;
begin
  if v_admin is null or not public.is_company_admin() then
    raise exception 'not authorized';
  end if;
  v_company := public.current_profile_company_id();
  v_exp := case
    when p_hours is null or p_hours <= 0 then null
    else now() + make_interval(hours => p_hours)
  end;

  update public.qr_tokens set is_active = false
  where company_id = v_company and is_active = true;

  insert into public.qr_tokens (company_id, label, token_hash, expires_at, is_active, created_by)
  values (v_company, coalesce(nullif(trim(p_label), ''), 'سەرەکی'), v_token, v_exp, true, v_admin)
  returning qr_tokens.id into v_id;

  return query
    select v_id, v_token, coalesce(nullif(trim(p_label), ''), 'سەرەکی'), v_exp;
end;
$$;
