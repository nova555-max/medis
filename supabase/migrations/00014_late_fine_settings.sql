-- Auto late fine settings + apply on check-in

alter table public.companies
  add column if not exists late_fine_enabled boolean not null default false,
  add column if not exists late_fine_amount numeric not null default 0,
  add column if not exists late_fine_after_minutes integer not null default 15;

create or replace function public.employee_check_in(
  p_lat double precision default null,
  p_lng double precision default null,
  p_qr_token text default null,
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
  v_late int := 0;
  v_status text := 'present';
  v_method text := 'manual';
  v_qr_id uuid;
  v_rec public.attendance_records;
  v_dist double precision;
  v_start time;
  v_grace int;
  v_gps_ok boolean;
  v_fine_amount numeric;
  v_fine_after int;
begin
  if v_user_id is null then raise exception 'not authenticated'; end if;

  select * into v_emp from public.employees where user_id = v_user_id and status = 'active';
  if not found then raise exception 'employee not found'; end if;

  select * into v_company from public.companies where id = v_emp.company_id;
  v_today := (v_now at time zone coalesce(v_company.timezone, 'Asia/Baghdad'))::date;
  v_local_time := (v_now at time zone coalesce(v_company.timezone, 'Asia/Baghdad'))::time;

  if public.is_company_off_day(v_emp.company_id, v_today, v_emp.branch_id) then
    if extract(dow from v_today) = 5 then
      raise exception 'friday off';
    end if;
    raise exception 'holiday today';
  end if;

  if exists (
    select 1 from public.attendance_records
    where company_id = v_emp.company_id and employee_id = v_emp.id
      and work_date = v_today and check_in_at is not null
  ) then
    raise exception 'already checked in';
  end if;

  if exists (
    select 1 from public.leave_requests lr
    where lr.company_id = v_emp.company_id and lr.employee_id = v_emp.id
      and lr.status = 'approved' and v_today between lr.start_date and lr.end_date
  ) then
    raise exception 'on leave today';
  end if;

  if v_emp.shift_id is not null then
    select * into v_shift from public.shifts where id = v_emp.shift_id and company_id = v_emp.company_id;
  end if;

  v_start := coalesce(v_shift.start_time, v_company.work_start_time);
  v_grace := coalesce(v_shift.late_grace_minutes, v_company.late_grace_minutes, 15);

  if coalesce(v_emp.gps_enabled, false) then
    if v_company.gps_required and v_company.gps_only_during_work_hours then
      if coalesce(v_shift.end_time, v_company.work_end_time) >= v_start then
        v_gps_ok := v_local_time >= v_start and v_local_time <= coalesce(v_shift.end_time, v_company.work_end_time);
      else
        v_gps_ok := v_local_time >= v_start or v_local_time <= coalesce(v_shift.end_time, v_company.work_end_time);
      end if;
      if not v_gps_ok then
        raise exception 'gps closed outside work hours';
      end if;
    end if;
    if p_lat is null or p_lng is null then
      raise exception 'gps required';
    end if;
    if v_emp.gps_lat is null or v_emp.gps_lng is null then
      raise exception 'employee gps location not set';
    end if;
    v_dist := public.haversine_m(p_lat, p_lng, v_emp.gps_lat, v_emp.gps_lng);
    if v_dist > coalesce(v_emp.gps_radius_meters, 150) then
      raise exception 'outside gps radius';
    end if;
    v_method := 'gps';
  end if;

  if coalesce(v_company.qr_required, false) then
    if p_qr_token is null or length(trim(p_qr_token)) = 0 then
      raise exception 'qr required';
    end if;
    select id into v_qr_id from public.qr_tokens
    where company_id = v_emp.company_id and is_active = true
      and token_hash = p_qr_token
      and (expires_at is null or expires_at > now())
    limit 1;
    if v_qr_id is null then raise exception 'invalid qr'; end if;
    v_method := case when v_method = 'gps' then 'gps_qr' else 'qr' end;
  end if;

  if coalesce(v_company.selfie_required, false)
     and (p_selfie_path is null or length(trim(p_selfie_path)) = 0) then
    raise exception 'selfie required';
  end if;

  if v_local_time > (v_start + make_interval(mins => v_grace)) then
    v_late := greatest(0, floor(extract(epoch from (v_local_time - v_start)) / 60)::int);
    v_status := 'late';
  end if;

  insert into public.attendance_records (
    company_id, employee_id, work_date, check_in_at,
    check_in_lat, check_in_lng, check_in_method, check_in_selfie_path,
    check_in_device_info, qr_token_id, status, late_minutes
  ) values (
    v_emp.company_id, v_emp.id, v_today, v_now,
    p_lat, p_lng, v_method, p_selfie_path,
    coalesce(p_device_info, '{}'::jsonb), v_qr_id, v_status, v_late
  )
  on conflict (company_id, employee_id, work_date) do update set
    check_in_at = excluded.check_in_at,
    check_in_lat = excluded.check_in_lat,
    check_in_lng = excluded.check_in_lng,
    check_in_method = excluded.check_in_method,
    check_in_selfie_path = excluded.check_in_selfie_path,
    check_in_device_info = excluded.check_in_device_info,
    qr_token_id = excluded.qr_token_id,
    status = excluded.status,
    late_minutes = excluded.late_minutes,
    updated_at = now()
  returning * into v_rec;

  -- Auto late fine (once per day)
  v_fine_amount := coalesce(v_company.late_fine_amount, 0);
  v_fine_after := coalesce(v_company.late_fine_after_minutes, 15);
  if coalesce(v_company.late_fine_enabled, false)
     and v_fine_amount > 0
     and v_late >= v_fine_after then
    if not exists (
      select 1 from public.rewards r
      where r.company_id = v_emp.company_id
        and r.employee_id = v_emp.id
        and r.kind = 'fine'
        and r.reward_date = v_today
        and r.note = 'auto_late_fine'
    ) then
      insert into public.rewards (
        company_id, employee_id, title, amount, reward_date, note, created_by, kind, currency
      ) values (
        v_emp.company_id,
        v_emp.id,
        format('غەرامەی دواکەوتن (%s خولەک)', v_late),
        v_fine_amount,
        v_today,
        'auto_late_fine',
        null,
        'fine',
        coalesce(v_emp.currency, 'IQD')
      );

      perform public.recalc_employee_month_salary(
        v_emp.company_id,
        v_emp.id,
        extract(year from v_today)::int,
        extract(month from v_today)::int
      );

      insert into public.notifications (company_id, user_id, title, body, type, data)
      values (
        v_emp.company_id,
        v_user_id,
        'غەرامەی دواکەوتن',
        format('بڕی %s بۆ دواکەوتنی %s خولەک', v_fine_amount, v_late),
        'fine',
        jsonb_build_object('late_minutes', v_late, 'amount', v_fine_amount)
      );
    end if;
  end if;

  insert into public.activity_logs (company_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_emp.company_id, v_user_id, 'attendance.check_in', 'attendance', v_rec.id,
    jsonb_build_object('status', v_status, 'late_minutes', v_late));

  return v_rec;
end;
$$;
