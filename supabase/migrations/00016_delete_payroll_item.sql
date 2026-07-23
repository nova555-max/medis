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
