-- Raise self-serve admin registration cap + ensure slots RPC exists.
-- Run in Supabase SQL Editor for project: ccpsitgvclhchkjsyvlo

create or replace function public.admin_registration_slots()
returns table(used int, max_allowed int, open boolean)
language sql
security definer
set search_path = public
stable
as $$
  select
    (select count(*)::int from public.profiles where role = 'admin') as used,
    20 as max_allowed,
    (select count(*)::int from public.profiles where role = 'admin') < 20 as open;
$$;

revoke all on function public.admin_registration_slots() from public;
grant execute on function public.admin_registration_slots() to anon, authenticated;

create or replace function public.register_company_workspace(
  p_company_name text,
  p_slug text,
  p_full_name text,
  p_email text,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_admin_count int;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select count(*)::int into v_admin_count
  from public.profiles
  where role = 'admin';

  if v_admin_count >= 20 then
    raise exception 'admin registration closed';
  end if;

  if exists (select 1 from public.profiles where id = v_user_id) then
    raise exception 'profile already exists';
  end if;

  insert into public.companies (name, slug)
  values (p_company_name, p_slug)
  returning id into v_company_id;

  insert into public.profiles (id, company_id, role, full_name, phone, email)
  values (v_user_id, v_company_id, 'admin', p_full_name, p_phone, p_email);

  insert into public.leave_types (company_id, code, name_ckb, is_paid, annual_allowance_days)
  values
    (v_company_id, 'annual', 'مۆڵەتی ساڵانە', true, 21),
    (v_company_id, 'sick', 'مۆڵەتی نەخۆشی', true, 14),
    (v_company_id, 'unpaid', 'مۆڵەتی بێ مووچە', false, 0);

  insert into public.activity_logs (company_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    v_company_id,
    v_user_id,
    'company.registered',
    'company',
    v_company_id,
    jsonb_build_object('name', p_company_name)
  );

  return v_company_id;
end;
$$;

revoke all on function public.register_company_workspace(text, text, text, text, text) from public;
grant execute on function public.register_company_workspace(text, text, text, text, text) to authenticated;
