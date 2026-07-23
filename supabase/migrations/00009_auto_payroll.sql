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
