-- Employee per-person GPS + company hours gate (synced from remote)

alter table public.companies
  add column if not exists gps_only_during_work_hours boolean not null default true;

alter table public.employees
  add column if not exists gps_enabled boolean not null default false,
  add column if not exists gps_lat double precision,
  add column if not exists gps_lng double precision,
  add column if not exists gps_radius_meters int not null default 150;

create or replace function public.haversine_m(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
returns double precision
language sql
immutable
as $$
  select 6371000 * 2 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) *
    power(sin(radians(lng2 - lng1) / 2), 2)
  ));
$$;

create or replace function public.is_gps_allowed_now(p_company_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_company public.companies%rowtype;
  v_now time;
begin
  select * into v_company from public.companies where id = p_company_id;
  if not found then
    return false;
  end if;

  if not v_company.gps_required then
    return true;
  end if;

  if not v_company.gps_only_during_work_hours then
    return true;
  end if;

  v_now := (now() at time zone coalesce(v_company.timezone, 'Asia/Baghdad'))::time;

  if v_company.work_start_time <= v_company.work_end_time then
    return v_now >= v_company.work_start_time and v_now <= v_company.work_end_time;
  end if;

  return v_now >= v_company.work_start_time or v_now <= v_company.work_end_time;
end;
$$;

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
set search_path = public
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
    crypt(p_password, gen_salt('bf')),
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
