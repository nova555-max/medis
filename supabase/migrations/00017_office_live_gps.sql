-- Live GPS for office (gps_enabled) + online; auto at_work / away
-- Harden checkout geofence when workplace coords missing

create or replace function public.employee_update_location(
  p_lat double precision,
  p_lng double precision,
  p_activity text default null
)
returns public.employees
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_emp public.employees%rowtype;
  v_dist double precision;
  v_radius int;
  v_activity text;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_lat is null or p_lng is null then
    raise exception 'location required';
  end if;

  select * into v_emp from public.employees
  where user_id = v_user and status = 'active';
  if not found then raise exception 'employee not found'; end if;

  -- Online always allowed; office only when GPS workplace is enabled
  if v_emp.employee_type = 'online' then
    v_activity := nullif(trim(coalesce(p_activity, '')), '');
    if v_activity is null then v_activity := 'working'; end if;
  elsif coalesce(v_emp.gps_enabled, false) then
    if v_emp.gps_lat is null or v_emp.gps_lng is null then
      raise exception 'employee gps location not set';
    end if;
    v_radius := coalesce(v_emp.gps_radius_meters, 150);
    v_dist := public.haversine_m(p_lat, p_lng, v_emp.gps_lat, v_emp.gps_lng);
    if v_dist <= v_radius then
      v_activity := 'at_work';
    else
      v_activity := 'left_work';
    end if;
  else
    raise exception 'live gps not enabled';
  end if;

  update public.employees set
    last_lat = p_lat,
    last_lng = p_lng,
    last_location_at = now(),
    last_activity = v_activity,
    updated_at = now()
  where id = v_emp.id
  returning * into v_emp;

  return v_emp;
end;
$$;

grant execute on function public.employee_update_location(double precision, double precision, text) to authenticated;

-- Ensure check-out requires workplace coords when GPS on
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
  v_shift public.shifts%rowtype;
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
  v_end time;
  v_start time;
  v_gps_ok boolean;
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

  if v_emp.shift_id is not null then
    select * into v_shift from public.shifts where id = v_emp.shift_id and company_id = v_emp.company_id;
  end if;
  v_start := coalesce(v_shift.start_time, v_company.work_start_time);
  v_end := coalesce(v_shift.end_time, v_company.work_end_time);

  if coalesce(v_emp.gps_enabled, false) then
    if v_company.gps_required and v_company.gps_only_during_work_hours then
      if v_end >= v_start then
        v_gps_ok := v_local_time >= v_start and v_local_time <= v_end;
      else
        v_gps_ok := v_local_time >= v_start or v_local_time <= v_end;
      end if;
      if not v_gps_ok then
        raise exception 'gps closed outside work hours';
      end if;
    end if;
    if p_lat is null or p_lng is null then raise exception 'gps required'; end if;
    if v_emp.gps_lat is null or v_emp.gps_lng is null then
      raise exception 'employee gps location not set';
    end if;
    v_dist := public.haversine_m(p_lat, p_lng, v_emp.gps_lat, v_emp.gps_lng);
    if v_dist > coalesce(v_emp.gps_radius_meters, 150) then
      raise exception 'outside gps radius';
    end if;
    v_method := 'gps';
  end if;

  v_worked := greatest(0, floor(extract(epoch from (v_now - v_rec.check_in_at)) / 60)::int);
  if v_local_time < v_end then
    v_early := greatest(0, floor(extract(epoch from (v_end - v_local_time)) / 60)::int);
  end if;
  if v_local_time > (v_end + make_interval(mins => coalesce(v_company.overtime_after_minutes, 0))) then
    v_ot := greatest(0, floor(extract(epoch from (v_local_time - v_end)) / 60)::int);
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

  -- refresh live position on checkout
  if p_lat is not null and p_lng is not null then
    update public.employees set
      last_lat = p_lat,
      last_lng = p_lng,
      last_location_at = now(),
      last_activity = case
        when coalesce(v_emp.gps_enabled, false) then 'left_work'
        else coalesce(last_activity, 'check_out')
      end,
      updated_at = now()
    where id = v_emp.id;
  end if;

  insert into public.activity_logs (company_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_emp.company_id, v_user_id, 'attendance.check_out', 'attendance', v_rec.id,
    jsonb_build_object('worked_minutes', v_worked, 'overtime_minutes', v_ot));

  return v_rec;
end;
$$;
