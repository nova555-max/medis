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
