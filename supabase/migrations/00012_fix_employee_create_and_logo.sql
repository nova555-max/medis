-- Fix employee create (pgcrypto in extensions schema) + restore avatar storage policies

create extension if not exists pgcrypto with schema extensions;

create or replace function public.admin_create_employee(
  p_full_name text,
  p_employee_code text,
  p_email text,
  p_password text,
  p_phone text default null,
  p_department_id uuid default null,
  p_position_id uuid default null,
  p_hire_date date default null,
  p_notes text default null,
  p_gps_enabled boolean default false,
  p_gps_lat double precision default null,
  p_gps_lng double precision default null,
  p_gps_radius_meters integer default 150
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_admin_id uuid := auth.uid();
  v_company_id uuid;
  v_user_id uuid := gen_random_uuid();
  v_employee_id uuid;
begin
  if v_admin_id is null or not public.is_company_admin() then
    raise exception 'not authorized';
  end if;

  v_company_id := public.current_profile_company_id();

  if p_full_name is null or length(trim(p_full_name)) < 2 then
    raise exception 'invalid name';
  end if;
  if p_employee_code is null or length(trim(p_employee_code)) < 1 then
    raise exception 'invalid employee code';
  end if;
  if p_email is null or position('@' in p_email) = 0 then
    raise exception 'invalid email';
  end if;
  if p_password is null or length(p_password) < 8 then
    raise exception 'password too short';
  end if;

  if coalesce(p_gps_enabled, false) and (p_gps_lat is null or p_gps_lng is null) then
    raise exception 'gps location required';
  end if;

  if exists (select 1 from auth.users where email = lower(trim(p_email))) then
    raise exception 'email already exists';
  end if;

  if exists (
    select 1 from public.employees
    where company_id = v_company_id and employee_code = trim(p_employee_code)
  ) then
    raise exception 'employee code exists';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    lower(trim(p_email)),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', trim(p_full_name), 'role', 'employee'),
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', lower(trim(p_email)), 'email_verified', true),
    'email',
    v_user_id::text,
    now(), now(), now()
  );

  insert into public.profiles (id, company_id, role, full_name, phone, email, is_active)
  values (
    v_user_id, v_company_id, 'employee', trim(p_full_name),
    nullif(trim(p_phone), ''), lower(trim(p_email)), true
  );

  insert into public.employees (
    company_id, user_id, employee_code, full_name, phone, email,
    department_id, position_id, hire_date, notes, status,
    gps_enabled, gps_lat, gps_lng, gps_radius_meters
  ) values (
    v_company_id, v_user_id, trim(p_employee_code), trim(p_full_name),
    nullif(trim(p_phone), ''), lower(trim(p_email)),
    p_department_id, p_position_id, p_hire_date,
    nullif(trim(coalesce(p_notes, '')), ''), 'active',
    coalesce(p_gps_enabled, false),
    case when coalesce(p_gps_enabled, false) then p_gps_lat else null end,
    case when coalesce(p_gps_enabled, false) then p_gps_lng else null end,
    coalesce(nullif(p_gps_radius_meters, 0), 150)
  )
  returning id into v_employee_id;

  insert into public.activity_logs (company_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    v_company_id, v_admin_id, 'employee.created', 'employee', v_employee_id,
    jsonb_build_object(
      'fullName', trim(p_full_name),
      'employeeCode', trim(p_employee_code),
      'email', lower(trim(p_email)),
      'gpsEnabled', coalesce(p_gps_enabled, false)
    )
  );

  return v_employee_id;
end;
$$;

-- Storage policies for company logos (avatars bucket)
drop policy if exists avatars_read on storage.objects;
drop policy if exists avatars_public_read on storage.objects;
drop policy if exists avatars_write_company on storage.objects;
drop policy if exists avatars_update_company on storage.objects;
drop policy if exists avatars_delete_company on storage.objects;

create policy avatars_public_read on storage.objects
  for select
  using (bucket_id = 'avatars');

create policy avatars_write_company on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_profile_company_id()::text
  );

create policy avatars_update_company on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_profile_company_id()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_profile_company_id()::text
  );

create policy avatars_delete_company on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_profile_company_id()::text
  );
