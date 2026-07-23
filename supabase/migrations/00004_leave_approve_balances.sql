-- Phase 1: leave approve updates balances + marks attendance on_leave

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
begin
  if v_admin is null or not public.is_company_admin() then
    raise exception 'not authorized';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'invalid status';
  end if;

  update public.leave_requests set
    status = p_status,
    reviewed_by = v_admin,
    reviewed_at = now(),
    review_note = p_note,
    updated_at = now()
  where id = p_leave_id
    and company_id = public.current_profile_company_id()
    and status = 'pending'
  returning * into v_req;

  if not found then raise exception 'leave not found'; end if;

  if p_status = 'approved' then
    v_year := extract(year from v_req.start_date)::int;

    insert into public.leave_balances (
      company_id, employee_id, leave_type_id, year, entitled_days, used_days, remaining_days
    ) values (
      v_req.company_id, v_req.employee_id, v_req.leave_type_id, v_year,
      greatest(v_req.days_count, 0), v_req.days_count, 0
    )
    on conflict (company_id, employee_id, leave_type_id, year) do update set
      used_days = public.leave_balances.used_days + v_req.days_count,
      remaining_days = greatest(
        public.leave_balances.remaining_days - v_req.days_count,
        0
      );

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
    coalesce(p_note, ''),
    'leave',
    jsonb_build_object('leave_id', v_req.id, 'status', p_status)
  from public.employees e where e.id = v_req.employee_id and e.user_id is not null;

  return v_req;
end;
$$;
