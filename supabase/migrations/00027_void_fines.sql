-- Allow admin to permanently waive/void any fine (manual, late, absence, advance).
-- Soft-void keeps the row so auto-recalc / check-in do not recreate it.

alter table public.rewards
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references public.profiles (id) on delete set null;

create index if not exists rewards_voided_idx
  on public.rewards (company_id, employee_id, voided_at)
  where voided_at is not null;

-- Delete/void payroll item: fines are waived (soft), rewards hard-deleted
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

  if v_row.voided_at is not null then
    raise exception 'already voided';
  end if;

  v_year := extract(year from v_row.reward_date)::int;
  v_month := extract(month from v_row.reward_date)::int;

  if coalesce(v_row.kind, 'reward') = 'fine' then
    update public.rewards set
      voided_at = now(),
      voided_by = v_admin
    where id = p_item_id and company_id = v_company;
  else
    delete from public.rewards
    where id = p_item_id and company_id = v_company;
  end if;

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
    case when coalesce(v_row.kind, 'reward') = 'fine'
      then 'payroll.fine_voided'
      else 'payroll.item_deleted'
    end,
    'reward',
    p_item_id,
    jsonb_build_object(
      'kind', v_row.kind,
      'title', v_row.title,
      'amount', v_row.amount,
      'note', v_row.note,
      'employee_id', v_row.employee_id
    )
  );
end;
$$;

grant execute on function public.admin_delete_payroll_item(uuid) to authenticated;

-- Recalc: ignore voided rows; do not recreate waived auto absence fines
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
  v_absence_waived boolean := false;
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

  select coalesce(sum(overtime_minutes), 0) into v_ot_minutes
  from public.attendance_records
  where company_id = p_company_id
    and employee_id = p_employee_id
    and work_date >= v_month_start
    and work_date <= v_month_end;

  if coalesce(v_company.overtime_rate_per_hour, 0) > 0 and v_ot_minutes > 0 then
    v_overtime := round((v_ot_minutes::numeric / 60.0) * v_company.overtime_rate_per_hour, 2);
  end if;

  -- Auto absence fines (respect admin waiver)
  select exists (
    select 1
    from public.rewards r
    where r.company_id = p_company_id
      and r.employee_id = p_employee_id
      and r.note = 'auto_absence_fine'
      and r.voided_at is not null
      and extract(year from r.reward_date)::int = p_year
      and extract(month from r.reward_date)::int = p_month
  ) into v_absence_waived;

  if coalesce(v_company.absence_fine_enabled, false) and not v_absence_waived then
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
          and voided_at is null
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
    else
      delete from public.rewards
      where company_id = p_company_id
        and employee_id = p_employee_id
        and note = 'auto_absence_fine'
        and voided_at is null
        and extract(year from reward_date)::int = p_year
        and extract(month from reward_date)::int = p_month;
    end if;
  end if;

  -- Advance installments (skip if active or voided charge already exists for month)
  for v_adv in
    select * from public.salary_advances
    where company_id = p_company_id
      and employee_id = p_employee_id
      and status = 'active'
      and remaining > 0
  loop
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
    and voided_at is null
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
    and voided_at is null
    and extract(year from reward_date)::int = p_year
    and extract(month from reward_date)::int = p_month;

  return v_salary_id;
end;
$$;

-- Late fine: do not recreate if a voided (or active) late fine already exists for the day
-- Patch helper used by check-in flows: existence check already matches note+date;
-- keeping voided rows with same note blocks re-insert. No check-in rewrite required.
