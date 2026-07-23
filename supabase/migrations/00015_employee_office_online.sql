-- Office vs online employees + live location for online staff

alter table public.employees
  add column if not exists employee_type text not null default 'office'
    check (employee_type in ('office', 'online')),
  add column if not exists last_lat double precision,
  add column if not exists last_lng double precision,
  add column if not exists last_location_at timestamptz,
  add column if not exists last_activity text;

create index if not exists employees_type_idx
  on public.employees (company_id, employee_type, status);

-- Online employees cannot use office GPS geofence
create or replace function public.enforce_online_no_gps()
returns trigger
language plpgsql
as $$
begin
  if new.employee_type = 'online' then
    new.gps_enabled := false;
    new.gps_lat := null;
    new.gps_lng := null;
  end if;
  return new;
end;
$$;

drop trigger if exists employees_enforce_online_no_gps on public.employees;
create trigger employees_enforce_online_no_gps
before insert or update on public.employees
for each row execute function public.enforce_online_no_gps();

-- Online employee reports live location + activity
create or replace function public.employee_update_location(
  p_lat double precision,
  p_lng double precision,
  p_activity text default null
)
returns public.employees
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_emp public.employees%rowtype;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_lat is null or p_lng is null then
    raise exception 'location required';
  end if;

  select * into v_emp from public.employees
  where user_id = v_user and status = 'active';
  if not found then raise exception 'employee not found'; end if;

  if v_emp.employee_type <> 'online' then
    raise exception 'only online employees';
  end if;

  update public.employees set
    last_lat = p_lat,
    last_lng = p_lng,
    last_location_at = now(),
    last_activity = nullif(trim(coalesce(p_activity, '')), ''),
    updated_at = now()
  where id = v_emp.id
  returning * into v_emp;

  return v_emp;
end;
$$;

grant execute on function public.employee_update_location(double precision, double precision, text) to authenticated;

-- Sync online last location from attendance check-in/out coords
create or replace function public.sync_online_location_from_attendance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
  v_lat double precision;
  v_lng double precision;
  v_act text;
begin
  select employee_type into v_type from public.employees where id = new.employee_id;
  if v_type is distinct from 'online' then
    return new;
  end if;

  if tg_op = 'INSERT' or new.check_in_at is distinct from old.check_in_at then
    v_lat := new.check_in_lat;
    v_lng := new.check_in_lng;
    v_act := 'check_in';
  elsif new.check_out_at is distinct from old.check_out_at then
    v_lat := new.check_out_lat;
    v_lng := new.check_out_lng;
    v_act := 'check_out';
  end if;

  if v_lat is not null and v_lng is not null then
    update public.employees set
      last_lat = v_lat,
      last_lng = v_lng,
      last_location_at = now(),
      last_activity = v_act,
      updated_at = now()
    where id = new.employee_id;
  end if;

  return new;
end;
$$;

drop trigger if exists attendance_sync_online_location on public.attendance_records;
create trigger attendance_sync_online_location
after insert or update on public.attendance_records
for each row execute function public.sync_online_location_from_attendance();

-- Extend create employee with type
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
  p_gps_radius_meters integer default 150,
  p_employee_type text default 'office'
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
  v_type text := case
    when lower(coalesce(p_employee_type, 'office')) = 'online' then 'online'
    else 'office'
  end;
  v_gps boolean := coalesce(p_gps_enabled, false);
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

  if v_type = 'online' then
    v_gps := false;
  end if;

  if v_gps and (p_gps_lat is null or p_gps_lng is null) then
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
    gps_enabled, gps_lat, gps_lng, gps_radius_meters, employee_type
  ) values (
    v_company_id, v_user_id, trim(p_employee_code), trim(p_full_name),
    nullif(trim(p_phone), ''), lower(trim(p_email)),
    p_department_id, p_position_id, p_hire_date,
    nullif(trim(coalesce(p_notes, '')), ''), 'active',
    v_gps,
    case when v_gps then p_gps_lat else null end,
    case when v_gps then p_gps_lng else null end,
    coalesce(nullif(p_gps_radius_meters, 0), 150),
    v_type
  )
  returning id into v_employee_id;

  insert into public.activity_logs (company_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    v_company_id, v_admin_id, 'employee.created', 'employee', v_employee_id,
    jsonb_build_object(
      'fullName', trim(p_full_name),
      'employeeCode', trim(p_employee_code),
      'email', lower(trim(p_email)),
      'employeeType', v_type,
      'gpsEnabled', v_gps
    )
  );

  return v_employee_id;
end;
$$;
