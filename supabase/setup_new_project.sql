-- ===== 00001_init_schema.sql =====
-- Media Office: core schema + multi-tenant RLS (no super admin)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- NOTE: profile helper functions are created AFTER tables (see below)

-- ---------------------------------------------------------------------------
-- Companies
-- ---------------------------------------------------------------------------

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  timezone text not null default 'Asia/Baghdad',
  work_start_time time not null default '09:00',
  work_end_time time not null default '17:00',
  late_grace_minutes int not null default 15,
  overtime_after_minutes int not null default 0,
  gps_required boolean not null default true,
  qr_required boolean not null default false,
  selfie_required boolean not null default false,
  gps_radius_meters int not null default 150,
  office_lat double precision,
  office_lng double precision,
  theme_default text not null default 'system'
    check (theme_default in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  role text not null check (role in ('admin', 'employee')),
  full_name text not null,
  phone text,
  email text,
  avatar_url text,
  is_active boolean not null default true,
  expo_push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_company_id_idx on public.profiles (company_id);
create index profiles_role_idx on public.profiles (company_id, role);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Org structure
-- ---------------------------------------------------------------------------

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create table public.positions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create trigger departments_set_updated_at
before update on public.departments
for each row execute function public.set_updated_at();

create trigger positions_set_updated_at
before update on public.positions
for each row execute function public.set_updated_at();

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid unique references public.profiles (id) on delete set null,
  employee_code text not null,
  full_name text not null,
  phone text,
  email text,
  photo_url text,
  department_id uuid references public.departments (id) on delete set null,
  position_id uuid references public.positions (id) on delete set null,
  hire_date date,
  status text not null default 'active' check (status in ('active', 'archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, employee_code)
);

create index employees_company_status_idx on public.employees (company_id, status);
create index employees_full_name_idx on public.employees (company_id, full_name);

create trigger employees_set_updated_at
before update on public.employees
for each row execute function public.set_updated_at();

create table public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  title text not null,
  file_path text not null,
  file_type text,
  file_size bigint,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index employee_documents_employee_idx
  on public.employee_documents (company_id, employee_id);

-- ---------------------------------------------------------------------------
-- QR tokens
-- ---------------------------------------------------------------------------

create table public.qr_tokens (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  label text not null default 'سەرەکی',
  token_hash text not null unique,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index qr_tokens_company_idx on public.qr_tokens (company_id, is_active);

-- ---------------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------------

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  work_date date not null,
  check_in_at timestamptz,
  check_out_at timestamptz,
  check_in_lat double precision,
  check_in_lng double precision,
  check_out_lat double precision,
  check_out_lng double precision,
  check_in_method text check (check_in_method in ('gps', 'qr', 'manual', 'gps_qr')),
  check_out_method text check (check_out_method in ('gps', 'qr', 'manual', 'gps_qr')),
  check_in_selfie_path text,
  check_out_selfie_path text,
  check_in_device_info jsonb,
  check_out_device_info jsonb,
  check_in_ip inet,
  check_out_ip inet,
  qr_token_id uuid references public.qr_tokens (id) on delete set null,
  status text not null default 'incomplete'
    check (status in ('present', 'late', 'early_leave', 'absent', 'on_leave', 'incomplete', 'overtime')),
  worked_minutes int not null default 0,
  late_minutes int not null default 0,
  early_leave_minutes int not null default 0,
  overtime_minutes int not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, employee_id, work_date)
);

create index attendance_company_date_idx
  on public.attendance_records (company_id, work_date);
create index attendance_employee_date_idx
  on public.attendance_records (company_id, employee_id, work_date);

create trigger attendance_set_updated_at
before update on public.attendance_records
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Leave
-- ---------------------------------------------------------------------------

create table public.leave_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  code text not null,
  name_ckb text not null,
  is_paid boolean not null default true,
  annual_allowance_days numeric(6,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, code)
);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  leave_type_id uuid not null references public.leave_types (id) on delete restrict,
  start_date date not null,
  end_date date not null,
  days_count numeric(6,2) not null,
  reason text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index leave_requests_company_status_idx
  on public.leave_requests (company_id, status);

create trigger leave_requests_set_updated_at
before update on public.leave_requests
for each row execute function public.set_updated_at();

create table public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  leave_type_id uuid not null references public.leave_types (id) on delete cascade,
  year int not null,
  entitled_days numeric(6,2) not null default 0,
  used_days numeric(6,2) not null default 0,
  remaining_days numeric(6,2) not null default 0,
  unique (company_id, employee_id, leave_type_id, year)
);

-- ---------------------------------------------------------------------------
-- Notifications / announcements / logs / backups
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'general',
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx
  on public.notifications (user_id, is_read, created_at desc);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null,
  body text not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index activity_logs_company_idx
  on public.activity_logs (company_id, created_at desc);

create table public.backups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  storage_path text,
  size_bytes bigint,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed')),
  triggered_by text not null check (triggered_by in ('auto', 'manual')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text
);

-- ---------------------------------------------------------------------------
-- Profile helpers (after tables exist)
-- ---------------------------------------------------------------------------

create or replace function public.current_profile_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_company_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

-- ---------------------------------------------------------------------------
-- Register company workspace (admin signup) — no super admin
-- ---------------------------------------------------------------------------

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
begin
  if v_user_id is null then
    raise exception 'not authenticated';
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

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.departments enable row level security;
alter table public.positions enable row level security;
alter table public.employees enable row level security;
alter table public.employee_documents enable row level security;
alter table public.qr_tokens enable row level security;
alter table public.attendance_records enable row level security;
alter table public.leave_types enable row level security;
alter table public.leave_requests enable row level security;
alter table public.leave_balances enable row level security;
alter table public.notifications enable row level security;
alter table public.announcements enable row level security;
alter table public.activity_logs enable row level security;
alter table public.backups enable row level security;

-- Companies: only own company, never list others
create policy companies_select_own on public.companies
  for select to authenticated
  using (id = public.current_profile_company_id());

create policy companies_update_admin on public.companies
  for update to authenticated
  using (id = public.current_profile_company_id() and public.is_company_admin())
  with check (id = public.current_profile_company_id() and public.is_company_admin());

-- Profiles
create policy profiles_select_same_company on public.profiles
  for select to authenticated
  using (company_id = public.current_profile_company_id());

create policy profiles_update_self_or_admin on public.profiles
  for update to authenticated
  using (
    company_id = public.current_profile_company_id()
    and (id = auth.uid() or public.is_company_admin())
  )
  with check (company_id = public.current_profile_company_id());

create policy profiles_insert_admin on public.profiles
  for insert to authenticated
  with check (
    company_id = public.current_profile_company_id()
    and public.is_company_admin()
  );

-- Generic company-scoped admin write / member read helpers via repeated policies

create policy departments_all_admin on public.departments
  for all to authenticated
  using (company_id = public.current_profile_company_id() and public.is_company_admin())
  with check (company_id = public.current_profile_company_id() and public.is_company_admin());

create policy departments_select_member on public.departments
  for select to authenticated
  using (company_id = public.current_profile_company_id());

create policy positions_all_admin on public.positions
  for all to authenticated
  using (company_id = public.current_profile_company_id() and public.is_company_admin())
  with check (company_id = public.current_profile_company_id() and public.is_company_admin());

create policy positions_select_member on public.positions
  for select to authenticated
  using (company_id = public.current_profile_company_id());

create policy employees_all_admin on public.employees
  for all to authenticated
  using (company_id = public.current_profile_company_id() and public.is_company_admin())
  with check (company_id = public.current_profile_company_id() and public.is_company_admin());

create policy employees_select_self on public.employees
  for select to authenticated
  using (
    company_id = public.current_profile_company_id()
    and (public.is_company_admin() or user_id = auth.uid())
  );

create policy employee_documents_admin on public.employee_documents
  for all to authenticated
  using (company_id = public.current_profile_company_id() and public.is_company_admin())
  with check (company_id = public.current_profile_company_id() and public.is_company_admin());

