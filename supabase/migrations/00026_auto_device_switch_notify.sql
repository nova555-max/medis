-- Auto-bind new phone on login; notify admins only (do not block employee)
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
  v_prev_id text;
  v_prev_label text;
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
      pending_device_id = null,
      pending_device_label = null,
      pending_device_at = null,
      updated_at = now()
    where id = v_emp.id;
    return jsonb_build_object('ok', true, 'status', 'matched');
  end if;

  -- different device → switch immediately + notify admins (login allowed)
  v_prev_id := v_emp.bound_device_id;
  v_prev_label := v_emp.bound_device_label;

  update public.employees set
    bound_device_id = trim(p_device_id),
    bound_device_label = v_label,
    bound_device_at = now(),
    pending_device_id = null,
    pending_device_label = null,
    pending_device_at = null,
    updated_at = now()
  where id = v_emp.id;

  insert into public.notifications (company_id, user_id, title, body, type, data)
  select p.company_id, p.id,
    'گۆڕینی مۆبایلی کارمەند',
    format(
      '%s (%s) مۆبایلی گۆڕی و چووە ژوورەوە. پێشتر: %s — ئێستا: %s',
      v_emp.full_name,
      v_emp.employee_code,
      coalesce(v_prev_label, 'مۆبایلی کۆن'),
      v_label
    ),
    'device_change',
    jsonb_build_object(
      'employee_id', v_emp.id,
      'employee_code', v_emp.employee_code,
      'new_device_id', trim(p_device_id),
      'new_device_label', v_label,
      'previous_device_id', v_prev_id,
      'previous_device_label', v_prev_label
    )
  from public.profiles p
  where p.company_id = v_emp.company_id
    and p.role in ('admin', 'manager')
    and p.is_active = true;

  return jsonb_build_object('ok', true, 'status', 'switched');
end;
$$;
