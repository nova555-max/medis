-- Leave rules: seed balances from leave_types, validate remaining days,
-- fix approve deduction, require review note path already supported.

create or replace function public.ensure_leave_balances(
  p_employee_id uuid,
  p_year int default extract(year from current_date)::int
)
returns setof public.leave_balances
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_emp public.employees;
  v_type public.leave_types;
begin
  if v_uid is null then
    raise exception 'not authorized';
  end if;

  select * into v_emp from public.employees where id = p_employee_id;
  if not found then
    raise exception 'employee not found';
  end if;

  if not (
    public.is_company_admin()
    and v_emp.company_id = public.current_profile_company_id()
  ) and not exists (
    select 1 from public.employees e
    where e.id = p_employee_id and e.user_id = v_uid
  ) then
    raise exception 'not authorized';
  end if;

  for v_type in
    select * from public.leave_types
    where company_id = v_emp.company_id and is_active = true
  loop
    insert into public.leave_balances (
      company_id, employee_id, leave_type_id, year,
      entitled_days, used_days, remaining_days
    ) values (
      v_emp.company_id, p_employee_id, v_type.id, p_year,
      coalesce(v_type.annual_allowance_days, 0),
      0,
      coalesce(v_type.annual_allowance_days, 0)
    )
    on conflict (company_id, employee_id, leave_type_id, year) do nothing;
  end loop;

  return query
    select * from public.leave_balances
    where employee_id = p_employee_id and year = p_year;
end;
$$;

create or replace function public.seed_leave_balances_on_employee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type public.leave_types;
  v_year int := extract(year from coalesce(new.hire_date, current_date))::int;
begin
  for v_type in
    select * from public.leave_types
    where company_id = new.company_id and is_active = true
  loop
    insert into public.leave_balances (
      company_id, employee_id, leave_type_id, year,
      entitled_days, used_days, remaining_days
    ) values (
      new.company_id, new.id, v_type.id, v_year,
      coalesce(v_type.annual_allowance_days, 0),
      0,
      coalesce(v_type.annual_allowance_days, 0)
    )
    on conflict (company_id, employee_id, leave_type_id, year) do nothing;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_seed_leave_balances on public.employees;
create trigger trg_seed_leave_balances
  after insert on public.employees
  for each row execute function public.seed_leave_balances_on_employee();

-- Seed current-year balances for existing employees
do $$
declare
  r record;
  t public.leave_types;
  y int := extract(year from current_date)::int;
begin
  for r in select id, company_id from public.employees loop
    for t in
      select * from public.leave_types
      where company_id = r.company_id and is_active = true
    loop
      insert into public.leave_balances (
        company_id, employee_id, leave_type_id, year,
        entitled_days, used_days, remaining_days
      ) values (
        r.company_id, r.id, t.id, y,
        coalesce(t.annual_allowance_days, 0),
        0,
        coalesce(t.annual_allowance_days, 0)
      )
      on conflict (company_id, employee_id, leave_type_id, year) do nothing;
    end loop;
  end loop;
end $$;

create or replace function public.leave_available_days(
  p_employee_id uuid,
  p_leave_type_id uuid,
  p_year int,
  p_exclude_request_id uuid default null
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_remaining numeric;
  v_pending numeric;
  v_allowance numeric;
begin
  select annual_allowance_days into v_allowance
  from public.leave_types
  where id = p_leave_type_id;

  -- Unlimited / unpaid with 0 allowance: no cap
  if coalesce(v_allowance, 0) <= 0 then
    return 9999;
  end if;

  select remaining_days into v_remaining
  from public.leave_balances
  where employee_id = p_employee_id
    and leave_type_id = p_leave_type_id
    and year = p_year;

  if v_remaining is null then
    v_remaining := v_allowance;
  end if;

  select coalesce(sum(days_count), 0) into v_pending
  from public.leave_requests
  where employee_id = p_employee_id
    and leave_type_id = p_leave_type_id
    and status = 'pending'
    and extract(year from start_date)::int = p_year
    and (p_exclude_request_id is null or id <> p_exclude_request_id);

  return greatest(v_remaining - v_pending, 0);
end;
$$;

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
  v_type public.leave_types;
  v_available numeric;
  v_entitled numeric;
begin
  if v_admin is null or not public.is_company_admin() then
    raise exception 'not authorized';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid status';
  end if;

  if p_status = 'rejected' and nullif(trim(coalesce(p_note, '')), '') is null then
    raise exception 'review note required';
  end if;

  select * into v_req
  from public.leave_requests
  where id = p_leave_id
    and company_id = public.current_profile_company_id()
    and status = 'pending';

  if not found then raise exception 'leave not found'; end if;

  select * into v_type from public.leave_types where id = v_req.leave_type_id;
  v_year := extract(year from v_req.start_date)::int;

  if p_status = 'approved' then
    -- Ensure balance row exists from policy
    perform public.ensure_leave_balances(v_req.employee_id, v_year);

    v_available := public.leave_available_days(
      v_req.employee_id, v_req.leave_type_id, v_year, v_req.id
    );

    if coalesce(v_type.annual_allowance_days, 0) > 0
       and v_req.days_count > v_available then
      raise exception 'insufficient leave balance';
    end if;

    v_entitled := coalesce(v_type.annual_allowance_days, 0);

    insert into public.leave_balances (
      company_id, employee_id, leave_type_id, year,
      entitled_days, used_days, remaining_days
    ) values (
      v_req.company_id, v_req.employee_id, v_req.leave_type_id, v_year,
      v_entitled, v_req.days_count, greatest(v_entitled - v_req.days_count, 0)
    )
    on conflict (company_id, employee_id, leave_type_id, year) do update set
      used_days = public.leave_balances.used_days + v_req.days_count,
      remaining_days = greatest(
        public.leave_balances.remaining_days - v_req.days_count,
        0
      );
  end if;

  update public.leave_requests set
    status = p_status,
    reviewed_by = v_admin,
    reviewed_at = now(),
    review_note = nullif(trim(coalesce(p_note, '')), ''),
    updated_at = now()
  where id = p_leave_id
  returning * into v_req;

  if p_status = 'approved' then
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
    coalesce(
      nullif(trim(coalesce(p_note, '')), ''),
      case when p_status = 'approved'
        then 'داواکاری مۆڵەتەکەت پەسەندکرا.'
        else 'داواکاری مۆڵەتەکەت ڕەتکرایەوە.'
      end
    ),
    'leave',
    jsonb_build_object('leave_id', v_req.id, 'status', p_status)
  from public.employees e where e.id = v_req.employee_id and e.user_id is not null;

  return v_req;
end;
$$;

grant execute on function public.ensure_leave_balances(uuid, int) to authenticated;
grant execute on function public.leave_available_days(uuid, uuid, int, uuid) to authenticated;
grant execute on function public.admin_review_leave(uuid, text, text) to authenticated;