create policy employee_documents_select_self on public.employee_documents
  for select to authenticated
  using (
    company_id = public.current_profile_company_id()
    and (
      public.is_company_admin()
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );

create policy qr_tokens_admin on public.qr_tokens
  for all to authenticated
  using (company_id = public.current_profile_company_id() and public.is_company_admin())
  with check (company_id = public.current_profile_company_id() and public.is_company_admin());

create policy qr_tokens_select_member on public.qr_tokens
  for select to authenticated
  using (company_id = public.current_profile_company_id() and is_active = true);

create policy attendance_admin on public.attendance_records
  for all to authenticated
  using (company_id = public.current_profile_company_id() and public.is_company_admin())
  with check (company_id = public.current_profile_company_id() and public.is_company_admin());

create policy attendance_select_self on public.attendance_records
  for select to authenticated
  using (
    company_id = public.current_profile_company_id()
    and (
      public.is_company_admin()
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );

create policy leave_types_admin on public.leave_types
  for all to authenticated
  using (company_id = public.current_profile_company_id() and public.is_company_admin())
  with check (company_id = public.current_profile_company_id() and public.is_company_admin());

create policy leave_types_select_member on public.leave_types
  for select to authenticated
  using (company_id = public.current_profile_company_id());

create policy leave_requests_admin on public.leave_requests
  for all to authenticated
  using (company_id = public.current_profile_company_id() and public.is_company_admin())
  with check (company_id = public.current_profile_company_id() and public.is_company_admin());

create policy leave_requests_select_self on public.leave_requests
  for select to authenticated
  using (
    company_id = public.current_profile_company_id()
    and (
      public.is_company_admin()
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );

create policy leave_requests_insert_self on public.leave_requests
  for insert to authenticated
  with check (
    company_id = public.current_profile_company_id()
    and employee_id in (select id from public.employees where user_id = auth.uid())
  );

create policy leave_balances_admin on public.leave_balances
  for all to authenticated
  using (company_id = public.current_profile_company_id() and public.is_company_admin())
  with check (company_id = public.current_profile_company_id() and public.is_company_admin());

create policy leave_balances_select_self on public.leave_balances
  for select to authenticated
  using (
    company_id = public.current_profile_company_id()
    and (
      public.is_company_admin()
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (
    company_id = public.current_profile_company_id()
    and user_id = auth.uid()
  );

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notifications_insert_admin on public.notifications
  for insert to authenticated
  with check (
    company_id = public.current_profile_company_id()
    and public.is_company_admin()
  );

create policy announcements_select_member on public.announcements
  for select to authenticated
  using (company_id = public.current_profile_company_id());

create policy announcements_admin on public.announcements
  for all to authenticated
  using (company_id = public.current_profile_company_id() and public.is_company_admin())
  with check (company_id = public.current_profile_company_id() and public.is_company_admin());

create policy activity_logs_select_admin on public.activity_logs
  for select to authenticated
  using (company_id = public.current_profile_company_id() and public.is_company_admin());

create policy activity_logs_insert_member on public.activity_logs
  for insert to authenticated
  with check (company_id = public.current_profile_company_id());

create policy backups_admin on public.backups
  for all to authenticated
  using (company_id = public.current_profile_company_id() and public.is_company_admin())
  with check (company_id = public.current_profile_company_id() and public.is_company_admin());

-- Allow company insert only via security definer RPC (no direct insert policy)

-- ---------------------------------------------------------------------------
-- Storage buckets (run in dashboard or via storage API; policies below)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('documents', 'documents', false),
  ('selfies', 'selfies', false),
  ('backups', 'backups', false)
on conflict (id) do nothing;

-- ===== 00002_storage_policies.sql =====
-- Storage policies: path must start with company_id

create policy avatars_read on storage.objects
  for select to authenticated
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
  );

create policy documents_company on storage.objects
  for all to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_profile_company_id()::text
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_profile_company_id()::text
  );

create policy selfies_company on storage.objects
  for all to authenticated
  using (
    bucket_id = 'selfies'
    and (storage.foldername(name))[1] = public.current_profile_company_id()::text
  )
  with check (
    bucket_id = 'selfies'
    and (storage.foldername(name))[1] = public.current_profile_company_id()::text
  );

create policy backups_admin_only on storage.objects
  for all to authenticated
  using (
    bucket_id = 'backups'
    and public.is_company_admin()
    and (storage.foldername(name))[1] = public.current_profile_company_id()::text
  )
  with check (
    bucket_id = 'backups'
    and public.is_company_admin()
    and (storage.foldername(name))[1] = public.current_profile_company_id()::text
  );

-- ===== 00003_employee_auth_gps_hours.sql =====
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

-- ===== 00004_leave_approve_balances.sql =====
-- Phase 1: leave approve updates balances + marks attendance on_leave

create or replace function public.admin_review_leave(
  p_leave_id uuid,
  p_status text,
  p_note text default null
)
returns public.leave_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_req public.leave_requests;
  v_day date;
  v_year int;
begin
  if v_admin is null or not public.is_company_admin() then
    raise exception 'not authorized';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid status';
  end if;

  update public.leave_requests set
    status = p_status,
    reviewed_by = v_admin,
    reviewed_at = now(),
    review_note = p_note,
    updated_at = now()
  where id = p_leave_id
    and company_id = public.current_profile_company_id()
    and status = 'pending'
  returning * into v_req;

  if not found then raise exception 'leave not found'; end if;

  if p_status = 'approved' then
    v_year := extract(year from v_req.start_date)::int;

    insert into public.leave_balances (
      company_id, employee_id, leave_type_id, year, entitled_days, used_days, remaining_days
    ) values (
      v_req.company_id, v_req.employee_id, v_req.leave_type_id, v_year,
      greatest(v_req.days_count, 0), v_req.days_count, 0
    )
    on conflict (company_id, employee_id, leave_type_id, year) do update set
      used_days = public.leave_balances.used_days + v_req.days_count,
      remaining_days = greatest(
        public.leave_balances.remaining_days - v_req.days_count,
        0
      );

    v_day := v_req.start_date;
    while v_day <= v_req.end_date loop
      insert into public.attendance_records (
        company_id, employee_id, work_date, status
      ) values (
        v_req.company_id, v_req.employee_id, v_day, 'on_leave'
      )
      on conflict (company_id, employee_id, work_date) do update set
        status = case
          when public.attendance_records.check_in_at is null then 'on_leave'
          else public.attendance_records.status
        end,
        updated_at = now();
      v_day := v_day + 1;
    end loop;
  end if;

  insert into public.notifications (company_id, user_id, title, body, type, data)
  select e.company_id, e.user_id,
    case when p_status = 'approved' then 'مۆڵەت پەسەندکرا' else 'مۆڵەت ڕەتکرایەوە' end,
    coalesce(p_note, ''),
    'leave',
    jsonb_build_object('leave_id', v_req.id, 'status', p_status)
  from public.employees e where e.id = v_req.employee_id and e.user_id is not null;

  return v_req;
end;
$$;

-- ===== 00005_payroll_attendance_rpcs.sql =====
-- Payroll + attendance RPCs synced from remote (QR/selfie enforce)

create table if not exists public.salaries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  year int not null,
  month int not null check (month >= 1 and month <= 12),
  base_amount numeric not null default 0,
  allowances numeric not null default 0,
  deductions numeric not null default 0,
  net_amount numeric not null default 0,
  status text not null default 'draft' check (status in ('draft', 'paid', 'cancelled')),
  paid_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, employee_id, year, month)
);

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  title text not null,
  amount numeric not null default 0,
  reward_date date not null default current_date,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.salaries enable row level security;
alter table public.rewards enable row level security;

drop policy if exists salaries_admin on public.salaries;
create policy salaries_admin on public.salaries
  for all to authenticated
  using (company_id = public.current_profile_company_id() and public.is_company_admin())
  with check (company_id = public.current_profile_company_id() and public.is_company_admin());

drop policy if exists salaries_select_self on public.salaries;
create policy salaries_select_self on public.salaries
  for select to authenticated
  using (
    company_id = public.current_profile_company_id()
    and employee_id in (
      select id from public.employees where user_id = auth.uid()
    )
  );

drop policy if exists rewards_admin on public.rewards;
create policy rewards_admin on public.rewards
  for all to authenticated
  using (company_id = public.current_profile_company_id() and public.is_company_admin())
  with check (company_id = public.current_profile_company_id() and public.is_company_admin());

drop policy if exists rewards_select_self on public.rewards;
create policy rewards_select_self on public.rewards
  for select to authenticated
  using (
    company_id = public.current_profile_company_id()
    and employee_id in (
      select id from public.employees where user_id = auth.uid()
    )
  );

create or replace function public.admin_upsert_salary(
  p_employee_id uuid,
  p_year integer,
  p_month integer,
  p_base numeric,
  p_allowances numeric default 0,
  p_deductions numeric default 0,
  p_status text default 'draft',
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_company uuid;
  v_id uuid;
  v_net numeric;
begin
  if v_admin is null or not public.is_company_admin() then raise exception 'not authorized'; end if;
  v_company := public.current_profile_company_id();
  if not exists (select 1 from public.employees where id = p_employee_id and company_id = v_company) then
    raise exception 'employee not found';
  end if;
  v_net := coalesce(p_base,0) + coalesce(p_allowances,0) - coalesce(p_deductions,0);

  insert into public.salaries (
    company_id, employee_id, year, month, base_amount, allowances, deductions, net_amount, status, note, paid_at
  ) values (
    v_company, p_employee_id, p_year, p_month, p_base, p_allowances, p_deductions, v_net, p_status, p_note,
    case when p_status = 'paid' then now() else null end
  )
  on conflict (company_id, employee_id, year, month) do update set
    base_amount = excluded.base_amount,
    allowances = excluded.allowances,
    deductions = excluded.deductions,
    net_amount = excluded.net_amount,
    status = excluded.status,
    note = excluded.note,
    paid_at = case when excluded.status = 'paid' then coalesce(public.salaries.paid_at, now()) else null end,
    updated_at = now()
  returning id into v_id;

  if p_status = 'paid' then
    insert into public.notifications (company_id, user_id, title, body, type, data)
    select e.company_id, e.user_id,
      'مووچە گەیشت',
      format('مووچەی مانگی %s/%s بە بڕی %s تۆمارکرا.', p_month, p_year, v_net),
      'salary',
      jsonb_build_object('salary_id', v_id, 'year', p_year, 'month', p_month, 'net', v_net)
    from public.employees e where e.id = p_employee_id and e.user_id is not null;
  end if;

  return v_id;
end;
$$;

create or replace function public.admin_add_reward(
  p_employee_id uuid,
  p_title text,
  p_amount numeric,
  p_reward_date date default current_date,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_company uuid;
  v_id uuid;
begin
  if v_admin is null or not public.is_company_admin() then raise exception 'not authorized'; end if;
  v_company := public.current_profile_company_id();
  if not exists (select 1 from public.employees where id = p_employee_id and company_id = v_company) then
    raise exception 'employee not found';
  end if;

  insert into public.rewards (company_id, employee_id, title, amount, reward_date, note, created_by)
  values (v_company, p_employee_id, trim(p_title), coalesce(p_amount,0), coalesce(p_reward_date, current_date), p_note, v_admin)
  returning id into v_id;

  insert into public.notifications (company_id, user_id, title, body, type, data)
  select e.company_id, e.user_id,
    'پاداشتی نوێ',
    format('%s — بڕی %s', trim(p_title), coalesce(p_amount,0)),
    'reward',
    jsonb_build_object('reward_id', v_id)
  from public.employees e where e.id = p_employee_id and e.user_id is not null;

  return v_id;
end;
$$;

create or replace function public.admin_create_qr_token(
  p_label text default 'سەرەکی',
  p_hours integer default 24
)
returns table(id uuid, token text, label text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_company uuid;
  v_token text := encode(gen_random_bytes(24), 'hex');
  v_id uuid;
  v_exp timestamptz;
begin
  if v_admin is null or not public.is_company_admin() then
    raise exception 'not authorized';
  end if;
  v_company := public.current_profile_company_id();
  v_exp := case when p_hours is null or p_hours <= 0 then null else now() + make_interval(hours => p_hours) end;

  update public.qr_tokens set is_active = false
  where company_id = v_company and is_active = true;

  insert into public.qr_tokens (company_id, label, token_hash, expires_at, is_active, created_by)
  values (v_company, coalesce(nullif(trim(p_label), ''), 'سەرەکی'), v_token, v_exp, true, v_admin)
  returning qr_tokens.id into v_id;

  return query select v_id, v_token, coalesce(nullif(trim(p_label), ''), 'سەرەکی'), v_exp;
end;
$$;

create or replace function public.employee_check_in(
  p_lat double precision default null,
  p_lng double precision default null,
  p_qr_token text default null,
  p_device_info jsonb default '{}'::jsonb,
  p_selfie_path text default null
)
returns public.attendance_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_emp public.employees%rowtype;
  v_company public.companies%rowtype;
  v_today date;
  v_now timestamptz := now();
  v_local_time time;
  v_late int := 0;
  v_status text := 'present';
  v_method text := 'manual';
  v_qr_id uuid;
  v_rec public.attendance_records;
  v_dist double precision;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select * into v_emp from public.employees where user_id = v_user_id and status = 'active';
  if not found then raise exception 'employee not found'; end if;

  select * into v_company from public.companies where id = v_emp.company_id;
  v_today := (v_now at time zone coalesce(v_company.timezone, 'Asia/Baghdad'))::date;
  v_local_time := (v_now at time zone coalesce(v_company.timezone, 'Asia/Baghdad'))::time;

  if exists (
    select 1 from public.attendance_records
    where company_id = v_emp.company_id and employee_id = v_emp.id
      and work_date = v_today and check_in_at is not null
  ) then
    raise exception 'already checked in';
  end if;

  if exists (
    select 1 from public.leave_requests lr
    where lr.company_id = v_emp.company_id and lr.employee_id = v_emp.id
      and lr.status = 'approved' and v_today between lr.start_date and lr.end_date
  ) then
    raise exception 'on leave today';
  end if;

  if coalesce(v_emp.gps_enabled, false) then
    if not public.is_gps_allowed_now(v_emp.company_id) then
      raise exception 'gps closed outside work hours';
    end if;
    if p_lat is null or p_lng is null then
      raise exception 'gps required';
    end if;
    if v_emp.gps_lat is null or v_emp.gps_lng is null then
      raise exception 'employee gps location not set';
    end if;
    v_dist := public.haversine_m(p_lat, p_lng, v_emp.gps_lat, v_emp.gps_lng);
    if v_dist > coalesce(v_emp.gps_radius_meters, 150) then
      raise exception 'outside gps radius';
    end if;
    v_method := 'gps';
  end if;

  if coalesce(v_company.qr_required, false) then
    if p_qr_token is null or length(trim(p_qr_token)) = 0 then
      raise exception 'qr required';
    end if;
    select id into v_qr_id from public.qr_tokens
    where company_id = v_emp.company_id and is_active = true
      and token_hash = p_qr_token
      and (expires_at is null or expires_at > now())
    limit 1;
    if v_qr_id is null then raise exception 'invalid qr'; end if;
    v_method := case when v_method = 'gps' then 'gps_qr' else 'qr' end;
  end if;

  if coalesce(v_company.selfie_required, false)
     and (p_selfie_path is null or length(trim(p_selfie_path)) = 0) then
    raise exception 'selfie required';
  end if;

  if v_local_time > (v_company.work_start_time + make_interval(mins => coalesce(v_company.late_grace_minutes, 15))) then
    v_late := greatest(0, floor(extract(epoch from (v_local_time - v_company.work_start_time)) / 60)::int);
    v_status := 'late';
  end if;

  insert into public.attendance_records (
    company_id, employee_id, work_date, check_in_at,
    check_in_lat, check_in_lng, check_in_method, check_in_selfie_path,
    check_in_device_info, qr_token_id, status, late_minutes
  ) values (
    v_emp.company_id, v_emp.id, v_today, v_now,
    p_lat, p_lng, v_method, p_selfie_path,
    coalesce(p_device_info, '{}'::jsonb), v_qr_id, v_status, v_late
  )
  on conflict (company_id, employee_id, work_date) do update set
    check_in_at = excluded.check_in_at,
    check_in_lat = excluded.check_in_lat,
    check_in_lng = excluded.check_in_lng,
    check_in_method = excluded.check_in_method,
    check_in_selfie_path = excluded.check_in_selfie_path,
    check_in_device_info = excluded.check_in_device_info,
    qr_token_id = excluded.qr_token_id,
    status = excluded.status,
    late_minutes = excluded.late_minutes,
    updated_at = now()
  returning * into v_rec;

  insert into public.activity_logs (company_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_emp.company_id, v_user_id, 'attendance.check_in', 'attendance', v_rec.id,
    jsonb_build_object('status', v_status, 'late_minutes', v_late));

  return v_rec;
end;
$$;

create or replace function public.employee_check_out(
  p_lat double precision default null,
  p_lng double precision default null,
  p_device_info jsonb default '{}'::jsonb,
  p_selfie_path text default null
)
returns public.attendance_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_emp public.employees%rowtype;
  v_company public.companies%rowtype;
  v_today date;
  v_now timestamptz := now();
  v_local_time time;
  v_rec public.attendance_records;
  v_worked int;
  v_early int := 0;
  v_ot int := 0;
  v_status text;
  v_method text := 'manual';
  v_dist double precision;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  select * into v_emp from public.employees where user_id = v_user_id and status = 'active';
  if not found then raise exception 'employee not found'; end if;
  select * into v_company from public.companies where id = v_emp.company_id;
  v_today := (v_now at time zone coalesce(v_company.timezone, 'Asia/Baghdad'))::date;
  v_local_time := (v_now at time zone coalesce(v_company.timezone, 'Asia/Baghdad'))::time;

  select * into v_rec from public.attendance_records
  where company_id = v_emp.company_id and employee_id = v_emp.id and work_date = v_today;
  if not found or v_rec.check_in_at is null then raise exception 'not checked in'; end if;
  if v_rec.check_out_at is not null then raise exception 'already checked out'; end if;

  if coalesce(v_emp.gps_enabled, false) then
    if not public.is_gps_allowed_now(v_emp.company_id) then
      raise exception 'gps closed outside work hours';
    end if;
    if p_lat is null or p_lng is null then raise exception 'gps required'; end if;
    v_dist := public.haversine_m(p_lat, p_lng, v_emp.gps_lat, v_emp.gps_lng);
    if v_dist > coalesce(v_emp.gps_radius_meters, 150) then
      raise exception 'outside gps radius';
    end if;
    v_method := 'gps';
  end if;

  v_worked := greatest(0, floor(extract(epoch from (v_now - v_rec.check_in_at)) / 60)::int);
  if v_local_time < v_company.work_end_time then
    v_early := greatest(0, floor(extract(epoch from (v_company.work_end_time - v_local_time)) / 60)::int);
  end if;
  if v_local_time > (v_company.work_end_time + make_interval(mins => coalesce(v_company.overtime_after_minutes, 0))) then
    v_ot := greatest(0, floor(extract(epoch from (v_local_time - v_company.work_end_time)) / 60)::int);
  end if;

  v_status := v_rec.status;
  if v_ot > 0 then v_status := 'overtime';
  elsif v_early > 0 then v_status := 'early_leave';
  end if;

  update public.attendance_records set
    check_out_at = v_now,
    check_out_lat = p_lat,
    check_out_lng = p_lng,
    check_out_method = v_method,
    check_out_selfie_path = p_selfie_path,
    check_out_device_info = coalesce(p_device_info, '{}'::jsonb),
    worked_minutes = v_worked,
    early_leave_minutes = v_early,
    overtime_minutes = v_ot,
    status = v_status,
    updated_at = now()
  where id = v_rec.id
  returning * into v_rec;

  insert into public.activity_logs (company_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_emp.company_id, v_user_id, 'attendance.check_out', 'attendance', v_rec.id,
    jsonb_build_object('worked_minutes', v_worked, 'overtime_minutes', v_ot));

  return v_rec;
end;
$$;

-- ===== 00006_branches_shifts_holidays.sql =====
-- Phase 2: branches, shifts, holidays + wire into attendance

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  address text,
  lat double precision,
  lng double precision,
  radius_meters int not null default 150,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  name text not null,
  start_time time not null,
  end_time time not null,
  late_grace_minutes int not null default 15,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete cascade,
  name text not null,
  holiday_date date not null,
  is_recurring_yearly boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists holidays_unique_idx
  on public.holidays (
    company_id,
    holiday_date,
    coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid),
    name
  );

alter table public.employees
  add column if not exists branch_id uuid references public.branches (id) on delete set null,
  add column if not exists shift_id uuid references public.shifts (id) on delete set null;

create index if not exists branches_company_idx on public.branches (company_id, is_active);
create index if not exists shifts_company_idx on public.shifts (company_id, is_active);
create index if not exists holidays_company_date_idx on public.holidays (company_id, holiday_date);
create index if not exists employees_branch_idx on public.employees (company_id, branch_id);
create index if not exists employees_shift_idx on public.employees (company_id, shift_id);

drop trigger if exists branches_set_updated_at on public.branches;
create trigger branches_set_updated_at
before update on public.branches
for each row execute function public.set_updated_at();

drop trigger if exists shifts_set_updated_at on public.shifts;
create trigger shifts_set_updated_at
before update on public.shifts
for each row execute function public.set_updated_at();

alter table public.branches enable row level security;
alter table public.shifts enable row level security;
alter table public.holidays enable row level security;

drop policy if exists branches_admin on public.branches;
create policy branches_admin on public.branches
  for all to authenticated
  using (company_id = public.current_profile_company_id() and public.is_company_admin())
  with check (company_id = public.current_profile_company_id() and public.is_company_admin());

drop policy if exists branches_select_member on public.branches;
create policy branches_select_member on public.branches
  for select to authenticated
  using (company_id = public.current_profile_company_id());

drop policy if exists shifts_admin on public.shifts;
create policy shifts_admin on public.shifts
  for all to authenticated
  using (company_id = public.current_profile_company_id() and public.is_company_admin())
  with check (company_id = public.current_profile_company_id() and public.is_company_admin());

drop policy if exists shifts_select_member on public.shifts;
create policy shifts_select_member on public.shifts
  for select to authenticated
  using (company_id = public.current_profile_company_id());

drop policy if exists holidays_admin on public.holidays;
create policy holidays_admin on public.holidays
  for all to authenticated
  using (company_id = public.current_profile_company_id() and public.is_company_admin())
  with check (company_id = public.current_profile_company_id() and public.is_company_admin());

drop policy if exists holidays_select_member on public.holidays;
create policy holidays_select_member on public.holidays
  for select to authenticated
  using (company_id = public.current_profile_company_id());

-- Attendance: honor holidays + per-employee shift hours
create or replace function public.employee_check_in(
  p_lat double precision default null,
  p_lng double precision default null,
  p_qr_token text default null,
  p_device_info jsonb default '{}'::jsonb,
  p_selfie_path text default null
)
returns public.attendance_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_emp public.employees%rowtype;
  v_company public.companies%rowtype;
  v_shift public.shifts%rowtype;
  v_today date;
  v_now timestamptz := now();
  v_local_time time;
  v_late int := 0;
  v_status text := 'present';
  v_method text := 'manual';
  v_qr_id uuid;
  v_rec public.attendance_records;
  v_dist double precision;
  v_start time;
  v_grace int;
  v_gps_ok boolean;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select * into v_emp from public.employees where user_id = v_user_id and status = 'active';
  if not found then raise exception 'employee not found'; end if;

  select * into v_company from public.companies where id = v_emp.company_id;
  v_today := (v_now at time zone coalesce(v_company.timezone, 'Asia/Baghdad'))::date;
  v_local_time := (v_now at time zone coalesce(v_company.timezone, 'Asia/Baghdad'))::time;

  if exists (
    select 1 from public.holidays h
    where h.company_id = v_emp.company_id
      and (
        h.holiday_date = v_today
        or (
          h.is_recurring_yearly
          and extract(month from h.holiday_date) = extract(month from v_today)
          and extract(day from h.holiday_date) = extract(day from v_today)
        )
      )
      and (h.branch_id is null or h.branch_id = v_emp.branch_id)
  ) then
    raise exception 'holiday today';
  end if;

  if exists (
    select 1 from public.attendance_records
    where company_id = v_emp.company_id and employee_id = v_emp.id
      and work_date = v_today and check_in_at is not null
  ) then
    raise exception 'already checked in';
  end if;

  if exists (
    select 1 from public.leave_requests lr
    where lr.company_id = v_emp.company_id and lr.employee_id = v_emp.id
      and lr.status = 'approved' and v_today between lr.start_date and lr.end_date
  ) then
    raise exception 'on leave today';
  end if;

  if v_emp.shift_id is not null then
    select * into v_shift from public.shifts where id = v_emp.shift_id and company_id = v_emp.company_id;
  end if;

  v_start := coalesce(v_shift.start_time, v_company.work_start_time);
  v_grace := coalesce(v_shift.late_grace_minutes, v_company.late_grace_minutes, 15);

  if coalesce(v_emp.gps_enabled, false) then
    if v_company.gps_required and v_company.gps_only_during_work_hours then
      if coalesce(v_shift.end_time, v_company.work_end_time) >= v_start then
        v_gps_ok := v_local_time >= v_start and v_local_time <= coalesce(v_shift.end_time, v_company.work_end_time);
      else
        v_gps_ok := v_local_time >= v_start or v_local_time <= coalesce(v_shift.end_time, v_company.work_end_time);
      end if;
      if not v_gps_ok then
        raise exception 'gps closed outside work hours';
      end if;
    end if;
    if p_lat is null or p_lng is null then
      raise exception 'gps required';
    end if;
    if v_emp.gps_lat is null or v_emp.gps_lng is null then
      raise exception 'employee gps location not set';
    end if;
    v_dist := public.haversine_m(p_lat, p_lng, v_emp.gps_lat, v_emp.gps_lng);
    if v_dist > coalesce(v_emp.gps_radius_meters, 150) then
      raise exception 'outside gps radius';
    end if;
    v_method := 'gps';
  end if;

  if coalesce(v_company.qr_required, false) then
    if p_qr_token is null or length(trim(p_qr_token)) = 0 then
      raise exception 'qr required';
    end if;
    select id into v_qr_id from public.qr_tokens
    where company_id = v_emp.company_id and is_active = true
      and token_hash = p_qr_token
      and (expires_at is null or expires_at > now())
    limit 1;
    if v_qr_id is null then raise exception 'invalid qr'; end if;
    v_method := case when v_method = 'gps' then 'gps_qr' else 'qr' end;
  end if;

  if coalesce(v_company.selfie_required, false)
     and (p_selfie_path is null or length(trim(p_selfie_path)) = 0) then
    raise exception 'selfie required';
  end if;

  if v_local_time > (v_start + make_interval(mins => v_grace)) then
    v_late := greatest(0, floor(extract(epoch from (v_local_time - v_start)) / 60)::int);
    v_status := 'late';
  end if;

  insert into public.attendance_records (
    company_id, employee_id, work_date, check_in_at,
    check_in_lat, check_in_lng, check_in_method, check_in_selfie_path,
    check_in_device_info, qr_token_id, status, late_minutes
  ) values (
    v_emp.company_id, v_emp.id, v_today, v_now,
    p_lat, p_lng, v_method, p_selfie_path,
    coalesce(p_device_info, '{}'::jsonb), v_qr_id, v_status, v_late
  )
  on conflict (company_id, employee_id, work_date) do update set
    check_in_at = excluded.check_in_at,
    check_in_lat = excluded.check_in_lat,
    check_in_lng = excluded.check_in_lng,
    check_in_method = excluded.check_in_method,
    check_in_selfie_path = excluded.check_in_selfie_path,
    check_in_device_info = excluded.check_in_device_info,
    qr_token_id = excluded.qr_token_id,
    status = excluded.status,
    late_minutes = excluded.late_minutes,
    updated_at = now()
  returning * into v_rec;

  insert into public.activity_logs (company_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_emp.company_id, v_user_id, 'attendance.check_in', 'attendance', v_rec.id,
    jsonb_build_object('status', v_status, 'late_minutes', v_late));

  return v_rec;
end;
$$;

create or replace function public.employee_check_out(
  p_lat double precision default null,
  p_lng double precision default null,
  p_device_info jsonb default '{}'::jsonb,
  p_selfie_path text default null
)
returns public.attendance_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_emp public.employees%rowtype;
  v_company public.companies%rowtype;
  v_shift public.shifts%rowtype;
  v_today date;
  v_now timestamptz := now();
  v_local_time time;
  v_rec public.attendance_records;
  v_worked int;
  v_early int := 0;
  v_ot int := 0;
  v_status text;
  v_method text := 'manual';
  v_dist double precision;
  v_end time;
  v_start time;
  v_gps_ok boolean;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  select * into v_emp from public.employees where user_id = v_user_id and status = 'active';
  if not found then raise exception 'employee not found'; end if;
  select * into v_company from public.companies where id = v_emp.company_id;
  v_today := (v_now at time zone coalesce(v_company.timezone, 'Asia/Baghdad'))::date;
  v_local_time := (v_now at time zone coalesce(v_company.timezone, 'Asia/Baghdad'))::time;

  select * into v_rec from public.attendance_records
  where company_id = v_emp.company_id and employee_id = v_emp.id and work_date = v_today;
  if not found or v_rec.check_in_at is null then raise exception 'not checked in'; end if;
  if v_rec.check_out_at is not null then raise exception 'already checked out'; end if;

  if v_emp.shift_id is not null then
    select * into v_shift from public.shifts where id = v_emp.shift_id and company_id = v_emp.company_id;
  end if;
  v_start := coalesce(v_shift.start_time, v_company.work_start_time);
  v_end := coalesce(v_shift.end_time, v_company.work_end_time);

  if coalesce(v_emp.gps_enabled, false) then
    if v_company.gps_required and v_company.gps_only_during_work_hours then
      if v_end >= v_start then
        v_gps_ok := v_local_time >= v_start and v_local_time <= v_end;
      else
        v_gps_ok := v_local_time >= v_start or v_local_time <= v_end;
      end if;
      if not v_gps_ok then
        raise exception 'gps closed outside work hours';
      end if;
    end if;
    if p_lat is null or p_lng is null then raise exception 'gps required'; end if;
    v_dist := public.haversine_m(p_lat, p_lng, v_emp.gps_lat, v_emp.gps_lng);
    if v_dist > coalesce(v_emp.gps_radius_meters, 150) then
      raise exception 'outside gps radius';
    end if;
    v_method := 'gps';
  end if;

  v_worked := greatest(0, floor(extract(epoch from (v_now - v_rec.check_in_at)) / 60)::int);
  if v_local_time < v_end then
    v_early := greatest(0, floor(extract(epoch from (v_end - v_local_time)) / 60)::int);
  end if;
  if v_local_time > (v_end + make_interval(mins => coalesce(v_company.overtime_after_minutes, 0))) then
    v_ot := greatest(0, floor(extract(epoch from (v_local_time - v_end)) / 60)::int);
  end if;

  v_status := v_rec.status;
  if v_ot > 0 then v_status := 'overtime';
  elsif v_early > 0 then v_status := 'early_leave';
  end if;

  update public.attendance_records set
    check_out_at = v_now,
    check_out_lat = p_lat,
    check_out_lng = p_lng,
    check_out_method = v_method,
    check_out_selfie_path = p_selfie_path,
    check_out_device_info = coalesce(p_device_info, '{}'::jsonb),
    worked_minutes = v_worked,
    early_leave_minutes = v_early,
    overtime_minutes = v_ot,
    status = v_status,
    updated_at = now()
  where id = v_rec.id
  returning * into v_rec;

  insert into public.activity_logs (company_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_emp.company_id, v_user_id, 'attendance.check_out', 'attendance', v_rec.id,
    jsonb_build_object('worked_minutes', v_worked, 'overtime_minutes', v_ot));

  return v_rec;
end;
$$;

-- ===== 00007_company_branding_reports.sql =====
-- Company branding for professional reports & receipts

alter table public.companies
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists report_watermark text,
  add column if not exists stamp_text text default 'مۆری کۆمپانیا';

alter table public.salaries
  add column if not exists payment_method text default 'cash',
  add column if not exists overtime_amount numeric not null default 0,
  add column if not exists bonus_amount numeric not null default 0,
  add column if not exists receipt_number text;

create unique index if not exists salaries_receipt_number_idx
  on public.salaries (company_id, receipt_number)
  where receipt_number is not null;

-- ===== 00008_salary_currency_fines.sql =====
-- Employee base salary + currency + fine/reward auto-apply

alter table public.employees
  add column if not exists base_salary numeric not null default 0,
  add column if not exists currency text not null default 'IQD'
    check (currency in ('IQD', 'USD'));

alter table public.companies
  add column if not exists default_currency text not null default 'IQD'
    check (default_currency in ('IQD', 'USD'));

alter table public.salaries
  add column if not exists currency text not null default 'IQD'
    check (currency in ('IQD', 'USD'));

alter table public.rewards
  add column if not exists kind text not null default 'reward'
    check (kind in ('reward', 'fine')),
  add column if not exists currency text not null default 'IQD'
    check (currency in ('IQD', 'USD')),
  add column if not exists applied_salary_id uuid references public.salaries (id) on delete set null;

create or replace function public.admin_add_payroll_item(
  p_employee_id uuid,
  p_title text,
  p_amount numeric,
  p_kind text default 'reward',
  p_reward_date date default current_date,
  p_note text default null,
  p_currency text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_company uuid;
  v_id uuid;
  v_emp public.employees%rowtype;
  v_year int;
  v_month int;
  v_salary_id uuid;
  v_currency text;
  v_amount numeric := abs(coalesce(p_amount, 0));
begin
  if v_admin is null or not public.is_company_admin() then
    raise exception 'not authorized';
  end if;
  if p_kind not in ('reward', 'fine') then
    raise exception 'invalid kind';
  end if;

  v_company := public.current_profile_company_id();
  select * into v_emp from public.employees
  where id = p_employee_id and company_id = v_company;
  if not found then raise exception 'employee not found'; end if;

  v_currency := coalesce(nullif(trim(p_currency), ''), v_emp.currency, 'IQD');
  v_year := extract(year from coalesce(p_reward_date, current_date))::int;
  v_month := extract(month from coalesce(p_reward_date, current_date))::int;

  insert into public.rewards (
    company_id, employee_id, title, amount, reward_date, note, created_by, kind, currency
  ) values (
    v_company, p_employee_id, trim(p_title), v_amount,
    coalesce(p_reward_date, current_date), p_note, v_admin, p_kind, v_currency
  )
  returning id into v_id;

  -- ensure monthly draft/paid salary row and apply auto
  insert into public.salaries (
    company_id, employee_id, year, month, base_amount, allowances, deductions,
    overtime_amount, bonus_amount, net_amount, status, currency
  ) values (
    v_company, p_employee_id, v_year, v_month,
    coalesce(v_emp.base_salary, 0), 0, 0, 0, 0, coalesce(v_emp.base_salary, 0),
    'draft', v_currency
  )
  on conflict (company_id, employee_id, year, month) do nothing;

  select id into v_salary_id from public.salaries
  where company_id = v_company and employee_id = p_employee_id
    and year = v_year and month = v_month;

  if p_kind = 'reward' then
    update public.salaries set
      bonus_amount = coalesce(bonus_amount, 0) + v_amount,
      allowances = coalesce(allowances, 0) + v_amount,
      net_amount = coalesce(base_amount, 0)
        + coalesce(overtime_amount, 0)
        + coalesce(bonus_amount, 0) + v_amount
        + greatest(coalesce(allowances, 0) - coalesce(bonus_amount, 0), 0)
        - coalesce(deductions, 0),
      currency = v_currency,
      updated_at = now()
    where id = v_salary_id;
  else
    update public.salaries set
      deductions = coalesce(deductions, 0) + v_amount,
      net_amount = greatest(
        coalesce(base_amount, 0)
          + coalesce(overtime_amount, 0)
          + coalesce(bonus_amount, 0)
          + coalesce(allowances, 0)
          - (coalesce(deductions, 0) + v_amount),
        0
      ),
      currency = v_currency,
      updated_at = now()
    where id = v_salary_id;
  end if;

  -- recalc net cleanly
  update public.salaries set
    net_amount = greatest(
      coalesce(base_amount, 0)
        + coalesce(overtime_amount, 0)
        + coalesce(bonus_amount, 0)
        + greatest(coalesce(allowances, 0) - coalesce(bonus_amount, 0), 0)
        - coalesce(deductions, 0),
      0
    ),
    updated_at = now()
  where id = v_salary_id;

  update public.rewards set applied_salary_id = v_salary_id where id = v_id;

  insert into public.notifications (company_id, user_id, title, body, type, data)
  select e.company_id, e.user_id,
    case when p_kind = 'reward' then 'پاداشتی نوێ' else 'غەرامە' end,
    format('%s — بڕی %s %s', trim(p_title), v_amount, v_currency),
    case when p_kind = 'reward' then 'reward' else 'fine' end,
    jsonb_build_object('item_id', v_id, 'salary_id', v_salary_id, 'kind', p_kind)
  from public.employees e
  where e.id = p_employee_id and e.user_id is not null;

  return v_id;
end;
$$;

-- ===== 00009_auto_payroll.sql =====
-- Auto payroll: generate monthly salaries from base + rewards + fines

create or replace function public.recalc_employee_month_salary(
  p_company_id uuid,
  p_employee_id uuid,
  p_year int,
  p_month int
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emp public.employees%rowtype;
  v_salary_id uuid;
  v_status text;
  v_base numeric;
  v_bonus numeric;
  v_deductions numeric;
  v_overtime numeric;
  v_currency text;
  v_net numeric;
begin
  select * into v_emp
  from public.employees
  where id = p_employee_id and company_id = p_company_id;
  if not found then
    return null;
  end if;

  v_base := coalesce(v_emp.base_salary, 0);
  v_currency := coalesce(nullif(v_emp.currency, ''), 'IQD');

  select
    coalesce(sum(case when coalesce(kind, 'reward') = 'reward' then amount else 0 end), 0),
    coalesce(sum(case when coalesce(kind, 'reward') = 'fine' then amount else 0 end), 0)
  into v_bonus, v_deductions
  from public.rewards
  where company_id = p_company_id
    and employee_id = p_employee_id
    and extract(year from reward_date)::int = p_year
    and extract(month from reward_date)::int = p_month;

  select id, status, coalesce(overtime_amount, 0)
  into v_salary_id, v_status, v_overtime
  from public.salaries
  where company_id = p_company_id
    and employee_id = p_employee_id
    and year = p_year
    and month = p_month;

  -- do not rewrite locked paid rows (keep overtime if any)
  if v_salary_id is not null and v_status = 'paid' then
    return v_salary_id;
  end if;

  v_net := greatest(v_base + coalesce(v_overtime, 0) + v_bonus - v_deductions, 0);

  if v_salary_id is null then
    insert into public.salaries (
      company_id, employee_id, year, month,
      base_amount, allowances, deductions,
      overtime_amount, bonus_amount, net_amount,
      status, currency
    ) values (
      p_company_id, p_employee_id, p_year, p_month,
      v_base, v_bonus, v_deductions,
      0, v_bonus, v_net,
      'draft', v_currency
    )
    returning id into v_salary_id;
  else
    update public.salaries set
      base_amount = v_base,
      allowances = v_bonus,
      bonus_amount = v_bonus,
      deductions = v_deductions,
      net_amount = greatest(v_base + coalesce(overtime_amount, 0) + v_bonus - v_deductions, 0),
      currency = v_currency,
      updated_at = now()
    where id = v_salary_id;
  end if;

  update public.rewards
  set applied_salary_id = v_salary_id
  where company_id = p_company_id
    and employee_id = p_employee_id
    and extract(year from reward_date)::int = p_year
    and extract(month from reward_date)::int = p_month;

  return v_salary_id;
end;
$$;

create or replace function public.admin_generate_monthly_payroll(
  p_year int default null,
  p_month int default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_company uuid;
  v_year int := coalesce(p_year, extract(year from current_date)::int);
  v_month int := coalesce(p_month, extract(month from current_date)::int);
  v_emp record;
  v_count int := 0;
  v_skipped int := 0;
  v_id uuid;
begin
  if v_admin is null or not public.is_company_admin() then
    raise exception 'not authorized';
  end if;
  v_company := public.current_profile_company_id();

  for v_emp in
    select e.id, e.base_salary, e.status
    from public.employees e
    where e.company_id = v_company
      and e.status = 'active'
      and (
        coalesce(e.base_salary, 0) > 0
        or exists (
          select 1 from public.rewards r
          where r.employee_id = e.id
            and r.company_id = v_company
            and extract(year from r.reward_date)::int = v_year
            and extract(month from r.reward_date)::int = v_month
        )
      )
  loop
    if exists (
      select 1 from public.salaries s
      where s.company_id = v_company
        and s.employee_id = v_emp.id
        and s.year = v_year
        and s.month = v_month
        and s.status = 'paid'
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_id := public.recalc_employee_month_salary(v_company, v_emp.id, v_year, v_month);
    if v_id is not null then
      v_count := v_count + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'year', v_year,
    'month', v_month,
    'generated', v_count,
    'skipped_paid', v_skipped
  );
end;
$$;

-- Rewards/fines always recalculate month salary from source totals
create or replace function public.admin_add_payroll_item(
  p_employee_id uuid,
  p_title text,
  p_amount numeric,
  p_kind text default 'reward',
  p_reward_date date default current_date,
  p_note text default null,
  p_currency text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_company uuid;
  v_id uuid;
  v_emp public.employees%rowtype;
  v_year int;
  v_month int;
  v_salary_id uuid;
  v_currency text;
  v_amount numeric := abs(coalesce(p_amount, 0));
begin
  if v_admin is null or not public.is_company_admin() then
    raise exception 'not authorized';
  end if;
  if p_kind not in ('reward', 'fine') then
    raise exception 'invalid kind';
  end if;

  v_company := public.current_profile_company_id();
  select * into v_emp from public.employees
  where id = p_employee_id and company_id = v_company;
  if not found then raise exception 'employee not found'; end if;

  v_currency := coalesce(nullif(trim(p_currency), ''), v_emp.currency, 'IQD');
  v_year := extract(year from coalesce(p_reward_date, current_date))::int;
  v_month := extract(month from coalesce(p_reward_date, current_date))::int;

  insert into public.rewards (
    company_id, employee_id, title, amount, reward_date, note, created_by, kind, currency
  ) values (
    v_company, p_employee_id, trim(p_title), v_amount,
    coalesce(p_reward_date, current_date), p_note, v_admin, p_kind, v_currency
  )
  returning id into v_id;

  v_salary_id := public.recalc_employee_month_salary(v_company, p_employee_id, v_year, v_month);

  insert into public.notifications (company_id, user_id, title, body, type, data)
  select e.company_id, e.user_id,
    case when p_kind = 'reward' then 'پاداشتی نوێ' else 'غەرامە' end,
    format('%s — بڕی %s %s', trim(p_title), v_amount, v_currency),
    case when p_kind = 'reward' then 'reward' else 'fine' end,
    jsonb_build_object('item_id', v_id, 'salary_id', v_salary_id, 'kind', p_kind)
  from public.employees e
  where e.id = p_employee_id and e.user_id is not null;

  return v_id;
end;
$$;

-- After base salary change, sync current month automatically
create or replace function public.admin_sync_employee_salary_after_base_change(
  p_employee_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid;
begin
  if auth.uid() is null or not public.is_company_admin() then
    raise exception 'not authorized';
  end if;
  v_company := public.current_profile_company_id();
  return public.recalc_employee_month_salary(
    v_company,
    p_employee_id,
    extract(year from current_date)::int,
    extract(month from current_date)::int
  );
end;
$$;

grant execute on function public.recalc_employee_month_salary(uuid, uuid, int, int) to authenticated;
grant execute on function public.admin_generate_monthly_payroll(int, int) to authenticated;
grant execute on function public.admin_add_payroll_item(uuid, text, numeric, text, date, text, text) to authenticated;
grant execute on function public.admin_sync_employee_salary_after_base_change(uuid) to authenticated;

-- ===== 00010_friday_off_day.sql =====
-- Weekly off: Friday only. Extra off-days: admin holidays table.

create or replace function public.is_company_off_day(
  p_company_id uuid,
  p_date date,
  p_branch_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- 5 = Friday (PostgreSQL DOW: Sun=0 … Sat=6)
    extract(dow from p_date) = 5
    or exists (
      select 1
      from public.holidays h
      where h.company_id = p_company_id
        and (
          h.holiday_date = p_date
          or (
            h.is_recurring_yearly
            and extract(month from h.holiday_date) = extract(month from p_date)
            and extract(day from h.holiday_date) = extract(day from p_date)
          )
        )
        and (h.branch_id is null or h.branch_id = p_branch_id)
    );
$$;

grant execute on function public.is_company_off_day(uuid, date, uuid) to authenticated;

-- Patch check-in: Friday + admin holidays block check-in
create or replace function public.employee_check_in(
  p_lat double precision default null,
  p_lng double precision default null,
  p_qr_token text default null,
  p_device_info jsonb default '{}'::jsonb,
  p_selfie_path text default null
)
returns public.attendance_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_emp public.employees%rowtype;
  v_company public.companies%rowtype;
  v_shift public.shifts%rowtype;
  v_today date;
  v_now timestamptz := now();
  v_local_time time;
  v_late int := 0;
  v_status text := 'present';
  v_method text := 'manual';
  v_qr_id uuid;
  v_rec public.attendance_records;
  v_dist double precision;
  v_start time;
  v_grace int;
  v_gps_ok boolean;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select * into v_emp from public.employees where user_id = v_user_id and status = 'active';
  if not found then raise exception 'employee not found'; end if;

  select * into v_company from public.companies where id = v_emp.company_id;
  v_today := (v_now at time zone coalesce(v_company.timezone, 'Asia/Baghdad'))::date;
  v_local_time := (v_now at time zone coalesce(v_company.timezone, 'Asia/Baghdad'))::time;

  if public.is_company_off_day(v_emp.company_id, v_today, v_emp.branch_id) then
    if extract(dow from v_today) = 5 then
      raise exception 'friday off';
    end if;
    raise exception 'holiday today';
  end if;

  if exists (
    select 1 from public.attendance_records
    where company_id = v_emp.company_id and employee_id = v_emp.id
      and work_date = v_today and check_in_at is not null
  ) then
    raise exception 'already checked in';
  end if;

  if exists (
    select 1 from public.leave_requests lr
    where lr.company_id = v_emp.company_id and lr.employee_id = v_emp.id
      and lr.status = 'approved' and v_today between lr.start_date and lr.end_date
  ) then
    raise exception 'on leave today';
  end if;

  if v_emp.shift_id is not null then
    select * into v_shift from public.shifts where id = v_emp.shift_id and company_id = v_emp.company_id;
  end if;

  v_start := coalesce(v_shift.start_time, v_company.work_start_time);
  v_grace := coalesce(v_shift.late_grace_minutes, v_company.late_grace_minutes, 15);

  if coalesce(v_emp.gps_enabled, false) then
    if v_company.gps_required and v_company.gps_only_during_work_hours then
      if coalesce(v_shift.end_time, v_company.work_end_time) >= v_start then
        v_gps_ok := v_local_time >= v_start and v_local_time <= coalesce(v_shift.end_time, v_company.work_end_time);
      else
        v_gps_ok := v_local_time >= v_start or v_local_time <= coalesce(v_shift.end_time, v_company.work_end_time);
      end if;
      if not v_gps_ok then
        raise exception 'gps closed outside work hours';
      end if;
    end if;
    if p_lat is null or p_lng is null then
      raise exception 'gps required';
    end if;
    if v_emp.gps_lat is null or v_emp.gps_lng is null then
      raise exception 'employee gps location not set';
    end if;
    v_dist := public.haversine_m(p_lat, p_lng, v_emp.gps_lat, v_emp.gps_lng);
    if v_dist > coalesce(v_emp.gps_radius_meters, 150) then
      raise exception 'outside gps radius';
    end if;
    v_method := 'gps';
  end if;

  if coalesce(v_company.qr_required, false) then
    if p_qr_token is null or length(trim(p_qr_token)) = 0 then
      raise exception 'qr required';
    end if;
    select id into v_qr_id from public.qr_tokens
    where company_id = v_emp.company_id and is_active = true
      and token_hash = p_qr_token
      and (expires_at is null or expires_at > now())
    limit 1;
    if v_qr_id is null then raise exception 'invalid qr'; end if;
    v_method := case when v_method = 'gps' then 'gps_qr' else 'qr' end;
  end if;

  if coalesce(v_company.selfie_required, false)
     and (p_selfie_path is null or length(trim(p_selfie_path)) = 0) then
    raise exception 'selfie required';
  end if;

  if v_local_time > (v_start + make_interval(mins => v_grace)) then
    v_late := greatest(0, floor(extract(epoch from (v_local_time - v_start)) / 60)::int);
    v_status := 'late';
  end if;

  insert into public.attendance_records (
    company_id, employee_id, work_date, check_in_at,
    check_in_lat, check_in_lng, check_in_method, check_in_selfie_path,
    check_in_device_info, qr_token_id, status, late_minutes
  ) values (
    v_emp.company_id, v_emp.id, v_today, v_now,
    p_lat, p_lng, v_method, p_selfie_path,
    coalesce(p_device_info, '{}'::jsonb), v_qr_id, v_status, v_late
  )
  on conflict (company_id, employee_id, work_date) do update set
    check_in_at = excluded.check_in_at,
    check_in_lat = excluded.check_in_lat,
    check_in_lng = excluded.check_in_lng,
    check_in_method = excluded.check_in_method,
    check_in_selfie_path = excluded.check_in_selfie_path,
    check_in_device_info = excluded.check_in_device_info,
    qr_token_id = excluded.qr_token_id,
    status = excluded.status,
    late_minutes = excluded.late_minutes,
    updated_at = now()
  returning * into v_rec;

  insert into public.activity_logs (company_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_emp.company_id, v_user_id, 'attendance.check_in', 'attendance', v_rec.id,
    jsonb_build_object('status', v_status, 'late_minutes', v_late));

  return v_rec;
end;
$$;

-- ===== 00011_employee_device_bind.sql =====
-- Employee single-device binding

alter table public.employees
  add column if not exists bound_device_id text,
  add column if not exists bound_device_label text,
  add column if not exists bound_device_at timestamptz,
  add column if not exists pending_device_id text,
  add column if not exists pending_device_label text,
  add column if not exists pending_device_at timestamptz;

create index if not exists employees_bound_device_idx
  on public.employees (company_id, bound_device_id)
  where bound_device_id is not null;

-- Bind first device, allow same device, or queue change request + notify admins
create or replace function public.employee_register_device(
  p_device_id text,
  p_device_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_emp public.employees%rowtype;
  v_label text := left(coalesce(nullif(trim(p_device_label), ''), 'مۆبایل'), 200);
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_device_id is null or length(trim(p_device_id)) < 8 then
    raise exception 'invalid device';
  end if;

  select * into v_emp
  from public.employees
  where user_id = v_user and status = 'active';
  if not found then raise exception 'employee not found'; end if;

  -- first bind
  if v_emp.bound_device_id is null then
    update public.employees set
      bound_device_id = trim(p_device_id),
      bound_device_label = v_label,
      bound_device_at = now(),
      pending_device_id = null,
      pending_device_label = null,
      pending_device_at = null,
      updated_at = now()
    where id = v_emp.id;
    return jsonb_build_object('ok', true, 'status', 'bound');
  end if;

  -- same device
  if v_emp.bound_device_id = trim(p_device_id) then
    update public.employees set
      bound_device_label = coalesce(v_label, bound_device_label),
      updated_at = now()
    where id = v_emp.id;
    return jsonb_build_object('ok', true, 'status', 'matched');
  end if;

  -- different device → pending + notify admins (do not switch yet)
  update public.employees set
    pending_device_id = trim(p_device_id),
    pending_device_label = v_label,
    pending_device_at = now(),
    updated_at = now()
  where id = v_emp.id;

  insert into public.notifications (company_id, user_id, title, body, type, data)
  select p.company_id, p.id,
    'داواکاری مۆبایلی نوێ',
    format('%s (%s) دەیەوێت لە مۆبایلی تر بچێتە ژوورەوە.', v_emp.full_name, v_emp.employee_code),
    'device_change',
    jsonb_build_object(
      'employee_id', v_emp.id,
      'employee_code', v_emp.employee_code,
      'pending_device_id', trim(p_device_id),
      'pending_device_label', v_label,
      'current_device_id', v_emp.bound_device_id
    )
  from public.profiles p
  where p.company_id = v_emp.company_id
    and p.role = 'admin'
    and p.is_active = true;

  return jsonb_build_object(
    'ok', false,
    'status', 'pending_approval',
    'message', 'device change requires admin'
  );
end;
$$;

create or replace function public.admin_approve_employee_device(
  p_employee_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emp public.employees%rowtype;
  v_company uuid;
begin
  if auth.uid() is null or not public.is_company_admin() then
    raise exception 'not authorized';
  end if;
  v_company := public.current_profile_company_id();

  select * into v_emp from public.employees
  where id = p_employee_id and company_id = v_company;
  if not found then raise exception 'employee not found'; end if;
  if v_emp.pending_device_id is null then
    raise exception 'no pending device';
  end if;

  update public.employees set
    bound_device_id = pending_device_id,
    bound_device_label = pending_device_label,
    bound_device_at = now(),
    pending_device_id = null,
    pending_device_label = null,
    pending_device_at = null,
    updated_at = now()
  where id = v_emp.id;

  if v_emp.user_id is not null then
    insert into public.notifications (company_id, user_id, title, body, type, data)
    values (
      v_company, v_emp.user_id,
      'مۆبایلی نوێ پەسەندکرا',
      'ئێستا دەتوانیت لەم مۆبایلەوە بچیتە ژوورەوە.',
      'device_approved',
      jsonb_build_object('employee_id', v_emp.id)
    );
  end if;
end;
$$;

create or replace function public.admin_clear_employee_device(
  p_employee_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_company_admin() then
    raise exception 'not authorized';
  end if;

  update public.employees set
    bound_device_id = null,
    bound_device_label = null,
    bound_device_at = null,
    pending_device_id = null,
    pending_device_label = null,
    pending_device_at = null,
    updated_at = now()
  where id = p_employee_id
    and company_id = public.current_profile_company_id();
end;
$$;

grant execute on function public.employee_register_device(text, text) to authenticated;
grant execute on function public.admin_approve_employee_device(uuid) to authenticated;
grant execute on function public.admin_clear_employee_device(uuid) to authenticated;

-- ===== 00012_fix_employee_create_and_logo.sql =====
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

-- ===== 00013_fix_qr_token.sql =====
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

-- ===== 00014_late_fine_settings.sql =====
-- Auto late fine settings + apply on check-in

alter table public.companies
  add column if not exists late_fine_enabled boolean not null default false,
  add column if not exists late_fine_amount numeric not null default 0,
  add column if not exists late_fine_after_minutes integer not null default 15;

create or replace function public.employee_check_in(
  p_lat double precision default null,
  p_lng double precision default null,
  p_qr_token text default null,
  p_device_info jsonb default '{}'::jsonb,
  p_selfie_path text default null
)
returns public.attendance_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_emp public.employees%rowtype;
  v_company public.companies%rowtype;
  v_shift public.shifts%rowtype;
  v_today date;
  v_now timestamptz := now();
  v_local_time time;
  v_late int := 0;
  v_status text := 'present';
  v_method text := 'manual';
  v_qr_id uuid;
  v_rec public.attendance_records;
  v_dist double precision;
  v_start time;
  v_grace int;
  v_gps_ok boolean;
  v_fine_amount numeric;
  v_fine_after int;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select * into v_emp from public.employees where user_id = v_user_id and status = 'active';
  if not found then raise exception 'employee not found'; end if;

  select * into v_company from public.companies where id = v_emp.company_id;
  v_today := (v_now at time zone coalesce(v_company.timezone, 'Asia/Baghdad'))::date;
  v_local_time := (v_now at time zone coalesce(v_company.timezone, 'Asia/Baghdad'))::time;

  if public.is_company_off_day(v_emp.company_id, v_today, v_emp.branch_id) then
    if extract(dow from v_today) = 5 then
      raise exception 'friday off';
    end if;
    raise exception 'holiday today';
  end if;

  if exists (
    select 1 from public.attendance_records
    where company_id = v_emp.company_id and employee_id = v_emp.id
      and work_date = v_today and check_in_at is not null
  ) then
    raise exception 'already checked in';
  end if;

  if exists (
    select 1 from public.leave_requests lr
    where lr.company_id = v_emp.company_id and lr.employee_id = v_emp.id
      and lr.status = 'approved' and v_today between lr.start_date and lr.end_date
  ) then
    raise exception 'on leave today';
  end if;

  if v_emp.shift_id is not null then
    select * into v_shift from public.shifts where id = v_emp.shift_id and company_id = v_emp.company_id;
  end if;

  v_start := coalesce(v_shift.start_time, v_company.work_start_time);
  v_grace := coalesce(v_shift.late_grace_minutes, v_company.late_grace_minutes, 15);

  if coalesce(v_emp.gps_enabled, false) then
    if v_company.gps_required and v_company.gps_only_during_work_hours then
      if coalesce(v_shift.end_time, v_company.work_end_time) >= v_start then
        v_gps_ok := v_local_time >= v_start and v_local_time <= coalesce(v_shift.end_time, v_company.work_end_time);
      else
        v_gps_ok := v_local_time >= v_start or v_local_time <= coalesce(v_shift.end_time, v_company.work_end_time);
      end if;
      if not v_gps_ok then
        raise exception 'gps closed outside work hours';
      end if;
    end if;
    if p_lat is null or p_lng is null then
      raise exception 'gps required';
    end if;
    if v_emp.gps_lat is null or v_emp.gps_lng is null then
      raise exception 'employee gps location not set';
    end if;
    v_dist := public.haversine_m(p_lat, p_lng, v_emp.gps_lat, v_emp.gps_lng);
    if v_dist > coalesce(v_emp.gps_radius_meters, 150) then
      raise exception 'outside gps radius';
    end if;
    v_method := 'gps';
  end if;

  if coalesce(v_company.qr_required, false) then
    if p_qr_token is null or length(trim(p_qr_token)) = 0 then
      raise exception 'qr required';
    end if;
    select id into v_qr_id from public.qr_tokens
    where company_id = v_emp.company_id and is_active = true
      and token_hash = p_qr_token
      and (expires_at is null or expires_at > now())
    limit 1;
    if v_qr_id is null then raise exception 'invalid qr'; end if;
    v_method := case when v_method = 'gps' then 'gps_qr' else 'qr' end;
  end if;

  if coalesce(v_company.selfie_required, false)
     and (p_selfie_path is null or length(trim(p_selfie_path)) = 0) then
    raise exception 'selfie required';
  end if;

  if v_local_time > (v_start + make_interval(mins => v_grace)) then
    v_late := greatest(0, floor(extract(epoch from (v_local_time - v_start)) / 60)::int);
    v_status := 'late';
  end if;

  insert into public.attendance_records (
    company_id, employee_id, work_date, check_in_at,
    check_in_lat, check_in_lng, check_in_method, check_in_selfie_path,
    check_in_device_info, qr_token_id, status, late_minutes
  ) values (
    v_emp.company_id, v_emp.id, v_today, v_now,
    p_lat, p_lng, v_method, p_selfie_path,
    coalesce(p_device_info, '{}'::jsonb), v_qr_id, v_status, v_late
  )
  on conflict (company_id, employee_id, work_date) do update set
    check_in_at = excluded.check_in_at,
    check_in_lat = excluded.check_in_lat,
    check_in_lng = excluded.check_in_lng,
    check_in_method = excluded.check_in_method,
    check_in_selfie_path = excluded.check_in_selfie_path,
    check_in_device_info = excluded.check_in_device_info,
    qr_token_id = excluded.qr_token_id,
    status = excluded.status,
    late_minutes = excluded.late_minutes,
    updated_at = now()
  returning * into v_rec;

  -- Auto late fine (once per day)
  v_fine_amount := coalesce(v_company.late_fine_amount, 0);
  v_fine_after := coalesce(v_company.late_fine_after_minutes, 15);
  if coalesce(v_company.late_fine_enabled, false)
     and v_fine_amount > 0
     and v_late >= v_fine_after then
    if not exists (
      select 1 from public.rewards r
      where r.company_id = v_emp.company_id
        and r.employee_id = v_emp.id
        and r.kind = 'fine'
        and r.reward_date = v_today
        and r.note = 'auto_late_fine'
    ) then
      insert into public.rewards (
        company_id, employee_id, title, amount, reward_date, note, created_by, kind, currency
      ) values (
        v_emp.company_id,
        v_emp.id,
        format('غەرامەی دواکەوتن (%s خولەک)', v_late),
        v_fine_amount,
        v_today,
        'auto_late_fine',
        null,
        'fine',
        coalesce(v_emp.currency, 'IQD')
      );

      perform public.recalc_employee_month_salary(
        v_emp.company_id,
        v_emp.id,
        extract(year from v_today)::int,
        extract(month from v_today)::int
      );

      insert into public.notifications (company_id, user_id, title, body, type, data)
      values (
        v_emp.company_id,
        v_user_id,
        'غەرامەی دواکەوتن',
        format('بڕی %s بۆ دواکەوتنی %s خولەک', v_fine_amount, v_late),
        'fine',
        jsonb_build_object('late_minutes', v_late, 'amount', v_fine_amount)
      );
    end if;
  end if;

  insert into public.activity_logs (company_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_emp.company_id, v_user_id, 'attendance.check_in', 'attendance', v_rec.id,
    jsonb_build_object('status', v_status, 'late_minutes', v_late));

  return v_rec;
end;
$$;

-- ===== 00015_employee_office_online.sql =====
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

-- ===== 00016_delete_payroll_item.sql =====
-- Delete reward/fine and recalc month salary

create or replace function public.admin_delete_payroll_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_company uuid;
  v_row public.rewards%rowtype;
  v_year int;
  v_month int;
begin
  if v_admin is null or not public.is_company_admin() then
    raise exception 'not authorized';
  end if;

  v_company := public.current_profile_company_id();

  select * into v_row
  from public.rewards
  where id = p_item_id and company_id = v_company;

  if not found then
    raise exception 'item not found';
  end if;

  v_year := extract(year from v_row.reward_date)::int;
  v_month := extract(month from v_row.reward_date)::int;

  delete from public.rewards
  where id = p_item_id and company_id = v_company;

  perform public.recalc_employee_month_salary(
    v_company,
    v_row.employee_id,
    v_year,
    v_month
  );

  insert into public.activity_logs (company_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    v_company,
    v_admin,
    'payroll.item_deleted',
    'reward',
    p_item_id,
    jsonb_build_object(
      'kind', v_row.kind,
      'title', v_row.title,
      'amount', v_row.amount,
      'employee_id', v_row.employee_id
    )
  );
end;
$$;

grant execute on function public.admin_delete_payroll_item(uuid) to authenticated;

-- ===== 00017_office_live_gps.sql =====
-- Live GPS for office (gps_enabled) + online; auto at_work / away
-- Harden checkout geofence when workplace coords missing

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
  v_dist double precision;
  v_radius int;
  v_activity text;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_lat is null or p_lng is null then
    raise exception 'location required';
  end if;

  select * into v_emp from public.employees
  where user_id = v_user and status = 'active';
  if not found then raise exception 'employee not found'; end if;

  -- Online always allowed; office only when GPS workplace is enabled
  if v_emp.employee_type = 'online' then
    v_activity := nullif(trim(coalesce(p_activity, '')), '');
    if v_activity is null then v_activity := 'working'; end if;
  elsif coalesce(v_emp.gps_enabled, false) then
    if v_emp.gps_lat is null or v_emp.gps_lng is null then
      raise exception 'employee gps location not set';
    end if;
    v_radius := coalesce(v_emp.gps_radius_meters, 150);
    v_dist := public.haversine_m(p_lat, p_lng, v_emp.gps_lat, v_emp.gps_lng);
    if v_dist <= v_radius then
      v_activity := 'at_work';
    else
      v_activity := 'left_work';
    end if;
  else
    raise exception 'live gps not enabled';
  end if;

  update public.employees set
    last_lat = p_lat,
    last_lng = p_lng,
    last_location_at = now(),
    last_activity = v_activity,
    updated_at = now()
  where id = v_emp.id
  returning * into v_emp;

  return v_emp;
end;
$$;

grant execute on function public.employee_update_location(double precision, double precision, text) to authenticated;

-- Ensure check-out requires workplace coords when GPS on
create or replace function public.employee_check_out(
  p_lat double precision default null,
  p_lng double precision default null,
  p_device_info jsonb default '{}'::jsonb,
  p_selfie_path text default null
)
returns public.attendance_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_emp public.employees%rowtype;
  v_company public.companies%rowtype;
  v_shift public.shifts%rowtype;
  v_today date;
  v_now timestamptz := now();
  v_local_time time;
  v_rec public.attendance_records;
  v_worked int;
  v_early int := 0;
  v_ot int := 0;
  v_status text;
  v_method text := 'manual';
  v_dist double precision;
  v_end time;
  v_start time;
  v_gps_ok boolean;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;
  select * into v_emp from public.employees where user_id = v_user_id and status = 'active';
  if not found then raise exception 'employee not found'; end if;
  select * into v_company from public.companies where id = v_emp.company_id;
  v_today := (v_now at time zone coalesce(v_company.timezone, 'Asia/Baghdad'))::date;
  v_local_time := (v_now at time zone coalesce(v_company.timezone, 'Asia/Baghdad'))::time;

  select * into v_rec from public.attendance_records
  where company_id = v_emp.company_id and employee_id = v_emp.id and work_date = v_today;
  if not found or v_rec.check_in_at is null then raise exception 'not checked in'; end if;
  if v_rec.check_out_at is not null then raise exception 'already checked out'; end if;

  if v_emp.shift_id is not null then
    select * into v_shift from public.shifts where id = v_emp.shift_id and company_id = v_emp.company_id;
  end if;
  v_start := coalesce(v_shift.start_time, v_company.work_start_time);
  v_end := coalesce(v_shift.end_time, v_company.work_end_time);

  if coalesce(v_emp.gps_enabled, false) then
    if v_company.gps_required and v_company.gps_only_during_work_hours then
      if v_end >= v_start then
        v_gps_ok := v_local_time >= v_start and v_local_time <= v_end;
      else
        v_gps_ok := v_local_time >= v_start or v_local_time <= v_end;
      end if;
      if not v_gps_ok then
        raise exception 'gps closed outside work hours';
      end if;
    end if;
    if p_lat is null or p_lng is null then raise exception 'gps required'; end if;
    if v_emp.gps_lat is null or v_emp.gps_lng is null then
      raise exception 'employee gps location not set';
    end if;
    v_dist := public.haversine_m(p_lat, p_lng, v_emp.gps_lat, v_emp.gps_lng);
    if v_dist > coalesce(v_emp.gps_radius_meters, 150) then
      raise exception 'outside gps radius';
    end if;
    v_method := 'gps';
  end if;

  v_worked := greatest(0, floor(extract(epoch from (v_now - v_rec.check_in_at)) / 60)::int);
  if v_local_time < v_end then
    v_early := greatest(0, floor(extract(epoch from (v_end - v_local_time)) / 60)::int);
  end if;
  if v_local_time > (v_end + make_interval(mins => coalesce(v_company.overtime_after_minutes, 0))) then
    v_ot := greatest(0, floor(extract(epoch from (v_local_time - v_end)) / 60)::int);
  end if;

  v_status := v_rec.status;
  if v_ot > 0 then v_status := 'overtime';
  elsif v_early > 0 then v_status := 'early_leave';
  end if;

  update public.attendance_records set
    check_out_at = v_now,
    check_out_lat = p_lat,
    check_out_lng = p_lng,
    check_out_method = v_method,
    check_out_selfie_path = p_selfie_path,
    check_out_device_info = coalesce(p_device_info, '{}'::jsonb),
    worked_minutes = v_worked,
    early_leave_minutes = v_early,
    overtime_minutes = v_ot,
    status = v_status,
    updated_at = now()
  where id = v_rec.id
  returning * into v_rec;

  -- refresh live position on checkout
  if p_lat is not null and p_lng is not null then
    update public.employees set
      last_lat = p_lat,
      last_lng = p_lng,
      last_location_at = now(),
      last_activity = case
        when coalesce(v_emp.gps_enabled, false) then 'left_work'
        else coalesce(last_activity, 'check_out')
      end,
      updated_at = now()
    where id = v_emp.id;
  end if;

  insert into public.activity_logs (company_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_emp.company_id, v_user_id, 'attendance.check_out', 'attendance', v_rec.id,
    jsonb_build_object('worked_minutes', v_worked, 'overtime_minutes', v_ot));

  return v_rec;
end;
$$;

-- ===== 00018_ops_features.sql =====
-- Ops pack: absences, manual attendance, OT pay, absence fine,
-- advances, weekly offs, manager role

-- ========== Company settings ==========
alter table public.companies
  add column if not exists weekly_off_dows int[] not null default '{5}',
  add column if not exists overtime_rate_per_hour numeric not null default 0,
  add column if not exists absence_fine_enabled boolean not null default false,
  add column if not exists absence_fine_amount numeric not null default 0,
  add column if not exists absence_fine_mode text not null default 'fixed';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'companies_absence_fine_mode_check'
  ) then
    alter table public.companies
      add constraint companies_absence_fine_mode_check
      check (absence_fine_mode in ('fixed', 'daily_wage'));
  end if;
end $$;

-- ========== Manager role ==========
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'manager', 'employee'));

create or replace function public.is_company_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_active
      and role in ('admin', 'manager')
  );
$$;

-- Operational RPCs: treat manager as staff; keep is_company_admin for owner-only later
create or replace function public.is_company_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_active
      and role in ('admin', 'manager')
  );
$$;

-- Owner-only helper (settings / backups / create managers)
create or replace function public.is_company_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_active
      and role = 'admin'
  );
$$;

grant execute on function public.is_company_staff() to authenticated;
grant execute on function public.is_company_owner() to authenticated;

-- ========== Salary advances ==========
create table if not exists public.salary_advances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  amount numeric not null check (amount > 0),
  remaining numeric not null check (remaining >= 0),
  installment_amount numeric not null check (installment_amount > 0),
  currency text not null default 'IQD',
  note text,
  status text not null default 'active'
    check (status in ('active', 'paid_off', 'cancelled')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists salary_advances_emp_idx
  on public.salary_advances (company_id, employee_id, status);

alter table public.salary_advances enable row level security;

drop policy if exists salary_advances_admin on public.salary_advances;
create policy salary_advances_admin on public.salary_advances
  for all using (
    company_id = public.current_profile_company_id()
    and public.is_company_admin()
  )
  with check (
    company_id = public.current_profile_company_id()
    and public.is_company_admin()
  );

drop policy if exists salary_advances_self on public.salary_advances;
create policy salary_advances_self on public.salary_advances
  for select using (
    company_id = public.current_profile_company_id()
    and employee_id in (
      select id from public.employees where user_id = auth.uid()
    )
  );

-- ========== Weekly offs ==========
create or replace function public.is_company_off_day(
  p_company_id uuid,
  p_date date,
  p_branch_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    extract(dow from p_date)::int = any (
      coalesce(
        (select weekly_off_dows from public.companies where id = p_company_id),
        array[5]
      )
    )
    or exists (
      select 1
      from public.holidays h
      where h.company_id = p_company_id
        and (
          h.holiday_date = p_date
          or (
            h.is_recurring_yearly
            and extract(month from h.holiday_date) = extract(month from p_date)
            and extract(day from h.holiday_date) = extract(day from p_date)
          )
        )
        and (h.branch_id is null or h.branch_id = p_branch_id)
    );
$$;

-- ========== Mark daily absences ==========
create or replace function public.admin_mark_daily_absences(
  p_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_company uuid;
  v_date date := coalesce(p_date, current_date);
  v_emp record;
  v_inserted int := 0;
  v_skipped int := 0;
  v_tz text;
begin
  if v_admin is null or not public.is_company_admin() then
    raise exception 'not authorized';
  end if;
  v_company := public.current_profile_company_id();
  select coalesce(timezone, 'Asia/Baghdad') into v_tz
  from public.companies where id = v_company;
  -- default to company "today" if null passed as current_date already
  if p_date is null then
    v_date := (now() at time zone v_tz)::date;
  end if;

  for v_emp in
    select e.id, e.branch_id
    from public.employees e
    where e.company_id = v_company
      and e.status = 'active'
  loop
    if public.is_company_off_day(v_company, v_date, v_emp.branch_id) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    -- already has attendance row
    if exists (
      select 1 from public.attendance_records ar
      where ar.company_id = v_company
        and ar.employee_id = v_emp.id
        and ar.work_date = v_date
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    -- approved leave covering this date
    if exists (
      select 1 from public.leave_requests lr
      where lr.company_id = v_company
        and lr.employee_id = v_emp.id
        and lr.status = 'approved'
        and lr.start_date <= v_date
        and lr.end_date >= v_date
    ) then
      insert into public.attendance_records (
        company_id, employee_id, work_date, status
      ) values (
        v_company, v_emp.id, v_date, 'on_leave'
      )
      on conflict do nothing;
      v_skipped := v_skipped + 1;
      continue;
    end if;

    insert into public.attendance_records (
      company_id, employee_id, work_date, status
    ) values (
      v_company, v_emp.id, v_date, 'absent'
    );
    v_inserted := v_inserted + 1;
  end loop;

  insert into public.activity_logs (company_id, actor_id, action, entity_type, metadata)
  values (
    v_company, v_admin, 'attendance.mark_absences', 'attendance',
    jsonb_build_object('date', v_date, 'inserted', v_inserted, 'skipped', v_skipped)
  );

  return jsonb_build_object(
    'date', v_date,
    'marked_absent', v_inserted,
    'skipped', v_skipped
  );
end;
$$;

grant execute on function public.admin_mark_daily_absences(date) to authenticated;

-- ========== Manual attendance upsert ==========
create or replace function public.admin_upsert_attendance(
  p_employee_id uuid,
  p_work_date date,
  p_check_in_at timestamptz default null,
  p_check_out_at timestamptz default null,
  p_status text default 'present',
  p_late_minutes int default 0,
  p_note text default null
)
returns public.attendance_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_company uuid;
  v_emp public.employees%rowtype;
  v_rec public.attendance_records;
  v_status text := coalesce(nullif(trim(p_status), ''), 'present');
  v_worked int := 0;
begin
  if v_admin is null or not public.is_company_admin() then
    raise exception 'not authorized';
  end if;
  if v_status not in (
    'present', 'late', 'early_leave', 'absent', 'on_leave', 'incomplete', 'overtime'
  ) then
    raise exception 'invalid status';
  end if;

  v_company := public.current_profile_company_id();
  select * into v_emp from public.employees
  where id = p_employee_id and company_id = v_company;
  if not found then raise exception 'employee not found'; end if;

  if p_check_in_at is not null and p_check_out_at is not null then
    v_worked := greatest(
      0,
      floor(extract(epoch from (p_check_out_at - p_check_in_at)) / 60)::int
    );
  end if;

  insert into public.attendance_records (
    company_id, employee_id, work_date,
    check_in_at, check_out_at,
    check_in_method, check_out_method,
    status, late_minutes, worked_minutes, notes
  ) values (
    v_company, p_employee_id, p_work_date,
    p_check_in_at, p_check_out_at,
    case when p_check_in_at is not null then 'manual' else null end,
    case when p_check_out_at is not null then 'manual' else null end,
    v_status,
    greatest(0, coalesce(p_late_minutes, 0)),
    v_worked,
    p_note
  )
  on conflict (company_id, employee_id, work_date) do update set
    check_in_at = coalesce(excluded.check_in_at, attendance_records.check_in_at),
    check_out_at = coalesce(excluded.check_out_at, attendance_records.check_out_at),
    check_in_method = case
      when excluded.check_in_at is not null then 'manual'
      else attendance_records.check_in_method
    end,
    check_out_method = case
      when excluded.check_out_at is not null then 'manual'
      else attendance_records.check_out_method
    end,
    status = excluded.status,
    late_minutes = excluded.late_minutes,
    worked_minutes = case
      when excluded.worked_minutes > 0 then excluded.worked_minutes
      else attendance_records.worked_minutes
    end,
    notes = coalesce(excluded.notes, attendance_records.notes),
    updated_at = now()
  returning * into v_rec;

  insert into public.activity_logs (company_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    v_company, v_admin, 'attendance.manual_upsert', 'attendance', v_rec.id,
    jsonb_build_object('employee_id', p_employee_id, 'date', p_work_date, 'status', v_status)
  );

  return v_rec;
end;
$$;

grant execute on function public.admin_upsert_attendance(
  uuid, date, timestamptz, timestamptz, text, int, text
) to authenticated;

-- ========== Advances RPCs ==========
create or replace function public.admin_add_salary_advance(
  p_employee_id uuid,
  p_amount numeric,
  p_installment_amount numeric,
  p_note text default null,
  p_currency text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_company uuid;
  v_emp public.employees%rowtype;
  v_id uuid;
  v_amount numeric := abs(coalesce(p_amount, 0));
  v_inst numeric := abs(coalesce(p_installment_amount, 0));
begin
  if v_admin is null or not public.is_company_admin() then
    raise exception 'not authorized';
  end if;
  if v_amount <= 0 then raise exception 'invalid amount'; end if;
  if v_inst <= 0 then raise exception 'invalid installment'; end if;
  if v_inst > v_amount then v_inst := v_amount; end if;

  v_company := public.current_profile_company_id();
  select * into v_emp from public.employees
  where id = p_employee_id and company_id = v_company;
  if not found then raise exception 'employee not found'; end if;

  insert into public.salary_advances (
    company_id, employee_id, amount, remaining, installment_amount,
    currency, note, created_by
  ) values (
    v_company, p_employee_id, v_amount, v_amount, v_inst,
    coalesce(nullif(p_currency, ''), v_emp.currency, 'IQD'),
    p_note, v_admin
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.admin_cancel_salary_advance(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid := auth.uid();
  v_company uuid;
begin
  if v_admin is null or not public.is_company_admin() then
    raise exception 'not authorized';
  end if;
  v_company := public.current_profile_company_id();
  update public.salary_advances set
    status = 'cancelled',
    updated_at = now()
  where id = p_id and company_id = v_company and status = 'active';
end;
$$;

grant execute on function public.admin_add_salary_advance(uuid, numeric, numeric, text, text) to authenticated;
grant execute on function public.admin_cancel_salary_advance(uuid) to authenticated;

-- ========== Payroll recalc: OT + absence fines + advance installments ==========
create or replace function public.recalc_employee_month_salary(
  p_company_id uuid,
  p_employee_id uuid,
  p_year int,
  p_month int
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emp public.employees%rowtype;
  v_company public.companies%rowtype;
  v_salary_id uuid;
  v_status text;
  v_base numeric;
  v_bonus numeric;
  v_deductions numeric;
  v_overtime numeric := 0;
  v_currency text;
  v_net numeric;
  v_ot_minutes int := 0;
  v_absent_count int := 0;
  v_absence_fine numeric := 0;
  v_daily numeric;
  v_adv record;
  v_deduct numeric;
  v_month_start date;
  v_month_end date;
begin
  select * into v_emp
  from public.employees
  where id = p_employee_id and company_id = p_company_id;
  if not found then
    return null;
  end if;

  select * into v_company from public.companies where id = p_company_id;

  v_base := coalesce(v_emp.base_salary, 0);
  v_currency := coalesce(nullif(v_emp.currency, ''), 'IQD');
  v_month_start := make_date(p_year, p_month, 1);
  v_month_end := (v_month_start + interval '1 month' - interval '1 day')::date;

  -- Overtime money from attendance minutes
  select coalesce(sum(overtime_minutes), 0) into v_ot_minutes
  from public.attendance_records
  where company_id = p_company_id
    and employee_id = p_employee_id
    and work_date >= v_month_start
    and work_date <= v_month_end;

  if coalesce(v_company.overtime_rate_per_hour, 0) > 0 and v_ot_minutes > 0 then
    v_overtime := round((v_ot_minutes::numeric / 60.0) * v_company.overtime_rate_per_hour, 2);
  end if;

  -- Auto absence fines (idempotent via note)
  if coalesce(v_company.absence_fine_enabled, false) then
    select count(*)::int into v_absent_count
    from public.attendance_records
    where company_id = p_company_id
      and employee_id = p_employee_id
      and work_date >= v_month_start
      and work_date <= v_month_end
      and status = 'absent';

    if v_absent_count > 0 then
      if v_company.absence_fine_mode = 'daily_wage' and v_base > 0 then
        v_daily := round(v_base / 30.0, 2);
      else
        v_daily := coalesce(v_company.absence_fine_amount, 0);
      end if;
      v_absence_fine := v_daily * v_absent_count;

      if v_absence_fine > 0 then
        delete from public.rewards
        where company_id = p_company_id
          and employee_id = p_employee_id
          and note = 'auto_absence_fine'
          and extract(year from reward_date)::int = p_year
          and extract(month from reward_date)::int = p_month;

        insert into public.rewards (
          company_id, employee_id, title, amount, kind, reward_date, note, currency
        ) values (
          p_company_id, p_employee_id,
          'غەرامەی غائیب (' || v_absent_count || ' ڕۆژ)',
          v_absence_fine, 'fine', v_month_end,
          'auto_absence_fine', v_currency
        );
      end if;
    end if;
  end if;

  -- Advance installments for this month (one per active advance)
  for v_adv in
    select * from public.salary_advances
    where company_id = p_company_id
      and employee_id = p_employee_id
      and status = 'active'
      and remaining > 0
  loop
    -- skip if already charged this month
    if exists (
      select 1 from public.rewards r
      where r.company_id = p_company_id
        and r.employee_id = p_employee_id
        and r.note = 'advance:' || v_adv.id::text
        and extract(year from r.reward_date)::int = p_year
        and extract(month from r.reward_date)::int = p_month
    ) then
      continue;
    end if;

    v_deduct := least(v_adv.installment_amount, v_adv.remaining);
    insert into public.rewards (
      company_id, employee_id, title, amount, kind, reward_date, note, currency
    ) values (
      p_company_id, p_employee_id,
      'قیستی پێشەکی مووچە',
      v_deduct, 'fine', v_month_end,
      'advance:' || v_adv.id::text, coalesce(v_adv.currency, v_currency)
    );

    update public.salary_advances set
      remaining = remaining - v_deduct,
      status = case when remaining - v_deduct <= 0 then 'paid_off' else 'active' end,
      updated_at = now()
    where id = v_adv.id;
  end loop;

  select
    coalesce(sum(case when coalesce(kind, 'reward') = 'reward' then amount else 0 end), 0),
    coalesce(sum(case when coalesce(kind, 'reward') = 'fine' then amount else 0 end), 0)
  into v_bonus, v_deductions
  from public.rewards
  where company_id = p_company_id
    and employee_id = p_employee_id
    and extract(year from reward_date)::int = p_year
    and extract(month from reward_date)::int = p_month;

  select id, status into v_salary_id, v_status
  from public.salaries
  where company_id = p_company_id
    and employee_id = p_employee_id
    and year = p_year
    and month = p_month;

  if v_salary_id is not null and v_status = 'paid' then
    return v_salary_id;
  end if;

  v_net := greatest(v_base + coalesce(v_overtime, 0) + v_bonus - v_deductions, 0);

  if v_salary_id is null then
    insert into public.salaries (
      company_id, employee_id, year, month,
      base_amount, allowances, deductions,
      overtime_amount, bonus_amount, net_amount,
      status, currency
    ) values (
      p_company_id, p_employee_id, p_year, p_month,
      v_base, v_bonus, v_deductions,
      v_overtime, v_bonus, v_net,
      'draft', v_currency
    )
    returning id into v_salary_id;
  else
    update public.salaries set
      base_amount = v_base,
      allowances = v_bonus,
      bonus_amount = v_bonus,
      deductions = v_deductions,
      overtime_amount = v_overtime,
      net_amount = greatest(v_base + v_overtime + v_bonus - v_deductions, 0),
      currency = v_currency,
      updated_at = now()
    where id = v_salary_id;
  end if;

  update public.rewards
  set applied_salary_id = v_salary_id
  where company_id = p_company_id
    and employee_id = p_employee_id
    and extract(year from reward_date)::int = p_year
    and extract(month from reward_date)::int = p_month;

  return v_salary_id;
end;
$$;

-- Restrict company settings writes to owner (role=admin)
drop policy if exists companies_update_admin on public.companies;
drop policy if exists companies_owner_update on public.companies;
create policy companies_owner_update on public.companies
  for update
  using (id = public.current_profile_company_id() and public.is_company_owner())
  with check (id = public.current_profile_company_id() and public.is_company_owner());

-- ========== Create manager account ==========
create or replace function public.admin_create_manager(
  p_full_name text,
  p_email text,
  p_password text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_admin uuid := auth.uid();
  v_company uuid;
  v_user_id uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
begin
  if v_admin is null or not public.is_company_owner() then
    raise exception 'not authorized';
  end if;
  if length(trim(p_full_name)) < 2 then raise exception 'name required'; end if;
  if v_email is null or position('@' in v_email) = 0 then
    raise exception 'invalid email';
  end if;
  if length(coalesce(p_password, '')) < 8 then
    raise exception 'password too short';
  end if;

  v_company := public.current_profile_company_id();

  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'email already exists';
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
    v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', trim(p_full_name), 'role', 'manager'),
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    'email',
    v_user_id::text,
    now(), now(), now()
  );

  insert into public.profiles (id, company_id, role, full_name, email, is_active)
  values (v_user_id, v_company, 'manager', trim(p_full_name), v_email, true);

  insert into public.activity_logs (company_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    v_company, v_admin, 'manager.created', 'profile', v_user_id,
    jsonb_build_object('fullName', trim(p_full_name), 'email', v_email)
  );

  return v_user_id;
end;
$$;

grant execute on function public.admin_create_manager(text, text, text) to authenticated;

-- ===== 00019_password_reset_rate_limit.sql =====
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

-- ===== 00020_password_reset_otp.sql =====
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

