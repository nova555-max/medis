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
