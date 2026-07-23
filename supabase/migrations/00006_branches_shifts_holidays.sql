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
