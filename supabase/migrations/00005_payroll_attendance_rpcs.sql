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
