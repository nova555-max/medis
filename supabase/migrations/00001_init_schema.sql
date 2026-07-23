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
