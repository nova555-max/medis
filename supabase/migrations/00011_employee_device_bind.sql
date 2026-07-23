-- Employee single-device binding

alter table public.employees
  add column if not exists bound_device_id text,
  add column if not exists bound_device_label text,
  add column if not exists bound_device_at timestamptz,
  add column if not exists pending_device_id text,
  add column if not exists pending_device_label text,
  add column if not exists pending_device_at timestamptz;

create index if not exists employees_bound_device_idx
  on public.employees (company_id, bound_device_id)
  where bound_device_id is not null;

-- Bind first device, allow same device, or queue change request + notify admins
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
      updated_at = now()
    where id = v_emp.id;
    return jsonb_build_object('ok', true, 'status', 'matched');
  end if;

  -- different device → pending + notify admins (do not switch yet)
  update public.employees set
    pending_device_id = trim(p_device_id),
    pending_device_label = v_label,
    pending_device_at = now(),
    updated_at = now()
  where id = v_emp.id;

  insert into public.notifications (company_id, user_id, title, body, type, data)
  select p.company_id, p.id,
    'داواکاری مۆبایلی نوێ',
    format('%s (%s) دەیەوێت لە مۆبایلی تر بچێتە ژوورەوە.', v_emp.full_name, v_emp.employee_code),
    'device_change',
    jsonb_build_object(
      'employee_id', v_emp.id,
      'employee_code', v_emp.employee_code,
      'pending_device_id', trim(p_device_id),
      'pending_device_label', v_label,
      'current_device_id', v_emp.bound_device_id
    )
  from public.profiles p
  where p.company_id = v_emp.company_id
    and p.role = 'admin'
    and p.is_active = true;

  return jsonb_build_object(
    'ok', false,
    'status', 'pending_approval',
    'message', 'device change requires admin'
  );
end;
$$;

create or replace function public.admin_approve_employee_device(
  p_employee_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_emp public.employees%rowtype;
  v_company uuid;
begin
  if auth.uid() is null or not public.is_company_admin() then
    raise exception 'not authorized';
  end if;
  v_company := public.current_profile_company_id();

  select * into v_emp from public.employees
  where id = p_employee_id and company_id = v_company;
  if not found then raise exception 'employee not found'; end if;
  if v_emp.pending_device_id is null then
    raise exception 'no pending device';
  end if;

  update public.employees set
    bound_device_id = pending_device_id,
    bound_device_label = pending_device_label,
    bound_device_at = now(),
    pending_device_id = null,
    pending_device_label = null,
    pending_device_at = null,
    updated_at = now()
  where id = v_emp.id;

  if v_emp.user_id is not null then
    insert into public.notifications (company_id, user_id, title, body, type, data)
    values (
      v_company, v_emp.user_id,
      'مۆبایلی نوێ پەسەندکرا',
      'ئێستا دەتوانیت لەم مۆبایلەوە بچیتە ژوورەوە.',
      'device_approved',
      jsonb_build_object('employee_id', v_emp.id)
    );
  end if;
end;
$$;

create or replace function public.admin_clear_employee_device(
  p_employee_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_company_admin() then
    raise exception 'not authorized';
  end if;

  update public.employees set
    bound_device_id = null,
    bound_device_label = null,
    bound_device_at = null,
    pending_device_id = null,
    pending_device_label = null,
    pending_device_at = null,
    updated_at = now()
  where id = p_employee_id
    and company_id = public.current_profile_company_id();
end;
$$;

grant execute on function public.employee_register_device(text, text) to authenticated;
grant execute on function public.admin_approve_employee_device(uuid) to authenticated;
grant execute on function public.admin_clear_employee_device(uuid) to authenticated;
